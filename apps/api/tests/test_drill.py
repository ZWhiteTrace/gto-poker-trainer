"""
Tests for drill endpoints.
"""


class TestDrillGenerate:
    """Tests for drill spot generation."""

    def test_generate_rfi_spot(self, client):
        """Test generating an RFI drill spot."""
        response = client.post(
            "/api/drill/generate",
            json={"drill_type": "rfi", "enabled_positions": ["UTG", "HJ", "CO", "BTN", "SB"]},
        )
        assert response.status_code == 200
        data = response.json()
        assert "hand" in data
        assert "hero_position" in data
        assert "available_actions" in data
        assert data["hero_position"] in ["UTG", "HJ", "CO", "BTN", "SB"]

    def test_generate_vs_rfi_spot(self, client):
        """Test generating a VS-RFI drill spot."""
        response = client.post("/api/drill/generate", json={"drill_type": "vs_rfi"})
        assert response.status_code == 200
        data = response.json()
        assert "hand" in data
        assert "hero_position" in data
        assert "villain_position" in data

    def test_generate_vs_3bet_spot(self, client):
        """Test generating a VS-3bet drill spot."""
        response = client.post("/api/drill/generate", json={"drill_type": "vs_3bet"})
        assert response.status_code == 200
        data = response.json()
        assert "hand" in data
        assert "available_actions" in data

    def test_generate_vs_4bet_spot(self, client):
        """Test generating a VS-4bet drill spot."""
        response = client.post("/api/drill/generate", json={"drill_type": "vs_4bet"})
        assert response.status_code == 200
        data = response.json()
        assert "hand" in data

    def test_generate_with_position_filter(self, client):
        """Test generating spot with position filter."""
        response = client.post(
            "/api/drill/generate", json={"drill_type": "rfi", "enabled_positions": ["BTN"]}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["hero_position"] == "BTN"


class TestEvaluateAction:
    """Tests for action evaluation."""

    def test_evaluate_correct_action(self, client):
        """Test evaluating a correct action."""
        # First generate a spot to get valid scenario
        gen_response = client.post(
            "/api/drill/generate", json={"drill_type": "rfi", "enabled_positions": ["BTN"]}
        )
        spot = gen_response.json()

        # Evaluate with fold (may or may not be correct)
        response = client.post(
            "/api/evaluate/action",
            json={"hand": spot["hand"], "scenario_key": spot["scenario_key"], "action": "fold"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "is_correct" in data
        assert "correct_action" in data
        assert "explanation" in data
        assert "explanation_zh" in data

    def test_evaluate_aa_utg_raise(self, client):
        """Test that AA should raise from UTG."""
        response = client.post(
            "/api/evaluate/action",
            json={"hand": "AA", "scenario_key": "rfi_UTG", "action": "raise"},
        )
        assert response.status_code == 200
        data = response.json()
        # AA should always raise
        assert data["is_correct"] or data["is_acceptable"]

    def test_evaluate_72o_utg_fold(self, client):
        """Test that 72o should fold from UTG."""
        response = client.post(
            "/api/evaluate/action",
            json={"hand": "72o", "scenario_key": "rfi_UTG", "action": "fold"},
        )
        assert response.status_code == 200
        data = response.json()
        # 72o should always fold
        assert data["is_correct"]
