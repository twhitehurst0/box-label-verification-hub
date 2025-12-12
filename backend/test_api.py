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
import os
import requests

API_BASE = os.environ.get("API_BASE", "http://localhost:8000").rstrip("/")
JOB_TIMEOUT_SECONDS = int(os.environ.get("JOB_TIMEOUT_SECONDS", "900") or "900")
EXPECTED_TOTAL_IMAGES = os.environ.get("EXPECTED_TOTAL_IMAGES", "").strip()
EXPECTED_TOTAL_IMAGES_INT = int(EXPECTED_TOTAL_IMAGES) if EXPECTED_TOTAL_IMAGES.isdigit() else None


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
        engine = os.environ.get("ENGINE", "easyocr")
        preprocessing = os.environ.get("PREPROCESSING", "none")
        use_gpu_env = os.environ.get("USE_GPU", "1").strip().lower()
        use_gpu = use_gpu_env in ("1", "true", "yes", "y", "on")

        payload = {
            "engine": engine,
            "dataset_version": dataset_version,
            "dataset_name": "default",
            "preprocessing": preprocessing,
            "use_gpu": use_gpu,
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


def test_start_batch_inference(dataset_version: str, preprocessing_options: list[str]):
    """Test starting a batch inference job."""
    print("\n" + "=" * 60)
    print("TEST 5B: Start Batch Inference")
    print("=" * 60)

    try:
        engine = os.environ.get("ENGINE", "easyocr")
        use_gpu_env = os.environ.get("USE_GPU", "1").strip().lower()
        use_gpu = use_gpu_env in ("1", "true", "yes", "y", "on")

        payload = {
            "engine": engine,
            "dataset_version": dataset_version,
            "dataset_name": "default",
            "preprocessing_options": preprocessing_options,
            "use_gpu": use_gpu,
        }
        print(f"  Request: {json.dumps(payload)}")

        res = requests.post(f"{API_BASE}/inference/start-batch", json=payload)
        data = res.json()
        print(f"  Status: {res.status_code}")
        print(f"  Response: {json.dumps(data, indent=2)}")

        if data.get("success") and data.get("job_ids"):
            print("  PASS")
            return True, list(data["job_ids"])

        print("  FAIL: Batch jobs not created")
        return False, []
    except Exception as e:
        print(f"  FAIL: {e}")
        return False, []


def test_wait_for_batch_completion(job_ids: list[str], timeout: int = 1200):
    """Wait for a batch of jobs to complete by polling the jobs list."""
    print("\n" + "=" * 60)
    print("TEST 7B: Wait for Batch Completion")
    print("=" * 60)

    start_time = time.time()
    last_report = {}

    while time.time() - start_time < timeout:
        try:
            res = requests.get(f"{API_BASE}/inference/jobs", params={"limit": 200})
            all_jobs = res.json()
            by_id = {j.get("job_id"): j for j in (all_jobs or [])}

            # Report progress changes
            done = 0
            failed = 0
            for jid in job_ids:
                j = by_id.get(jid)
                if not j:
                    continue
                status = j.get("status")
                processed = j.get("processed_images", 0)
                total = j.get("total_images", 0)
                key = f"{status}:{processed}/{total}"
                if last_report.get(jid) != key:
                    print(f"  - {jid[:8]}... {j.get('preprocessing','')} {status} {processed}/{total}")
                    last_report[jid] = key
                if status in ("completed", "failed"):
                    done += 1
                if status == "failed":
                    failed += 1

            if done == len(job_ids):
                print(f"  Batch finished: completed={len(job_ids) - failed} failed={failed}")
                if failed != 0:
                    return False

                if EXPECTED_TOTAL_IMAGES_INT is not None:
                    # Validate each job processed the expected number of images
                    for jid in job_ids:
                        j = by_id.get(jid)
                        if not j:
                            print(f"  WARNING: Job {jid[:8]}... not found in jobs list for validation")
                            continue
                        total = int(j.get("total_images", 0) or 0)
                        processed = int(j.get("processed_images", 0) or 0)
                        if total != EXPECTED_TOTAL_IMAGES_INT or processed != EXPECTED_TOTAL_IMAGES_INT:
                            print(
                                f"  FAIL - {jid[:8]}... processed={processed} total={total} "
                                f"(expected {EXPECTED_TOTAL_IMAGES_INT})"
                            )
                            return False

                return True

            time.sleep(5)
        except Exception as e:
            print(f"  Error checking batch status: {e}")
            time.sleep(5)

    print("  FAIL - Timeout waiting for batch completion")
    return False


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
            processed = data.get("processed_images", 0)
            total = data.get("total_images", 0)

            if progress != last_progress:
                print(f"  Progress: {progress:.1f}% ({status}) {processed}/{total}")
                last_progress = progress

            if status == "completed":
                if total and processed == total:
                    if EXPECTED_TOTAL_IMAGES_INT is not None and total != EXPECTED_TOTAL_IMAGES_INT:
                        print(f"  FAIL - Completed but total_images={total} (expected {EXPECTED_TOTAL_IMAGES_INT})")
                        return False
                    print("  PASS - Job completed with all images processed!")
                    return True
                print(f"  FAIL - Job marked completed but processed={processed} total={total}")
                return False
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

        run_batch = os.environ.get("RUN_BATCH", "0").strip().lower() in ("1", "true", "yes", "y", "on")

        if run_batch:
            # Build preprocessing list
            preprocessing_raw = os.environ.get("BATCH_PREPROCESSING_OPTIONS", "").strip()
            if preprocessing_raw:
                preprocessing_options = [p.strip() for p in preprocessing_raw.split(",") if p.strip()]
            else:
                # Default: use all preprocessing options from the backend
                try:
                    opts_res = requests.get(f"{API_BASE}/preprocessing-options")
                    opts = opts_res.json()
                    preprocessing_options = [o.get("id") for o in (opts or []) if o.get("id")]
                except Exception:
                    preprocessing_options = ["none", "rescale"]

            print(f"\n  Batch preprocessing options ({len(preprocessing_options)}): {preprocessing_options}")
            success, job_ids = test_start_batch_inference(dataset_version, preprocessing_options)
            if success and job_ids:
                print("\n  [Set SKIP_WAIT=1 to skip waiting for batch completion]")
                if os.environ.get("SKIP_WAIT") != "1":
                    test_wait_for_batch_completion(job_ids, timeout=JOB_TIMEOUT_SECONDS)
                else:
                    print("  Skipping wait (SKIP_WAIT=1)")
        else:
            # Test 5: Start inference
            success, job_id = test_start_inference(dataset_version)

            if success and job_id:
                # Test 6: Check status
                test_job_status(job_id)

                # Test 7: Wait for completion (skip if you want quick tests)
                print("\n  [Set SKIP_WAIT=1 to skip waiting for job completion]")
                if os.environ.get("SKIP_WAIT") != "1":
                    if test_wait_for_completion(job_id, timeout=JOB_TIMEOUT_SECONDS):
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
