"""
Box Label OCR Inference using SmolVLM2 (End-to-End VLM)

This script:
1. Loads images from the test dataset
2. Runs SmolVLM2 directly on full images (no detection/cropping needed)
3. Extracts all label fields in a single inference call
4. Compares results against ground truth
5. Generates benchmark report

Unlike EasyOCR/PaddleOCR pipelines, SmolVLM2 was trained end-to-end to extract
all 16 label fields directly from the full image.
"""
import json
import sys
import re
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Optional

import supervision as sv
from inference_sdk import InferenceHTTPClient
from tqdm import tqdm

from config import (
    IMAGES_DIR,
    RESULTS_DIR,
    ROBOFLOW_API_KEY,
    SMOLVLM2_WORKSPACE,
    SMOLVLM2_PROJECT,
    SMOLVLM2_VERSION,
    SMOLVLM2_API_URL,
    DETECTION_CLASSES,
)
from benchmark import (
    load_ground_truth,
    compare_image_results,
    generate_report,
    save_report_csv,
    print_report_summary,
    ImageResult,
)


class SmolVLM2Engine:
    """Wrapper for SmolVLM2 via Roboflow Inference SDK."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        workspace: Optional[str] = None,
        project: Optional[str] = None,
        version: Optional[int] = None,
        api_url: Optional[str] = None,
    ):
        """
        Initialize the SmolVLM2 engine.

        Args:
            api_key: Roboflow API key (defaults to env var)
            workspace: Roboflow workspace name
            project: Roboflow project name
            version: Model version number
            api_url: API URL for inference
        """
        self.api_key = api_key or ROBOFLOW_API_KEY
        self.workspace = workspace or SMOLVLM2_WORKSPACE
        self.project = project or SMOLVLM2_PROJECT
        self.version = version or SMOLVLM2_VERSION
        self.api_url = api_url or SMOLVLM2_API_URL

        if not self.api_key:
            raise ValueError("ROBOFLOW_API_KEY not set. Please set it in .env file.")

        # Initialize inference client
        self.client = InferenceHTTPClient(
            api_url=self.api_url,
            api_key=self.api_key
        )
        self.model_id = f"{self.project}/{self.version}"

        print(f"Initialized SmolVLM2 engine with model: {self.model_id}")

    def extract_all_fields(self, image_path: str) -> Dict[str, str]:
        """
        Extract all label fields from a full image using SmolVLM2.
        No detection/cropping needed - the VLM handles everything.

        Args:
            image_path: Path to the full box label image

        Returns:
            Dict mapping field names to extracted text
        """
        # Load image using supervision for potential preprocessing
        image = sv.imread(str(image_path))

        # Build the prompt for field extraction
        fields_list = "\n".join(f"- {field}" for field in DETECTION_CLASSES)
        prompt = f"""Extract the following fields from this box label image.
Return a JSON object with these exact keys. If a field is not visible or cannot be read, use an empty string.

Fields to extract:
{fields_list}

Return ONLY valid JSON, no other text or explanation."""

        # Call SmolVLM2 via inference SDK
        try:
            result = self.client.infer(
                inference_input=str(image_path),
                model_id=self.model_id,
            )

            # Parse the response
            return self._parse_response(result)

        except Exception as e:
            print(f"Error during inference: {e}")
            # Return empty predictions on error
            return {field: "" for field in DETECTION_CLASSES}

    def _parse_response(self, result: dict) -> Dict[str, str]:
        """
        Parse the SmolVLM2 response into a field dictionary.

        Args:
            result: Raw response from the inference SDK

        Returns:
            Dict mapping field names to extracted text
        """
        predictions = {field: "" for field in DETECTION_CLASSES}

        try:
            # The response format depends on how the model was trained
            # SmolVLM2 typically returns text in a 'response' or 'output' field
            response_text = ""

            if isinstance(result, dict):
                # Try common response fields
                if "response" in result:
                    response_text = result["response"]
                elif "output" in result:
                    response_text = result["output"]
                elif "text" in result:
                    response_text = result["text"]
                elif "predictions" in result:
                    # Handle prediction format
                    preds = result["predictions"]
                    if isinstance(preds, list) and len(preds) > 0:
                        if isinstance(preds[0], dict) and "response" in preds[0]:
                            response_text = preds[0]["response"]
                        elif isinstance(preds[0], str):
                            response_text = preds[0]
                else:
                    # Try to use the entire result as JSON
                    response_text = json.dumps(result)
            elif isinstance(result, str):
                response_text = result

            # Try to parse as JSON
            if response_text:
                # Clean up the response - remove markdown code blocks if present
                cleaned = response_text.strip()
                if cleaned.startswith("```json"):
                    cleaned = cleaned[7:]
                if cleaned.startswith("```"):
                    cleaned = cleaned[3:]
                if cleaned.endswith("```"):
                    cleaned = cleaned[:-3]
                cleaned = cleaned.strip()

                # Try to extract JSON from the response
                try:
                    parsed = json.loads(cleaned)
                    if isinstance(parsed, dict):
                        for field in DETECTION_CLASSES:
                            if field in parsed:
                                predictions[field] = str(parsed[field])
                            # Also try lowercase/normalized versions
                            field_lower = field.lower().replace(" ", "_")
                            if field_lower in parsed:
                                predictions[field] = str(parsed[field_lower])
                except json.JSONDecodeError:
                    # If not valid JSON, try to extract key-value pairs
                    for field in DETECTION_CLASSES:
                        # Look for "field_name: value" or "field_name": "value" patterns
                        pattern = rf'["\']?{re.escape(field)}["\']?\s*[:=]\s*["\']?([^"\'}\n,]+)["\']?'
                        match = re.search(pattern, response_text, re.IGNORECASE)
                        if match:
                            predictions[field] = match.group(1).strip()

        except Exception as e:
            print(f"Error parsing response: {e}")

        return predictions


def run_inference(
    images_dir: Optional[Path] = None,
    output_dir: Optional[Path] = None,
    verbose: bool = True,
) -> Dict:
    """
    Run SmolVLM2 inference on all images in the dataset.

    Args:
        images_dir: Directory containing images
        output_dir: Directory to save results
        verbose: Print progress

    Returns:
        Dictionary with all results
    """
    images_dir = images_dir or IMAGES_DIR
    output_dir = output_dir or RESULTS_DIR
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    # Initialize SmolVLM2 engine
    print("Initializing SmolVLM2 engine...")
    vlm_engine = SmolVLM2Engine()

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
            # Call SmolVLM2 on FULL image (single call extracts all fields)
            predictions = vlm_engine.extract_all_fields(str(image_path))

            # Store predictions
            all_predictions[image_filename] = {
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
    report = generate_report(all_results, "SmolVLM2")

    # Save results
    results_json_path = output_dir / f"smolvlm2_results_{timestamp}.json"
    with open(results_json_path, "w") as f:
        json.dump(all_predictions, f, indent=2)
    print(f"\nRaw results saved to: {results_json_path}")

    benchmark_csv_path = output_dir / f"smolvlm2_benchmark_{timestamp}.csv"
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
        description="Run SmolVLM2 inference on box label images (end-to-end VLM)"
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
        "--quiet",
        action="store_true",
        help="Suppress progress output",
    )

    args = parser.parse_args()

    try:
        run_inference(
            images_dir=args.images_dir,
            output_dir=args.output_dir,
            verbose=not args.quiet,
        )
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
