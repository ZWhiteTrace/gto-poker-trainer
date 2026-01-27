"""
Evaluation endpoints for checking player actions.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, Dict
from pathlib import Path

from core.hand import Hand
from core.position import Position
from core.scenario import Scenario, ActionType
from core.evaluator import Evaluator, EvalResult

router = APIRouter()


class EvaluateRequest(BaseModel):
    hand: str  # e.g., "AKs", "QQ"
    scenario_key: str  # e.g., "rfi_UTG", "vs_rfi_BTN_vs_UTG"
    action: str  # e.g., "raise", "call", "fold"


class EvaluateResponse(BaseModel):
    is_correct: bool
    is_acceptable: bool
    correct_action: str
    player_action: str
    frequency: int  # Frequency of correct action (0-100)
    player_action_frequency: int
    explanation: str
    explanation_zh: str


# Initialize evaluator with correct data path
_evaluator = None


def get_evaluator() -> Evaluator:
    global _evaluator
    if _evaluator is None:
        data_dir = Path(__file__).parent.parent / "data" / "ranges"
        _evaluator = Evaluator(data_dir=data_dir)
    return _evaluator


@router.post("/action", response_model=EvaluateResponse)
def evaluate_action(request: EvaluateRequest):
    """Evaluate a player's action against GTO."""
    try:
        evaluator = get_evaluator()
        hand = Hand(request.hand)

        # Parse scenario_key to create Scenario object
        # Format: "rfi_UTG" or "vs_rfi_BTN_vs_UTG"
        parts = request.scenario_key.split("_")

        if parts[0] == "rfi":
            action_type = ActionType.RFI
            hero_position = Position[parts[1]]
            villain_position = None
        elif parts[0] == "vs" and parts[1] == "rfi":
            action_type = ActionType.VS_RFI
            hero_position = Position[parts[2]]
            villain_position = Position[parts[4]] if len(parts) > 4 else None
        elif parts[0] == "vs" and parts[1] == "3bet":
            action_type = ActionType.VS_3BET
            hero_position = Position[parts[2]]
            villain_position = Position[parts[4]] if len(parts) > 4 else None
        elif parts[0] == "vs" and parts[1] == "4bet":
            action_type = ActionType.VS_4BET
            hero_position = Position[parts[2]]
            villain_position = Position[parts[4]] if len(parts) > 4 else None
        else:
            raise ValueError(f"Unknown scenario key format: {request.scenario_key}")

        scenario = Scenario(
            hero_position=hero_position,
            villain_position=villain_position,
            action_type=action_type,
        )

        result: EvalResult = evaluator.evaluate(hand, scenario, request.action)

        return EvaluateResponse(
            is_correct=result.is_correct,
            is_acceptable=result.is_acceptable,
            correct_action=result.correct_action,
            player_action=result.player_action,
            frequency=result.frequency,
            player_action_frequency=result.player_action_frequency,
            explanation=result.explanation,
            explanation_zh=result.explanation_zh,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
