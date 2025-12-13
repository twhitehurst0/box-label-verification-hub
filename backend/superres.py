"""
Super-Resolution Module for Box Label OCR

Provides 3 super-resolution preprocessing options using the ISR library:
- sr_fast_2x: RDN psnr-small (2x upscale, fast)
- sr_quality_2x: RDN psnr-large (2x upscale, better quality)
- sr_gans_4x: RRDN gans (4x upscale, best quality, slowest)

Models are lazy-loaded and cached to avoid repeated initialization.
"""

import numpy as np
from typing import Optional
import threading

# Global model cache with thread-safe lazy loading
_sr_models: dict = {}
_sr_lock = threading.Lock()

# Valid SR preprocessing types
SR_TYPES = ("sr_fast_2x", "sr_quality_2x", "sr_gans_4x")


def is_sr_preprocessing(preprocessing: str) -> bool:
    """Check if preprocessing is a super-resolution type."""
    return preprocessing in SR_TYPES


def get_sr_model(sr_type: str):
    """
    Load and cache a super-resolution model.
    
    Models are lazy-loaded on first use and cached for subsequent calls.
    Thread-safe via global lock.
    
    Args:
        sr_type: One of 'sr_fast_2x', 'sr_quality_2x', 'sr_gans_4x'
        
    Returns:
        ISR model instance (RDN or RRDN)
        
    Raises:
        ValueError: If sr_type is not recognized
    """
    if sr_type not in SR_TYPES:
        raise ValueError(f"Unknown SR type: {sr_type}. Must be one of {SR_TYPES}")
    
    with _sr_lock:
        if sr_type not in _sr_models:
            print(f"[SUPERRES] Loading model for {sr_type}...")
            
            # Import here to avoid loading TensorFlow at module import
            from ISR.models import RDN, RRDN
            
            if sr_type == "sr_fast_2x":
                # RDN psnr-small: C=3, D=10, 2x upscale
                _sr_models[sr_type] = RDN(weights='psnr-small')
            elif sr_type == "sr_quality_2x":
                # RDN psnr-large: C=6, D=20, 2x upscale
                _sr_models[sr_type] = RDN(weights='psnr-large')
            elif sr_type == "sr_gans_4x":
                # RRDN gans: ESRGAN-based, 4x upscale
                _sr_models[sr_type] = RRDN(weights='gans')
            
            print(f"[SUPERRES] Model {sr_type} loaded successfully")
        
        return _sr_models[sr_type]


def apply_superres(image: np.ndarray, sr_type: str, by_patch_of_size: Optional[int] = None) -> np.ndarray:
    """
    Apply super-resolution to an image.
    
    Args:
        image: Input image as numpy array (H, W, C) in RGB format, uint8
        sr_type: One of 'sr_fast_2x', 'sr_quality_2x', 'sr_gans_4x'
        by_patch_of_size: Optional patch size for memory-efficient processing
                          of large images. If None, processes entire image at once.
    
    Returns:
        Super-resolved image as numpy array (H*scale, W*scale, C), uint8
        
    Notes:
        - sr_fast_2x and sr_quality_2x produce 2x upscaled output
        - sr_gans_4x produces 4x upscaled output
        - For large images (>1000px), consider using by_patch_of_size=200
    """
    model = get_sr_model(sr_type)
    
    # Ensure image is in correct format (uint8, RGB)
    if image.dtype != np.uint8:
        image = (np.clip(image, 0, 255)).astype(np.uint8)
    
    # Handle grayscale images by converting to RGB
    if len(image.shape) == 2:
        image = np.stack([image, image, image], axis=-1)
    elif image.shape[2] == 1:
        image = np.concatenate([image, image, image], axis=-1)
    elif image.shape[2] == 4:
        # RGBA -> RGB (drop alpha)
        image = image[:, :, :3]
    
    # Run prediction
    if by_patch_of_size is not None:
        sr_image = model.predict(image, by_patch_of_size=by_patch_of_size)
    else:
        sr_image = model.predict(image)
    
    return sr_image


def get_sr_info(sr_type: str) -> dict:
    """
    Get information about a super-resolution type.
    
    Args:
        sr_type: One of 'sr_fast_2x', 'sr_quality_2x', 'sr_gans_4x'
        
    Returns:
        Dict with 'name', 'description', 'scale', 'model' keys
    """
    info = {
        "sr_fast_2x": {
            "name": "SR Fast 2x",
            "description": "Super-resolution 2x upscale (RDN small, fast)",
            "scale": 2,
            "model": "RDN psnr-small",
        },
        "sr_quality_2x": {
            "name": "SR Quality 2x",
            "description": "Super-resolution 2x upscale (RDN large, better quality)",
            "scale": 2,
            "model": "RDN psnr-large",
        },
        "sr_gans_4x": {
            "name": "SR GANS 4x",
            "description": "Super-resolution 4x upscale (ESRGAN, best quality)",
            "scale": 4,
            "model": "RRDN gans",
        },
    }
    return info.get(sr_type, {})
