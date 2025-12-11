#!/usr/bin/env python3
"""
Test script for the FastAPI backend.

Run this to verify the API endpoints are working:
    cd backend
    python test_api.py

Prerequisites:
    1. Install dependencies: pip install -r requirements.txt
    2. Start the server: python main.py (in another terminal)
"""
import sys
import json
import time
import requests

API_BASE = "http://localhost:8000"


def test_health():
    """Test health endpoint."""
    print("=" * 60)
    print("TEST 1: Health Check")
    print("=" * 60)

    try:
        res = requests.get(f"{API_BASE}/health")
        data = res.json()
        print(f"  Status: {res.status_code}")
        print(f"  Response: {json.dumps(data, indent=2)}")
        assert res.status_code == 200
        assert data["status"] == "healthy"
        print("  PASS")
        return True
    except requests.ConnectionError:
        print("  FAIL: Could not connect to API")
        print("  Make sure the server is running: python main.py")
        return False
    except Exception as e:
        print(f"  FAIL: {e}")
        return False


def test_list_datasets():
    """Test listing datasets."""
    print("\n" + "=" * 60)
    print("TEST 2: List Datasets")
    print("=" * 60)

    try:
        res = requests.get(f"{API_BASE}/datasets")
        data = res.json()
        print(f"  Status: {res.status_code}")
        print(f"  Found {len(data)} datasets")
        for ds in data:
            print(f"    - {ds['version']}: {ds['image_count']} images, GT: {ds['has_ground_truth']}")
        print("  PASS")
        return True, data
    except Exception as e:
        print(f"  FAIL: {e}")
        return False, []


def test_list_ocr_engines():
    """Test listing OCR engines."""
    print("\n" + "=" * 60)
    print("TEST 3: List OCR Engines")
    print("=" * 60)

    try:
        res = requests.get(f"{API_BASE}/ocr-engines")
        data = res.json()
        print(f"  Status: {res.status_code}")
        print(f"  Found {len(data)} engines:")
        for eng in data:
            print(f"    - {eng['id']}: {eng['name']}")
        print("  PASS")
        return True
    except Exception as e:
        print(f"  FAIL: {e}")
        return False


def test_list_jobs():
    """Test listing jobs."""
    print("\n" + "=" * 60)
    print("TEST 4: List Jobs")
    print("=" * 60)

    try:
        res = requests.get(f"{API_BASE}/inference/jobs")
        data = res.json()
        print(f"  Status: {res.status_code}")
        print(f"  Found {len(data)} jobs")
        for job in data[:5]:  # Show first 5
            print(f"    - {job['job_id'][:8]}...: {job['engine']} / {job['status']}")
        print("  PASS")
        return True
    except Exception as e:
        print(f"  FAIL: {e}")
        return False


def test_start_inference(dataset_version: str):
    """Test starting an inference job."""
    print("\n" + "=" * 60)
    print("TEST 5: Start Inference")
    print("=" * 60)

    try:
        payload = {
            "engine": "easyocr",
            "dataset_version": dataset_version,
            "dataset_name": "default",
        }
        print(f"  Request: {json.dumps(payload)}")

        res = requests.post(f"{API_BASE}/inference/start", json=payload)
        data = res.json()
        print(f"  Status: {res.status_code}")
        print(f"  Response: {json.dumps(data, indent=2)}")

        if data.get("success") and data.get("job_id"):
            print("  PASS")
            return True, data["job_id"]
        else:
            print("  FAIL: Job not created")
            return False, None
    except Exception as e:
        print(f"  FAIL: {e}")
        return False, None


def test_job_status(job_id: str):
    """Test getting job status."""
    print("\n" + "=" * 60)
    print("TEST 6: Job Status")
    print("=" * 60)

    try:
        res = requests.get(f"{API_BASE}/inference/jobs/{job_id}/status")
        data = res.json()
        print(f"  Status: {res.status_code}")
        print(f"  Job Status: {data.get('status')}")
        print(f"  Progress: {data.get('progress', 0):.1f}%")
        print("  PASS")
        return True, data
    except Exception as e:
        print(f"  FAIL: {e}")
        return False, None


def test_wait_for_completion(job_id: str, timeout: int = 120):
    """Wait for a job to complete."""
    print("\n" + "=" * 60)
    print("TEST 7: Wait for Job Completion")
    print("=" * 60)

    start_time = time.time()
    last_progress = -1

    while time.time() - start_time < timeout:
        try:
            res = requests.get(f"{API_BASE}/inference/jobs/{job_id}/status")
            data = res.json()

            progress = data.get("progress", 0)
            status = data.get("status", "unknown")

            if progress != last_progress:
                print(f"  Progress: {progress:.1f}% ({status})")
                last_progress = progress

            if status == "completed":
                print("  PASS - Job completed!")
                return True
            elif status == "failed":
                print(f"  FAIL - Job failed: {data.get('error_message')}")
                return False

            time.sleep(2)
        except Exception as e:
            print(f"  Error checking status: {e}")
            time.sleep(2)

    print("  FAIL - Timeout waiting for job")
    return False


def test_job_results(job_id: str):
    """Test getting job results."""
    print("\n" + "=" * 60)
    print("TEST 8: Job Results")
    print("=" * 60)

    try:
        res = requests.get(f"{API_BASE}/inference/jobs/{job_id}/results")
        data = res.json()
        print(f"  Status: {res.status_code}")

        if "summary" in data and data["summary"]:
            summary = data["summary"]
            print(f"  Total Images: {summary.get('total_images')}")
            print(f"  Exact Match Rate: {summary.get('overall_exact_match_rate', 0)*100:.1f}%")
            print(f"  Normalized Match Rate: {summary.get('overall_normalized_match_rate', 0)*100:.1f}%")
            print(f"  Average CER: {summary.get('overall_cer', 0):.3f}")
            print("  PASS")
            return True
        else:
            print("  No summary available (may be expected if no ground truth)")
            print("  PASS (partial)")
            return True
    except Exception as e:
        print(f"  FAIL: {e}")
        return False


def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("FASTAPI BACKEND TEST SUITE")
    print("=" * 60)
    print(f"API Base: {API_BASE}")

    # Test 1: Health
    if not test_health():
        print("\n" + "=" * 60)
        print("Cannot connect to API. Make sure the server is running.")
        print("Start it with: cd backend && python main.py")
        print("=" * 60)
        return 1

    # Test 2: List datasets
    success, datasets = test_list_datasets()
    if not success or not datasets:
        print("\n  WARNING: No datasets found. Skipping inference tests.")
        print("  Add test images to test_data_OCR/version-X/images/")

    # Test 3: List OCR engines
    test_list_ocr_engines()

    # Test 4: List jobs
    test_list_jobs()

    # Only run inference tests if we have datasets
    if datasets:
        dataset_version = datasets[0]["version"]
        print(f"\n  Using dataset: {dataset_version}")

        # Test 5: Start inference
        success, job_id = test_start_inference(dataset_version)

        if success and job_id:
            # Test 6: Check status
            test_job_status(job_id)

            # Test 7: Wait for completion (skip if you want quick tests)
            print("\n  [Set SKIP_WAIT=1 to skip waiting for job completion]")
            import os
            if os.environ.get("SKIP_WAIT") != "1":
                if test_wait_for_completion(job_id):
                    # Test 8: Get results
                    test_job_results(job_id)
            else:
                print("  Skipping wait (SKIP_WAIT=1)")

    print("\n" + "=" * 60)
    print("TEST SUITE COMPLETE")
    print("=" * 60)
    return 0


if __name__ == "__main__":
    sys.exit(main())
