"""Tests for postflop router endpoints."""

from fastapi.testclient import TestClient

# Base URL for postflop endpoints
BASE_URL = "/api/postflop"


class TestCbetEndpoints:
    """Tests for C-bet flop endpoints."""

    def test_get_random_cbet_scenario(self, client: TestClient):
        """Test getting a random C-bet scenario."""
        response = client.get(f"{BASE_URL}/cbet/random")
        assert response.status_code == 200
        data = response.json()
        assert "scenario" in data
        assert "options" in data
        scenario = data["scenario"]
        assert "id" in scenario
        assert "hero_hand" in scenario
        assert "correct_action" in scenario
        assert "flop" in scenario

    def test_get_random_cbet_with_texture_filter(self, client: TestClient):
        """Test filtering C-bet scenarios by texture."""
        # First get available textures
        textures_response = client.get(f"{BASE_URL}/cbet/textures")
        if textures_response.status_code == 200:
            textures = textures_response.json().get("textures", {})
            if textures:
                texture_key = list(textures.keys())[0]
                response = client.get(f"{BASE_URL}/cbet/random?texture={texture_key}")
                assert response.status_code == 200

    def test_evaluate_cbet_decision(self, client: TestClient):
        """Test evaluating a C-bet decision."""
        # First get a scenario
        scenario_response = client.get(f"{BASE_URL}/cbet/random")
        assert scenario_response.status_code == 200
        scenario_id = scenario_response.json()["scenario"]["id"]

        # Evaluate with a user action
        response = client.post(
            f"{BASE_URL}/cbet/evaluate",
            json={"scenario_id": scenario_id, "user_action": "bet_50"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "correct" in data
        assert "correct_action" in data
        assert "explanation_zh" in data
        assert "explanation_en" in data

    def test_list_cbet_textures(self, client: TestClient):
        """Test listing available C-bet textures."""
        response = client.get(f"{BASE_URL}/cbet/textures")
        assert response.status_code == 200
        data = response.json()
        assert "textures" in data

    def test_list_cbet_scenarios(self, client: TestClient):
        """Test listing C-bet scenarios."""
        response = client.get(f"{BASE_URL}/cbet/scenarios")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "scenarios" in data


class TestTurnEndpoints:
    """Tests for turn barrel endpoints."""

    def test_get_random_turn_scenario(self, client: TestClient):
        """Test getting a random turn barrel scenario."""
        response = client.get(f"{BASE_URL}/turn/random")
        assert response.status_code == 200
        data = response.json()
        assert "scenario" in data
        assert "options" in data
        scenario = data["scenario"]
        assert "id" in scenario
        assert "hero_hand" in scenario
        assert "correct_action" in scenario
        assert "flop" in scenario
        assert "turn" in scenario
        assert "flop_action" in scenario

    def test_get_random_turn_with_texture_filter(self, client: TestClient):
        """Test filtering turn scenarios by texture."""
        textures_response = client.get(f"{BASE_URL}/turn/textures")
        if textures_response.status_code == 200:
            textures = textures_response.json().get("textures", {})
            if textures:
                texture_key = list(textures.keys())[0]
                response = client.get(f"{BASE_URL}/turn/random?texture={texture_key}")
                assert response.status_code == 200

    def test_get_random_turn_with_position_filter(self, client: TestClient):
        """Test filtering turn scenarios by position."""
        response = client.get(f"{BASE_URL}/turn/random?position=BTN")
        assert response.status_code == 200
        data = response.json()
        assert data["scenario"]["hero_position"] == "BTN"

    def test_evaluate_turn_decision_correct(self, client: TestClient):
        """Test evaluating a correct turn decision."""
        scenario_response = client.get(f"{BASE_URL}/turn/random")
        assert scenario_response.status_code == 200
        scenario = scenario_response.json()["scenario"]
        scenario_id = scenario["id"]
        correct_action = scenario["correct_action"]

        response = client.post(
            f"{BASE_URL}/turn/evaluate",
            json={
                "scenario_id": scenario_id,
                "user_action": correct_action,
                "street": "turn",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["correct"] is True

    def test_evaluate_turn_decision_wrong(self, client: TestClient):
        """Test evaluating a wrong turn decision."""
        scenario_response = client.get(f"{BASE_URL}/turn/random")
        assert scenario_response.status_code == 200
        scenario = scenario_response.json()["scenario"]
        scenario_id = scenario["id"]
        correct_action = scenario["correct_action"]
        wrong_action = "check" if correct_action == "bet" else "bet_50"

        response = client.post(
            f"{BASE_URL}/turn/evaluate",
            json={
                "scenario_id": scenario_id,
                "user_action": wrong_action,
                "street": "turn",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["correct"] is False
        assert data["correct_action"] == correct_action

    def test_list_turn_textures(self, client: TestClient):
        """Test listing available turn textures."""
        response = client.get(f"{BASE_URL}/turn/textures")
        assert response.status_code == 200
        data = response.json()
        assert "textures" in data
        assert len(data["textures"]) > 0


class TestRiverEndpoints:
    """Tests for river decision endpoints."""

    def test_get_random_river_scenario(self, client: TestClient):
        """Test getting a random river decision scenario."""
        response = client.get(f"{BASE_URL}/river/random")
        assert response.status_code == 200
        data = response.json()
        assert "scenario" in data
        assert "options" in data
        scenario = data["scenario"]
        assert "id" in scenario
        assert "hero_hand" in scenario
        assert "correct_action" in scenario
        assert "board" in scenario
        assert "previous_action" in scenario

    def test_get_random_river_with_texture_filter(self, client: TestClient):
        """Test filtering river scenarios by texture."""
        textures_response = client.get(f"{BASE_URL}/river/textures")
        if textures_response.status_code == 200:
            textures = textures_response.json().get("textures", {})
            if textures:
                texture_key = list(textures.keys())[0]
                response = client.get(f"{BASE_URL}/river/random?texture={texture_key}")
                assert response.status_code == 200

    def test_get_random_river_with_position_filter(self, client: TestClient):
        """Test filtering river scenarios by position."""
        response = client.get(f"{BASE_URL}/river/random?position=BTN")
        assert response.status_code == 200
        data = response.json()
        assert data["scenario"]["hero_position"] == "BTN"

    def test_evaluate_river_decision_correct(self, client: TestClient):
        """Test evaluating a correct river decision."""
        scenario_response = client.get(f"{BASE_URL}/river/random")
        assert scenario_response.status_code == 200
        scenario = scenario_response.json()["scenario"]
        scenario_id = scenario["id"]
        correct_action = scenario["correct_action"]

        response = client.post(
            f"{BASE_URL}/river/evaluate",
            json={
                "scenario_id": scenario_id,
                "user_action": correct_action,
                "street": "river",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["correct"] is True

    def test_evaluate_river_decision_wrong(self, client: TestClient):
        """Test evaluating a wrong river decision."""
        scenario_response = client.get(f"{BASE_URL}/river/random")
        assert scenario_response.status_code == 200
        scenario = scenario_response.json()["scenario"]
        scenario_id = scenario["id"]
        correct_action = scenario["correct_action"]
        # Pick an action that's different from correct
        wrong_action = "check" if correct_action in ["bet", "raise"] else "bet_50"

        response = client.post(
            f"{BASE_URL}/river/evaluate",
            json={
                "scenario_id": scenario_id,
                "user_action": wrong_action,
                "street": "river",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["correct"] is False
        assert data["correct_action"] == correct_action

    def test_list_river_textures(self, client: TestClient):
        """Test listing available river textures."""
        response = client.get(f"{BASE_URL}/river/textures")
        assert response.status_code == 200
        data = response.json()
        assert "textures" in data
        assert len(data["textures"]) > 0

    def test_river_scenario_structure(self, client: TestClient):
        """Test that river scenario has all required fields."""
        response = client.get(f"{BASE_URL}/river/random")
        assert response.status_code == 200
        scenario = response.json()["scenario"]
        required_fields = [
            "id",
            "preflop",
            "hero_position",
            "villain_position",
            "pot_type",
            "board",
            "board_suits",
            "texture",
            "texture_zh",
            "hero_hand",
            "previous_action",
            "correct_action",
            "frequency",
            "explanation_zh",
            "explanation_en",
        ]
        for field in required_fields:
            assert field in scenario, f"Missing field: {field}"
