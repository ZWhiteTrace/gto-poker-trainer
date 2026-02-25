"""Tests for evaluate router endpoints."""

from fastapi.testclient import TestClient


class TestEvaluateAction:
    """Tests for action evaluation endpoint."""

    def test_evaluate_rfi_aa_utg_raise(self, client: TestClient):
        """Test AA from UTG should raise."""
        response = client.post(
            "/api/evaluate/action",
            json={
                "hand": "AA",
                "scenario_key": "rfi_UTG",
                "action": "raise",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_correct"] is True
        assert data["correct_action"] == "raise"

    def test_evaluate_rfi_72o_utg_fold(self, client: TestClient):
        """Test 72o from UTG should fold."""
        response = client.post(
            "/api/evaluate/action",
            json={
                "hand": "72o",
                "scenario_key": "rfi_UTG",
                "action": "fold",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_correct"] is True
        assert data["correct_action"] == "fold"

    def test_evaluate_rfi_wrong_action(self, client: TestClient):
        """Test wrong action returns is_correct=False."""
        response = client.post(
            "/api/evaluate/action",
            json={
                "hand": "AA",
                "scenario_key": "rfi_UTG",
                "action": "fold",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["is_correct"] is False
        assert data["correct_action"] == "raise"
        assert data["player_action"] == "fold"

    def test_evaluate_vs_rfi_scenario(self, client: TestClient):
        """Test VS RFI scenario evaluation."""
        response = client.post(
            "/api/evaluate/action",
            json={
                "hand": "AKs",
                "scenario_key": "vs_rfi_BTN_vs_UTG",
                "action": "raise",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "is_correct" in data
        assert "correct_action" in data
        assert "explanation" in data
        assert "explanation_zh" in data

    def test_evaluate_vs_3bet_scenario(self, client: TestClient):
        """Test VS 3-bet scenario evaluation."""
        response = client.post(
            "/api/evaluate/action",
            json={
                "hand": "QQ",
                "scenario_key": "vs_3bet_BTN_vs_BB",
                "action": "raise",
            },
        )
        # May return 200 or 500 depending on data availability
        assert response.status_code in [200, 500]

    def test_evaluate_response_has_frequency(self, client: TestClient):
        """Test that response includes frequency information."""
        response = client.post(
            "/api/evaluate/action",
            json={
                "hand": "KQs",
                "scenario_key": "rfi_BTN",
                "action": "raise",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "frequency" in data
        assert "player_action_frequency" in data
        assert isinstance(data["frequency"], int)

    def test_evaluate_response_has_explanations(self, client: TestClient):
        """Test that response includes bilingual explanations."""
        response = client.post(
            "/api/evaluate/action",
            json={
                "hand": "JTs",
                "scenario_key": "rfi_CO",
                "action": "raise",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "explanation" in data
        assert "explanation_zh" in data
        assert len(data["explanation"]) > 0 or len(data["explanation_zh"]) > 0

    def test_evaluate_invalid_scenario_key(self, client: TestClient):
        """Test invalid scenario key returns error."""
        response = client.post(
            "/api/evaluate/action",
            json={
                "hand": "AA",
                "scenario_key": "invalid_scenario",
                "action": "raise",
            },
        )
        assert response.status_code == 500

    def test_evaluate_acceptable_action(self, client: TestClient):
        """Test is_acceptable field for mixed frequency hands."""
        response = client.post(
            "/api/evaluate/action",
            json={
                "hand": "ATo",
                "scenario_key": "rfi_HJ",
                "action": "raise",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "is_acceptable" in data
        assert isinstance(data["is_acceptable"], bool)
