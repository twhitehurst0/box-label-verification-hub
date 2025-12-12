"""
FastAPI Server for Box Label OCR Model Testing

This server provides HTTP endpoints for:
- Running OCR inference jobs
- Querying job status and results
- Listing available datasets

Runs on port 8000 by default.
"""
import os
import sys
import signal
from pathlib import Path
from typing import Optional, List, Dict
from datetime import datetime
import asyncio
import multiprocessing
import tempfile

# CRITICAL: Set multiprocessing spawn method at module level
# This MUST be done before any Process is created
# Without this, 'fork' is used on Linux which causes inherited connection issues
try:
    multiprocessing.set_start_method("spawn", force=True)
except RuntimeError:
    pass  # Already set
import shutil

import boto3
from botocore.exceptions import ClientError
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
import uvicorn

# S3 Configuration for test datasets
S3_BUCKET = "marina-nano-bucket"
S3_PREFIX = "prod-boxlabel/box-label-OCR-test-data/"

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from inference_service import get_inference_service, InferenceService
from pixeltable_schema import setup_all_tables, get_job_summaries_table
from contextlib import asynccontextmanager

# ============================================================================
# Background process supervision (best-effort, per-instance)
# ============================================================================

_JOB_PROCESSES: Dict[str, multiprocessing.Process] = {}
_JOB_WATCH_TASKS: Dict[str, "asyncio.Task[None]"] = {}
_WATCHER_DB_LOCK = asyncio.Lock()
_START_LOCK = asyncio.Lock()
_JOB_QUEUE: "asyncio.Queue[dict]" = asyncio.Queue()
_DISPATCHER_TASK: Optional["asyncio.Task[None]"] = None


async def _prepare_local_dataset(version: str):
    """Download dataset to local cache and return (images_dir, ground_truth_csv_str, local_image_count)."""
    from pathlib import Path as _Path

    local_dataset_dir = await asyncio.to_thread(download_dataset_from_s3, version)
    images_dir = _Path(local_dataset_dir) / "images"
    ground_truth_csv = _Path(local_dataset_dir) / "ground_truth.csv"
    ground_truth_csv_str = str(ground_truth_csv) if ground_truth_csv.exists() else None

    local_image_count = len(
        list(images_dir.glob("*.jpg")) + list(images_dir.glob("*.jpeg")) + list(images_dir.glob("*.png"))
    )
    return images_dir, ground_truth_csv_str, local_image_count


async def _start_single_job(job_id: str, engine: str, dataset_version: str, preprocessing: str, use_gpu: bool):
    """Start a single inference worker process for one job id."""
    images_dir, ground_truth_csv_str, local_image_count = await _prepare_local_dataset(dataset_version)
    ctx = multiprocessing.get_context("spawn")
    process = ctx.Process(
        target=run_inference_process,
        args=(
            job_id,
            engine,
            str(images_dir),
            ground_truth_csv_str,
            dataset_version,
            local_image_count,
            preprocessing,
            use_gpu,
        ),
        daemon=True,
    )
    process.start()
    _register_and_watch_job(job_id, process)
    print(f"[DISPATCHER] Started worker pid={process.pid} for job {job_id} engine={engine} preprocessing={preprocessing}")


async def _start_batch_jobs(
    job_ids: List[str],
    engine: str,
    dataset_version: str,
    preprocessing_options: List[str],
    use_gpu: bool,
):
    """Start a sequential batch worker that runs the provided preprocessing options in order."""
    images_dir, ground_truth_csv_str, local_image_count = await _prepare_local_dataset(dataset_version)

    job_configs = []
    for job_id, preprocessing in zip(job_ids, preprocessing_options):
        job_configs.append(
            {
                "job_id": job_id,
                "engine": engine,
                "images_dir": str(images_dir),
                "ground_truth_csv": ground_truth_csv_str,
                "dataset_version": dataset_version,
                "total_images": local_image_count,
                "preprocessing": preprocessing,
                "use_gpu": use_gpu,
            }
        )

    ctx = multiprocessing.get_context("spawn")
    process = ctx.Process(
        target=run_sequential_batch_inference,
        args=(job_configs,),
        daemon=True,
    )
    process.start()
    for job_id in job_ids:
        _register_and_watch_job(job_id, process)
    print(f"[DISPATCHER] Started batch worker pid={process.pid} for {len(job_ids)} jobs engine={engine}")


async def _get_oldest_pending_job_from_db() -> Optional[dict]:
    """Best-effort recovery: start oldest pending job even if queue state is lost."""
    try:
        async with _WATCHER_DB_LOCK:
            service = get_inference_service()
            jobs = service.list_jobs(limit=200)
    except Exception:
        return None

    pending = [j for j in (jobs or []) if j.get("status") == "pending"]
    if not pending:
        return None

    # created_at is serialized as string; ISO-like ordering works, but parse defensively.
    def _key(j: dict):
        s = j.get("created_at") or ""
        return s

    pending.sort(key=_key)
    j = pending[0]
    return {
        "type": "single",
        "job_id": j["job_id"],
        "engine": j.get("engine", "easyocr"),
        "dataset_version": j.get("dataset_version", "version-1"),
        "preprocessing": j.get("preprocessing", "none") or "none",
        "use_gpu": True,
    }


async def _start_queue_item(item: dict) -> None:
    """Start a queued item if it still exists and is pending."""
    job_id = item.get("job_id")
    if item.get("type") == "batch":
        job_ids: List[str] = item.get("job_ids", [])
        if not job_ids:
            return
        # If the batch was deleted/cancelled, skip.
        async with _WATCHER_DB_LOCK:
            service = get_inference_service()
            any_exists = any(service.get_job_status(jid) is not None for jid in job_ids[:3])
        if not any_exists:
            return

        await _start_batch_jobs(
            job_ids=job_ids,
            engine=item.get("engine", "easyocr"),
            dataset_version=item.get("dataset_version", "version-1"),
            preprocessing_options=item.get("preprocessing_options", []),
            use_gpu=bool(item.get("use_gpu", True)),
        )
        return

    if not job_id:
        return

    async with _WATCHER_DB_LOCK:
        service = get_inference_service()
        status = service.get_job_status(job_id)
    if not status or status.get("status") != "pending":
        return

    await _start_single_job(
        job_id=job_id,
        engine=item.get("engine", status.get("engine", "easyocr")),
        dataset_version=item.get("dataset_version", status.get("dataset_version", "version-1")),
        preprocessing=item.get("preprocessing", status.get("preprocessing", "none") or "none"),
        use_gpu=bool(item.get("use_gpu", True)),
    )


async def _dispatcher_loop() -> None:
    """Background dispatcher: runs queued jobs sequentially (1 worker at a time)."""
    print("[DISPATCHER] started")
    while True:
        try:
            if _get_active_worker_pids():
                await asyncio.sleep(1)
                continue

            item: Optional[dict] = None
            try:
                item = _JOB_QUEUE.get_nowait()
            except asyncio.QueueEmpty:
                item = None

            if item is None:
                item = await _get_oldest_pending_job_from_db()

            if item is None:
                await asyncio.sleep(1)
                continue

            async with _START_LOCK:
                # Re-check within lock
                if _get_active_worker_pids():
                    # Put it back and try later
                    await _JOB_QUEUE.put(item)
                    await asyncio.sleep(1)
                    continue
                await _start_queue_item(item)
        except asyncio.CancelledError:
            print("[DISPATCHER] cancelled")
            return
        except Exception as e:
            import traceback as _tb
            print(f"[DISPATCHER ERROR] {type(e).__name__}: {e}\n{_tb.format_exc()}")
            await asyncio.sleep(2)

async def _terminate_process(process: multiprocessing.Process, reason: str, timeout_s: float = 5.0) -> bool:
    """Best-effort terminate a worker process so new jobs can start."""
    try:
        if process is None or process.pid is None:
            return True
        if not process.is_alive():
            return True

        print(f"[CANCEL] Terminating worker pid={process.pid} reason={reason}")
        try:
            process.terminate()
        except Exception as e:
            print(f"[CANCEL] Failed to terminate pid={process.pid}: {type(e).__name__}: {e}")

        await asyncio.to_thread(process.join, timeout_s)
        if process.is_alive():
            print(f"[CANCEL] Worker still alive after SIGTERM pid={process.pid}; sending SIGKILL")
            try:
                # Python 3.10+: Process.kill() exists
                process.kill()
            except Exception as e:
                print(f"[CANCEL] Failed to kill pid={process.pid}: {type(e).__name__}: {e}")
            await asyncio.to_thread(process.join, timeout_s)

        return not process.is_alive()
    except Exception as e:
        print(f"[CANCEL] Unexpected error terminating worker: {type(e).__name__}: {e}")
        return False


async def _terminate_workers_for_job_ids(job_ids: List[str], reason: str) -> None:
    """Terminate any active worker processes associated with the provided job IDs."""
    procs_by_pid: Dict[int, multiprocessing.Process] = {}
    for jid in job_ids:
        try:
            proc = _JOB_PROCESSES.get(jid)
            if proc is None or proc.pid is None:
                continue
            if proc.is_alive():
                procs_by_pid[int(proc.pid)] = proc
        except Exception:
            continue

    for pid, proc in procs_by_pid.items():
        await _terminate_process(proc, reason=f"{reason} pid={pid}")

def _get_active_worker_pids() -> Dict[int, multiprocessing.Process]:
    """Return unique alive worker processes keyed by PID (dedupes batch jobs)."""
    active: Dict[int, multiprocessing.Process] = {}
    for proc in _JOB_PROCESSES.values():
        try:
            if proc is None or proc.pid is None:
                continue
            if proc.is_alive():
                active[int(proc.pid)] = proc
        except Exception:
            # If the process handle is in a bad state, ignore it for concurrency accounting.
            continue
    return active


def _format_exitcode(exitcode: Optional[int]) -> str:
    if exitcode is None:
        return "exitcode=None"
    if exitcode == 0:
        return "exitcode=0"
    if exitcode < 0:
        sig_num = -exitcode
        try:
            sig_name = signal.Signals(sig_num).name
        except Exception:
            sig_name = f"SIG{sig_num}"
        return f"exitcode={exitcode} ({sig_name})"
    return f"exitcode={exitcode}"


async def _watch_job_process(job_id: str, process: multiprocessing.Process, poll_seconds: float = 1.0) -> None:
    """
    Watch a background worker process and ensure the job isn't left 'running' forever.

    If the worker exits unexpectedly (including SIGKILL/OOM), mark the job as failed.
    Runs in the main event loop thread to avoid Pixeltable thread-local/session issues.
    """
    try:
        while process.is_alive():
            await asyncio.sleep(poll_seconds)

        exitcode = process.exitcode
        print(f"[WATCHER] Worker exited for job {job_id}: pid={process.pid} {_format_exitcode(exitcode)}")

        # Best-effort status correction: if the worker died without updating the DB,
        # ensure the job is not stuck in pending/running.
        try:
            # Pixeltable operations are not safe under high concurrency; serialize watcher DB work.
            async with _WATCHER_DB_LOCK:
                service = get_inference_service()
                status = service.get_job_status(job_id)
                if not status:
                    return

                current = status.get("status")
                if current in ("completed", "failed", "cancelled"):
                    return

                processed = int(status.get("processed_images", 0) or 0)
                total = int(status.get("total_images", 0) or 0)

                if exitcode == 0 and total > 0 and processed >= total:
                    service.update_job_status(job_id, "completed", processed_images=processed)
                    return

                msg = (
                    f"Worker process exited before job completed. "
                    f"pid={process.pid} {_format_exitcode(exitcode)} "
                    f"status={current} processed={processed}/{total}"
                )

                # Retry a few times on AssertionError which Pixeltable can raise under contention.
                for attempt in range(5):
                    try:
                        service.update_job_status(job_id, "failed", error_message=msg[:2000])
                        break
                    except AssertionError:
                        await asyncio.sleep(0.1 * (attempt + 1))
        except Exception as watcher_err:
            import traceback as _tb
            print(
                f"[WATCHER ERROR] Failed to reconcile job {job_id}: "
                f"{type(watcher_err).__name__}: {watcher_err}\n{_tb.format_exc()}"
            )
    finally:
        _JOB_PROCESSES.pop(job_id, None)
        task = _JOB_WATCH_TASKS.pop(job_id, None)
        if task is not None and not task.done():
            task.cancel()


def _register_and_watch_job(job_id: str, process: multiprocessing.Process) -> None:
    _JOB_PROCESSES[job_id] = process
    # Only start one watcher per job_id
    existing = _JOB_WATCH_TASKS.get(job_id)
    if existing is None or existing.done():
        _JOB_WATCH_TASKS[job_id] = asyncio.create_task(_watch_job_process(job_id, process))


# ============================================================================
# Pydantic Models
# ============================================================================

class StartInferenceRequest(BaseModel):
    """Request body for starting an inference job."""
    engine: str = Field(..., description="OCR engine: 'easyocr', 'paddleocr', or 'smolvlm2'")
    dataset_version: str = Field(..., description="Dataset version (e.g., 'version-1')")
    dataset_name: str = Field(default="default", description="Dataset name")
    preprocessing: str = Field(default="none", description="Preprocessing type to apply")
    use_gpu: bool = Field(default=True, description="Whether to use GPU acceleration")


class StartBatchInferenceRequest(BaseModel):
    """Request body for starting batch inference with multiple preprocessing options."""
    engine: str = Field(..., description="OCR engine: 'easyocr' or 'paddleocr' (batch preprocessing)")
    dataset_version: str = Field(..., description="Dataset version (e.g., 'version-1')")
    dataset_name: str = Field(default="default", description="Dataset name")
    preprocessing_options: List[str] = Field(default=["none"], description="List of preprocessing types to run")
    use_gpu: bool = Field(default=True, description="Whether to use GPU acceleration")


class StartBatchInferenceResponse(BaseModel):
    """Response from starting batch inference jobs."""
    success: bool
    job_ids: List[str]
    message: str
    total_jobs: int
    queued: bool = False
    queue_position: Optional[int] = None


class StartInferenceResponse(BaseModel):
    """Response from starting an inference job."""
    success: bool
    job_id: Optional[str] = None
    message: str
    total_images: Optional[int] = None
    queued: bool = False
    queue_position: Optional[int] = None


class JobStatusResponse(BaseModel):
    """Response with job status information."""
    job_id: str
    engine: str
    preprocessing: str = "none"
    dataset_version: str
    dataset_name: str
    status: str
    total_images: int
    processed_images: int
    progress: float
    created_at: Optional[str] = None
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    error_message: Optional[str] = None


class JobSummary(BaseModel):
    """Summary statistics for a completed job."""
    total_images: int
    overall_exact_match_rate: float
    overall_normalized_match_rate: float
    overall_cer: float
    per_field_stats: dict


class ImageResult(BaseModel):
    """Result for a single image."""
    image_filename: str
    image_path: Optional[str] = None
    detections: List[dict]
    ocr_results: dict
    processing_time_ms: float


class JobResultsResponse(BaseModel):
    """Full results for a completed job."""
    job: JobStatusResponse
    summary: Optional[JobSummary] = None
    images: List[ImageResult] = []


class DatasetInfo(BaseModel):
    """Information about an available dataset."""
    version: str
    name: str
    images_dir: str
    image_count: int
    has_ground_truth: bool


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    timestamp: str
    pixeltable_status: str


# ============================================================================
# FastAPI App
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for FastAPI app startup/shutdown."""
    # Startup: Initialize Pixeltable tables
    try:
        current_method = multiprocessing.get_start_method(allow_none=True)
    except TypeError:
        # Python <3.8 compatibility (not expected here, but keep safe)
        current_method = multiprocessing.get_start_method()
    print(f"[BOOT] multiprocessing start method: {current_method}")

    print("Starting up: Initializing Pixeltable tables...")
    try:
        setup_all_tables()
        print("Pixeltable tables initialized successfully!")
    except Exception as e:
        print(f"Warning: Failed to initialize Pixeltable tables: {e}")
        # Continue anyway - tables might already exist

    # Start background dispatcher (queues pending jobs and runs them one-at-a-time)
    global _DISPATCHER_TASK
    if _DISPATCHER_TASK is None or _DISPATCHER_TASK.done():
        _DISPATCHER_TASK = asyncio.create_task(_dispatcher_loop())
    yield
    # Shutdown: cleanup if needed
    print("Shutting down...")
    if _DISPATCHER_TASK is not None and not _DISPATCHER_TASK.done():
        _DISPATCHER_TASK.cancel()
        try:
            await _DISPATCHER_TASK
        except Exception:
            pass

app = FastAPI(
    title="Box Label OCR Model Testing API",
    description="API for running OCR inference on box label images using Pixeltable",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware for Next.js frontend
# Supports local development and Vercel production/preview deployments
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3007",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3007",
        os.environ.get("FRONTEND_URL", ""),  # Production Vercel URL
    ],
    allow_origin_regex=r"https://.*\.vercel\.app",  # All Vercel preview deployments
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Note: Using multiprocessing.Process for inference jobs instead of ThreadPoolExecutor
# This ensures each process gets its own Pixeltable connection


# ============================================================================
# Admin Endpoints
# ============================================================================

@app.post("/admin/init-tables")
async def init_tables():
    """Manually initialize Pixeltable tables. Call this if tables don't exist."""
    import traceback
    try:
        setup_all_tables()
        return {"success": True, "message": "Pixeltable tables initialized successfully"}
    except Exception as e:
        tb = traceback.format_exc()
        return {"success": False, "error": str(e), "traceback": tb}


# ============================================================================
# Helper Functions
# ============================================================================

def get_s3_client():
    """Get boto3 S3 client with credentials from environment."""
    return boto3.client(
        's3',
        aws_access_key_id=os.environ.get('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.environ.get('AWS_SECRET_ACCESS_KEY'),
        region_name=os.environ.get('AWS_REGION', 'us-east-1')
    )


def get_test_data_dir() -> Path:
    """Get the local test_data_OCR directory path (for caching S3 downloads)."""
    cache_dir = Path("/tmp/test_data_OCR")
    cache_dir.mkdir(parents=True, exist_ok=True)
    return cache_dir


def list_available_datasets() -> List[DatasetInfo]:
    """List all available datasets from S3 bucket."""
    datasets = []

    try:
        s3 = get_s3_client()

        # List "directories" (common prefixes) under the test data path
        # S3 structure: s3://marina-nano-bucket/prod-boxlabel/box-label-OCR-test-data/{version}/images/
        response = s3.list_objects_v2(
            Bucket=S3_BUCKET,
            Prefix=S3_PREFIX,
            Delimiter='/'
        )

        # Get version directories
        version_prefixes = response.get('CommonPrefixes', [])

        for prefix_info in version_prefixes:
            prefix = prefix_info['Prefix']
            # Extract version name (e.g., "version-1" from ".../version-1/")
            version = prefix.rstrip('/').split('/')[-1]

            if version.startswith('.'):
                continue

            # Count images in this version's images folder
            images_prefix = f"{prefix}images/"
            images_response = s3.list_objects_v2(
                Bucket=S3_BUCKET,
                Prefix=images_prefix,
            )

            image_count = 0
            if 'Contents' in images_response:
                image_count = len([
                    obj for obj in images_response['Contents']
                    if obj['Key'].lower().endswith(('.jpg', '.jpeg', '.png'))
                ])

            # Check if ground_truth.csv exists
            ground_truth_key = f"{prefix}ground_truth.csv"
            has_ground_truth = False
            try:
                s3.head_object(Bucket=S3_BUCKET, Key=ground_truth_key)
                has_ground_truth = True
            except ClientError:
                pass

            if image_count > 0:
                datasets.append(DatasetInfo(
                    version=version,
                    name="default",
                    images_dir=f"s3://{S3_BUCKET}/{images_prefix}",
                    image_count=image_count,
                    has_ground_truth=has_ground_truth,
                ))

    except ClientError as e:
        print(f"Error listing S3 datasets: {e}")
    except Exception as e:
        print(f"Unexpected error listing datasets: {e}")

    return datasets


def download_dataset_from_s3(version: str) -> Path:
    """Download a dataset version from S3 to local cache."""
    local_dir = get_test_data_dir() / version
    images_dir = local_dir / "images"

    # If already downloaded, return cached path
    if images_dir.exists() and any(images_dir.iterdir()):
        return local_dir

    # Create directories
    images_dir.mkdir(parents=True, exist_ok=True)

    s3 = get_s3_client()
    s3_prefix = f"{S3_PREFIX}{version}/"

    try:
        # Download images
        images_prefix = f"{s3_prefix}images/"
        response = s3.list_objects_v2(Bucket=S3_BUCKET, Prefix=images_prefix)

        if 'Contents' in response:
            for obj in response['Contents']:
                key = obj['Key']
                filename = key.split('/')[-1]
                if filename and filename.lower().endswith(('.jpg', '.jpeg', '.png')):
                    local_path = images_dir / filename
                    s3.download_file(S3_BUCKET, key, str(local_path))
                    print(f"Downloaded: {filename}")

        # Download ground_truth.csv if it exists
        gt_key = f"{s3_prefix}ground_truth.csv"
        try:
            s3.download_file(S3_BUCKET, gt_key, str(local_dir / "ground_truth.csv"))
            print("Downloaded: ground_truth.csv")
        except ClientError:
            print("No ground_truth.csv found")

    except Exception as e:
        print(f"Error downloading dataset: {e}")
        raise

    return local_dir


def run_inference_process(
    job_id: str,
    engine: str,
    images_dir_str: str,
    ground_truth_csv_str: Optional[str],
    dataset_version: str,
    total_images: int,
    preprocessing: str = "none",
    use_gpu: bool = True,
):
    """
    Run inference in a separate process.

    This function runs in its own process with fresh Pixeltable connections,
    avoiding SQLAlchemy thread-local connection issues.

    Args:
        job_id: Unique job identifier
        engine: OCR engine to use
        images_dir_str: Path to images directory
        ground_truth_csv_str: Path to ground truth CSV (optional)
        dataset_version: Version of the dataset
        total_images: Total number of images
        preprocessing: Preprocessing type to apply before OCR
    """
    # Import everything fresh in this process
    import sys
    import os
    from pathlib import Path

    # Add paths for imports
    backend_dir = Path(__file__).parent
    project_root = backend_dir.parent
    sys.path.insert(0, str(project_root))
    sys.path.insert(0, str(backend_dir))

    # Load environment variables BEFORE importing anything that uses config.py
    from dotenv import load_dotenv

    # Try .env.local first (Next.js convention)
    env_file = project_root / ".env.local"
    if env_file.exists():
        load_dotenv(env_file, override=True)
        print(f"Loaded environment from {env_file}")

    # Also try OCR_scripts/.env
    ocr_env = project_root / "OCR_scripts" / ".env"
    if ocr_env.exists():
        load_dotenv(ocr_env, override=True)
        print(f"Loaded environment from {ocr_env}")

    # Verify ROBOFLOW_API_KEY is now set
    roboflow_key = os.environ.get("ROBOFLOW_API_KEY", "")
    if roboflow_key:
        print(f"ROBOFLOW_API_KEY loaded: {roboflow_key[:8]}...")
    else:
        print("WARNING: ROBOFLOW_API_KEY not found in environment")

    # Force reload of config module to pick up the new env vars
    # This is necessary because config.py reads env vars at import time
    import importlib
    if 'config' in sys.modules:
        importlib.reload(sys.modules['config'])

    # Now import inference_service (which imports config)
    from inference_service import InferenceService
    from pixeltable_schema import setup_all_tables

    # Ensure Pixeltable tables are set up in this subprocess
    # (Each process needs its own Pixeltable connection/context)
    print("[SUBPROCESS] Initializing Pixeltable tables...")
    try:
        setup_all_tables()
        print("[SUBPROCESS] Pixeltable tables ready")
    except Exception as e:
        print(f"[SUBPROCESS] Warning during Pixeltable setup: {e}")
        # Continue anyway - tables might already exist

    images_dir = Path(images_dir_str)
    ground_truth_csv = Path(ground_truth_csv_str) if ground_truth_csv_str else None

    try:
        try:
            current_method = multiprocessing.get_start_method(allow_none=True)
        except TypeError:
            current_method = multiprocessing.get_start_method()
        print(f"[SUBPROCESS] multiprocessing start method: {current_method}")

        # Create fresh service instance in this process
        service = InferenceService(use_gpu=use_gpu)

        # Update job to running
        service.update_job_status(job_id, "running")

        # Run the actual inference
        service.run_inference(
            job_id=job_id,
            engine=engine,
            images_dir=images_dir,
            ground_truth_csv=ground_truth_csv,
            preprocessing=preprocessing,
            use_gpu=use_gpu,
        )

        print(f"Inference job {job_id} completed successfully")

    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        error_msg = f"{type(e).__name__}: {str(e)}\n\nTraceback:\n{tb}"
        print(f"[PROCESS ERROR] Background inference failed:\n{error_msg}")

        # Try to update status to failed with full traceback
        try:
            service = InferenceService()
            # Truncate to 2000 chars for DB field limit
            service.update_job_status(job_id, "failed", error_message=error_msg[:2000])
        except Exception as update_err:
            print(f"Failed to update job status: {update_err}")


# ============================================================================
# API Endpoints
# ============================================================================

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    pixeltable_status = "unknown"
    try:
        import pixeltable as pxt
        # Try to access pixeltable
        pixeltable_status = "connected"
    except Exception as e:
        pixeltable_status = f"error: {str(e)}"

    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        pixeltable_status=pixeltable_status,
    )


@app.get("/datasets", response_model=List[DatasetInfo])
async def get_datasets():
    """List available datasets for inference."""
    return list_available_datasets()


@app.post("/inference/start", response_model=StartInferenceResponse)
async def start_inference(request: StartInferenceRequest):
    """Start a new inference job."""
    # Validate engine
    if request.engine not in ("easyocr", "paddleocr", "smolvlm2"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid engine: {request.engine}. Must be 'easyocr', 'paddleocr', or 'smolvlm2'"
        )

    # Find dataset
    datasets = list_available_datasets()
    dataset = next(
        (d for d in datasets if d.version == request.dataset_version),
        None
    )

    if not dataset:
        raise HTTPException(
            status_code=404,
            detail=f"Dataset not found: {request.dataset_version}"
        )

    preprocessing = "none" if request.engine == "smolvlm2" else (request.preprocessing or "none")

    # Get service and create job in main process
    try:
        service = get_inference_service()
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get inference service: {type(e).__name__}: {str(e)}\n{tb[:1000]}"
        )

    try:
        job_id = service.create_job(
            engine=request.engine,
            dataset_version=request.dataset_version,
            dataset_name=request.dataset_name,
            total_images=dataset.image_count,
            preprocessing=preprocessing,
        )
    except Exception as e:
        import traceback
        tb = traceback.format_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create job: {type(e).__name__}: {str(e)}\n{tb[:1000]}"
        )

    # Enqueue the job; the dispatcher will run jobs sequentially as capacity is available.
    queue_position = _JOB_QUEUE.qsize() + 1
    await _JOB_QUEUE.put({
        "type": "single",
        "job_id": job_id,
        "engine": request.engine,
        "dataset_version": request.dataset_version,
        "preprocessing": preprocessing,
        "use_gpu": request.use_gpu,
    })
    print(f"[QUEUE] Enqueued job {job_id} engine={request.engine} preprocessing={preprocessing} pos={queue_position}")

    return StartInferenceResponse(
        success=True,
        job_id=job_id,
        message=f"Job queued for {request.engine}",
        total_images=dataset.image_count,
        queued=True,
        queue_position=queue_position,
    )


@app.get("/preprocessing-options")
async def get_preprocessing_options():
    """Get list of available preprocessing options."""
    from preprocessing import get_available_preprocessing_options
    return get_available_preprocessing_options()


def run_sequential_batch_inference(
    job_configs: List[dict],
):
    """
    Run multiple inference jobs sequentially in a single process.

    This avoids Pixeltable concurrency conflicts by running one job at a time.
    Each job_config contains: job_id, engine, images_dir, ground_truth_csv,
    dataset_version, total_images, preprocessing, use_gpu
    """
    import sys
    import os
    from pathlib import Path

    # Add paths for imports
    backend_dir = Path(__file__).parent
    project_root = backend_dir.parent
    sys.path.insert(0, str(project_root))
    sys.path.insert(0, str(backend_dir))

    # Load environment variables
    from dotenv import load_dotenv
    env_file = project_root / ".env.local"
    if env_file.exists():
        load_dotenv(env_file, override=True)
    ocr_env = project_root / "OCR_scripts" / ".env"
    if ocr_env.exists():
        load_dotenv(ocr_env, override=True)

    # Import inference service
    from inference_service import InferenceService

    if not job_configs:
        return

    # Reuse a single service + detector across all preprocessing runs to reduce overhead
    # and allow detection caching to avoid repeated Roboflow API calls.
    default_use_gpu = bool(job_configs[0].get("use_gpu", True))
    service = InferenceService(use_gpu=default_use_gpu)
    detection_cache: dict = {}

    for config in job_configs:
        job_id = config["job_id"]
        engine = config["engine"]
        images_dir = Path(config["images_dir"])
        ground_truth_csv = Path(config["ground_truth_csv"]) if config["ground_truth_csv"] else None
        preprocessing = config["preprocessing"]
        use_gpu = bool(config.get("use_gpu", True))

        try:
            service.set_use_gpu(use_gpu)

            # Update job to running
            service.update_job_status(job_id, "running")
            print(f"Starting sequential job {job_id} with preprocessing: {preprocessing}")

            # Run the actual inference (reuse detection cache across jobs)
            service.run_inference(
                job_id=job_id,
                engine=engine,
                images_dir=images_dir,
                ground_truth_csv=ground_truth_csv,
                preprocessing=preprocessing,
                use_gpu=use_gpu,
                detection_cache=detection_cache,
            )

            print(f"Completed job {job_id} with preprocessing: {preprocessing}")

        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Job {job_id} failed: {e}")

            try:
                service.update_job_status(job_id, "failed", error_message=str(e))
            except Exception as update_err:
                print(f"Failed to update job status: {update_err}")


@app.post("/inference/start-batch", response_model=StartBatchInferenceResponse)
async def start_batch_inference(request: StartBatchInferenceRequest):
    """Start multiple inference jobs with different preprocessing options.

    This endpoint creates one job per preprocessing option and runs them SEQUENTIALLY
    to avoid Pixeltable concurrency conflicts.
    """
    # Validate engine
    if request.engine == "smolvlm2":
        raise HTTPException(
            status_code=400,
            detail="SmolVLM2 is an end-to-end model and does not support preprocessing batch runs. Use /inference/start instead."
        )
    if request.engine not in ("easyocr", "paddleocr"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid engine: {request.engine}. Must be 'easyocr' or 'paddleocr'"
        )

    # Find dataset
    datasets = list_available_datasets()
    dataset = next(
        (d for d in datasets if d.version == request.dataset_version),
        None
    )

    if not dataset:
        raise HTTPException(
            status_code=404,
            detail=f"Dataset not found: {request.dataset_version}"
        )

    # Get service
    service = get_inference_service()
    job_ids = []

    # Create all jobs first (in pending state)
    for preprocessing in request.preprocessing_options:
        job_id = service.create_job(
            engine=request.engine,
            dataset_version=request.dataset_version,
            dataset_name=request.dataset_name,
            total_images=dataset.image_count,
            preprocessing=preprocessing,
        )
        job_ids.append(job_id)
        print(f"Created batch job {job_id} with preprocessing: {preprocessing}")

    # Enqueue a single batch item; the dispatcher will start the sequential batch worker when capacity is available.
    queue_position = _JOB_QUEUE.qsize() + 1
    await _JOB_QUEUE.put({
        "type": "batch",
        "job_ids": job_ids,
        "engine": request.engine,
        "dataset_version": request.dataset_version,
        "preprocessing_options": request.preprocessing_options,
        "use_gpu": request.use_gpu,
    })
    print(f"[QUEUE] Enqueued batch {len(job_ids)} jobs engine={request.engine} pos={queue_position}")

    return StartBatchInferenceResponse(
        success=True,
        job_ids=job_ids,
        message=f"Queued {len(job_ids)} inference jobs (will run sequentially)",
        total_jobs=len(job_ids),
        queued=True,
        queue_position=queue_position,
    )


@app.get("/inference/jobs", response_model=List[dict])
async def list_jobs(limit: int = 50):
    """List recent inference jobs."""
    service = get_inference_service()
    return service.list_jobs(limit=limit)


@app.get("/inference/job-summaries", response_model=List[dict])
async def list_job_summaries(limit: int = 50):
    """List recent job summaries (for Results dashboard)."""
    summary_table = get_job_summaries_table()
    results = summary_table.order_by(summary_table.created_at, asc=False).limit(limit).collect()

    summaries: List[dict] = []
    if results and len(results) > 0:
        import json as _json
        for row in results.to_pandas().itertuples():
            summaries.append({
                "summary_id": getattr(row, "summary_id", None),
                "job_id": row.job_id,
                "engine": row.engine,
                "dataset_version": row.dataset_version,
                "dataset_name": row.dataset_name,
                "total_images": int(row.total_images),
                "overall_exact_match_rate": float(row.overall_exact_match_rate),
                "overall_normalized_match_rate": float(row.overall_normalized_match_rate),
                "overall_cer": float(row.overall_cer),
                "per_field_stats": _json.loads(row.per_field_stats_json) if getattr(row, "per_field_stats_json", None) else {},
                "created_at": str(row.created_at) if getattr(row, "created_at", None) else None,
            })

    return summaries


@app.get("/inference/jobs/{job_id}/status", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    """Get status of a specific job."""
    service = get_inference_service()
    status = service.get_job_status(job_id)

    if not status:
        raise HTTPException(status_code=404, detail="Job not found")

    return JobStatusResponse(**status)


@app.get("/inference/jobs/{job_id}/results")
async def get_job_results(job_id: str):
    """Get full results for a completed job."""
    service = get_inference_service()
    results = service.get_job_results(job_id)

    if "error" in results:
        raise HTTPException(status_code=404, detail=results["error"])

    return results


@app.delete("/inference/jobs/{job_id}")
async def delete_job(job_id: str):
    """Delete a job and all its related data from Pixeltable."""
    service = get_inference_service()
    status = service.get_job_status(job_id)

    if not status:
        raise HTTPException(status_code=404, detail="Job not found")

    # If this job is associated with an active worker, terminate it first.
    # This prevents the per-instance concurrency guard from blocking new jobs after deletion.
    await _terminate_workers_for_job_ids([job_id], reason="delete_job")

    # If running, mark as cancelled first
    if status["status"] == "running":
        service.update_job_status(job_id, "cancelled")

    # Delete all related data from Pixeltable
    success = service.delete_job(job_id)

    if success:
        return {"success": True, "message": "Job deleted from Pixeltable"}
    else:
        raise HTTPException(status_code=500, detail="Failed to delete job from database")


class BatchDeleteRequest(BaseModel):
    """Request body for batch deletion of jobs."""
    job_ids: List[str] = Field(..., description="List of job IDs to delete")


class BatchDeleteResponse(BaseModel):
    """Response from batch deletion."""
    success: bool
    deleted_count: int
    failed_count: int
    failed_jobs: List[str] = []
    message: str


@app.post("/inference/jobs/batch-delete", response_model=BatchDeleteResponse)
async def batch_delete_jobs(request: BatchDeleteRequest):
    """Delete multiple jobs and all their related data from Pixeltable."""
    service = get_inference_service()

    deleted_count = 0
    failed_count = 0
    failed_jobs = []

    # Terminate any active workers for these jobs up-front (batch runs share one worker pid).
    await _terminate_workers_for_job_ids(request.job_ids, reason="batch_delete_jobs")

    for job_id in request.job_ids:
        try:
            status = service.get_job_status(job_id)

            if not status:
                failed_count += 1
                failed_jobs.append(job_id)
                continue

            # If running, mark as cancelled first
            if status["status"] == "running":
                service.update_job_status(job_id, "cancelled")

            # Delete all related data from Pixeltable
            success = service.delete_job(job_id)

            if success:
                deleted_count += 1
            else:
                failed_count += 1
                failed_jobs.append(job_id)
        except Exception as e:
            print(f"Failed to delete job {job_id}: {e}")
            failed_count += 1
            failed_jobs.append(job_id)

    return BatchDeleteResponse(
        success=failed_count == 0,
        deleted_count=deleted_count,
        failed_count=failed_count,
        failed_jobs=failed_jobs,
        message=f"Deleted {deleted_count} jobs" + (f", {failed_count} failed" if failed_count > 0 else ""),
    )


@app.get("/ocr-engines")
async def list_ocr_engines():
    """List available OCR engines."""
    return [
        {
            "id": "easyocr",
            "name": "EasyOCR",
            "description": "Lightweight OCR with good accuracy for printed text",
            "supports_gpu": True,
            "languages": ["en"],
        },
        {
            "id": "paddleocr",
            "name": "PaddleOCR",
            "description": "High-performance OCR with angle classification support",
            "supports_gpu": True,
            "languages": ["en"],
        },
        {
            "id": "smolvlm2",
            "name": "SmolVLM2 (VLM)",
            "description": "End-to-end VLM extraction (Roboflow Serverless) - no preprocessing needed",
            "supports_gpu": False,
            "languages": ["en"],
        },
    ]


@app.get("/images/{version}/{filename}")
async def serve_image(version: str, filename: str):
    """Serve an image from the test_data_OCR directory."""
    test_data_dir = get_test_data_dir()
    image_path = test_data_dir / version / "images" / filename

    if not image_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")

    # Security: ensure the path is within test_data_OCR
    try:
        image_path.resolve().relative_to(test_data_dir.resolve())
    except ValueError:
        raise HTTPException(status_code=403, detail="Access denied")

    # Determine media type
    suffix = image_path.suffix.lower()
    media_types = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".webp": "image/webp",
    }
    media_type = media_types.get(suffix, "application/octet-stream")

    return FileResponse(image_path, media_type=media_type)


# ============================================================================
# Main
# ============================================================================

if __name__ == "__main__":
    print("Starting Box Label OCR Model Testing API...")
    print("API docs available at: http://localhost:8000/docs")
    # Use loop="asyncio" to avoid uvloop conflict with Pixeltable's nest_asyncio
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        loop="asyncio",  # Fix for Pixeltable compatibility
    )
