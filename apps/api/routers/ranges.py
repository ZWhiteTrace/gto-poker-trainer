"""
Range data endpoints.
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, List, Optional
from pathlib import Path
import json

router = APIRouter()


class RangeResponse(BaseModel):
    position: str
    action_type: str
    hands: Dict[str, Dict[str, int]]  # {hand: {action: frequency}}
    drillable: List[str]
    total_hands: int


# Cache for range data
_range_cache: Dict[str, Dict] = {}


def get_range_data(format: str = "6max") -> Dict:
    """Load range data from JSON files."""
    if format in _range_cache:
        return _range_cache[format]

    data_dir = Path(__file__).parent.parent / "data" / "ranges" / format
    range_data = {}

    # Load RFI frequencies
    rfi_path = data_dir / "rfi_frequencies.json"
    if rfi_path.exists():
        with open(rfi_path) as f:
            range_data["rfi"] = json.load(f)

    # Load VS RFI frequencies
    vs_rfi_path = data_dir / "vs_rfi_frequencies.json"
    if vs_rfi_path.exists():
        with open(vs_rfi_path) as f:
            range_data["vs_rfi"] = json.load(f)

    # Load VS 3bet frequencies
    vs_3bet_path = data_dir / "vs_3bet_frequencies.json"
    if vs_3bet_path.exists():
        with open(vs_3bet_path) as f:
            range_data["vs_3bet"] = json.load(f)

    # Load VS 4bet frequencies
    vs_4bet_path = data_dir / "vs_4bet_frequencies.json"
    if vs_4bet_path.exists():
        with open(vs_4bet_path) as f:
            range_data["vs_4bet"] = json.load(f)

    _range_cache[format] = range_data
    return range_data


@router.get("/rfi/{position}", response_model=RangeResponse)
def get_rfi_range(
    position: str,
    format: str = Query(default="6max", description="Game format"),
):
    """Get RFI range for a specific position."""
    try:
        data = get_range_data(format)
        if "rfi" not in data:
            raise HTTPException(status_code=404, detail="RFI data not found")

        rfi_data = data["rfi"]
        if position not in rfi_data:
            raise HTTPException(status_code=404, detail=f"Position {position} not found")

        position_data = rfi_data[position]
        frequencies = position_data.get("frequencies", {})
        drillable = position_data.get("drillable", [])

        return RangeResponse(
            position=position,
            action_type="rfi",
            hands=frequencies,
            drillable=drillable,
            total_hands=len(frequencies),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/vs_rfi/{hero_position}/{villain_position}", response_model=RangeResponse)
def get_vs_rfi_range(
    hero_position: str,
    villain_position: str,
    format: str = Query(default="6max", description="Game format"),
):
    """Get VS RFI range for a specific matchup."""
    try:
        data = get_range_data(format)
        if "vs_rfi" not in data:
            raise HTTPException(status_code=404, detail="VS RFI data not found")

        vs_rfi_data = data["vs_rfi"]
        key = f"{hero_position}_vs_{villain_position}"

        if key not in vs_rfi_data:
            raise HTTPException(status_code=404, detail=f"Matchup {key} not found")

        matchup_data = vs_rfi_data[key]
        frequencies = matchup_data.get("frequencies", {})
        drillable = matchup_data.get("drillable", [])

        return RangeResponse(
            position=hero_position,
            action_type="vs_rfi",
            hands=frequencies,
            drillable=drillable,
            total_hands=len(frequencies),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/vs_3bet/{hero_position}/{villain_position}", response_model=RangeResponse)
def get_vs_3bet_range(
    hero_position: str,
    villain_position: str,
    format: str = Query(default="6max", description="Game format"),
):
    """Get VS 3-bet range for a specific matchup (original raiser facing 3-bet)."""
    try:
        data = get_range_data(format)
        if "vs_3bet" not in data:
            raise HTTPException(status_code=404, detail="VS 3-bet data not found")

        vs_3bet_data = data["vs_3bet"]
        key = f"{hero_position}_vs_{villain_position}"

        if key not in vs_3bet_data:
            raise HTTPException(status_code=404, detail=f"Matchup {key} not found")

        matchup_data = vs_3bet_data[key]
        frequencies = matchup_data.get("frequencies", {})
        drillable = matchup_data.get("drillable", [])

        return RangeResponse(
            position=hero_position,
            action_type="vs_3bet",
            hands=frequencies,
            drillable=drillable,
            total_hands=len(frequencies),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/vs_4bet/{hero_position}/{villain_position}", response_model=RangeResponse)
def get_vs_4bet_range(
    hero_position: str,
    villain_position: str,
    format: str = Query(default="6max", description="Game format"),
):
    """Get VS 4-bet range for a specific matchup (3-bettor facing 4-bet)."""
    try:
        data = get_range_data(format)
        if "vs_4bet" not in data:
            raise HTTPException(status_code=404, detail="VS 4-bet data not found")

        vs_4bet_data = data["vs_4bet"]
        key = f"{hero_position}_vs_{villain_position}"

        if key not in vs_4bet_data:
            raise HTTPException(status_code=404, detail=f"Matchup {key} not found")

        matchup_data = vs_4bet_data[key]
        frequencies = matchup_data.get("frequencies", {})
        drillable = matchup_data.get("drillable", [])

        return RangeResponse(
            position=hero_position,
            action_type="vs_4bet",
            hands=frequencies,
            drillable=drillable,
            total_hands=len(frequencies),
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/list")
def list_available_ranges(
    format: str = Query(default="6max", description="Game format"),
):
    """List all available range types."""
    try:
        data = get_range_data(format)
        available = {}

        if "rfi" in data:
            available["rfi"] = list(data["rfi"].keys())
        if "vs_rfi" in data:
            available["vs_rfi"] = list(data["vs_rfi"].keys())
        if "vs_3bet" in data:
            available["vs_3bet"] = list(data["vs_3bet"].keys())
        if "vs_4bet" in data:
            available["vs_4bet"] = list(data["vs_4bet"].keys())

        return {"format": format, "available": available}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
