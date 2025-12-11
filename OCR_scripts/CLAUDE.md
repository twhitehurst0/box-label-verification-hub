# CLAUDE.md - OCR Scripts

This directory contains Python scripts for Box Label OCR inference and benchmarking. These scripts are the backend engine for the Model Testing and Reporting pages.

## Commands

```bash
# Install dependencies (from OCR_scripts directory)
pip install -r requirements.txt

# Run EasyOCR inference (detection + EasyOCR)
python inference_easyocr.py --images-dir ../test_data_OCR/version-1/images --output-dir results

# Run PaddleOCR inference (detection + PaddleOCR)
python inference_paddleocr.py --images-dir ../test_data_OCR/version-1/images --output-dir results

# Run SmolVLM2 inference (end-to-end VLM, no object detection)
python inference_smolvlm2.py --images-dir ../test_data_OCR/version-1/images --output-dir results

# Test Roboflow detector
python roboflow_detector.py <image_path>

# Test benchmark loading
python benchmark.py
```

## Architecture

### Pipeline Overview

```
Image → Roboflow Detection → Crop Regions → OCR Engine → Compare to Ground Truth → Report
```

1. **Roboflow Detection**: Identifies label fields on box images (barcodes, SKU names, dates, etc.)
2. **Region Cropping**: Extracts each detected field as a separate image
3. **OCR Processing**: Runs text extraction on each cropped region
4. **Benchmarking**: Compares OCR output to ground truth CSV, calculates accuracy metrics

### File Structure

| File | Purpose |
|------|---------|
| `config.py` | Configuration, paths, class mappings, thresholds |
| `roboflow_detector.py` | Roboflow model wrapper, detection + cropping |
| `inference_easyocr.py` | Full pipeline using EasyOCR (detection → crop → OCR) |
| `inference_paddleocr.py` | Full pipeline using PaddleOCR (detection → crop → OCR) |
| `inference_smolvlm2.py` | End-to-end VLM inference (no detection needed) |
| `benchmark.py` | Ground truth comparison, accuracy metrics, reporting |
| `results/` | Output directory for JSON results and CSV reports |

## Configuration (config.py)

### Environment Variables (via .env)

```bash
# Roboflow Detection Model
ROBOFLOW_API_KEY=your_api_key
ROBOFLOW_WORKSPACE=your_workspace
ROBOFLOW_PROJECT=your_project
ROBOFLOW_MODEL_VERSION=1

# SmolVLM2 Configuration (uses same API key)
SMOLVLM2_WORKSPACE=flovisionml
SMOLVLM2_PROJECT=box-label-llm-ocr-71fnj
SMOLVLM2_VERSION=2
SMOLVLM2_API_URL=https://serverless.roboflow.com
```

### Detection Classes (16 label field types)

```python
DETECTION_CLASSES = [
    "Made In Label",
    "Barcode",
    "Box Number",
    "Halal stamp",
    "SKU Name",
    "Pack Date",
    "Kill Date",
    "Product Instructions",
    "Facility Name",
    "Facility Address",
    "Net Weight Label",
    "Net Weight (kg)",
    "Net Weight (lb)",
    "Piece Count",
    "Meta Data",
    "Site Stamp",
]
```

### Confidence Thresholds

```python
DETECTION_CONFIDENCE_THRESHOLD = 0.5  # For Roboflow detection
OCR_CONFIDENCE_THRESHOLD = 0.3        # For OCR text extraction
```

### Path Configuration

- Test data: `../test_data_OCR/version-1/`
- Images: `../test_data_OCR/version-1/images/`
- Ground truth: `../test_data_OCR/version-1/ground_truth.csv`
- Results output: `./results/`

## Key Components

### RoboflowDetector (roboflow_detector.py)

```python
from roboflow_detector import RoboflowDetector, Detection

detector = RoboflowDetector()

# Detect and crop in one call
detections, crops = detector.detect_and_crop(
    image_path,
    confidence_threshold=0.5,
    padding=5  # pixels around crop
)

# Detection dataclass
detection.class_name   # "Barcode"
detection.confidence   # 0.95
detection.bbox         # (x_min, y_min, x_max, y_max)
detection.x, detection.y, detection.width, detection.height
```

### OCR Engines

#### EasyOCR Engine

```python
from inference_easyocr import EasyOCREngine

ocr = EasyOCREngine(languages=["en"], gpu=True)
text = ocr.read_text(cropped_image, confidence_threshold=0.3)
```

#### PaddleOCR Engine

```python
from inference_paddleocr import PaddleOCREngine

ocr = PaddleOCREngine(lang="en", use_gpu=True)
text = ocr.read_text(cropped_image, confidence_threshold=0.3)
```

#### SmolVLM2 Engine (End-to-End VLM)

```python
from inference_smolvlm2 import SmolVLM2Engine

vlm = SmolVLM2Engine()
predictions = vlm.extract_all_fields(image_path)  # Returns dict of all 16 fields
```

**Note**: SmolVLM2 runs on full images without detection/cropping. It extracts all fields in a single inference call.

### Benchmarking (benchmark.py)

#### Data Classes

```python
@dataclass
class FieldResult:
    field_name: str
    ground_truth: str
    prediction: str
    exact_match: bool
    normalized_match: bool
    character_error_rate: float  # CER = Levenshtein distance / GT length
    word_accuracy: float         # % of GT words found in prediction

@dataclass
class ImageResult:
    image_filename: str
    field_results: Dict[str, FieldResult]
    detection_count: int
    expected_field_count: int
    # Properties: exact_match_rate, normalized_match_rate, average_cer

@dataclass
class BenchmarkReport:
    ocr_engine: str
    timestamp: str
    image_results: List[ImageResult]
    # Properties: total_images, overall_exact_match_rate, overall_normalized_match_rate, overall_cer
    # Methods: per_field_accuracy()
```

#### Key Functions

```python
from benchmark import (
    load_ground_truth,       # Returns DataFrame indexed by image filename
    normalize_text,          # Lowercase, remove punctuation, collapse whitespace
    character_error_rate,    # CER calculation
    word_accuracy,           # Word-level accuracy
    compare_field,           # Compare single prediction to GT
    compare_image_results,   # Compare all fields for one image
    generate_report,         # Create BenchmarkReport from results
    save_report_csv,         # Export detailed CSV
    print_report_summary,    # Console summary output
)
```

## Output Formats

### JSON Results (per engine)

```json
{
  "image_001.jpg": {
    "detections": [
      {
        "class": "Barcode",
        "confidence": 0.95,
        "bbox": [100, 200, 300, 250]
      }
    ],
    "ocr_results": {
      "Barcode": "1234567890",
      "SKU Name": "Product ABC"
    }
  }
}
```

### Benchmark CSV

| image | field | ground_truth | prediction | exact_match | normalized_match | character_error_rate | word_accuracy |
|-------|-------|--------------|------------|-------------|------------------|---------------------|---------------|
| img.jpg | Barcode | 123456 | 123456 | True | True | 0.0 | 1.0 |

## Integration with Frontend

### Model Testing Page

The frontend should:
1. Allow selection of OCR engine (EasyOCR vs PaddleOCR)
2. Allow selection of test dataset version
3. Trigger inference via API endpoint
4. Display real-time progress
5. Show detection visualizations (bounding boxes on images)
6. Display per-image OCR results

### Reporting Page

The frontend should:
1. Load benchmark CSV/JSON results
2. Display overall metrics (exact match rate, normalized match rate, CER)
3. Show per-field accuracy breakdown
4. Visualize comparisons (tables, charts)
5. Allow filtering/sorting by accuracy
6. Export capabilities

### API Requirements

To integrate with Next.js frontend, create API routes that:
- Execute inference scripts via subprocess or Python microservice
- Stream progress updates (SSE or WebSocket)
- Return structured JSON results
- Support selecting different model versions and OCR engines

## Dependencies

```
roboflow>=1.1.0          # Roboflow SDK for detection
easyocr>=1.7.0           # EasyOCR engine
paddleocr>=2.7.0         # PaddleOCR engine
paddlepaddle>=2.5.0      # PaddlePaddle framework
opencv-python>=4.8.0     # Image processing
pillow>=10.0.0           # Image handling
pandas>=2.0.0            # Data manipulation
numpy>=1.24.0            # Numerical operations
python-dotenv>=1.0.0     # Environment variables
tqdm>=4.65.0             # Progress bars
```

## Accuracy Metrics Explained

| Metric | Description | Range |
|--------|-------------|-------|
| **Exact Match** | Prediction equals GT (case-sensitive, whitespace-sensitive) | 0-100% |
| **Normalized Match** | Match after lowercase + removing punctuation + collapsing whitespace | 0-100% |
| **CER** | Character Error Rate = Levenshtein distance / GT length | 0.0 (perfect) - 1.0+ (bad) |
| **Word Accuracy** | % of ground truth words found in prediction | 0-100% |
