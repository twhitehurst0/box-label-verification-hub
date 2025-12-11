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
from pathlib import Path
from typing import Optional, List
from datetime import datetime
import asyncio
import multiprocessing

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
import uvicorn

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from inference_service import get_inference_service, InferenceService

# ============================================================================
# Pydantic Models
# ============================================================================

class StartInferenceRequest(BaseModel):
    """Request body for starting an inference job."""
    engine: str = Field(..., description="OCR engine: 'easyocr' or 'paddleocr'")
    dataset_version: str = Field(..., description="Dataset version (e.g., 'version-1')")
    dataset_name: str = Field(default="default", description="Dataset name")
    use_gpu: bool = Field(default=True, description="Whether to use GPU acceleration")


class StartInferenceResponse(BaseModel):
    """Response from starting an inference job."""
    success: bool
    job_id: Optional[str] = None
    message: str
    total_images: Optional[int] = None


class JobStatusResponse(BaseModel):
    """Response with job status information."""
    job_id: str
    engine: str
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

app = FastAPI(
    title="Box Label OCR Model Testing API",
    description="API for running OCR inference on box label images using Pixeltable",
    version="1.0.0",
)

# CORS middleware for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3007",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3007",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Note: Using multiprocessing.Process for inference jobs instead of ThreadPoolExecutor
# This ensures each process gets its own Pixeltable connection


# ============================================================================
# Helper Functions
# ============================================================================

def get_test_data_dir() -> Path:
    """Get the test_data_OCR directory path."""
    return Path(__file__).parent.parent / "test_data_OCR"


def list_available_datasets() -> List[DatasetInfo]:
    """List all available datasets in test_data_OCR."""
    test_data_dir = get_test_data_dir()
    datasets = []

    if not test_data_dir.exists():
        return datasets

    # Look for version directories
    for version_dir in sorted(test_data_dir.iterdir()):
        if not version_dir.is_dir() or version_dir.name.startswith("."):
            continue

        images_dir = version_dir / "images"
        ground_truth_csv = version_dir / "ground_truth.csv"

        if images_dir.exists():
            image_files = list(images_dir.glob("*.jpg")) + list(images_dir.glob("*.png"))

            datasets.append(DatasetInfo(
                version=version_dir.name,
                name="default",
                images_dir=str(images_dir),
                image_count=len(image_files),
                has_ground_truth=ground_truth_csv.exists(),
            ))

    return datasets


def run_inference_process(
    job_id: str,
    engine: str,
    images_dir_str: str,
    ground_truth_csv_str: Optional[str],
    dataset_version: str,
    total_images: int
):
    """
    Run inference in a separate process.

    This function runs in its own process with fresh Pixeltable connections,
    avoiding SQLAlchemy thread-local connection issues.
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

    images_dir = Path(images_dir_str)
    ground_truth_csv = Path(ground_truth_csv_str) if ground_truth_csv_str else None

    try:
        # Create fresh service instance in this process
        service = InferenceService()

        # Update job to running
        service.update_job_status(job_id, "running")

        # Run the actual inference
        service.run_inference(
            job_id=job_id,
            engine=engine,
            images_dir=images_dir,
            ground_truth_csv=ground_truth_csv,
        )

        print(f"Inference job {job_id} completed successfully")

    except Exception as e:
        import traceback
        traceback.print_exc()
        print(f"Background inference failed: {e}")

        # Try to update status to failed
        try:
            service = InferenceService()
            service.update_job_status(job_id, "failed", error_message=str(e))
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

    images_dir = Path(dataset.images_dir)
    ground_truth_csv = images_dir.parent / "ground_truth.csv"

    ground_truth_csv_str = str(ground_truth_csv) if ground_truth_csv.exists() else None

    # Get service and create job in main process
    service = get_inference_service()

    job_id = service.create_job(
        engine=request.engine,
        dataset_version=request.dataset_version,
        dataset_name=request.dataset_name,
        total_images=dataset.image_count,
    )

    # Start inference in a separate PROCESS (not thread)
    # This gives the subprocess its own Pixeltable connection
    process = multiprocessing.Process(
        target=run_inference_process,
        args=(
            job_id,
            request.engine,
            str(images_dir),
            ground_truth_csv_str,
            request.dataset_version,
            dataset.image_count,
        ),
        daemon=True,  # Process will terminate when main process exits
    )
    process.start()

    print(f"Started inference process (PID: {process.pid}) for job {job_id}")

    return StartInferenceResponse(
        success=True,
        job_id=job_id,
        message=f"Inference job started with {request.engine}",
        total_images=dataset.image_count,
    )


@app.get("/inference/jobs", response_model=List[dict])
async def list_jobs(limit: int = 50):
    """List recent inference jobs."""
    service = get_inference_service()
    return service.list_jobs(limit=limit)


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

    # If running, mark as cancelled first
    if status["status"] == "running":
        service.update_job_status(job_id, "cancelled")

    # Delete all related data from Pixeltable
    success = service.delete_job(job_id)

    if success:
        return {"success": True, "message": "Job deleted from Pixeltable"}
    else:
        raise HTTPException(status_code=500, detail="Failed to delete job from database")


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
    # Set spawn method for macOS compatibility with multiprocessing
    # Must be done before any Process is created
    try:
        multiprocessing.set_start_method("spawn", force=True)
    except RuntimeError:
        pass  # Already set

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
