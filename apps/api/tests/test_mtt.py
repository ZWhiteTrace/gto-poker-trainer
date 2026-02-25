"""
Tests for MTT push/fold endpoints.
"""


class TestMttRanges:
    """Tests for MTT range queries."""

    def test_list_mtt_ranges(self, client):
        """Test listing available MTT ranges."""
        response = client.get("/api/mtt/list")
        assert response.status_code == 200
        data = response.json()
        assert "available" in data
        assert "push_fold" in data["available"]

    def test_get_push_fold_range(self, client):
        """Test getting push/fold range for a position."""
        response = client.get("/api/mtt/push_fold/BTN/10bb")
        assert response.status_code == 200
        data = response.json()
        assert "hands" in data
        assert "position" in data
        assert "stack_depth" in data
        # AA should always be in push range
        assert "AA" in data["hands"]

    def test_get_defense_range(self, client):
        """Test getting defense range."""
        response = client.get("/api/mtt/defense/BB_vs_SB_shove/10bb")
        assert response.status_code == 200
        data = response.json()
        assert "hands" in data


class TestMttDrill:
    """Tests for MTT drill generation and evaluation."""

    def test_generate_push_drill(self, client):
        """Test generating a push drill spot."""
        response = client.post(
            "/api/mtt/drill/generate",
            json={
                "mode": "push",
                "enabled_positions": ["BTN", "SB"],
                "enabled_stack_depths": ["10bb", "15bb"],
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "hand" in data
        assert "position" in data
        assert "stack_depth" in data
        assert "available_actions" in data
        assert data["mode"] == "push"
        assert data["position"] in ["BTN", "SB"]
        assert data["stack_depth"] in ["10bb", "15bb"]

    def test_generate_defense_drill(self, client):
        """Test generating a defense drill spot."""
        response = client.post(
            "/api/mtt/drill/generate", json={"mode": "defense", "enabled_stack_depths": ["10bb"]}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["mode"] == "defense"
        assert "scenario" in data
        assert "call" in data["available_actions"]

    def test_evaluate_push_aa(self, client):
        """Test evaluating push with AA - should always be correct."""
        response = client.post(
            "/api/mtt/drill/evaluate",
            json={
                "hand": "AA",
                "position": "BTN",
                "stack_depth": "10bb",
                "mode": "push",
                "action": "push",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_correct"]

    def test_evaluate_fold_72o(self, client):
        """Test evaluating fold with 72o - should be correct from UTG."""
        response = client.post(
            "/api/mtt/drill/evaluate",
            json={
                "hand": "72o",
                "position": "UTG",
                "stack_depth": "15bb",
                "mode": "push",
                "action": "fold",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_correct"]

    def test_evaluate_includes_explanation(self, client):
        """Test that evaluation includes bilingual explanation."""
        response = client.post(
            "/api/mtt/drill/evaluate",
            json={
                "hand": "AKs",
                "position": "CO",
                "stack_depth": "12bb",
                "mode": "push",
                "action": "push",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "explanation" in data
        assert "explanation_zh" in data
        assert "range_pct" in data
