"""
Configuration for Box Label OCR Inference Scripts
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Roboflow Configuration
ROBOFLOW_API_KEY = os.getenv("ROBOFLOW_API_KEY", "")
ROBOFLOW_WORKSPACE = os.getenv("ROBOFLOW_WORKSPACE", "")
ROBOFLOW_PROJECT = os.getenv("ROBOFLOW_PROJECT", "")
ROBOFLOW_MODEL_VERSION = int(os.getenv("ROBOFLOW_MODEL_VERSION", "1"))

# Paths
SCRIPTS_DIR = Path(__file__).parent
PROJECT_ROOT = SCRIPTS_DIR.parent
TEST_DATA_DIR = PROJECT_ROOT / "test_data_OCR" / "version-1"
IMAGES_DIR = TEST_DATA_DIR / "images"
GROUND_TRUTH_CSV = TEST_DATA_DIR / "ground_truth.csv"
RESULTS_DIR = SCRIPTS_DIR / "results"

# Ensure results directory exists
RESULTS_DIR.mkdir(exist_ok=True)

# Detection class names (as they appear in Roboflow model)
# These should match your trained model's class names
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

# Mapping from detection class names to CSV column names
# Update this if your model uses different class names than the CSV headers
CLASS_TO_CSV_COLUMN = {
    "Made In Label": "Made In Label",
    "Barcode": "Barcode",
    "Box Number": "Box Number (?)",
    "Halal stamp": "Halal stamp",
    "SKU Name": "SKU Name (?)",
    "Pack Date": "Pack Date",
    "Kill Date": "Kill Date",
    "Product Instructions": "Product Instructions",
    "Facility Name": "Facility Name",
    "Facility Address": "Facility Address",
    "Net Weight Label": "Net Weight Label",
    "Net Weight (kg)": "Net Weight (kg)",
    "Net Weight (lb)": "Net Weight (lb)",
    "Piece Count": "Piece Count",
    "Meta Data": "Meta Data",
    "Site Stamp": "Site Stamp (?)",
}

# CSV column for image filename
IMAGE_FILENAME_COLUMN = "Box Label"

# OCR Configuration
EASYOCR_LANGUAGES = ["en"]  # English
PADDLEOCR_LANG = "en"

# Confidence thresholds
DETECTION_CONFIDENCE_THRESHOLD = 0.5
OCR_CONFIDENCE_THRESHOLD = 0.3

# SmolVLM2 Configuration (end-to-end VLM, no detection needed)
SMOLVLM2_WORKSPACE = os.getenv("SMOLVLM2_WORKSPACE", "flovisionml")
SMOLVLM2_PROJECT = os.getenv("SMOLVLM2_PROJECT", "box-label-llm-ocr-71fnj")
SMOLVLM2_VERSION = int(os.getenv("SMOLVLM2_VERSION", "2"))
SMOLVLM2_API_URL = os.getenv("SMOLVLM2_API_URL", "https://serverless.roboflow.com")
