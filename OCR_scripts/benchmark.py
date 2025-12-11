"""
Benchmarking utilities for OCR accuracy evaluation.

Provides functions to:
- Load ground truth from CSV
- Compare OCR predictions against ground truth
- Calculate various accuracy metrics
- Generate benchmark reports
"""
import re
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime

import pandas as pd
import numpy as np

from config import (
    GROUND_TRUTH_CSV,
    IMAGE_FILENAME_COLUMN,
    CLASS_TO_CSV_COLUMN,
    DETECTION_CLASSES,
)


@dataclass
class FieldResult:
    """Result for a single field comparison."""
    field_name: str
    ground_truth: str
    prediction: str
    exact_match: bool
    normalized_match: bool
    character_error_rate: float
    word_accuracy: float


@dataclass
class ImageResult:
    """Results for a single image."""
    image_filename: str
    field_results: Dict[str, FieldResult] = field(default_factory=dict)
    detection_count: int = 0
    expected_field_count: int = 0

    @property
    def exact_match_rate(self) -> float:
        if not self.field_results:
            return 0.0
        matches = sum(1 for r in self.field_results.values() if r.exact_match)
        return matches / len(self.field_results)

    @property
    def normalized_match_rate(self) -> float:
        if not self.field_results:
            return 0.0
        matches = sum(1 for r in self.field_results.values() if r.normalized_match)
        return matches / len(self.field_results)

    @property
    def average_cer(self) -> float:
        if not self.field_results:
            return 1.0
        return np.mean([r.character_error_rate for r in self.field_results.values()])


@dataclass
class BenchmarkReport:
    """Overall benchmark report."""
    ocr_engine: str
    timestamp: str
    image_results: List[ImageResult] = field(default_factory=list)

    @property
    def total_images(self) -> int:
        return len(self.image_results)

    @property
    def overall_exact_match_rate(self) -> float:
        if not self.image_results:
            return 0.0
        return np.mean([r.exact_match_rate for r in self.image_results])

    @property
    def overall_normalized_match_rate(self) -> float:
        if not self.image_results:
            return 0.0
        return np.mean([r.normalized_match_rate for r in self.image_results])

    @property
    def overall_cer(self) -> float:
        if not self.image_results:
            return 1.0
        return np.mean([r.average_cer for r in self.image_results])

    def per_field_accuracy(self) -> Dict[str, Dict[str, float]]:
        """Calculate accuracy metrics per field across all images."""
        field_stats = {}

        for field_name in DETECTION_CLASSES:
            exact_matches = []
            normalized_matches = []
            cers = []

            for img_result in self.image_results:
                if field_name in img_result.field_results:
                    result = img_result.field_results[field_name]
                    exact_matches.append(1 if result.exact_match else 0)
                    normalized_matches.append(1 if result.normalized_match else 0)
                    cers.append(result.character_error_rate)

            if exact_matches:
                field_stats[field_name] = {
                    "exact_match_rate": np.mean(exact_matches),
                    "normalized_match_rate": np.mean(normalized_matches),
                    "average_cer": np.mean(cers),
                    "sample_count": len(exact_matches),
                }

        return field_stats


def load_ground_truth(csv_path: Optional[Path] = None) -> pd.DataFrame:
    """
    Load ground truth data from CSV file.

    Args:
        csv_path: Path to CSV file (defaults to config path)

    Returns:
        DataFrame with ground truth data indexed by image filename
    """
    csv_path = csv_path or GROUND_TRUTH_CSV
    df = pd.read_csv(csv_path)
    df = df.set_index(IMAGE_FILENAME_COLUMN)
    return df


def normalize_text(text: str) -> str:
    """
    Normalize text for comparison.

    - Convert to lowercase
    - Remove extra whitespace
    - Standardize common variations
    """
    if not isinstance(text, str):
        text = str(text) if pd.notna(text) else ""

    # Lowercase
    text = text.lower()

    # Remove extra whitespace
    text = " ".join(text.split())

    # Remove punctuation variations (keep alphanumeric and spaces)
    text = re.sub(r"[^\w\s]", "", text)

    return text.strip()


def levenshtein_distance(s1: str, s2: str) -> int:
    """Calculate Levenshtein (edit) distance between two strings."""
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)

    if len(s2) == 0:
        return len(s1)

    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row

    return previous_row[-1]


def character_error_rate(prediction: str, ground_truth: str) -> float:
    """
    Calculate Character Error Rate (CER).

    CER = Levenshtein distance / length of ground truth
    """
    if not ground_truth:
        return 0.0 if not prediction else 1.0

    distance = levenshtein_distance(prediction, ground_truth)
    return distance / len(ground_truth)


def word_accuracy(prediction: str, ground_truth: str) -> float:
    """
    Calculate word-level accuracy.

    Returns percentage of words in ground truth that appear in prediction.
    """
    gt_words = set(normalize_text(ground_truth).split())
    pred_words = set(normalize_text(prediction).split())

    if not gt_words:
        return 1.0 if not pred_words else 0.0

    matching_words = gt_words.intersection(pred_words)
    return len(matching_words) / len(gt_words)


def compare_field(
    prediction: str,
    ground_truth: str,
    field_name: str,
) -> FieldResult:
    """
    Compare a single field prediction against ground truth.

    Args:
        prediction: OCR prediction text
        ground_truth: Expected ground truth text
        field_name: Name of the field

    Returns:
        FieldResult with comparison metrics
    """
    pred_str = str(prediction) if pd.notna(prediction) else ""
    gt_str = str(ground_truth) if pd.notna(ground_truth) else ""

    # Exact match
    exact = pred_str.strip() == gt_str.strip()

    # Normalized match
    normalized = normalize_text(pred_str) == normalize_text(gt_str)

    # Character error rate
    cer = character_error_rate(pred_str, gt_str)

    # Word accuracy
    word_acc = word_accuracy(pred_str, gt_str)

    return FieldResult(
        field_name=field_name,
        ground_truth=gt_str,
        prediction=pred_str,
        exact_match=exact,
        normalized_match=normalized,
        character_error_rate=cer,
        word_accuracy=word_acc,
    )


def compare_image_results(
    predictions: Dict[str, str],
    ground_truth_row: pd.Series,
    image_filename: str,
) -> ImageResult:
    """
    Compare all predictions for an image against ground truth.

    Args:
        predictions: Dict mapping class names to OCR text
        ground_truth_row: Row from ground truth DataFrame
        image_filename: Name of the image file

    Returns:
        ImageResult with all field comparisons
    """
    result = ImageResult(
        image_filename=image_filename,
        detection_count=len(predictions),
        expected_field_count=len(DETECTION_CLASSES),
    )

    for class_name in DETECTION_CLASSES:
        csv_column = CLASS_TO_CSV_COLUMN.get(class_name, class_name)

        # Get ground truth value
        gt_value = ""
        if csv_column in ground_truth_row.index:
            gt_value = ground_truth_row[csv_column]

        # Get prediction value
        pred_value = predictions.get(class_name, "")

        # Compare
        field_result = compare_field(pred_value, gt_value, class_name)
        result.field_results[class_name] = field_result

    return result


def generate_report(
    all_results: List[ImageResult],
    ocr_engine: str,
) -> BenchmarkReport:
    """
    Generate a comprehensive benchmark report.

    Args:
        all_results: List of ImageResult objects
        ocr_engine: Name of OCR engine used

    Returns:
        BenchmarkReport with all metrics
    """
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    return BenchmarkReport(
        ocr_engine=ocr_engine,
        timestamp=timestamp,
        image_results=all_results,
    )


def save_report_csv(report: BenchmarkReport, output_path: Path) -> None:
    """Save benchmark report to CSV file."""
    rows = []

    for img_result in report.image_results:
        for field_name, field_result in img_result.field_results.items():
            rows.append({
                "image": img_result.image_filename,
                "field": field_name,
                "ground_truth": field_result.ground_truth,
                "prediction": field_result.prediction,
                "exact_match": field_result.exact_match,
                "normalized_match": field_result.normalized_match,
                "character_error_rate": field_result.character_error_rate,
                "word_accuracy": field_result.word_accuracy,
            })

    df = pd.DataFrame(rows)
    df.to_csv(output_path, index=False)


def print_report_summary(report: BenchmarkReport) -> None:
    """Print a human-readable summary of the benchmark report."""
    print(f"\n{'='*60}")
    print(f"OCR Benchmark Report - {report.ocr_engine}")
    print(f"{'='*60}")
    print(f"Timestamp: {report.timestamp}")
    print(f"Total Images: {report.total_images}")
    print(f"\nOverall Metrics:")
    print(f"  Exact Match Rate:      {report.overall_exact_match_rate:.1%}")
    print(f"  Normalized Match Rate: {report.overall_normalized_match_rate:.1%}")
    print(f"  Average CER:           {report.overall_cer:.3f}")

    print(f"\nPer-Field Accuracy:")
    print(f"{'Field':<25} {'Exact':<10} {'Normalized':<12} {'CER':<10} {'N':<5}")
    print("-" * 62)

    field_stats = report.per_field_accuracy()
    for field_name, stats in field_stats.items():
        print(
            f"{field_name:<25} "
            f"{stats['exact_match_rate']:>8.1%}  "
            f"{stats['normalized_match_rate']:>10.1%}  "
            f"{stats['average_cer']:>8.3f}  "
            f"{stats['sample_count']:>4}"
        )

    print(f"{'='*60}\n")


if __name__ == "__main__":
    # Test loading ground truth
    print("Loading ground truth data...")
    gt = load_ground_truth()
    print(f"Loaded {len(gt)} images")
    print(f"Columns: {list(gt.columns)}")
