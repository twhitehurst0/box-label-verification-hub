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

# Add OCR_scripts to path
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
)

from preprocessing import preprocess_image


class InferenceService:
    """Service for running OCR inference and storing results in Pixeltable."""

    def __init__(self):
        """Initialize the inference service."""
        self.detector: Optional[RoboflowDetector] = None
        self.easyocr_reader = None
        self.paddleocr_engine = None

        # Ensure tables exist
        try:
            setup_all_tables()
        except Exception as e:
            print(f"Tables may already exist: {e}")

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
            self.easyocr_reader = easyocr.Reader(languages, gpu=True)
        return self.easyocr_reader

    def _init_paddleocr(self, lang: str = "en"):
        """Lazy initialization of PaddleOCR (v3.x API)."""
        if self.paddleocr_engine is None:
            from paddleocr import PaddleOCR
            # PaddleOCR 3.x uses simplified API - removed deprecated params
            self.paddleocr_engine = PaddleOCR(lang=lang)
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
            results = ocr.predict(processed_crop)

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
        jobs_table.insert([{
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

        if status == "running":
            updates["started_at"] = datetime.now()
        elif status in ("completed", "failed"):
            updates["completed_at"] = datetime.now()

        if error_message:
            updates["error_message"] = error_message

        # Update using where clause
        jobs_table.update(updates, where=(jobs_table.job_id == job_id))

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

        results_table.insert([{
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

        benchmark_table.insert([{
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

    def calculate_and_store_summary(self, job_id: str, engine: str, dataset_version: str, dataset_name: str):
        """Calculate aggregate statistics and store job summary."""
        benchmark_table = get_benchmark_results_table()
        summary_table = get_job_summaries_table()

        # Query all benchmark results for this job
        results = benchmark_table.where(benchmark_table.job_id == job_id).collect()

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

        # Store summary
        summary_table.insert([{
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
        preprocessing: str = "none"
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

        # Initialize detector
        detector = self._init_detector()

        try:
            for idx, image_path in enumerate(image_files):
                start_time = time.time()
                image_filename = image_path.name

                # Run detection
                detections, crops = detector.detect_and_crop(
                    str(image_path),
                    confidence_threshold=DETECTION_CONFIDENCE_THRESHOLD
                )

                # Run OCR on each crop with preprocessing
                ocr_results = {}
                for class_name, crop_image in crops.items():
                    text = self._run_ocr_on_crop(crop_image, engine, preprocessing)
                    ocr_results[class_name] = text

                processing_time = (time.time() - start_time) * 1000

                # Store image result
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

            # Calculate and store summary
            self.calculate_and_store_summary(job_id, engine, dataset_version, dataset_name)

            # Mark as completed
            self.update_job_status(job_id, "completed", processed_images=len(image_files))

        except Exception as e:
            self.update_job_status(job_id, "failed", error_message=str(e))
            raise

        return job_id

    def get_job_status(self, job_id: str) -> Optional[Dict[str, Any]]:
        """Get current status of a job."""
        jobs_table = get_inference_jobs_table()
        results = jobs_table.where(jobs_table.job_id == job_id).collect()

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

    def get_job_results(self, job_id: str) -> Dict[str, Any]:
        """Get full results for a completed job."""
        # Get job info
        job = self.get_job_status(job_id)
        if not job:
            return {"error": "Job not found"}

        # Get summary
        summary_table = get_job_summaries_table()
        summary_results = summary_table.where(summary_table.job_id == job_id).collect()

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

        # Get image results
        results_table = get_image_results_table()
        image_results = results_table.where(results_table.job_id == job_id).collect()

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

    def list_jobs(self, limit: int = 50) -> List[Dict[str, Any]]:
        """List recent inference jobs."""
        jobs_table = get_inference_jobs_table()
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

            # Delete related records first (foreign key style)
            results_table.delete(where=(results_table.job_id == job_id))
            benchmark_table.delete(where=(benchmark_table.job_id == job_id))
            summary_table.delete(where=(summary_table.job_id == job_id))

            # Delete the job itself
            jobs_table.delete(where=(jobs_table.job_id == job_id))

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
