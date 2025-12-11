"""
Box Label OCR Inference using Roboflow Detection + EasyOCR

This script:
1. Loads images from the test dataset
2. Runs Roboflow object detection to find label fields
3. Crops each detected region
4. Runs EasyOCR on each crop
5. Compares results against ground truth
6. Generates benchmark report
"""
import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional

import cv2
import easyocr
import numpy as np
from tqdm import tqdm

from config import (
    IMAGES_DIR,
    RESULTS_DIR,
    EASYOCR_LANGUAGES,
    OCR_CONFIDENCE_THRESHOLD,
    DETECTION_CONFIDENCE_THRESHOLD,
)
from roboflow_detector import RoboflowDetector, load_image
from benchmark import (
    load_ground_truth,
    compare_image_results,
    generate_report,
    save_report_csv,
    print_report_summary,
    ImageResult,
)


class EasyOCREngine:
    """Wrapper for EasyOCR."""

    def __init__(self, languages: Optional[List[str]] = None, gpu: bool = True):
        """
        Initialize EasyOCR reader.

        Args:
            languages: List of language codes (default: ['en'])
            gpu: Whether to use GPU acceleration
        """
        self.languages = languages or EASYOCR_LANGUAGES
        print(f"Initializing EasyOCR with languages: {self.languages}")
        self.reader = easyocr.Reader(self.languages, gpu=gpu)

    def read_text(
        self,
        image: np.ndarray,
        confidence_threshold: float = OCR_CONFIDENCE_THRESHOLD,
    ) -> str:
        """
        Extract text from an image.

        Args:
            image: Input image as numpy array (BGR format)
            confidence_threshold: Minimum confidence to include text

        Returns:
            Extracted text as string
        """
        # EasyOCR expects RGB
        if len(image.shape) == 3 and image.shape[2] == 3:
            image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
        else:
            image_rgb = image

        # Run OCR
        results = self.reader.readtext(image_rgb)

        # Filter by confidence and concatenate
        texts = []
        for bbox, text, confidence in results:
            if confidence >= confidence_threshold:
                texts.append(text)

        return " ".join(texts)


def run_inference(
    images_dir: Optional[Path] = None,
    output_dir: Optional[Path] = None,
    use_gpu: bool = True,
    verbose: bool = True,
) -> Dict:
    """
    Run inference on all images in the dataset.

    Args:
        images_dir: Directory containing images
        output_dir: Directory to save results
        use_gpu: Whether to use GPU for OCR
        verbose: Print progress

    Returns:
        Dictionary with all results
    """
    images_dir = images_dir or IMAGES_DIR
    output_dir = output_dir or RESULTS_DIR
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    # Initialize components
    print("Initializing Roboflow detector...")
    detector = RoboflowDetector()

    print("Initializing EasyOCR engine...")
    ocr_engine = EasyOCREngine(gpu=use_gpu)

    print("Loading ground truth data...")
    ground_truth = load_ground_truth()

    # Get list of images
    image_files = sorted(list(images_dir.glob("*.jpg")) + list(images_dir.glob("*.png")))
    print(f"Found {len(image_files)} images to process")

    # Process each image
    all_results = []
    all_predictions = {}

    iterator = tqdm(image_files, desc="Processing images") if verbose else image_files

    for image_path in iterator:
        image_filename = image_path.name

        try:
            # Load image
            image = load_image(str(image_path))

            # Run detection
            detections, crops = detector.detect_and_crop(
                str(image_path),
                confidence_threshold=DETECTION_CONFIDENCE_THRESHOLD,
            )

            # Run OCR on each crop
            predictions = {}
            for class_name, crop_image in crops.items():
                text = ocr_engine.read_text(crop_image)
                predictions[class_name] = text

            # Store predictions
            all_predictions[image_filename] = {
                "detections": [
                    {
                        "class": d.class_name,
                        "confidence": d.confidence,
                        "bbox": d.bbox,
                    }
                    for d in detections
                ],
                "ocr_results": predictions,
            }

            # Compare with ground truth if available
            if image_filename in ground_truth.index:
                gt_row = ground_truth.loc[image_filename]
                image_result = compare_image_results(
                    predictions, gt_row, image_filename
                )
                all_results.append(image_result)

        except Exception as e:
            print(f"\nError processing {image_filename}: {e}")
            continue

    # Generate report
    report = generate_report(all_results, "EasyOCR")

    # Save results
    results_json_path = output_dir / f"easyocr_results_{timestamp}.json"
    with open(results_json_path, "w") as f:
        json.dump(all_predictions, f, indent=2)
    print(f"\nRaw results saved to: {results_json_path}")

    benchmark_csv_path = output_dir / f"easyocr_benchmark_{timestamp}.csv"
    save_report_csv(report, benchmark_csv_path)
    print(f"Benchmark CSV saved to: {benchmark_csv_path}")

    # Print summary
    print_report_summary(report)

    return {
        "predictions": all_predictions,
        "report": report,
        "results_path": str(results_json_path),
        "benchmark_path": str(benchmark_csv_path),
    }


def main():
    """Main entry point."""
    import argparse

    parser = argparse.ArgumentParser(
        description="Run EasyOCR inference on box label images"
    )
    parser.add_argument(
        "--images-dir",
        type=Path,
        default=IMAGES_DIR,
        help="Directory containing images",
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=RESULTS_DIR,
        help="Directory to save results",
    )
    parser.add_argument(
        "--no-gpu",
        action="store_true",
        help="Disable GPU acceleration",
    )
    parser.add_argument(
        "--quiet",
        action="store_true",
        help="Suppress progress output",
    )

    args = parser.parse_args()

    try:
        run_inference(
            images_dir=args.images_dir,
            output_dir=args.output_dir,
            use_gpu=not args.no_gpu,
            verbose=not args.quiet,
        )
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
