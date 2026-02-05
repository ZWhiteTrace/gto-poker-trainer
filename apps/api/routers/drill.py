"""
Drill generation endpoints.
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from core.hand import Hand, random_hand
from core.position import Position, POSITIONS_6MAX
from core.scenario import Scenario, ActionType
from trainer.drill import PreflopDrill

router = APIRouter()


class DrillRequest(BaseModel):
    drill_type: str  # "rfi", "vs_rfi", "vs_3bet", "vs_4bet"
    hero_position: Optional[str] = None
    villain_position: Optional[str] = None
    enabled_positions: Optional[List[str]] = None


class SpotResponse(BaseModel):
    hand: str
    hero_position: str
    villain_position: Optional[str]
    action_type: str
    available_actions: List[str]
    scenario_key: str


# Initialize drill engine
_drill_cache = {}


def get_drill(drill_type: str, positions: List[str] = None) -> PreflopDrill:
    """Get or create a drill engine."""
    cache_key = f"{drill_type}_{positions}"
    if cache_key not in _drill_cache:
        action_type = {
            "rfi": ActionType.RFI,
            "vs_rfi": ActionType.VS_RFI,
            "vs_3bet": ActionType.VS_3BET,
            "vs_4bet": ActionType.VS_4BET,
        }.get(drill_type)

        if not action_type:
            raise ValueError(f"Unknown drill type: {drill_type}")

        # Create drill and configure it
        drill = PreflopDrill(format="6max")
        drill.enabled_action_types = [action_type]

        if positions:
            drill.enabled_positions = [Position[p] for p in positions]

        _drill_cache[cache_key] = drill
    return _drill_cache[cache_key]


@router.post("/generate", response_model=SpotResponse)
def generate_spot(request: DrillRequest):
    """Generate a new training spot."""
    try:
        drill = get_drill(
            request.drill_type,
            request.enabled_positions,
        )
        spot = drill.generate_spot()

        return SpotResponse(
            hand=spot.hand.notation,
            hero_position=spot.scenario.hero_position.name,
            villain_position=spot.scenario.villain_position.name if spot.scenario.villain_position else None,
            action_type=spot.scenario.action_type.value,
            available_actions=spot.scenario.available_actions,
            scenario_key=spot.scenario.scenario_key,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
