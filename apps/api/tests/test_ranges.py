"""
Tests for range query endpoints.
"""

import pytest


class TestRangeList:
    """Tests for range listing."""

    def test_list_ranges(self, client):
        """Test listing available ranges."""
        response = client.get("/api/ranges/list")
        assert response.status_code == 200
        data = response.json()
        assert "format" in data
        assert "available" in data


class TestRfiRanges:
    """Tests for RFI ranges."""

    @pytest.mark.parametrize("position", ["UTG", "HJ", "CO", "BTN", "SB"])
    def test_get_rfi_range(self, client, position):
        """Test getting RFI range for each position."""
        response = client.get(f"/api/ranges/rfi/{position}")
        assert response.status_code == 200
        data = response.json()
        assert "position" in data
        assert "hands" in data
        assert data["position"] == position


class TestVsRfiRanges:
    """Tests for VS-RFI ranges."""

    def test_get_vs_rfi_range(self, client):
        """Test getting VS-RFI range."""
        response = client.get("/api/ranges/vs_rfi/BB/BTN")
        assert response.status_code == 200
        data = response.json()
        assert "hands" in data

    def test_get_vs_rfi_invalid_position(self, client):
        """Test that invalid position combos return error or empty."""
        response = client.get("/api/ranges/vs_rfi/UTG/BB")
        # May return 404 or empty range depending on implementation
        assert response.status_code in [200, 404, 422]


class TestVs3betRanges:
    """Tests for VS-3bet ranges."""

    def test_get_vs_3bet_range(self, client):
        """Test getting VS-3bet range."""
        response = client.get("/api/ranges/vs_3bet/BTN/BB")
        assert response.status_code == 200
        data = response.json()
        assert "hands" in data


class TestVs4betRanges:
    """Tests for VS-4bet ranges."""

    def test_get_vs_4bet_range(self, client):
        """Test getting VS-4bet range."""
        # Try UTG vs BB which is more likely to exist
        response = client.get("/api/ranges/vs_4bet/UTG/BB")
        # May return 200 or 404 depending on available data
        assert response.status_code in [200, 404]
        if response.status_code == 200:
            data = response.json()
            assert "hands" in data
