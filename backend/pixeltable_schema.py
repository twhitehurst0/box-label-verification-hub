"""
Pixeltable Schema for Box Label OCR Model Testing

This module defines the Pixeltable tables and computed columns for:
- Storing inference jobs and their results
- Running OCR with EasyOCR and PaddleOCR via UDFs
- Benchmarking against ground truth
"""
import os
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional, Any
import json

import pixeltable as pxt
from pixeltable import Table
import numpy as np
import cv2

# Add OCR_scripts to path for imports
OCR_SCRIPTS_DIR = Path(__file__).parent.parent / "OCR_scripts"
sys.path.insert(0, str(OCR_SCRIPTS_DIR))

from config import DETECTION_CLASSES, CLASS_TO_CSV_COLUMN

# Directory name in Pixeltable
PIXELTABLE_DIR = "box_label_ocr"

# ============================================================================
# Table Schemas
# ============================================================================

def init_pixeltable():
    """Initialize Pixeltable directory and tables."""
    # Create directory if it doesn't exist
    try:
        pxt.create_dir(PIXELTABLE_DIR)
        print(f"Created Pixeltable directory: {PIXELTABLE_DIR}")
    except Exception as e:
        if "already exists" not in str(e).lower():
            raise
        print(f"Pixeltable directory already exists: {PIXELTABLE_DIR}")


def create_inference_jobs_table() -> Table:
    """
    Create table for tracking inference jobs.

    Columns:
    - job_id: Unique identifier for the job
    - engine: OCR engine used (easyocr, paddleocr)
    - preprocessing: Preprocessing type applied (none, rescale, binarize_otsu, etc.)
    - dataset_version: S3 dataset version
    - dataset_name: S3 dataset name
    - status: pending, running, completed, failed
    - total_images: Total images to process
    - processed_images: Images processed so far
    - created_at: Job creation timestamp
    - started_at: Job start timestamp
    - completed_at: Job completion timestamp
    - error_message: Error details if failed
    """
    table_path = f"{PIXELTABLE_DIR}.inference_jobs"

    try:
        # Drop existing table if recreating
        pxt.drop_table(table_path, if_not_exists="ignore", force=True)
    except:
        pass

    t = pxt.create_table(
        table_path,
        {
            "job_id": pxt.String,
            "engine": pxt.String,
            "preprocessing": pxt.String,
            "dataset_version": pxt.String,
            "dataset_name": pxt.String,
            "status": pxt.String,
            "total_images": pxt.Int,
            "processed_images": pxt.Int,
            "created_at": pxt.Timestamp,
            "started_at": pxt.Timestamp,
            "completed_at": pxt.Timestamp,
            "error_message": pxt.String,
        },
        if_exists="ignore"
    )

    print(f"Created table: {table_path}")
    return t


def create_image_results_table() -> Table:
    """
    Create table for storing per-image inference results.

    Columns:
    - result_id: Unique identifier
    - job_id: Reference to inference job
    - image_path: Path to the image
    - image: The actual image (Pixeltable Image type)
    - detections_json: JSON string of all detections
    - ocr_results_json: JSON string of OCR text per class
    - processing_time_ms: Time to process this image
    - timestamp: When this result was created
    """
    table_path = f"{PIXELTABLE_DIR}.image_results"

    try:
        pxt.drop_table(table_path, if_not_exists="ignore", force=True)
    except:
        pass

    t = pxt.create_table(
        table_path,
        {
            "result_id": pxt.String,
            "job_id": pxt.String,
            "image_filename": pxt.String,
            "image_path": pxt.String,
            "image": pxt.Image,
            "detections_json": pxt.String,
            "ocr_results_json": pxt.String,
            "processing_time_ms": pxt.Float,
            "timestamp": pxt.Timestamp,
        },
        if_exists="ignore"
    )

    print(f"Created table: {table_path}")
    return t


def create_benchmark_results_table() -> Table:
    """
    Create table for storing benchmark comparison results.

    Columns:
    - benchmark_id: Unique identifier
    - job_id: Reference to inference job
    - image_filename: Image being compared
    - field_name: Detection class being compared
    - ground_truth: Expected value from CSV
    - prediction: OCR prediction
    - exact_match: Boolean - exact string match
    - normalized_match: Boolean - match after normalization
    - character_error_rate: CER metric
    - word_accuracy: Word-level accuracy
    """
    table_path = f"{PIXELTABLE_DIR}.benchmark_results"

    try:
        pxt.drop_table(table_path, if_not_exists="ignore", force=True)
    except:
        pass

    t = pxt.create_table(
        table_path,
        {
            "benchmark_id": pxt.String,
            "job_id": pxt.String,
            "image_filename": pxt.String,
            "field_name": pxt.String,
            "ground_truth": pxt.String,
            "prediction": pxt.String,
            "exact_match": pxt.Bool,
            "normalized_match": pxt.Bool,
            "character_error_rate": pxt.Float,
            "word_accuracy": pxt.Float,
        },
        if_exists="ignore"
    )

    print(f"Created table: {table_path}")
    return t


def create_job_summary_table() -> Table:
    """
    Create table for storing aggregated job statistics.

    Columns:
    - summary_id: Unique identifier
    - job_id: Reference to inference job
    - engine: OCR engine used
    - total_images: Images processed
    - overall_exact_match_rate: Aggregate accuracy
    - overall_normalized_match_rate: Aggregate normalized accuracy
    - overall_cer: Average character error rate
    - per_field_stats_json: JSON of per-field accuracy
    - created_at: Summary creation timestamp
    """
    table_path = f"{PIXELTABLE_DIR}.job_summaries"

    try:
        pxt.drop_table(table_path, if_not_exists="ignore", force=True)
    except:
        pass

    t = pxt.create_table(
        table_path,
        {
            "summary_id": pxt.String,
            "job_id": pxt.String,
            "engine": pxt.String,
            "dataset_version": pxt.String,
            "dataset_name": pxt.String,
            "total_images": pxt.Int,
            "overall_exact_match_rate": pxt.Float,
            "overall_normalized_match_rate": pxt.Float,
            "overall_cer": pxt.Float,
            "per_field_stats_json": pxt.String,
            "created_at": pxt.Timestamp,
        },
        if_exists="ignore"
    )

    print(f"Created table: {table_path}")
    return t


# ============================================================================
# User-Defined Functions (UDFs) for OCR
# ============================================================================

@pxt.udf
def run_easyocr(image_crop: pxt.Image, languages: str = "en") -> str:
    """
    Run EasyOCR on a cropped image region.

    Args:
        image_crop: Cropped image region as Pixeltable Image
        languages: Comma-separated language codes

    Returns:
        Extracted text as string
    """
    import easyocr

    # Initialize reader (cached by EasyOCR)
    lang_list = [l.strip() for l in languages.split(",")]
    reader = easyocr.Reader(lang_list, gpu=True)

    # Convert Pixeltable image to numpy array
    img_array = np.array(image_crop)

    # EasyOCR expects RGB
    if len(img_array.shape) == 3 and img_array.shape[2] == 3:
        img_rgb = cv2.cvtColor(img_array, cv2.COLOR_BGR2RGB)
    else:
        img_rgb = img_array

    # Run OCR
    results = reader.readtext(img_rgb)

    # Concatenate text with confidence > 0.3
    texts = [text for bbox, text, conf in results if conf >= 0.3]
    return " ".join(texts)


@pxt.udf
def run_paddleocr(image_crop: pxt.Image, lang: str = "en") -> str:
    """
    Run PaddleOCR on a cropped image region.

    Args:
        image_crop: Cropped image region as Pixeltable Image
        lang: Language code

    Returns:
        Extracted text as string
    """
    from paddleocr import PaddleOCR

    # Initialize PaddleOCR
    ocr = PaddleOCR(lang=lang, use_angle_cls=True, use_gpu=True, show_log=False)

    # Convert Pixeltable image to numpy array
    img_array = np.array(image_crop)

    # Run OCR
    results = ocr.ocr(img_array, cls=True)

    # Handle empty results
    if not results or results[0] is None:
        return ""

    # Extract text with confidence > 0.3
    texts = []
    for line in results[0]:
        if line is None:
            continue
        bbox, (text, confidence) = line
        if confidence >= 0.3:
            texts.append(text)

    return " ".join(texts)


@pxt.udf
def calculate_cer(prediction: str, ground_truth: str) -> float:
    """
    Calculate Character Error Rate (CER).

    CER = Levenshtein distance / length of ground truth
    """
    if not ground_truth:
        return 0.0 if not prediction else 1.0

    # Levenshtein distance calculation
    def levenshtein(s1: str, s2: str) -> int:
        if len(s1) < len(s2):
            return levenshtein(s2, s1)
        if len(s2) == 0:
            return len(s1)

        prev_row = range(len(s2) + 1)
        for i, c1 in enumerate(s1):
            curr_row = [i + 1]
            for j, c2 in enumerate(s2):
                insertions = prev_row[j + 1] + 1
                deletions = curr_row[j] + 1
                substitutions = prev_row[j] + (c1 != c2)
                curr_row.append(min(insertions, deletions, substitutions))
            prev_row = curr_row
        return prev_row[-1]

    distance = levenshtein(prediction, ground_truth)
    return distance / len(ground_truth)


@pxt.udf
def normalize_text(text: str) -> str:
    """Normalize text for comparison (lowercase, remove punctuation, collapse whitespace)."""
    import re

    if not text:
        return ""

    text = text.lower()
    text = " ".join(text.split())
    text = re.sub(r"[^\w\s]", "", text)
    return text.strip()


@pxt.udf
def check_exact_match(prediction: str, ground_truth: str) -> bool:
    """Check if prediction exactly matches ground truth."""
    return prediction.strip() == ground_truth.strip()


@pxt.udf
def check_normalized_match(prediction: str, ground_truth: str) -> bool:
    """Check if normalized prediction matches normalized ground truth."""
    import re

    def normalize(text: str) -> str:
        if not text:
            return ""
        text = text.lower()
        text = " ".join(text.split())
        text = re.sub(r"[^\w\s]", "", text)
        return text.strip()

    return normalize(prediction) == normalize(ground_truth)


# ============================================================================
# Helper Functions
# ============================================================================

def get_table(table_name: str) -> Table:
    """Get a Pixeltable table by name."""
    return pxt.get_table(f"{PIXELTABLE_DIR}.{table_name}")


def get_inference_jobs_table() -> Table:
    return get_table("inference_jobs")


def get_image_results_table() -> Table:
    return get_table("image_results")


def get_benchmark_results_table() -> Table:
    return get_table("benchmark_results")


def get_job_summaries_table() -> Table:
    return get_table("job_summaries")


def setup_all_tables():
    """Initialize Pixeltable and create all tables."""
    init_pixeltable()
    create_inference_jobs_table()
    create_image_results_table()
    create_benchmark_results_table()
    create_job_summary_table()
    print("All Pixeltable tables created successfully!")


if __name__ == "__main__":
    # Run setup when executed directly
    setup_all_tables()

    # Print table info
    print("\n--- Tables Created ---")
    for table_name in ["inference_jobs", "image_results", "benchmark_results", "job_summaries"]:
        t = get_table(table_name)
        print(f"\n{table_name}:")
        print(f"  Columns: {list(t.column_names())}")
