"""
Image Preprocessing Module for OCR Quality Improvement

Based on Tesseract OCR quality improvement guidelines:
https://tesseract-ocr.github.io/tessdoc/ImproveQuality.html

Provides preprocessing functions to enhance OCR accuracy on cropped image regions.
"""
import cv2
import numpy as np
from typing import Dict, Callable, List


# Type alias for preprocessing functions
PreprocessingFunction = Callable[[np.ndarray], np.ndarray]


def preprocess_image(image: np.ndarray, preprocessing_type: str) -> np.ndarray:
    """
    Apply the specified preprocessing to an image crop.

    Args:
        image: Input image as numpy array (BGR format from cv2)
        preprocessing_type: One of the supported preprocessing types

    Returns:
        Preprocessed image as numpy array
    """
    preprocessors: Dict[str, PreprocessingFunction] = {
        "none": lambda x: x,
        "rescale": rescale_to_300dpi,
        "binarize_otsu": binarize_otsu,
        "binarize_adaptive": binarize_adaptive,
        "binarize_sauvola": binarize_sauvola,
        "denoise_gaussian": denoise_gaussian,
        "denoise_median": denoise_median,
        "dilation": apply_dilation,
        "erosion": apply_erosion,
        "deskew": deskew_image,
        "add_border": add_border,
        "invert": invert_image,
    }

    if preprocessing_type not in preprocessors:
        print(f"Warning: Unknown preprocessing type '{preprocessing_type}', using 'none'")
        return image

    try:
        return preprocessors[preprocessing_type](image)
    except Exception as e:
        print(f"Warning: Preprocessing '{preprocessing_type}' failed: {e}, returning original")
        return image


def get_available_preprocessing_options() -> List[Dict]:
    """Return list of available preprocessing options with metadata."""
    return [
        {
            "id": "none",
            "name": "None (Baseline)",
            "description": "Original image without preprocessing",
            "category": "baseline"
        },
        {
            "id": "rescale",
            "name": "Rescale to 300 DPI",
            "description": "Upscale image for better OCR accuracy",
            "category": "geometric"
        },
        {
            "id": "binarize_otsu",
            "name": "Otsu Binarization",
            "description": "Global thresholding for text extraction",
            "category": "binarization"
        },
        {
            "id": "binarize_adaptive",
            "name": "Adaptive Threshold",
            "description": "Local adaptive thresholding for uneven lighting",
            "category": "binarization"
        },
        {
            "id": "binarize_sauvola",
            "name": "Sauvola Binarization",
            "description": "Document-optimized local thresholding",
            "category": "binarization"
        },
        {
            "id": "denoise_gaussian",
            "name": "Gaussian Blur",
            "description": "Smooth noise with Gaussian filter",
            "category": "noise"
        },
        {
            "id": "denoise_median",
            "name": "Median Filter",
            "description": "Remove salt-and-pepper noise",
            "category": "noise"
        },
        {
            "id": "dilation",
            "name": "Dilation",
            "description": "Expand characters for thin text",
            "category": "morphological"
        },
        {
            "id": "erosion",
            "name": "Erosion",
            "description": "Shrink characters for heavy ink bleed",
            "category": "morphological"
        },
        {
            "id": "deskew",
            "name": "Deskew",
            "description": "Rotate to straighten text lines",
            "category": "geometric"
        },
        {
            "id": "add_border",
            "name": "Add Border",
            "description": "Add 10px white margin around text",
            "category": "geometric"
        },
        {
            "id": "invert",
            "name": "Invert Colors",
            "description": "Ensure dark text on light background",
            "category": "baseline"
        },
    ]


# =============================================================================
# Preprocessing Functions
# =============================================================================

def rescale_to_300dpi(image: np.ndarray, target_dpi: int = 300, assumed_dpi: int = 72) -> np.ndarray:
    """
    Rescale image assuming input DPI to target DPI.

    Tesseract works best on images with at least 300 DPI.
    """
    scale_factor = target_dpi / assumed_dpi
    height, width = image.shape[:2]
    new_size = (int(width * scale_factor), int(height * scale_factor))
    return cv2.resize(image, new_size, interpolation=cv2.INTER_CUBIC)


def binarize_otsu(image: np.ndarray) -> np.ndarray:
    """
    Apply Otsu's global thresholding.

    Best for images with bimodal histogram (clear foreground/background).
    """
    # Convert to grayscale if needed
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image

    # Apply Otsu's thresholding
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

    # Convert back to 3-channel for consistency
    return cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)


def binarize_adaptive(image: np.ndarray, block_size: int = 11, c: int = 2) -> np.ndarray:
    """
    Apply adaptive thresholding.

    Better for images with varying lighting conditions.
    """
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image

    # Ensure block_size is odd
    if block_size % 2 == 0:
        block_size += 1

    binary = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        block_size, c
    )

    return cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)


def binarize_sauvola(image: np.ndarray, window_size: int = 25, k: float = 0.5, r: float = 128) -> np.ndarray:
    """
    Apply Sauvola local thresholding.

    Document-optimized binarization that handles degraded documents well.
    Formula: T(x,y) = mean(x,y) * (1 + k * (std(x,y) / R - 1))
    """
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image.copy()

    # Ensure window_size is odd
    if window_size % 2 == 0:
        window_size += 1

    # Calculate local mean using box filter
    gray_float = gray.astype(np.float64)
    mean = cv2.boxFilter(gray_float, -1, (window_size, window_size))

    # Calculate local standard deviation
    sqmean = cv2.boxFilter(gray_float ** 2, -1, (window_size, window_size))
    std = np.sqrt(np.maximum(sqmean - mean ** 2, 0))

    # Sauvola threshold formula
    threshold = mean * (1 + k * (std / r - 1))

    # Apply threshold
    binary = (gray > threshold).astype(np.uint8) * 255

    return cv2.cvtColor(binary, cv2.COLOR_GRAY2BGR)


def denoise_gaussian(image: np.ndarray, kernel_size: int = 5) -> np.ndarray:
    """
    Apply Gaussian blur for noise removal.

    Good for general noise reduction while preserving edges somewhat.
    """
    # Ensure kernel_size is odd
    if kernel_size % 2 == 0:
        kernel_size += 1

    return cv2.GaussianBlur(image, (kernel_size, kernel_size), 0)


def denoise_median(image: np.ndarray, kernel_size: int = 5) -> np.ndarray:
    """
    Apply median filter for salt-and-pepper noise removal.

    Excellent for removing impulse noise while preserving edges.
    """
    # Ensure kernel_size is odd
    if kernel_size % 2 == 0:
        kernel_size += 1

    return cv2.medianBlur(image, kernel_size)


def apply_dilation(image: np.ndarray, kernel_size: int = 2, iterations: int = 1) -> np.ndarray:
    """
    Dilate image to expand thin text characters.

    Useful for text that appears too thin or broken.
    """
    kernel = np.ones((kernel_size, kernel_size), np.uint8)
    return cv2.dilate(image, kernel, iterations=iterations)


def apply_erosion(image: np.ndarray, kernel_size: int = 2, iterations: int = 1) -> np.ndarray:
    """
    Erode image to shrink heavy ink bleed.

    Useful for historical documents with ink bleeding or bold text.
    """
    kernel = np.ones((kernel_size, kernel_size), np.uint8)
    return cv2.erode(image, kernel, iterations=iterations)


def deskew_image(image: np.ndarray) -> np.ndarray:
    """
    Detect and correct skew angle using Hough transform.

    Straightens rotated text for better line segmentation.
    """
    # Convert to grayscale
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image.copy()

    # Edge detection
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)

    # Detect lines using Probabilistic Hough Transform
    lines = cv2.HoughLinesP(
        edges, 1, np.pi / 180,
        threshold=100,
        minLineLength=min(image.shape[:2]) // 4,
        maxLineGap=10
    )

    if lines is None or len(lines) == 0:
        return image

    # Calculate angles of detected lines
    angles = []
    for line in lines:
        x1, y1, x2, y2 = line[0]
        angle = np.degrees(np.arctan2(y2 - y1, x2 - x1))
        # Only consider near-horizontal lines (within 45 degrees)
        if abs(angle) < 45:
            angles.append(angle)

    if not angles:
        return image

    # Use median angle to be robust to outliers
    avg_angle = np.median(angles)

    # Skip if angle is very small
    if abs(avg_angle) < 0.5:
        return image

    # Rotate image
    (h, w) = image.shape[:2]
    center = (w // 2, h // 2)
    rotation_matrix = cv2.getRotationMatrix2D(center, avg_angle, 1.0)

    rotated = cv2.warpAffine(
        image, rotation_matrix, (w, h),
        flags=cv2.INTER_CUBIC,
        borderMode=cv2.BORDER_REPLICATE
    )

    return rotated


def add_border(image: np.ndarray, border_size: int = 10, color: tuple = (255, 255, 255)) -> np.ndarray:
    """
    Add white border around image.

    Tesseract performs better with some margin around text.
    """
    return cv2.copyMakeBorder(
        image,
        border_size, border_size, border_size, border_size,
        cv2.BORDER_CONSTANT,
        value=color
    )


def invert_image(image: np.ndarray) -> np.ndarray:
    """
    Invert colors if image has light text on dark background.

    Tesseract 4+ works best with dark text on light background.
    """
    # Convert to grayscale to check intensity
    if len(image.shape) == 3:
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    else:
        gray = image

    # Check if image is predominantly dark (light text on dark bg)
    mean_intensity = np.mean(gray)

    if mean_intensity < 127:
        # Dark background, invert the image
        return cv2.bitwise_not(image)

    return image


# =============================================================================
# Utility Functions
# =============================================================================

def apply_multiple_preprocessing(image: np.ndarray, preprocessing_types: List[str]) -> np.ndarray:
    """
    Apply multiple preprocessing steps in sequence.

    Args:
        image: Input image
        preprocessing_types: List of preprocessing types to apply in order

    Returns:
        Preprocessed image
    """
    result = image.copy()
    for preprocessing_type in preprocessing_types:
        result = preprocess_image(result, preprocessing_type)
    return result
