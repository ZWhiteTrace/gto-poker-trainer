"""
Postflop C-bet practice endpoints.
"""

import json
import random
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

router = APIRouter()

# Cache for postflop data
_postflop_cache: dict[str, dict] = {}


class CbetScenario(BaseModel):
    id: str
    preflop: str
    hero_position: str
    villain_position: str
    pot_type: str
    flop: list[str]
    flop_suits: list[str]
    texture: str
    texture_zh: str
    hero_hand: str
    correct_action: str
    correct_sizing: str | None
    frequency: int
    explanation_zh: str
    explanation_en: str


class TurnScenario(BaseModel):
    id: str
    preflop: str
    hero_position: str
    villain_position: str
    pot_type: str
    flop: list[str]
    flop_suits: list[str]
    turn: str
    turn_suit: str
    texture: str
    texture_zh: str
    hero_hand: str
    flop_action: str
    correct_action: str
    correct_sizing: str | None
    frequency: int
    explanation_zh: str
    explanation_en: str


class RiverScenario(BaseModel):
    id: str
    preflop: str
    hero_position: str
    villain_position: str
    pot_type: str
    board: list[str]
    board_suits: list[str]
    texture: str
    texture_zh: str
    hero_hand: str
    previous_action: str
    correct_action: str
    correct_sizing: str | None
    frequency: int
    explanation_zh: str
    explanation_en: str


class CbetDrillResponse(BaseModel):
    scenario: CbetScenario
    options: list[str]


class TurnDrillResponse(BaseModel):
    scenario: TurnScenario
    options: list[str]


class RiverDrillResponse(BaseModel):
    scenario: RiverScenario
    options: list[str]


class CbetEvaluateRequest(BaseModel):
    scenario_id: str
    user_action: str


class PostflopEvaluateRequest(BaseModel):
    scenario_id: str
    user_action: str
    street: str  # "flop", "turn", "river"


class CbetEvaluateResponse(BaseModel):
    correct: bool
    correct_action: str
    correct_sizing: str | None
    frequency: int
    explanation_zh: str
    explanation_en: str


class PostflopEvaluateResponse(BaseModel):
    correct: bool
    correct_action: str
    correct_sizing: str | None
    frequency: int
    explanation_zh: str
    explanation_en: str


def get_cbet_data() -> dict:
    """Load C-bet scenario data."""
    if "cbet" in _postflop_cache:
        return _postflop_cache["cbet"]

    data_path = Path(__file__).parent.parent / "data" / "postflop" / "flop_cbet.json"
    if not data_path.exists():
        raise HTTPException(status_code=404, detail="C-bet data not found")

    with open(data_path) as f:
        data = json.load(f)

    _postflop_cache["cbet"] = data
    return data


@router.get("/cbet/random", response_model=CbetDrillResponse)
def get_random_cbet_scenario(
    texture: str | None = Query(default=None, description="Filter by board texture"),
    position: str | None = Query(default=None, description="Filter by hero position"),
):
    """Get a random C-bet scenario for practice."""
    try:
        data = get_cbet_data()
        scenarios = data.get("scenarios", [])

        if not scenarios:
            raise HTTPException(status_code=404, detail="No scenarios available")

        # Apply filters
        filtered = scenarios
        if texture:
            filtered = [s for s in filtered if s.get("texture") == texture]
        if position:
            filtered = [s for s in filtered if s.get("hero_position") == position]

        if not filtered:
            raise HTTPException(status_code=404, detail="No scenarios match the filters")

        # Pick random scenario
        scenario = random.choice(filtered)

        return CbetDrillResponse(
            scenario=CbetScenario(**scenario),
            options=["bet_33", "bet_50", "bet_75", "check"],
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cbet/evaluate", response_model=CbetEvaluateResponse)
def evaluate_cbet_decision(request: CbetEvaluateRequest):
    """Evaluate user's C-bet decision."""
    try:
        data = get_cbet_data()
        scenarios = data.get("scenarios", [])

        # Find scenario
        scenario = None
        for s in scenarios:
            if s.get("id") == request.scenario_id:
                scenario = s
                break

        if not scenario:
            raise HTTPException(status_code=404, detail="Scenario not found")

        # Evaluate
        user_action_base = request.user_action.split("_")[0]  # Extract "bet" or "check"
        correct_action = scenario.get("correct_action")
        is_correct = user_action_base == correct_action

        return CbetEvaluateResponse(
            correct=is_correct,
            correct_action=scenario.get("correct_action"),
            correct_sizing=scenario.get("correct_sizing"),
            frequency=scenario.get("frequency", 0),
            explanation_zh=scenario.get("explanation_zh", ""),
            explanation_en=scenario.get("explanation_en", ""),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cbet/textures")
def list_textures():
    """List available board textures."""
    try:
        data = get_cbet_data()
        scenarios = data.get("scenarios", [])

        textures = {}
        for s in scenarios:
            texture = s.get("texture")
            texture_zh = s.get("texture_zh")
            if texture and texture not in textures:
                textures[texture] = texture_zh

        return {"textures": textures}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cbet/scenarios")
def list_scenarios(
    texture: str | None = Query(default=None),
    limit: int = Query(default=20, le=100),
):
    """List C-bet scenarios with optional filtering."""
    try:
        data = get_cbet_data()
        scenarios = data.get("scenarios", [])

        if texture:
            scenarios = [s for s in scenarios if s.get("texture") == texture]

        return {
            "total": len(scenarios),
            "scenarios": scenarios[:limit],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ Turn Barrel Endpoints ============


def get_turn_data() -> dict:
    """Load Turn barrel scenario data."""
    if "turn" in _postflop_cache:
        return _postflop_cache["turn"]

    data_path = Path(__file__).parent.parent / "data" / "postflop" / "turn_barrel.json"
    if not data_path.exists():
        raise HTTPException(status_code=404, detail="Turn data not found")

    with open(data_path) as f:
        data = json.load(f)

    _postflop_cache["turn"] = data
    return data


@router.get("/turn/random", response_model=TurnDrillResponse)
def get_random_turn_scenario(
    texture: str | None = Query(default=None, description="Filter by board texture"),
    position: str | None = Query(default=None, description="Filter by hero position"),
):
    """Get a random turn barrel scenario for practice."""
    try:
        data = get_turn_data()
        scenarios = data.get("scenarios", [])

        if not scenarios:
            raise HTTPException(status_code=404, detail="No turn scenarios available")

        # Apply filters
        filtered = scenarios
        if texture:
            filtered = [s for s in filtered if s.get("texture") == texture]
        if position:
            filtered = [s for s in filtered if s.get("hero_position") == position]

        if not filtered:
            raise HTTPException(status_code=404, detail="No scenarios match the filters")

        # Pick random scenario
        scenario = random.choice(filtered)

        return TurnDrillResponse(
            scenario=TurnScenario(**scenario),
            options=["bet_33", "bet_50", "bet_66", "bet_75", "check"],
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/turn/evaluate", response_model=PostflopEvaluateResponse)
def evaluate_turn_decision(request: PostflopEvaluateRequest):
    """Evaluate user's turn barrel decision."""
    try:
        data = get_turn_data()
        scenarios = data.get("scenarios", [])

        # Find scenario
        scenario = None
        for s in scenarios:
            if s.get("id") == request.scenario_id:
                scenario = s
                break

        if not scenario:
            raise HTTPException(status_code=404, detail="Scenario not found")

        # Evaluate
        user_action_base = request.user_action.split("_")[0]
        correct_action = scenario.get("correct_action")
        is_correct = user_action_base == correct_action

        return PostflopEvaluateResponse(
            correct=is_correct,
            correct_action=scenario.get("correct_action"),
            correct_sizing=scenario.get("correct_sizing"),
            frequency=scenario.get("frequency", 0),
            explanation_zh=scenario.get("explanation_zh", ""),
            explanation_en=scenario.get("explanation_en", ""),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/turn/textures")
def list_turn_textures():
    """List available turn textures."""
    try:
        data = get_turn_data()
        scenarios = data.get("scenarios", [])

        textures = {}
        for s in scenarios:
            texture = s.get("texture")
            texture_zh = s.get("texture_zh")
            if texture and texture not in textures:
                textures[texture] = texture_zh

        return {"textures": textures}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ River Decision Endpoints ============


def get_river_data() -> dict:
    """Load River decision scenario data."""
    if "river" in _postflop_cache:
        return _postflop_cache["river"]

    data_path = Path(__file__).parent.parent / "data" / "postflop" / "river_decision.json"
    if not data_path.exists():
        raise HTTPException(status_code=404, detail="River data not found")

    with open(data_path) as f:
        data = json.load(f)

    _postflop_cache["river"] = data
    return data


@router.get("/river/random", response_model=RiverDrillResponse)
def get_random_river_scenario(
    texture: str | None = Query(default=None, description="Filter by board texture"),
    position: str | None = Query(default=None, description="Filter by hero position"),
):
    """Get a random river decision scenario for practice."""
    try:
        data = get_river_data()
        scenarios = data.get("scenarios", [])

        if not scenarios:
            raise HTTPException(status_code=404, detail="No river scenarios available")

        # Apply filters
        filtered = scenarios
        if texture:
            filtered = [s for s in filtered if s.get("texture") == texture]
        if position:
            filtered = [s for s in filtered if s.get("hero_position") == position]

        if not filtered:
            raise HTTPException(status_code=404, detail="No scenarios match the filters")

        # Pick random scenario
        scenario = random.choice(filtered)

        return RiverDrillResponse(
            scenario=RiverScenario(**scenario),
            options=["bet_25", "bet_50", "bet_75", "bet_100", "bet_150", "check", "raise"],
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/river/evaluate", response_model=PostflopEvaluateResponse)
def evaluate_river_decision(request: PostflopEvaluateRequest):
    """Evaluate user's river decision."""
    try:
        data = get_river_data()
        scenarios = data.get("scenarios", [])

        # Find scenario
        scenario = None
        for s in scenarios:
            if s.get("id") == request.scenario_id:
                scenario = s
                break

        if not scenario:
            raise HTTPException(status_code=404, detail="Scenario not found")

        # Evaluate
        user_action_base = request.user_action.split("_")[0]
        correct_action = scenario.get("correct_action")
        is_correct = user_action_base == correct_action

        return PostflopEvaluateResponse(
            correct=is_correct,
            correct_action=scenario.get("correct_action"),
            correct_sizing=scenario.get("correct_sizing"),
            frequency=scenario.get("frequency", 0),
            explanation_zh=scenario.get("explanation_zh", ""),
            explanation_en=scenario.get("explanation_en", ""),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/river/textures")
def list_river_textures():
    """List available river textures."""
    try:
        data = get_river_data()
        scenarios = data.get("scenarios", [])

        textures = {}
        for s in scenarios:
            texture = s.get("texture")
            texture_zh = s.get("texture_zh")
            if texture and texture not in textures:
                textures[texture] = texture_zh

        return {"textures": textures}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
