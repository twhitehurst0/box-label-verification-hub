"""
SmolVLM2 inference wrapper (Roboflow Serverless via inference_sdk).

Used by the FastAPI backend to run end-to-end OCR over the full image
(no detection/cropping required), returning a dict keyed by DETECTION_CLASSES.
"""

from __future__ import annotations

import json
import os
import re
from typing import Dict, Optional

from inference_sdk import InferenceHTTPClient

from config import (
    DETECTION_CLASSES,
    ROBOFLOW_API_KEY,
    SMOLVLM2_API_URL,
    SMOLVLM2_PROJECT,
    SMOLVLM2_VERSION,
)


class SmolVLM2Engine:
    """Wrapper for SmolVLM2 via Roboflow Inference SDK."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        project: Optional[str] = None,
        version: Optional[int] = None,
        api_url: Optional[str] = None,
    ):
        self.api_key = api_key or os.environ.get("ROBOFLOW_API_KEY", "") or ROBOFLOW_API_KEY
        self.project = project or os.environ.get("SMOLVLM2_PROJECT", "") or SMOLVLM2_PROJECT
        self.version = version or int(os.environ.get("SMOLVLM2_VERSION", "0") or SMOLVLM2_VERSION or 1)
        self.api_url = api_url or os.environ.get("SMOLVLM2_API_URL", "") or SMOLVLM2_API_URL

        if not self.api_key:
            raise ValueError("ROBOFLOW_API_KEY not set (required for SmolVLM2).")
        if not self.project:
            raise ValueError("SMOLVLM2_PROJECT not set.")
        if not self.version:
            raise ValueError("SMOLVLM2_VERSION not set.")
        if not self.api_url:
            raise ValueError("SMOLVLM2_API_URL not set.")

        self.client = InferenceHTTPClient(api_url=self.api_url, api_key=self.api_key)
        self.model_id = f"{self.project}/{self.version}"
        print(f"[SMOLVLM2] Initialized model_id={self.model_id} api_url={self.api_url}")

    def extract_all_fields(self, image_path: str) -> Dict[str, str]:
        """
        Extract all label fields from a full image using SmolVLM2.

        Returns a dict with keys = DETECTION_CLASSES (missing fields are empty strings).
        """
        fields_list = "\n".join(f"- {field}" for field in DETECTION_CLASSES)
        prompt = (
            "Extract the following fields from this box label image.\n"
            "Return a JSON object with these exact keys. If a field is not visible or cannot be read, use an empty string.\n\n"
            f"Fields to extract:\n{fields_list}\n\n"
            "Return ONLY valid JSON, no other text or explanation."
        )

        try:
            # Some inference-sdk versions support a 'prompt' kwarg for generative/VLM models.
            try:
                result = self.client.infer(inference_input=str(image_path), model_id=self.model_id, prompt=prompt)
            except TypeError:
                result = self.client.infer(inference_input=str(image_path), model_id=self.model_id)
            return self._parse_response(result)
        except Exception as e:
            print(f"[SMOLVLM2] Error during inference for {image_path}: {type(e).__name__}: {e}")
            return {field: "" for field in DETECTION_CLASSES}

    def _parse_response(self, result: object) -> Dict[str, str]:
        """Parse raw inference response into a DETECTION_CLASSES-keyed dict."""
        predictions: Dict[str, str] = {field: "" for field in DETECTION_CLASSES}

        try:
            response_text = ""

            if isinstance(result, dict):
                if "response" in result:
                    response_text = str(result["response"])
                elif "output" in result:
                    response_text = str(result["output"])
                elif "text" in result:
                    response_text = str(result["text"])
                elif "predictions" in result:
                    preds = result["predictions"]
                    if isinstance(preds, list) and len(preds) > 0:
                        if isinstance(preds[0], dict) and "response" in preds[0]:
                            response_text = str(preds[0]["response"])
                        elif isinstance(preds[0], str):
                            response_text = preds[0]
                else:
                    response_text = json.dumps(result)
            elif isinstance(result, str):
                response_text = result

            cleaned = response_text.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()

            if cleaned:
                try:
                    parsed = json.loads(cleaned)
                    if isinstance(parsed, dict):
                        for field in DETECTION_CLASSES:
                            if field in parsed:
                                predictions[field] = str(parsed[field])
                                continue
                            field_lower = field.lower().replace(" ", "_")
                            if field_lower in parsed:
                                predictions[field] = str(parsed[field_lower])
                except json.JSONDecodeError:
                    # Fallback: attempt "Field: value" extraction
                    for field in DETECTION_CLASSES:
                        # Avoid literal '}' in an f-string pattern; keep the value capture permissive.
                        pattern = rf'["\']?{re.escape(field)}["\']?\s*[:=]\s*["\']?([^"\'\n,]+)["\']?'
                        match = re.search(pattern, response_text, re.IGNORECASE)
                        if match:
                            predictions[field] = match.group(1).strip()

        except Exception as e:
            print(f"[SMOLVLM2] Error parsing response: {type(e).__name__}: {e}")

        return predictions


