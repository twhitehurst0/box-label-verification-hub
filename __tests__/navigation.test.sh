#!/bin/bash
# Navigation Tests
# Run with: bash __tests__/navigation.test.sh

BASE_URL="${1:-http://localhost:3007}"
PASS=0
FAIL=0

echo "========================================"
echo "Navigation Tests"
echo "Base URL: $BASE_URL"
echo "========================================"
echo ""

# Test 1: Projects page loads
echo "Test 1: Projects page returns 200..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/projects")
if [ "$STATUS" = "200" ]; then
    echo "  ✓ PASS: /projects returns 200"
    PASS=$((PASS + 1))
else
    echo "  ✗ FAIL: /projects returns $STATUS (expected 200)"
    FAIL=$((FAIL + 1))
fi

# Test 2: OCR page loads
echo "Test 2: OCR page returns 200..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/ocr")
if [ "$STATUS" = "200" ]; then
    echo "  ✓ PASS: /ocr returns 200"
    PASS=$((PASS + 1))
else
    echo "  ✗ FAIL: /ocr returns $STATUS (expected 200)"
    FAIL=$((FAIL + 1))
fi

# Test 3: Test-nav page loads
echo "Test 3: Test navigation page returns 200..."
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/test-nav")
if [ "$STATUS" = "200" ]; then
    echo "  ✓ PASS: /test-nav returns 200"
    PASS=$((PASS + 1))
else
    echo "  ✗ FAIL: /test-nav returns $STATUS (expected 200)"
    FAIL=$((FAIL + 1))
fi

# Test 4: Projects page contains href="/ocr"
echo "Test 4: Projects page contains link to /ocr..."
HTML=$(curl -s "$BASE_URL/projects")
if echo "$HTML" | grep -q 'href="/ocr"'; then
    echo "  ✓ PASS: Found href=\"/ocr\" in projects page"
    PASS=$((PASS + 1))
else
    echo "  ✗ FAIL: href=\"/ocr\" not found in projects page"
    FAIL=$((FAIL + 1))
fi

# Test 5: Projects page contains ENTER button text
echo "Test 5: Projects page contains ENTER button..."
if echo "$HTML" | grep -q 'ENTER'; then
    echo "  ✓ PASS: Found ENTER text in projects page"
    PASS=$((PASS + 1))
else
    echo "  ✗ FAIL: ENTER text not found in projects page"
    FAIL=$((FAIL + 1))
fi

# Test 6: Test-nav page has all navigation methods
echo "Test 6: Test-nav page contains all navigation test links..."
TEST_HTML=$(curl -s "$BASE_URL/test-nav")
TESTS_FOUND=0
if echo "$TEST_HTML" | grep -q 'href="/ocr"'; then
    TESTS_FOUND=$((TESTS_FOUND + 1))
fi
if echo "$TEST_HTML" | grep -q 'router.push'; then
    TESTS_FOUND=$((TESTS_FOUND + 1))
fi
if echo "$TEST_HTML" | grep -q 'window.location'; then
    TESTS_FOUND=$((TESTS_FOUND + 1))
fi
if [ "$TESTS_FOUND" -ge 2 ]; then
    echo "  ✓ PASS: Found $TESTS_FOUND navigation methods in test-nav page"
    PASS=$((PASS + 1))
else
    echo "  ✗ FAIL: Only found $TESTS_FOUND navigation methods"
    FAIL=$((FAIL + 1))
fi

echo ""
echo "========================================"
echo "Results: $PASS passed, $FAIL failed"
echo "========================================"

if [ "$FAIL" -gt 0 ]; then
    exit 1
fi
exit 0
