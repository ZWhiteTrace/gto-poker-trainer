"""
MTT Push/Fold range endpoints.
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, List, Optional
from pathlib import Path
import json

router = APIRouter()

# Cache for MTT data
_mtt_cache: Dict[str, Dict] = {}


class PushFoldResponse(BaseModel):
    position: str
    stack_depth: str
    hands: List[str]  # List of hands that should push
    total_combos: int


class DefenseResponse(BaseModel):
    scenario: str
    stack_depth: str
    hands: List[str]  # List of hands that should call
    total_combos: int


class MTTRangesResponse(BaseModel):
    stack_depths: List[str]
    positions: List[str]


def get_mtt_data(data_type: str) -> Dict:
    """Load MTT range data from JSON files."""
    if data_type in _mtt_cache:
        return _mtt_cache[data_type]

    data_dir = Path(__file__).parent.parent / "data" / "ranges" / "mtt"

    file_map = {
        "push_fold": "push_fold.json",
        "defense": "defense_vs_shove.json",
        "resteal": "resteal.json",
        "hu": "hu_push_defense.json",
    }

    if data_type not in file_map:
        raise HTTPException(status_code=404, detail=f"Data type {data_type} not found")

    file_path = data_dir / file_map[data_type]
    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"Data file not found: {file_path}")

    with open(file_path) as f:
        data = json.load(f)

    _mtt_cache[data_type] = data
    return data


@router.get("/push_fold/{position}/{stack_depth}", response_model=PushFoldResponse)
def get_push_fold_range(
    position: str,
    stack_depth: str,
    format: str = Query(default="6max", description="Game format"),
):
    """Get push/fold range for a specific position and stack depth."""
    try:
        data = get_mtt_data("push_fold")

        if format not in data:
            raise HTTPException(status_code=404, detail=f"Format {format} not found")

        format_data = data[format]
        if stack_depth not in format_data:
            raise HTTPException(status_code=404, detail=f"Stack depth {stack_depth} not found")

        stack_data = format_data[stack_depth]
        if position not in stack_data:
            raise HTTPException(status_code=404, detail=f"Position {position} not found")

        hands = stack_data[position]

        return PushFoldResponse(
            position=position,
            stack_depth=stack_depth,
            hands=hands,
            total_combos=len(hands),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/defense/{scenario}/{stack_depth}", response_model=DefenseResponse)
def get_defense_range(
    scenario: str,
    stack_depth: str,
    format: str = Query(default="6max", description="Game format"),
):
    """Get defense range for a specific scenario and stack depth."""
    try:
        data = get_mtt_data("defense")

        if format not in data:
            raise HTTPException(status_code=404, detail=f"Format {format} not found")

        format_data = data[format]
        if scenario not in format_data:
            raise HTTPException(status_code=404, detail=f"Scenario {scenario} not found")

        scenario_data = format_data[scenario]
        if stack_depth not in scenario_data:
            raise HTTPException(status_code=404, detail=f"Stack depth {stack_depth} not found")

        hands = scenario_data[stack_depth]

        return DefenseResponse(
            scenario=scenario,
            stack_depth=stack_depth,
            hands=hands,
            total_combos=len(hands),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/resteal/{scenario}/{stack_depth}", response_model=DefenseResponse)
def get_resteal_range(
    scenario: str,
    stack_depth: str,
    format: str = Query(default="6max", description="Game format"),
):
    """Get resteal (3bet shove) range for a specific scenario."""
    try:
        data = get_mtt_data("resteal")

        if format not in data:
            raise HTTPException(status_code=404, detail=f"Format {format} not found")

        format_data = data[format]
        if scenario not in format_data:
            raise HTTPException(status_code=404, detail=f"Scenario {scenario} not found")

        scenario_data = format_data[scenario]
        if stack_depth not in scenario_data:
            raise HTTPException(status_code=404, detail=f"Stack depth {stack_depth} not found")

        hands = scenario_data[stack_depth]

        return DefenseResponse(
            scenario=scenario,
            stack_depth=stack_depth,
            hands=hands,
            total_combos=len(hands),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/hu/{scenario}/{stack_depth}", response_model=DefenseResponse)
def get_hu_range(
    scenario: str,
    stack_depth: str,
    format: str = Query(default="6max", description="Game format"),
):
    """Get heads-up push/defense range."""
    try:
        data = get_mtt_data("hu")

        if format not in data:
            raise HTTPException(status_code=404, detail=f"Format {format} not found")

        format_data = data[format]
        if scenario not in format_data:
            raise HTTPException(status_code=404, detail=f"Scenario {scenario} not found")

        scenario_data = format_data[scenario]
        if stack_depth not in scenario_data:
            raise HTTPException(status_code=404, detail=f"Stack depth {stack_depth} not found")

        hands = scenario_data[stack_depth]

        return DefenseResponse(
            scenario=scenario,
            stack_depth=stack_depth,
            hands=hands,
            total_combos=len(hands),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
def list_mtt_ranges(format: str = Query(default="6max", description="Game format")):
    """List available MTT range types and configurations."""
    try:
        result = {
            "push_fold": {"positions": ["UTG", "HJ", "CO", "BTN", "SB"], "stack_depths": []},
            "defense": {"scenarios": [], "stack_depths": []},
            "resteal": {"scenarios": [], "stack_depths": []},
            "hu": {"scenarios": [], "stack_depths": []},
        }

        # Get push_fold data
        try:
            pf_data = get_mtt_data("push_fold")
            if format in pf_data:
                result["push_fold"]["stack_depths"] = list(pf_data[format].keys())
        except:
            pass

        # Get defense data
        try:
            def_data = get_mtt_data("defense")
            if format in def_data:
                result["defense"]["scenarios"] = list(def_data[format].keys())
                first_scenario = list(def_data[format].keys())[0]
                result["defense"]["stack_depths"] = list(def_data[format][first_scenario].keys())
        except:
            pass

        # Get resteal data
        try:
            rs_data = get_mtt_data("resteal")
            if format in rs_data:
                result["resteal"]["scenarios"] = list(rs_data[format].keys())
                first_scenario = list(rs_data[format].keys())[0]
                result["resteal"]["stack_depths"] = list(rs_data[format][first_scenario].keys())
        except:
            pass

        # Get HU data
        try:
            hu_data = get_mtt_data("hu")
            if format in hu_data:
                result["hu"]["scenarios"] = list(hu_data[format].keys())
                first_scenario = list(hu_data[format].keys())[0]
                result["hu"]["stack_depths"] = list(hu_data[format][first_scenario].keys())
        except:
            pass

        return {"format": format, "available": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
