"""Tests for solver router endpoints."""

import os

from fastapi.testclient import TestClient

BASE_URL = "/api/solver"


class TestSolverPostflop:
    """Tests for /postflop strategy query."""

    def test_postflop_returns_valid_response(self, client: TestClient):
        response = client.get(
            f"{BASE_URL}/postflop",
            params={
                "board": "Ah7s2d",
                "hand": "AKo",
                "position": "BTN",
                "villain": "BB",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "found" in data

    def test_postflop_missing_params(self, client: TestClient):
        response = client.get(f"{BASE_URL}/postflop")
        assert response.status_code == 422

    def test_postflop_with_3bet_pot(self, client: TestClient):
        response = client.get(
            f"{BASE_URL}/postflop",
            params={
                "board": "Ks9h4d",
                "hand": "QQ",
                "position": "CO",
                "villain": "BB",
                "pot_type": "3bet",
            },
        )
        assert response.status_code == 200

    def test_postflop_normalizes_hand(self, client: TestClient):
        response = client.get(
            f"{BASE_URL}/postflop",
            params={
                "board": "Ah7s2d",
                "hand": "ak",
                "position": "BTN",
                "villain": "BB",
            },
        )
        assert response.status_code == 200
        data = response.json()
        if data.get("hand"):
            assert data["hand"] == "AKo"


class TestSolverTextures:
    """Tests for /textures endpoint."""

    def test_list_textures(self, client: TestClient):
        response = client.get(f"{BASE_URL}/textures")
        assert response.status_code == 200
        data = response.json()
        assert "textures" in data
        assert "total_scenarios" in data
        assert isinstance(data["textures"], list)
        assert isinstance(data["total_scenarios"], int)


class TestSolverScenarios:
    """Tests for /scenarios endpoint."""

    def test_list_scenarios_default(self, client: TestClient):
        response = client.get(f"{BASE_URL}/scenarios")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "scenarios" in data
        assert isinstance(data["scenarios"], list)

    def test_list_scenarios_with_position_filter(self, client: TestClient):
        response = client.get(f"{BASE_URL}/scenarios", params={"position": "BTN"})
        assert response.status_code == 200
        data = response.json()
        for s in data["scenarios"]:
            assert s["position"] == "BTN"

    def test_list_scenarios_with_limit(self, client: TestClient):
        response = client.get(f"{BASE_URL}/scenarios", params={"limit": 5})
        assert response.status_code == 200
        data = response.json()
        assert len(data["scenarios"]) <= 5

    def test_list_scenarios_with_pot_type_filter(self, client: TestClient):
        response = client.get(f"{BASE_URL}/scenarios", params={"pot_type": "srp"})
        assert response.status_code == 200
        data = response.json()
        for s in data["scenarios"]:
            assert s["pot_type"] == "srp"


class TestSolverBoards:
    """Tests for /boards endpoint."""

    def test_list_boards(self, client: TestClient):
        response = client.get(
            f"{BASE_URL}/boards",
            params={"position": "BTN", "villain": "BB"},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["position"] == "BTN"
        assert data["villain"] == "BB"
        assert "boards" in data
        assert "count" in data

    def test_list_boards_missing_params(self, client: TestClient):
        response = client.get(f"{BASE_URL}/boards")
        assert response.status_code == 422


class TestSolverCache:
    """Tests for /cache endpoint."""

    def test_clear_cache_without_api_key(self, client: TestClient):
        response = client.delete(f"{BASE_URL}/cache")
        assert response.status_code == 422

    def test_clear_cache_with_wrong_api_key(self, client: TestClient):
        response = client.delete(
            f"{BASE_URL}/cache", headers={"X-API-Key": "wrong-key"}
        )
        assert response.status_code == 403

    def test_clear_cache_with_valid_api_key(self, client: TestClient):
        test_key = "test-admin-key"
        original = os.environ.get("ADMIN_API_KEY")
        os.environ["ADMIN_API_KEY"] = test_key
        try:
            response = client.delete(
                f"{BASE_URL}/cache", headers={"X-API-Key": test_key}
            )
            assert response.status_code == 200
            assert response.json()["message"] == "Solver cache cleared"
        finally:
            if original is None:
                os.environ.pop("ADMIN_API_KEY", None)
            else:
                os.environ["ADMIN_API_KEY"] = original


class TestLevel1Textures:
    """Tests for /level1/textures endpoint."""

    def test_list_level1_textures(self, client: TestClient):
        response = client.get(f"{BASE_URL}/level1/textures")
        assert response.status_code == 200
        data = response.json()
        assert "total" in data
        assert "textures" in data
        assert "categories" in data

    def test_level1_texture_detail(self, client: TestClient):
        textures_resp = client.get(f"{BASE_URL}/level1/textures")
        if textures_resp.status_code == 200:
            textures = textures_resp.json().get("textures", [])
            if textures:
                tid = textures[0]["texture_id"]
                response = client.get(f"{BASE_URL}/level1/texture/{tid}")
                assert response.status_code == 200
                data = response.json()
                assert data["texture_id"] == tid
                assert "concept" in data
                assert "hand_count" in data

    def test_level1_texture_detail_not_found(self, client: TestClient):
        response = client.get(f"{BASE_URL}/level1/texture/nonexistent")
        assert response.status_code == 404


class TestLevel1Drill:
    """Tests for /level1/drill endpoint."""

    def test_get_drill_question(self, client: TestClient):
        response = client.get(f"{BASE_URL}/level1/drill")
        assert response.status_code == 200
        data = response.json()
        assert "texture_id" in data
        assert "board" in data
        assert "hand" in data
        assert "options" in data

    def test_get_drill_with_texture_filter(self, client: TestClient):
        textures_resp = client.get(f"{BASE_URL}/level1/textures")
        if textures_resp.status_code == 200:
            textures = textures_resp.json().get("textures", [])
            if textures:
                tid = textures[0]["texture_id"]
                response = client.get(
                    f"{BASE_URL}/level1/drill", params={"texture_id": tid}
                )
                assert response.status_code == 200
                assert response.json()["texture_id"] == tid

    def test_get_drill_with_difficulty_filter(self, client: TestClient):
        response = client.get(f"{BASE_URL}/level1/drill", params={"difficulty": 1})
        if response.status_code == 200:
            assert response.json().get("difficulty") == 1

    def test_get_drill_invalid_texture(self, client: TestClient):
        response = client.get(
            f"{BASE_URL}/level1/drill", params={"texture_id": "nonexistent"}
        )
        assert response.status_code == 404


class TestLevel1Evaluate:
    """Tests for /level1/evaluate endpoint."""

    def test_evaluate_drill_answer(self, client: TestClient):
        drill_resp = client.get(f"{BASE_URL}/level1/drill")
        if drill_resp.status_code == 200:
            drill = drill_resp.json()
            response = client.post(
                f"{BASE_URL}/level1/evaluate",
                params={
                    "texture_id": drill["texture_id"],
                    "hand": drill["hand"],
                    "user_action": drill["options"][0],
                },
            )
            assert response.status_code == 200
            data = response.json()
            assert "correct" in data
            assert "user_action" in data
            assert "full_strategy" in data

    def test_evaluate_invalid_texture(self, client: TestClient):
        response = client.post(
            f"{BASE_URL}/level1/evaluate",
            params={
                "texture_id": "nonexistent",
                "hand": "AKo",
                "user_action": "check",
            },
        )
        assert response.status_code == 404

    def test_evaluate_invalid_hand(self, client: TestClient):
        textures_resp = client.get(f"{BASE_URL}/level1/textures")
        if textures_resp.status_code == 200:
            textures = textures_resp.json().get("textures", [])
            if textures:
                tid = textures[0]["texture_id"]
                response = client.post(
                    f"{BASE_URL}/level1/evaluate",
                    params={
                        "texture_id": tid,
                        "hand": "ZZz",
                        "user_action": "check",
                    },
                )
                assert response.status_code == 404


class TestLevel1TextureHands:
    """Tests for /level1/texture/{id}/hands endpoint."""

    def test_get_texture_hands(self, client: TestClient):
        textures_resp = client.get(f"{BASE_URL}/level1/textures")
        if textures_resp.status_code == 200:
            textures = textures_resp.json().get("textures", [])
            if textures:
                tid = textures[0]["texture_id"]
                response = client.get(f"{BASE_URL}/level1/texture/{tid}/hands")
                assert response.status_code == 200
                data = response.json()
                assert data["texture_id"] == tid
                assert "hands_by_category" in data
                assert "total_hands" in data

    def test_get_texture_hands_not_found(self, client: TestClient):
        response = client.get(f"{BASE_URL}/level1/texture/nonexistent/hands")
        assert response.status_code == 404


class TestTurnAdjustments:
    """Tests for /turn endpoints."""

    def test_get_turn_adjustment(self, client: TestClient):
        response = client.get(
            f"{BASE_URL}/turn",
            params={
                "flop_texture": "dry_ace_high",
                "turn_type": "brick",
                "position": "ip",
            },
        )
        assert response.status_code in (200, 404)

    def test_get_turn_adjustment_with_hand_category(self, client: TestClient):
        response = client.get(
            f"{BASE_URL}/turn",
            params={
                "flop_texture": "dry_ace_high",
                "turn_type": "brick",
                "position": "ip",
                "hand_category": "value",
            },
        )
        assert response.status_code in (200, 404)

    def test_classify_turn(self, client: TestClient):
        response = client.get(
            f"{BASE_URL}/turn/classify",
            params={"flop": "Ah7s2d", "turn": "Kc"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "flop" in data
        assert "turn" in data
        assert "turn_type" in data
        assert "turn_type_zh" in data

    def test_classify_turn_invalid_flop(self, client: TestClient):
        response = client.get(
            f"{BASE_URL}/turn/classify",
            params={"flop": "A", "turn": "Kc"},
        )
        assert response.status_code == 400

    def test_list_turn_card_types(self, client: TestClient):
        response = client.get(f"{BASE_URL}/turn/card-types")
        assert response.status_code == 200
        data = response.json()
        assert "turn_card_types" in data


class TestRiverAdjustments:
    """Tests for /river endpoints."""

    def test_get_river_adjustment(self, client: TestClient):
        response = client.get(
            f"{BASE_URL}/river",
            params={
                "board_texture": "dry_ace_high",
                "river_type": "brick",
            },
        )
        assert response.status_code in (200, 404)

    def test_classify_river(self, client: TestClient):
        response = client.get(
            f"{BASE_URL}/river/classify",
            params={"board": "Ah7s2dKc", "river": "3h"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "board" in data
        assert "river" in data
        assert "river_type" in data

    def test_classify_river_invalid_board(self, client: TestClient):
        response = client.get(
            f"{BASE_URL}/river/classify",
            params={"board": "Ah", "river": "3h"},
        )
        assert response.status_code == 400

    def test_list_river_card_types(self, client: TestClient):
        response = client.get(f"{BASE_URL}/river/card-types")
        assert response.status_code == 200
        data = response.json()
        assert "river_card_types" in data


class TestMultistreet:
    """Tests for /multistreet endpoint."""

    def test_multistreet_flop_only(self, client: TestClient):
        response = client.get(
            f"{BASE_URL}/multistreet",
            params={
                "flop": "Ah7s2d",
                "hand": "AKo",
                "position": "BTN",
                "villain": "BB",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "streets" in data
        assert "flop" in data["streets"]

    def test_multistreet_with_turn(self, client: TestClient):
        response = client.get(
            f"{BASE_URL}/multistreet",
            params={
                "flop": "Ah7s2d",
                "turn": "Kc",
                "hand": "AKo",
                "position": "BTN",
                "villain": "BB",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "turn" in data["streets"]
        assert "card_type" in data["streets"]["turn"]

    def test_multistreet_with_turn_and_river(self, client: TestClient):
        response = client.get(
            f"{BASE_URL}/multistreet",
            params={
                "flop": "Ah7s2d",
                "turn": "Kc",
                "river": "3h",
                "hand": "AKo",
                "position": "BTN",
                "villain": "BB",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert "river" in data["streets"]

    def test_multistreet_invalid_flop(self, client: TestClient):
        response = client.get(
            f"{BASE_URL}/multistreet",
            params={
                "flop": "A",
                "hand": "AKo",
                "position": "BTN",
            },
        )
        assert response.status_code == 400

    def test_multistreet_missing_params(self, client: TestClient):
        response = client.get(f"{BASE_URL}/multistreet")
        assert response.status_code == 422


class TestRandomDrill:
    """Tests for /random-drill endpoint."""

    def test_get_random_drill(self, client: TestClient):
        response = client.get(f"{BASE_URL}/random-drill")
        assert response.status_code in (200, 404)
        if response.status_code == 200:
            data = response.json()
            assert "scenario_id" in data
            assert "board" in data
            assert "hand" in data
            assert "options" in data
            assert "correct_strategy" in data

    def test_get_random_drill_with_pot_type(self, client: TestClient):
        response = client.get(
            f"{BASE_URL}/random-drill", params={"pot_type": "srp"}
        )
        assert response.status_code in (200, 404)

    def test_get_random_drill_invalid_pot_type(self, client: TestClient):
        response = client.get(
            f"{BASE_URL}/random-drill", params={"pot_type": "nonexistent"}
        )
        assert response.status_code == 404


class TestPotTypes:
    """Tests for /pot-types endpoint."""

    def test_list_pot_types(self, client: TestClient):
        response = client.get(f"{BASE_URL}/pot-types")
        assert response.status_code == 200
        data = response.json()
        assert "pot_types" in data
        assert "total_scenarios" in data


class TestNormalizeFunctions:
    """Tests for solver utility functions."""

    def test_normalize_hand_variants(self, client: TestClient):
        test_cases = [
            ("AKo", "AKo"),
            ("AKs", "AKs"),
            ("AA", "AA"),
            ("ak", "AKo"),
            ("AK", "AKo"),
            ("qjs", "QJs"),
        ]
        for input_hand, expected in test_cases:
            response = client.get(
                f"{BASE_URL}/postflop",
                params={
                    "board": "Ah7s2d",
                    "hand": input_hand,
                    "position": "BTN",
                    "villain": "BB",
                },
            )
            assert response.status_code == 200
            data = response.json()
            if data.get("hand"):
                assert data["hand"] == expected, f"Failed for {input_hand}"

    def test_classify_turn_types(self, client: TestClient):
        cases = [
            ("Ah7s2d", "7c", "pair_board"),
            ("Ah7s2d", "Kc", "overcard"),
        ]
        for flop, turn, expected_type in cases:
            response = client.get(
                f"{BASE_URL}/turn/classify",
                params={"flop": flop, "turn": turn},
            )
            assert response.status_code == 200
            assert response.json()["turn_type"] == expected_type

    def test_classify_river_types(self, client: TestClient):
        cases = [
            ("Ah7s2dKc", "7d", "pair_board"),
            ("Ah7s2dKc", "Qc", "overcard"),
        ]
        for board, river, expected_type in cases:
            response = client.get(
                f"{BASE_URL}/river/classify",
                params={"board": board, "river": river},
            )
            assert response.status_code == 200
            assert response.json()["river_type"] == expected_type
