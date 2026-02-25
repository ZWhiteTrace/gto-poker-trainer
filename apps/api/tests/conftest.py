"""
Pytest configuration and fixtures for API tests.
"""

import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

import pytest
from fastapi.testclient import TestClient

from main import app


@pytest.fixture
def client():
    """Create a test client for the FastAPI app."""
    return TestClient(app)


@pytest.fixture
def sample_rfi_hands():
    """Sample hands for RFI testing."""
    return [
        ("AA", "UTG", True),  # Always raise
        ("72o", "UTG", False),  # Never raise
        ("KQs", "BTN", True),  # Raise on button
        ("T8s", "UTG", False),  # Fold from UTG
        ("T8s", "BTN", True),  # Raise from BTN
    ]


@pytest.fixture
def sample_push_fold_hands():
    """Sample hands for push/fold testing."""
    return [
        ("AA", "BTN", "10bb", True),  # Always push
        ("72o", "BTN", "10bb", False),  # Never push
        ("A5s", "SB", "8bb", True),  # Push from SB short
        ("K2o", "UTG", "15bb", False),  # Fold from UTG
    ]
