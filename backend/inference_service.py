"""
Inference Service for Box Label OCR

This service handles:
- Running inference jobs with EasyOCR or PaddleOCR
- Storing results in Pixeltable
- Comparing against ground truth for benchmarking
"""
import os
import sys
import uuid
import traceback
import contextlib
import threading
import signal
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Tuple, Any
import json
import time

import pixeltable as pxt
import numpy as np
import cv2
import pandas as pd
from PIL import Image

# Add OCR_scripts to path - check Docker location first, then local
OCR_SCRIPTS_DIR = Path("/app/OCR_scripts")
if not OCR_SCRIPTS_DIR.exists():
    # Local development fallback
    OCR_SCRIPTS_DIR = Path(__file__).parent.parent / "OCR_scripts"
sys.path.insert(0, str(OCR_SCRIPTS_DIR))

from config import (
    DETECTION_CLASSES,
    CLASS_TO_CSV_COLUMN,
    DETECTION_CONFIDENCE_THRESHOLD,
    OCR_CONFIDENCE_THRESHOLD,
)
from roboflow_detector import RoboflowDetector, Detection
from benchmark import (
    normalize_text,
    character_error_rate,
    word_accuracy,
)

from pixeltable_schema import (
    PIXELTABLE_DIR,
    get_inference_jobs_table,
    get_image_results_table,
    get_benchmark_results_table,
    get_job_summaries_table,
    setup_all_tables,
    table_insert,
    table_update,
    table_query,
    table_delete,
    retry_on_db_error,
)

from preprocessing import preprocess_image


@contextlib.contextmanager
def _time_limit(seconds: Optional[float], timeout_message: str):
    """
    Best-effort wall-clock timeout.

    - Uses SIGALRM when available (Linux/macOS, main thread only).
    - Falls back to no-op on platforms/threads where SIGALRM isn't usable.
    """
    if seconds is None or seconds <= 0:
        yield
        return

    if not hasattr(signal, "SIGALRM"):
        yield
        return

    if threading.current_thread() is not threading.main_thread():
        yield
        return

    start = time.monotonic()
    old_handler = signal.getsignal(signal.SIGALRM)
    old_timer = signal.getitimer(signal.ITIMER_REAL)

    def _handler(signum, frame):
        raise TimeoutError(timeout_message)

    signal.signal(signal.SIGALRM, _handler)
    signal.setitimer(signal.ITIMER_REAL, float(seconds))
    try:
        yield
    finally:
        # Cancel our timer and restore previous handler/timer (supports nesting).
        signal.setitimer(signal.ITIMER_REAL, 0)
        signal.signal(signal.SIGALRM, old_handler)

        old_remaining, old_interval = old_timer
        if old_remaining and old_remaining > 0:
            elapsed = time.monotonic() - start
            remaining = max(0.0, float(old_remaining) - elapsed)
            if remaining > 0:
                signal.setitimer(signal.ITIMER_REAL, remaining, float(old_interval))


def _get_rss_mb() -> Optional[float]:
    """Best-effort RSS (resident set size) in MB, for CloudWatch log debugging."""
    # Linux containers: prefer /proc/self/status (VmRSS)
    try:
        with open("/proc/self/status", "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("VmRSS:"):
                    parts = line.split()
                    if len(parts) >= 2:
                        kb = float(parts[1])
                        return kb / 1024.0
    except Exception:
        pass

    # Fallback: resource module (platform-dependent units)
    try:
        import resource
        rss = float(resource.getrusage(resource.RUSAGE_SELF).ru_maxrss)
        # Linux: KB, macOS: bytes
        if sys.platform == "darwin":
            return rss / (1024.0 * 1024.0)
        return rss / 1024.0
    except Exception:
        return None


class InferenceService:
    """Service for running OCR inference and storing results in Pixeltable."""

    def __init__(self, use_gpu: Optional[bool] = None):
        """Initialize the inference service."""
        self.detector: Optional[RoboflowDetector] = None
        self.easyocr_reader = None
        self.paddleocr_engine = None
        self.use_gpu: bool = False

        # Resolve GPU usage once (can be overridden per-run via run_inference(use_gpu=...))
        if use_gpu is None:
            env_default = os.environ.get("DEFAULT_USE_GPU")
            if env_default is None or env_default == "":
                requested = True  # prefer GPU if available
            else:
                requested = env_default.strip().lower() in ("1", "true", "yes", "y", "on")
            self.set_use_gpu(requested)
        else:
            self.set_use_gpu(bool(use_gpu))

        # Ensure tables exist
        try:
            setup_all_tables()
        except Exception as e:
            print(f"Tables may already exist: {e}")

    def _torch_cuda_available(self) -> bool:
        try:
            import torch  # EasyOCR depends on torch
            return bool(torch.cuda.is_available())
        except Exception:
            return False

    def _paddle_cuda_available(self) -> bool:
        try:
            import paddle
            # Paddle API differs across versions
            if hasattr(paddle, "device") and hasattr(paddle.device, "is_compiled_with_cuda"):
                return bool(paddle.device.is_compiled_with_cuda())
            if hasattr(paddle, "is_compiled_with_cuda"):
                return bool(paddle.is_compiled_with_cuda())
        except Exception:
            return False
        return False

    def _resolve_use_gpu(self, requested: bool) -> bool:
        # Hard override for production safety
        if os.environ.get("FORCE_CPU", "").strip().lower() in ("1", "true", "yes", "y", "on"):
            return False
        if not requested:
            return False

        # Prefer torch CUDA availability; fall back to paddle's check
        return self._torch_cuda_available() or self._paddle_cuda_available()

    def set_use_gpu(self, requested: bool) -> None:
        resolved = self._resolve_use_gpu(requested)
        if getattr(self, "use_gpu", None) != resolved:
            self.use_gpu = resolved
            # Re-init OCR engines with the correct device setting
            self.easyocr_reader = None
            self.paddleocr_engine = None
        print(f"[GPU] requested={requested} resolved={self.use_gpu}")

    def _init_detector(self):
        """Lazy initialization of Roboflow detector."""
        if self.detector is None:
            self.detector = RoboflowDetector()
        return self.detector

    def _init_easyocr(self, languages: List[str] = None):
        """Lazy initialization of EasyOCR."""
        if self.easyocr_reader is None:
            import easyocr
            languages = languages or ["en"]
            self.easyocr_reader = easyocr.Reader(languages, gpu=self.use_gpu)
        return self.easyocr_reader

    def _init_paddleocr(self, lang: str = "en"):
        """Lazy initialization of PaddleOCR (v3.x API)."""
        if self.paddleocr_engine is None:
            import inspect
            from paddleocr import PaddleOCR
            # PaddleOCR 3.x uses simplified API - removed deprecated params
            kwargs = {"lang": lang}
            try:
                sig = inspect.signature(PaddleOCR)
                if "use_gpu" in sig.parameters:
                    kwargs["use_gpu"] = self.use_gpu
                if "show_log" in sig.parameters:
                    kwargs["show_log"] = False
            except Exception:
                # If signature introspection fails, fall back to minimal init
                pass
            self.paddleocr_engine = PaddleOCR(**kwargs)
        return self.paddleocr_engine

    def _run_ocr_on_crop(self, crop: np.ndarray, engine: str, preprocessing: str = "none") -> str:
        """Run OCR on a cropped image region with optional preprocessing.

        Args:
            crop: Input image crop as numpy array (BGR format)
            engine: OCR engine to use ('easyocr' or 'paddleocr')
            preprocessing: Preprocessing type to apply before OCR

        Returns:
            Extracted text from the image crop
        """
        # Apply preprocessing before OCR
        processed_crop = preprocess_image(crop, preprocessing)

        if engine == "easyocr":
            reader = self._init_easyocr()
            # EasyOCR expects RGB
            if len(processed_crop.shape) == 3 and processed_crop.shape[2] == 3:
                crop_rgb = cv2.cvtColor(processed_crop, cv2.COLOR_BGR2RGB)
            else:
                crop_rgb = processed_crop

            results = reader.readtext(crop_rgb)
            texts = [text for bbox, text, conf in results if conf >= OCR_CONFIDENCE_THRESHOLD]
            return " ".join(texts)

        elif engine == "paddleocr":
            ocr = self._init_paddleocr()
            # PaddleOCR 3.x uses predict() instead of ocr()
            try:
                results = ocr.predict(processed_crop)
            except Exception as paddle_err:
                print(f"[PADDLE PREDICT ERROR] {type(paddle_err).__name__}: {paddle_err}")
                print(f"  Crop shape: {processed_crop.shape if hasattr(processed_crop, 'shape') else 'unknown'}")
                raise

            if not results:
                return ""

            # PaddleOCR 3.x returns list of dicts with 'rec_texts' and 'rec_scores'
            result = results[0] if results else {}
            rec_texts = result.get("rec_texts", [])
            rec_scores = result.get("rec_scores", [])

            texts = []
            for text, score in zip(rec_texts, rec_scores):
                if score >= OCR_CONFIDENCE_THRESHOLD:
                    texts.append(text)
            return " ".join(texts)

        else:
            raise ValueError(f"Unknown OCR engine: {engine}")

    @retry_on_db_error(max_retries=3, delay=0.5)
    def create_job(
        self,
        engine: str,
        dataset_version: str,
        dataset_name: str,
        total_images: int,
        preprocessing: str = "none"
    ) -> str:
        """Create a new inference job record.

        Args:
            engine: OCR engine to use
            dataset_version: Version of the dataset
            dataset_name: Name of the dataset
            total_images: Total number of images to process
            preprocessing: Preprocessing type to apply

        Returns:
            job_id: Unique identifier for the job
        """
        job_id = str(uuid.uuid4())

        jobs_table = get_inference_jobs_table()
        table_insert(jobs_table, [{
            "job_id": job_id,
            "engine": engine,
            "preprocessing": preprocessing,
            "dataset_version": dataset_version,
            "dataset_name": dataset_name,
            "status": "pending",
            "total_images": total_images,
            "processed_images": 0,
            "created_at": datetime.now(),
            "started_at": None,
            "completed_at": None,
            "error_message": None,
        }])

        return job_id

    @retry_on_db_error(max_retries=3, delay=0.5)
    def update_job_status(
        self,
        job_id: str,
        status: str,
        processed_images: Optional[int] = None,
        error_message: Optional[str] = None
    ):
        """Update job status in Pixeltable."""
        jobs_table = get_inference_jobs_table()

        # Build update dict
        updates = {"status": status}

        if processed_images is not None:
            updates["processed_images"] = processed_images

        # Only set started_at when transitioning into running (avoid overwriting it on every progress update)
        if status == "running" and processed_images is None:
            updates["started_at"] = datetime.now()
        elif status in ("completed", "failed"):
            updates["completed_at"] = datetime.now()

        if error_message:
            updates["error_message"] = error_message

        # Update using where clause with retry
        table_update(jobs_table, updates, (jobs_table.job_id == job_id))

    @retry_on_db_error(max_retries=3, delay=0.5)
    def store_image_result(
        self,
        job_id: str,
        image_filename: str,
        image_path: str,
        detections: List[Detection],
        ocr_results: Dict[str, str],
        processing_time_ms: float
    ):
        """Store inference result for a single image."""
        results_table = get_image_results_table()

        # Serialize detections to JSON
        detections_json = json.dumps([
            {
                "class": d.class_name,
                "confidence": d.confidence,
                "bbox": d.bbox,
            }
            for d in detections
        ])

        # Serialize OCR results
        ocr_results_json = json.dumps(ocr_results)

        table_insert(results_table, [{
            "result_id": str(uuid.uuid4()),
            "job_id": job_id,
            "image_filename": image_filename,
            "image_path": image_path,
            "image": image_path,  # Pixeltable will load the image
            "detections_json": detections_json,
            "ocr_results_json": ocr_results_json,
            "processing_time_ms": processing_time_ms,
            "timestamp": datetime.now(),
        }])

    @retry_on_db_error(max_retries=3, delay=0.5)
    def store_benchmark_result(
        self,
        job_id: str,
        image_filename: str,
        field_name: str,
        ground_truth: str,
        prediction: str
    ):
        """Store benchmark comparison for a single field."""
        benchmark_table = get_benchmark_results_table()

        gt_str = str(ground_truth) if pd.notna(ground_truth) else ""
        pred_str = str(prediction) if prediction else ""

        exact = pred_str.strip() == gt_str.strip()
        normalized = normalize_text(pred_str) == normalize_text(gt_str)
        cer = character_error_rate(pred_str, gt_str)
        word_acc = word_accuracy(pred_str, gt_str)

        table_insert(benchmark_table, [{
            "benchmark_id": str(uuid.uuid4()),
            "job_id": job_id,
            "image_filename": image_filename,
            "field_name": field_name,
            "ground_truth": gt_str,
            "prediction": pred_str,
            "exact_match": exact,
            "normalized_match": normalized,
            "character_error_rate": cer,
            "word_accuracy": word_acc,
        }])

    @retry_on_db_error(max_retries=3, delay=0.5)
    def calculate_and_store_summary(self, job_id: str, engine: str, dataset_version: str, dataset_name: str):
        """Calculate aggregate statistics and store job summary."""
        benchmark_table = get_benchmark_results_table()
        summary_table = get_job_summaries_table()

        # Query all benchmark results for this job with retry
        results = table_query(benchmark_table, benchmark_table.job_id == job_id)

        if not results or len(results) == 0:
            return

        # Calculate overall metrics
        total_fields = len(results)
        exact_matches = sum(1 for r in results.to_pandas().itertuples() if r.exact_match)
        normalized_matches = sum(1 for r in results.to_pandas().itertuples() if r.normalized_match)
        total_cer = sum(r.character_error_rate for r in results.to_pandas().itertuples())

        overall_exact_rate = exact_matches / total_fields if total_fields > 0 else 0
        overall_normalized_rate = normalized_matches / total_fields if total_fields > 0 else 0
        overall_cer = total_cer / total_fields if total_fields > 0 else 0

        # Calculate per-field statistics
        df = results.to_pandas()
        per_field_stats = {}

        for field_name in df["field_name"].unique():
            field_df = df[df["field_name"] == field_name]
            per_field_stats[field_name] = {
                "exact_match_rate": field_df["exact_match"].mean(),
                "normalized_match_rate": field_df["normalized_match"].mean(),
                "average_cer": field_df["character_error_rate"].mean(),
                "sample_count": len(field_df),
            }

        # Get unique image count
        total_images = df["image_filename"].nunique()

        # Store summary with retry
        table_insert(summary_table, [{
            "summary_id": str(uuid.uuid4()),
            "job_id": job_id,
            "engine": engine,
            "dataset_version": dataset_version,
            "dataset_name": dataset_name,
            "total_images": total_images,
            "overall_exact_match_rate": overall_exact_rate,
            "overall_normalized_match_rate": overall_normalized_rate,
            "overall_cer": overall_cer,
            "per_field_stats_json": json.dumps(per_field_stats),
            "created_at": datetime.now(),
        }])

    def run_inference(
        self,
        engine: str,
        images_dir: Path,
        ground_truth_csv: Optional[Path] = None,
        progress_callback=None,
        job_id: Optional[str] = None,
        preprocessing: str = "none",
        use_gpu: Optional[bool] = None,
        detection_cache: Optional[Dict[str, List[Detection]]] = None,
    ) -> str:
        """
        Run full inference pipeline on a dataset.

        Args:
            engine: OCR engine to use ('easyocr' or 'paddleocr')
            images_dir: Directory containing images
            ground_truth_csv: Optional path to ground truth CSV
            progress_callback: Optional callback(job_id, processed, total, current_file)
            job_id: Optional existing job ID (if not provided, creates new job)
            preprocessing: Preprocessing type to apply to images before OCR

        Returns:
            job_id: The ID of the created/used job
        """
        if use_gpu is not None:
            self.set_use_gpu(bool(use_gpu))

        # Get list of images
        image_files = sorted(
            list(images_dir.glob("*.jpg")) +
            list(images_dir.glob("*.png")) +
            list(images_dir.glob("*.jpeg"))
        )

        if not image_files:
            raise ValueError(f"No images found in {images_dir}")

        # Parse dataset info from path
        # Expected: .../test_data_OCR/version-1/images/
        dataset_version = images_dir.parent.name
        dataset_name = "default"

        # Create job only if not provided
        if job_id is None:
            job_id = self.create_job(
                engine=engine,
                dataset_version=dataset_version,
                dataset_name=dataset_name,
                total_images=len(image_files),
                preprocessing=preprocessing
            )
            # Update status to running (only for newly created jobs)
            self.update_job_status(job_id, "running")

        # Load ground truth if provided
        ground_truth = None
        if ground_truth_csv and ground_truth_csv.exists():
            ground_truth = pd.read_csv(ground_truth_csv)
            ground_truth = ground_truth.set_index("Box Label")

        try:
            # Initialize detector inside try block to catch init errors
            detector = self._init_detector()
            rss_every = int(os.environ.get("LOG_RSS_EVERY_N_IMAGES", "1") or "1")
            if rss_every < 1:
                rss_every = 1
            start_rss = _get_rss_mb()
            if start_rss is not None:
                print(f"[MEM] rss_mb={start_rss:.1f} at job start")

            for idx, image_path in enumerate(image_files):
                start_time = time.time()
                image_filename = image_path.name
                image_timeout_s = float(os.environ.get("MAX_IMAGE_SECONDS", "120"))
                roboflow_timeout_s = float(os.environ.get("ROBOFLOW_TIMEOUT_SECONDS", "30"))

                # Per-image error handling - continue on failures instead of crashing
                try:
                    # Time-box the entire image pipeline so a single hang can't stall the whole job.
                    with _time_limit(image_timeout_s, f"timeout: image_pipeline {image_filename}"):
                        cache_key = str(image_path)
                        cached_detections = detection_cache.get(cache_key) if detection_cache is not None else None

                        if cached_detections is not None:
                            detections = cached_detections
                            # Crop locally using cached detections (avoids repeated Roboflow API calls)
                            image = cv2.imread(str(image_path))
                            if image is None:
                                raise ValueError(f"Could not load image: {image_path}")
                            crops = detector.crop_detections(image, detections, padding=5)
                        else:
                            # Run detection (also time-box Roboflow network call)
                            with _time_limit(roboflow_timeout_s, f"timeout: roboflow_detect {image_filename}"):
                                detections, crops = detector.detect_and_crop(
                                    str(image_path),
                                    confidence_threshold=DETECTION_CONFIDENCE_THRESHOLD
                                )
                            if detection_cache is not None:
                                detection_cache[cache_key] = detections

                        # Run OCR on each crop with preprocessing
                        ocr_results = {}
                        for class_name, crop_image in crops.items():
                            try:
                                text = self._run_ocr_on_crop(crop_image, engine, preprocessing)
                                ocr_results[class_name] = text
                            except Exception as ocr_err:
                                ocr_tb = traceback.format_exc()
                                print(f"[OCR ERROR] {class_name} in {image_filename}:\n{type(ocr_err).__name__}: {ocr_err}\n{ocr_tb}")
                                ocr_results[class_name] = ""

                except Exception as img_error:
                    # Log error with full traceback but continue processing other images
                    img_tb = traceback.format_exc()
                    print(f"[IMAGE ERROR] Error processing {image_filename}:\n{type(img_error).__name__}: {img_error}\n{img_tb}")
                    detections = []
                    ocr_results = {}

                processing_time = (time.time() - start_time) * 1000

                # Store image result (even if empty due to error)
                self.store_image_result(
                    job_id=job_id,
                    image_filename=image_filename,
                    image_path=str(image_path),
                    detections=detections,
                    ocr_results=ocr_results,
                    processing_time_ms=processing_time
                )

                # Store benchmark results if ground truth available
                if ground_truth is not None and image_filename in ground_truth.index:
                    gt_row = ground_truth.loc[image_filename]

                    for class_name in DETECTION_CLASSES:
                        csv_column = CLASS_TO_CSV_COLUMN.get(class_name, class_name)
                        gt_value = gt_row.get(csv_column, "")
                        pred_value = ocr_results.get(class_name, "")

                        self.store_benchmark_result(
                            job_id=job_id,
                            image_filename=image_filename,
                            field_name=class_name,
                            ground_truth=gt_value,
                            prediction=pred_value
                        )

                # Update progress
                self.update_job_status(job_id, "running", processed_images=idx + 1)

                if progress_callback:
                    progress_callback(job_id, idx + 1, len(image_files), image_filename)

                if ((idx + 1) % rss_every) == 0:
                    rss = _get_rss_mb()
                    if rss is not None:
                        print(f"[MEM] rss_mb={rss:.1f} after {idx + 1}/{len(image_files)} ({image_filename})")

            # Calculate and store summary
            self.calculate_and_store_summary(job_id, engine, dataset_version, dataset_name)

            # Mark as completed
            self.update_job_status(job_id, "completed", processed_images=len(image_files))

        except Exception as e:
            # Capture full traceback for debugging
            tb = traceback.format_exc()
            error_msg = f"{type(e).__name__}: {str(e)}\n\nTraceback:\n{tb}"
            print(f"[INFERENCE ERROR] Job {job_id} failed:\n{error_msg}")

            # Store truncated version in DB (limit to 2000 chars for DB field)
            self.update_job_status(job_id, "failed", error_message=error_msg[:2000])
            raise

        return job_id

    @retry_on_db_error(max_retries=3, delay=0.5)
    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get current status of a job."""
        jobs_table = get_inference_jobs_table()
        results = table_query(jobs_table, jobs_table.job_id == job_id)

        if not results or len(results) == 0:
            return None

        row = results.to_pandas().iloc[0]
        return {
            "job_id": row["job_id"],
            "engine": row["engine"],
            "preprocessing": row.get("preprocessing", "none"),
            "dataset_version": row["dataset_version"],
            "dataset_name": row["dataset_name"],
            "status": row["status"],
            "total_images": row["total_images"],
            "processed_images": row["processed_images"],
            "progress": (row["processed_images"] / row["total_images"] * 100) if row["total_images"] > 0 else 0,
            "created_at": str(row["created_at"]) if row["created_at"] else None,
            "started_at": str(row["started_at"]) if row["started_at"] else None,
            "completed_at": str(row["completed_at"]) if row["completed_at"] else None,
            "error_message": row["error_message"],
        }

    def _convert_numpy_types(self, obj):
        """Convert numpy types to native Python types for JSON serialization."""
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, dict):
            return {k: self._convert_numpy_types(v) for k, v in obj.items()}
        elif isinstance(obj, list):
            return [self._convert_numpy_types(item) for item in obj]
        return obj

    @retry_on_db_error(max_retries=3, delay=0.5)
    def get_job_results(self, job_id: str) -> Dict[str, Any]:
        """Get full results for a completed job."""
        # Get job info
        job = self.get_job_status(job_id)
        if not job:
            return {"error": "Job not found"}

        # Get summary with retry
        summary_table = get_job_summaries_table()
        summary_results = table_query(summary_table, summary_table.job_id == job_id)

        summary = None
        if summary_results and len(summary_results) > 0:
            summary_row = summary_results.to_pandas().iloc[0]
            summary = {
                "total_images": int(summary_row["total_images"]),
                "overall_exact_match_rate": float(summary_row["overall_exact_match_rate"]),
                "overall_normalized_match_rate": float(summary_row["overall_normalized_match_rate"]),
                "overall_cer": float(summary_row["overall_cer"]),
                "per_field_stats": json.loads(summary_row["per_field_stats_json"]) if summary_row["per_field_stats_json"] else {},
            }

        # Get image results with retry
        results_table = get_image_results_table()
        image_results = table_query(results_table, results_table.job_id == job_id)

        images = []
        if image_results and len(image_results) > 0:
            for row in image_results.to_pandas().itertuples():
                images.append({
                    "image_filename": str(row.image_filename),
                    "image_path": str(row.image_path) if hasattr(row, 'image_path') and row.image_path else None,
                    "detections": json.loads(row.detections_json) if row.detections_json else [],
                    "ocr_results": json.loads(row.ocr_results_json) if row.ocr_results_json else {},
                    "processing_time_ms": float(row.processing_time_ms),
                })

        return self._convert_numpy_types({
            "job": job,
            "summary": summary,
            "images": images,
        })

    @retry_on_db_error(max_retries=3, delay=0.5)
    def list_jobs(self, limit: int = 50) -> List[Dict[str, Any]]:
        """List recent inference jobs."""
        jobs_table = get_inference_jobs_table()
        # Use direct table query - order_by and limit don't work with our wrapper
        results = jobs_table.order_by(jobs_table.created_at, asc=False).limit(limit).collect()

        jobs = []
        if results and len(results) > 0:
            for row in results.to_pandas().itertuples():
                jobs.append({
                    "job_id": row.job_id,
                    "engine": row.engine,
                    "preprocessing": getattr(row, "preprocessing", "none"),
                    "dataset_version": row.dataset_version,
                    "dataset_name": row.dataset_name,
                    "status": row.status,
                    "total_images": row.total_images,
                    "processed_images": row.processed_images,
                    "progress": (row.processed_images / row.total_images * 100) if row.total_images > 0 else 0,
                    "created_at": str(row.created_at) if row.created_at else None,
                })

        return jobs

    @retry_on_db_error(max_retries=3, delay=0.5)
    def delete_job(self, job_id: str) -> bool:
        """
        Delete a job and all its related data from Pixeltable.

        Removes records from:
        - inference_jobs
        - image_results
        - benchmark_results
        - job_summaries
        """
        try:
            # Delete from all related tables
            jobs_table = get_inference_jobs_table()
            results_table = get_image_results_table()
            benchmark_table = get_benchmark_results_table()
            summary_table = get_job_summaries_table()

            # Delete related records first (foreign key style) with retry
            table_delete(results_table, (results_table.job_id == job_id))
            table_delete(benchmark_table, (benchmark_table.job_id == job_id))
            table_delete(summary_table, (summary_table.job_id == job_id))

            # Delete the job itself
            table_delete(jobs_table, (jobs_table.job_id == job_id))

            print(f"Deleted job {job_id} and all related data")
            return True

        except Exception as e:
            print(f"Failed to delete job {job_id}: {e}")
            return False


# Singleton instance
_service_instance: Optional[InferenceService] = None


def get_inference_service() -> InferenceService:
    """Get or create the inference service singleton."""
    global _service_instance
    if _service_instance is None:
        _service_instance = InferenceService()
    return _service_instance


if __name__ == "__main__":
    # Test the service
    service = get_inference_service()

    # Test creating a job
    print("Testing InferenceService...")
    print(f"Service initialized successfully")

    # List existing jobs
    jobs = service.list_jobs()
    print(f"Found {len(jobs)} existing jobs")
