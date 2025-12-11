# CLAUDE.md - Backend (Pixeltable + FastAPI)

This directory contains the Python backend for the Model Testing page, using Pixeltable for data storage and FastAPI for the HTTP API.

## Quick Start

```bash
# 1. Install dependencies
cd backend
pip install -r requirements.txt

# 2. Set up Pixeltable tables
python pixeltable_schema.py

# 3. Test Pixeltable connection
python test_pixeltable.py

# 4. Start the FastAPI server
python main.py
# API runs at http://localhost:8000
# Docs at http://localhost:8000/docs

# 5. Test API endpoints
python test_api.py
```

## Architecture

```
Next.js Frontend (port 3000)
       ↓ HTTP
FastAPI Server (port 8000)
       ↓
Pixeltable (data storage)
       ↓
OCR_scripts (EasyOCR / PaddleOCR)
       ↓
Roboflow (object detection)
```

## File Structure

| File | Purpose |
|------|---------|
| `main.py` | FastAPI server with HTTP endpoints |
| `pixeltable_schema.py` | Pixeltable table definitions and UDFs |
| `inference_service.py` | OCR inference pipeline orchestration |
| `requirements.txt` | Python dependencies |
| `test_pixeltable.py` | Tests for Pixeltable setup |
| `test_api.py` | Tests for API endpoints |

## Pixeltable Schema

### Tables

**`box_label_ocr.inference_jobs`**
- Tracks inference job metadata (status, progress, timestamps)
- Columns: job_id, engine, dataset_version, status, total_images, processed_images, etc.

**`box_label_ocr.image_results`**
- Stores per-image inference results
- Columns: result_id, job_id, image_filename, detections_json, ocr_results_json, processing_time_ms

**`box_label_ocr.benchmark_results`**
- Stores field-level accuracy comparisons
- Columns: benchmark_id, job_id, image_filename, field_name, ground_truth, prediction, exact_match, normalized_match, character_error_rate, word_accuracy

**`box_label_ocr.job_summaries`**
- Stores aggregated job statistics
- Columns: summary_id, job_id, overall_exact_match_rate, overall_normalized_match_rate, overall_cer, per_field_stats_json

### User-Defined Functions (UDFs)

```python
@pxt.udf
def run_easyocr(image_crop: pxt.Image, languages: str = "en") -> str:
    """Run EasyOCR on a cropped image region."""

@pxt.udf
def run_paddleocr(image_crop: pxt.Image, lang: str = "en") -> str:
    """Run PaddleOCR on a cropped image region."""

@pxt.udf
def calculate_cer(prediction: str, ground_truth: str) -> float:
    """Calculate Character Error Rate."""

@pxt.udf
def normalize_text(text: str) -> str:
    """Normalize text for comparison."""
```

## API Endpoints

### Health & Status

```
GET /health
  → { status, timestamp, pixeltable_status }

GET /datasets
  → [{ version, name, images_dir, image_count, has_ground_truth }]

GET /ocr-engines
  → [{ id, name, description, supports_gpu, languages }]
```

### Inference Jobs

```
POST /inference/start
  Body: { engine, dataset_version, dataset_name, use_gpu }
  → { success, job_id, message, total_images }

GET /inference/jobs
  → [{ job_id, engine, dataset_version, status, progress, ... }]

GET /inference/jobs/{job_id}/status
  → { job_id, status, progress, processed_images, total_images, ... }

GET /inference/jobs/{job_id}/results
  → { job, summary, images }

DELETE /inference/jobs/{job_id}
  → { success, message }
```

## InferenceService Methods

```python
service = get_inference_service()

# Create a new job
job_id = service.create_job(engine, dataset_version, dataset_name, total_images)

# Run full inference pipeline
job_id = service.run_inference(
    engine="easyocr",
    images_dir=Path("..."),
    ground_truth_csv=Path("..."),  # Optional
    progress_callback=lambda job_id, processed, total, current: ...
)

# Get job status
status = service.get_job_status(job_id)
# → { job_id, engine, status, progress, processed_images, total_images, ... }

# Get full results
results = service.get_job_results(job_id)
# → { job, summary, images }

# List recent jobs
jobs = service.list_jobs(limit=50)
```

## Configuration

### Environment Variables

The backend uses the same `.env` file as OCR_scripts:

```bash
ROBOFLOW_API_KEY=your_api_key
ROBOFLOW_WORKSPACE=your_workspace
ROBOFLOW_PROJECT=your_project
ROBOFLOW_MODEL_VERSION=1
```

### Pixeltable Storage

Data is stored in `~/.pixeltable/` by default:
- Structured data: PostgreSQL database
- Media files: `~/.pixeltable/media/`

## Testing

### Test Pixeltable Setup

```bash
python test_pixeltable.py
```

Tests:
1. Import Pixeltable
2. Create directory
3. Create table
4. Insert/query data
5. Update data
6. Cleanup
7. Schema setup

### Test API Endpoints

```bash
# Start server first
python main.py &

# Run tests
python test_api.py

# Skip waiting for job completion
SKIP_WAIT=1 python test_api.py
```

Tests:
1. Health check
2. List datasets
3. List OCR engines
4. List jobs
5. Start inference
6. Job status
7. Wait for completion
8. Job results

## Frontend Integration

The Next.js frontend calls these endpoints:

```typescript
const API_BASE = "http://localhost:8000"

// Check API health
fetch(`${API_BASE}/health`)

// Get datasets
fetch(`${API_BASE}/datasets`)

// Start inference
fetch(`${API_BASE}/inference/start`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    engine: "easyocr",
    dataset_version: "version-1",
    dataset_name: "default",
  }),
})

// Poll status
fetch(`${API_BASE}/inference/jobs/${jobId}/status`)

// Get results
fetch(`${API_BASE}/inference/jobs/${jobId}/results`)
```

## Dependencies

Key dependencies:
- `pixeltable>=0.5.0` - Multimodal AI data infrastructure
- `fastapi>=0.109.0` - HTTP API framework
- `uvicorn` - ASGI server
- `easyocr>=1.7.0` - OCR engine
- `paddleocr>=2.7.0` - OCR engine
- `roboflow>=1.1.0` - Object detection

## Troubleshooting

### "Cannot connect to API"
```bash
# Make sure server is running
python main.py
```

### "No datasets found"
```bash
# Add images to test_data_OCR directory
mkdir -p ../test_data_OCR/version-1/images
# Copy images there
```

### "Pixeltable not found"
```bash
pip install pixeltable
```

### "Roboflow API error"
```bash
# Check .env file has valid credentials
cat ../.env
```
