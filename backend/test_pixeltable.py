#!/usr/bin/env python3
"""
Test script for Pixeltable setup and basic operations.

Run this to verify Pixeltable is working correctly:
    cd backend
    python test_pixeltable.py
"""
import sys
from pathlib import Path
from datetime import datetime
import json

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent))


def test_pixeltable_import():
    """Test that Pixeltable can be imported."""
    print("=" * 60)
    print("TEST 1: Import Pixeltable")
    print("=" * 60)

    try:
        import pixeltable as pxt
        print(f"  Pixeltable version: {pxt.__version__}")
        print("  PASS")
        return True
    except ImportError as e:
        print(f"  FAIL: Could not import pixeltable: {e}")
        print("  Run: pip install pixeltable")
        return False


def test_create_directory():
    """Test creating a Pixeltable directory."""
    print("\n" + "=" * 60)
    print("TEST 2: Create Pixeltable Directory")
    print("=" * 60)

    try:
        import pixeltable as pxt

        test_dir = "test_box_label_ocr"

        # Clean up if exists
        try:
            pxt.drop_dir(test_dir, force=True)
        except:
            pass

        # Create directory
        pxt.create_dir(test_dir)
        print(f"  Created directory: {test_dir}")
        print("  PASS")
        return True
    except Exception as e:
        print(f"  FAIL: {e}")
        return False


def test_create_table():
    """Test creating a table with various column types."""
    print("\n" + "=" * 60)
    print("TEST 3: Create Table")
    print("=" * 60)

    try:
        import pixeltable as pxt

        table_path = "test_box_label_ocr.test_jobs"

        # Drop if exists
        try:
            pxt.drop_table(table_path, force=True)
        except:
            pass

        # Create table
        t = pxt.create_table(
            table_path,
            {
                "job_id": pxt.String,
                "engine": pxt.String,
                "status": pxt.String,
                "total_images": pxt.Int,
                "processed_images": pxt.Int,
                "accuracy": pxt.Float,
                "created_at": pxt.Timestamp,
            }
        )

        print(f"  Created table: {table_path}")
        print(f"  Columns: {list(t.column_names())}")
        print("  PASS")
        return True
    except Exception as e:
        print(f"  FAIL: {e}")
        return False


def test_insert_and_query():
    """Test inserting and querying data."""
    print("\n" + "=" * 60)
    print("TEST 4: Insert and Query Data")
    print("=" * 60)

    try:
        import pixeltable as pxt

        t = pxt.get_table("test_box_label_ocr.test_jobs")

        # Insert test data
        test_data = [
            {
                "job_id": "test-001",
                "engine": "easyocr",
                "status": "completed",
                "total_images": 100,
                "processed_images": 100,
                "accuracy": 0.85,
                "created_at": datetime.now(),
            },
            {
                "job_id": "test-002",
                "engine": "paddleocr",
                "status": "running",
                "total_images": 50,
                "processed_images": 25,
                "accuracy": 0.0,
                "created_at": datetime.now(),
            },
        ]

        t.insert(test_data)
        print(f"  Inserted {len(test_data)} rows")

        # Query all
        results = t.collect()
        print(f"  Query all: {len(results)} rows")

        # Query with filter
        completed = t.where(t.status == "completed").collect()
        print(f"  Query completed: {len(completed)} rows")

        # Query with select
        selected = t.select(t.job_id, t.engine, t.accuracy).collect()
        print(f"  Query select: {len(selected)} rows")

        print("  PASS")
        return True
    except Exception as e:
        print(f"  FAIL: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_update():
    """Test updating data."""
    print("\n" + "=" * 60)
    print("TEST 5: Update Data")
    print("=" * 60)

    try:
        import pixeltable as pxt

        t = pxt.get_table("test_box_label_ocr.test_jobs")

        # Update the running job
        t.update(
            {"status": "completed", "processed_images": 50, "accuracy": 0.92},
            where=(t.job_id == "test-002")
        )
        print("  Updated job test-002")

        # Verify update
        result = t.where(t.job_id == "test-002").collect()
        if len(result) > 0:
            df = result.to_pandas()
            row = df.iloc[0]
            print(f"  Verified: status={row['status']}, processed={row['processed_images']}, accuracy={row['accuracy']}")

        print("  PASS")
        return True
    except Exception as e:
        print(f"  FAIL: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_cleanup():
    """Clean up test data."""
    print("\n" + "=" * 60)
    print("TEST 6: Cleanup")
    print("=" * 60)

    try:
        import pixeltable as pxt

        pxt.drop_dir("test_box_label_ocr", force=True)
        print("  Cleaned up test directory")
        print("  PASS")
        return True
    except Exception as e:
        print(f"  FAIL: {e}")
        return False


def test_schema_setup():
    """Test the actual schema setup from pixeltable_schema.py."""
    print("\n" + "=" * 60)
    print("TEST 7: Schema Setup (pixeltable_schema.py)")
    print("=" * 60)

    try:
        from pixeltable_schema import setup_all_tables, PIXELTABLE_DIR
        import pixeltable as pxt

        # Setup tables
        setup_all_tables()
        print("  All tables created successfully")

        # Verify tables exist
        tables = ["inference_jobs", "image_results", "benchmark_results", "job_summaries"]
        for table_name in tables:
            t = pxt.get_table(f"{PIXELTABLE_DIR}.{table_name}")
            print(f"    {table_name}: {list(t.column_names())}")

        print("  PASS")
        return True
    except Exception as e:
        print(f"  FAIL: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("PIXELTABLE TEST SUITE")
    print("=" * 60)

    tests = [
        ("Import", test_pixeltable_import),
        ("Create Directory", test_create_directory),
        ("Create Table", test_create_table),
        ("Insert/Query", test_insert_and_query),
        ("Update", test_update),
        ("Cleanup", test_cleanup),
        ("Schema Setup", test_schema_setup),
    ]

    results = []
    for name, test_fn in tests:
        try:
            passed = test_fn()
            results.append((name, passed))
        except Exception as e:
            print(f"  FAIL (exception): {e}")
            results.append((name, False))

    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)

    passed = sum(1 for _, p in results if p)
    total = len(results)

    for name, p in results:
        status = "PASS" if p else "FAIL"
        print(f"  [{status}] {name}")

    print(f"\n  {passed}/{total} tests passed")

    if passed == total:
        print("\n  All tests passed! Pixeltable is ready.")
        return 0
    else:
        print("\n  Some tests failed. Check the output above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
