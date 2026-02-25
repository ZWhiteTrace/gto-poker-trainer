#!/usr/bin/env python3
"""
E2E test runner using Playwright.
This script is designed to be run with the with_server.py helper.
"""

import subprocess
import sys
import os


def main():
    # Change to the web app directory
    web_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    os.chdir(web_dir)

    # Run Playwright tests
    result = subprocess.run(
        [
            "npx",
            "playwright",
            "test",
            "--config=e2e/playwright.config.ts",
            "--reporter=list",
        ],
        capture_output=False,
        text=True,
    )

    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
