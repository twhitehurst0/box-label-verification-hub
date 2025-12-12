"""
Roboflow Object Detection Module for Box Label Detection

This module handles:
- Loading the Roboflow model
- Running inference on images
- Cropping detected regions for OCR processing
"""
import cv2
import numpy as np
import time
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from functools import wraps

# Fix for Pillow 10+ compatibility with Roboflow SDK
# ANTIALIAS was removed in Pillow 10, replaced with LANCZOS
from PIL import Image
if not hasattr(Image, 'ANTIALIAS'):
    Image.ANTIALIAS = Image.Resampling.LANCZOS

from roboflow import Roboflow

from config import (
    ROBOFLOW_API_KEY,
    ROBOFLOW_WORKSPACE,
    ROBOFLOW_PROJECT,
    ROBOFLOW_MODEL_VERSION,
    DETECTION_CONFIDENCE_THRESHOLD,
)


def retry_on_api_error(max_retries: int = 3, delay: float = 1.0):
    """
    Retry decorator for Roboflow API calls.

    Retries on transient network/API errors with exponential backoff.
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            last_error = None
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except Exception as e:
                    last_error = e
                    error_str = str(e).lower()
                    # Retry on network/API errors
                    if any(err in error_str for err in [
                        'timeout', 'connection', 'rate', '429', '500', '502', '503', '504',
                        'timed out', 'network', 'reset by peer', 'broken pipe'
                    ]):
                        print(f"Roboflow API error (attempt {attempt + 1}/{max_retries}): {e}")
                        time.sleep(delay * (attempt + 1))  # Exponential backoff
                        continue
                    raise  # Re-raise non-retryable errors
            raise last_error
        return wrapper
    return decorator


@dataclass
class Detection:
    """Represents a single detection from the model."""
    class_name: str
    confidence: float
    x: int  # center x
    y: int  # center y
    width: int
    height: int

    @property
    def x_min(self) -> int:
        return int(self.x - self.width / 2)

    @property
    def y_min(self) -> int:
        return int(self.y - self.height / 2)

    @property
    def x_max(self) -> int:
        return int(self.x + self.width / 2)

    @property
    def y_max(self) -> int:
        return int(self.y + self.height / 2)

    @property
    def bbox(self) -> Tuple[int, int, int, int]:
        """Returns (x_min, y_min, x_max, y_max)"""
        return (self.x_min, self.y_min, self.x_max, self.y_max)


class RoboflowDetector:
    """Wrapper for Roboflow object detection model."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        workspace: Optional[str] = None,
        project: Optional[str] = None,
        version: Optional[int] = None,
    ):
        """
        Initialize the Roboflow detector.

        Args:
            api_key: Roboflow API key (defaults to env var)
            workspace: Roboflow workspace name (defaults to env var)
            project: Roboflow project name (defaults to env var)
            version: Model version number (defaults to env var)
        """
        # Read from env vars at runtime (not import time) to support late loading
        import os
        self.api_key = api_key or os.environ.get("ROBOFLOW_API_KEY", "") or ROBOFLOW_API_KEY
        self.workspace = workspace or os.environ.get("ROBOFLOW_WORKSPACE", "") or ROBOFLOW_WORKSPACE
        self.project_name = project or os.environ.get("ROBOFLOW_PROJECT", "") or ROBOFLOW_PROJECT
        self.version = version or int(os.environ.get("ROBOFLOW_MODEL_VERSION", "0") or ROBOFLOW_MODEL_VERSION or 1)

        if not self.api_key:
            raise ValueError("ROBOFLOW_API_KEY not set. Please set it in .env file or environment.")

        # Initialize Roboflow client
        self.rf = Roboflow(api_key=self.api_key)
        self.project = self.rf.workspace(self.workspace).project(self.project_name)
        self.model = self.project.version(self.version).model

    @retry_on_api_error(max_retries=3, delay=1.0)
    def detect(
        self,
        image_path: str,
        confidence_threshold: float = DETECTION_CONFIDENCE_THRESHOLD,
        max_dimension: int = 1024,
    ) -> List[Detection]:
        """
        Run object detection on an image.

        Args:
            image_path: Path to the image file
            confidence_threshold: Minimum confidence to include detection
            max_dimension: Maximum image dimension (resizes if larger to avoid 413 errors)

        Returns:
            List of Detection objects
        """
        import tempfile
        import os as _os

        # Check if image needs resizing (Roboflow has ~1MB limit)
        image = cv2.imread(image_path)
        h, w = image.shape[:2]
        scale = 1.0

        if max(h, w) > max_dimension:
            scale = max_dimension / max(h, w)
            new_w, new_h = int(w * scale), int(h * scale)
            image = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)

            # Save to temp file for prediction
            with tempfile.NamedTemporaryFile(suffix='.jpg', delete=False) as tmp:
                cv2.imwrite(tmp.name, image, [cv2.IMWRITE_JPEG_QUALITY, 85])
                predict_path = tmp.name
        else:
            predict_path = image_path

        try:
            # Run inference
            result = self.model.predict(predict_path, confidence=int(confidence_threshold * 100))
            predictions = result.json()["predictions"]

            detections = []
            for pred in predictions:
                if pred["confidence"] >= confidence_threshold:
                    # Scale coordinates back to original image size
                    detection = Detection(
                        class_name=pred["class"],
                        confidence=pred["confidence"],
                        x=int(pred["x"] / scale),
                        y=int(pred["y"] / scale),
                        width=int(pred["width"] / scale),
                        height=int(pred["height"] / scale),
                    )
                    detections.append(detection)

            return detections

        except Exception as e:
            # Log error and re-raise - the retry decorator will handle retries
            print(f"Error detecting objects in {image_path}: {e}")
            raise

        finally:
            # Clean up temp file if created
            if predict_path != image_path:
                try:
                    _os.unlink(predict_path)
                except OSError as cleanup_err:
                    print(f"Warning: Could not clean up temp file {predict_path}: {cleanup_err}")

    def crop_detections(
        self,
        image: np.ndarray,
        detections: List[Detection],
        padding: int = 5,
    ) -> Dict[str, np.ndarray]:
        """
        Crop detected regions from the image.

        Args:
            image: Input image as numpy array (BGR format from cv2)
            detections: List of Detection objects
            padding: Pixels to add around each crop

        Returns:
            Dictionary mapping class names to cropped images
        """
        h, w = image.shape[:2]
        crops = {}

        for detection in detections:
            # Calculate crop coordinates with padding
            x_min = max(0, detection.x_min - padding)
            y_min = max(0, detection.y_min - padding)
            x_max = min(w, detection.x_max + padding)
            y_max = min(h, detection.y_max + padding)

            # Crop the region
            crop = image[y_min:y_max, x_min:x_max]

            # Handle multiple detections of same class (keep highest confidence)
            if detection.class_name in crops:
                # Compare with existing - keep this logic simple for now
                pass
            else:
                crops[detection.class_name] = crop

        return crops

    def detect_and_crop(
        self,
        image_path: str,
        confidence_threshold: float = DETECTION_CONFIDENCE_THRESHOLD,
        padding: int = 5,
    ) -> Tuple[List[Detection], Dict[str, np.ndarray]]:
        """
        Convenience method to detect and crop in one call.

        Args:
            image_path: Path to the image file
            confidence_threshold: Minimum confidence to include detection
            padding: Pixels to add around each crop

        Returns:
            Tuple of (list of detections, dict of cropped images)
        """
        # Load image
        image = cv2.imread(str(image_path))
        if image is None:
            raise ValueError(f"Could not load image: {image_path}")

        # Detect
        detections = self.detect(image_path, confidence_threshold)

        # Crop
        crops = self.crop_detections(image, detections, padding)

        return detections, crops


def load_image(image_path: str) -> np.ndarray:
    """Load an image from disk."""
    image = cv2.imread(str(image_path))
    if image is None:
        raise ValueError(f"Could not load image: {image_path}")
    return image


if __name__ == "__main__":
    # Test the detector
    import sys

    if len(sys.argv) < 2:
        print("Usage: python roboflow_detector.py <image_path>")
        sys.exit(1)

    image_path = sys.argv[1]

    try:
        detector = RoboflowDetector()
        detections, crops = detector.detect_and_crop(image_path)

        print(f"Found {len(detections)} detections:")
        for d in detections:
            print(f"  - {d.class_name}: {d.confidence:.2%} at {d.bbox}")

        print(f"\nCropped {len(crops)} regions")

    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)
