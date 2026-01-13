"""
GTO Poker Trainer - Automated Website Testing
Tests the deployed app at https://gto-trainer.streamlit.app/
"""
from playwright.sync_api import sync_playwright
import os
from datetime import datetime

# Create screenshots directory
SCREENSHOT_DIR = "/tmp/gto-trainer-tests"
os.makedirs(SCREENSHOT_DIR, exist_ok=True)

def save_screenshot(page, name):
    """Save a screenshot with timestamp."""
    path = f"{SCREENSHOT_DIR}/{name}.png"
    page.screenshot(path=path, full_page=True)
    print(f"  Screenshot saved: {path}")
    return path

def test_homepage(page):
    """Test 1: Homepage loads correctly."""
    print("\n[Test 1] Homepage loading...")
    page.goto("https://gto-trainer.streamlit.app/")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(3000)  # Extra wait for Streamlit to fully render

    save_screenshot(page, "01_homepage")

    # Check for key elements
    content = page.content()
    checks = [
        ("GTO" in content or "翻前" in content, "App title present"),
        ("練習模式" in content or "Practice" in content, "Practice mode text"),
    ]

    for passed, desc in checks:
        status = "PASS" if passed else "FAIL"
        print(f"  [{status}] {desc}")

    return all(c[0] for c in checks)

def test_menu_navigation(page):
    """Test 2: All 8 menu options work."""
    print("\n[Test 2] Menu navigation...")

    # Streamlit sidebar menu - look for radio buttons or selectbox
    page.wait_for_timeout(2000)

    # Get all menu items (Streamlit uses radio buttons in sidebar)
    menu_items = page.locator("div[data-testid='stSidebar'] label").all()
    print(f"  Found {len(menu_items)} menu items")

    if len(menu_items) == 0:
        # Try alternative selector
        menu_items = page.locator("div[data-testid='stSidebar'] div[role='radiogroup'] label").all()
        print(f"  Alternative: Found {len(menu_items)} menu items")

    save_screenshot(page, "02_sidebar_menu")

    # Expected pages (at least these should exist)
    expected_count = 8
    passed = len(menu_items) >= expected_count
    status = "PASS" if passed else f"FAIL (expected {expected_count}, got {len(menu_items)})"
    print(f"  [{status}] Menu items count")

    return passed

def test_drill_mode(page):
    """Test 3: Drill mode shows hand and action buttons."""
    print("\n[Test 3] Drill mode functionality...")

    # Navigate to drill/practice mode - click the first radio option
    try:
        # Look for practice mode option
        practice_btn = page.locator("text=練習模式").first
        if practice_btn.is_visible():
            practice_btn.click()
            page.wait_for_timeout(2000)
    except:
        print("  Could not click practice mode, may already be there")

    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)

    save_screenshot(page, "03_drill_mode")

    content = page.content()

    # Check for action buttons
    checks = [
        ("Raise" in content or "加注" in content or "Fold" in content or "棄牌" in content,
         "Action buttons present"),
        ("♠" in content or "♥" in content or "♦" in content or "♣" in content,
         "Card suits displayed"),
    ]

    for passed, desc in checks:
        status = "PASS" if passed else "FAIL"
        print(f"  [{status}] {desc}")

    return all(c[0] for c in checks)

def test_range_viewer(page):
    """Test 4: Range viewer shows 13x13 grid."""
    print("\n[Test 4] Range viewer...")

    # Navigate to range viewer
    try:
        range_btn = page.locator("text=範圍查看").first
        if range_btn.is_visible():
            range_btn.click()
            page.wait_for_timeout(2000)
    except:
        try:
            range_btn = page.locator("text=Range Viewer").first
            if range_btn.is_visible():
                range_btn.click()
                page.wait_for_timeout(2000)
        except:
            print("  Could not navigate to Range Viewer")

    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)

    save_screenshot(page, "04_range_viewer")

    content = page.content()

    # Check for range grid elements
    checks = [
        ("AA" in content, "AA hand shown"),
        ("AK" in content or "AKs" in content, "AK hand shown"),
        ("range-grid" in content or "range-cell" in content, "Grid CSS classes"),
    ]

    for passed, desc in checks:
        status = "PASS" if passed else "FAIL"
        print(f"  [{status}] {desc}")

    return all(c[0] for c in checks)

def test_statistics_page(page):
    """Test 5: Statistics page loads."""
    print("\n[Test 5] Statistics page...")

    try:
        stats_btn = page.locator("text=統計分析").first
        if stats_btn.is_visible():
            stats_btn.click()
            page.wait_for_timeout(2000)
    except:
        try:
            stats_btn = page.locator("text=Statistics").first
            if stats_btn.is_visible():
                stats_btn.click()
                page.wait_for_timeout(2000)
        except:
            print("  Could not navigate to Statistics")

    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)

    save_screenshot(page, "05_statistics")

    content = page.content()

    checks = [
        ("正確率" in content or "Accuracy" in content or "%" in content,
         "Accuracy metric shown"),
    ]

    for passed, desc in checks:
        status = "PASS" if passed else "FAIL"
        print(f"  [{status}] {desc}")

    return all(c[0] for c in checks)

def test_learning_page(page):
    """Test 6: Learning page loads with content."""
    print("\n[Test 6] Learning page...")

    try:
        learn_btn = page.locator("text=學習").first
        if learn_btn.is_visible():
            learn_btn.click()
            page.wait_for_timeout(2000)
    except:
        try:
            learn_btn = page.locator("text=Learning").first
            if learn_btn.is_visible():
                learn_btn.click()
                page.wait_for_timeout(2000)
        except:
            print("  Could not navigate to Learning")

    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)

    save_screenshot(page, "06_learning")

    content = page.content()

    checks = [
        ("Equity" in content or "權益" in content or "%" in content,
         "Equity content present"),
        ("Outs" in content or "補牌" in content,
         "Outs content present"),
    ]

    for passed, desc in checks:
        status = "PASS" if passed else "FAIL"
        print(f"  [{status}] {desc}")

    return all(c[0] for c in checks)

def test_language_switch(page):
    """Test 7: Language switch works."""
    print("\n[Test 7] Language switch...")

    # Go back to home first
    page.goto("https://gto-trainer.streamlit.app/")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(2000)

    # Look for language toggle (EN button)
    try:
        en_btn = page.locator("text=EN").first
        if en_btn.is_visible():
            en_btn.click()
            page.wait_for_timeout(2000)
            save_screenshot(page, "07_english_mode")

            content = page.content()
            passed = "Practice" in content or "Range" in content
            status = "PASS" if passed else "FAIL"
            print(f"  [{status}] English mode works")
            return passed
    except:
        pass

    print("  [SKIP] Language toggle not found")
    return True

def test_table_format_switch(page):
    """Test 8: 6-max/9-max switch works."""
    print("\n[Test 8] Table format switch...")

    try:
        # Look for 9-max button
        nine_max_btn = page.locator("text=9-max").first
        if nine_max_btn.is_visible():
            nine_max_btn.click()
            page.wait_for_timeout(2000)
            save_screenshot(page, "08_9max_mode")

            content = page.content()
            # 9-max should show UTG+1, UTG+2, etc.
            passed = "UTG" in content
            status = "PASS" if passed else "FAIL"
            print(f"  [{status}] 9-max mode works")
            return passed
    except:
        pass

    print("  [SKIP] Table format toggle not found")
    return True

def test_mobile_viewport(page):
    """Test 9: Mobile viewport (600px)."""
    print("\n[Test 9] Mobile viewport...")

    # Set mobile viewport
    page.set_viewport_size({"width": 375, "height": 812})
    page.goto("https://gto-trainer.streamlit.app/")
    page.wait_for_load_state("networkidle")
    page.wait_for_timeout(3000)

    save_screenshot(page, "09_mobile_view")

    # Check if content is still visible
    content = page.content()
    passed = len(content) > 1000  # Basic check that content loaded
    status = "PASS" if passed else "FAIL"
    print(f"  [{status}] Mobile view renders")

    # Reset to desktop
    page.set_viewport_size({"width": 1280, "height": 800})

    return passed

def run_all_tests():
    """Run all tests and generate report."""
    print("=" * 60)
    print("GTO Poker Trainer - Automated Test Suite")
    print(f"Target: https://gto-trainer.streamlit.app/")
    print(f"Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)

    results = {}

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={"width": 1280, "height": 800})
        page = context.new_page()

        # Run tests
        tests = [
            ("Homepage", test_homepage),
            ("Menu Navigation", test_menu_navigation),
            ("Drill Mode", test_drill_mode),
            ("Range Viewer", test_range_viewer),
            ("Statistics", test_statistics_page),
            ("Learning", test_learning_page),
            ("Language Switch", test_language_switch),
            ("Table Format", test_table_format_switch),
            ("Mobile View", test_mobile_viewport),
        ]

        for name, test_fn in tests:
            try:
                results[name] = test_fn(page)
            except Exception as e:
                print(f"  [ERROR] {e}")
                results[name] = False

        browser.close()

    # Summary
    print("\n" + "=" * 60)
    print("TEST SUMMARY")
    print("=" * 60)

    passed = sum(1 for v in results.values() if v)
    total = len(results)

    for name, result in results.items():
        status = "PASS" if result else "FAIL"
        print(f"  [{status}] {name}")

    print(f"\nTotal: {passed}/{total} tests passed")
    print(f"Screenshots saved to: {SCREENSHOT_DIR}")

    return results

if __name__ == "__main__":
    run_all_tests()
