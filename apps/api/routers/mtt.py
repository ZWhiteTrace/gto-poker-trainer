"""
MTT Push/Fold range endpoints and drill mode.
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, List, Optional, Set
from pathlib import Path
import json
import random

router = APIRouter()

# Cache for MTT data
_mtt_cache: Dict[str, Dict] = {}

# All possible hands for edge hand generation
ALL_HANDS = []
for r1 in "AKQJT98765432":
    for r2 in "AKQJT98765432":
        if r1 == r2:
            ALL_HANDS.append(f"{r1}{r2}")  # Pairs
        elif "AKQJT98765432".index(r1) < "AKQJT98765432".index(r2):
            ALL_HANDS.append(f"{r1}{r2}s")  # Suited
            ALL_HANDS.append(f"{r1}{r2}o")  # Offsuit
ALL_HANDS = list(set(ALL_HANDS))


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
        except Exception:
            pass

        # Get defense data
        try:
            def_data = get_mtt_data("defense")
            if format in def_data:
                result["defense"]["scenarios"] = list(def_data[format].keys())
                first_scenario = list(def_data[format].keys())[0]
                result["defense"]["stack_depths"] = list(def_data[format][first_scenario].keys())
        except Exception:
            pass

        # Get resteal data
        try:
            rs_data = get_mtt_data("resteal")
            if format in rs_data:
                result["resteal"]["scenarios"] = list(rs_data[format].keys())
                first_scenario = list(rs_data[format].keys())[0]
                result["resteal"]["stack_depths"] = list(rs_data[format][first_scenario].keys())
        except Exception:
            pass

        # Get HU data
        try:
            hu_data = get_mtt_data("hu")
            if format in hu_data:
                result["hu"]["scenarios"] = list(hu_data[format].keys())
                first_scenario = list(hu_data[format].keys())[0]
                result["hu"]["stack_depths"] = list(hu_data[format][first_scenario].keys())
        except Exception:
            pass

        return {"format": format, "available": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# =====================
# Drill Mode Endpoints
# =====================

class DrillSpotRequest(BaseModel):
    mode: str = "push"  # push, defense, resteal, hu
    enabled_positions: List[str] = ["UTG", "HJ", "CO", "BTN", "SB"]
    enabled_stack_depths: List[str] = ["5bb", "8bb", "10bb", "12bb", "15bb"]
    enabled_scenarios: Optional[List[str]] = None  # For defense/resteal/hu


class DrillSpotResponse(BaseModel):
    hand: str
    position: str
    stack_depth: str
    mode: str
    scenario: Optional[str] = None  # For defense/resteal/hu
    scenario_display: Optional[str] = None  # Human readable scenario
    available_actions: List[str]


class DrillEvaluateRequest(BaseModel):
    hand: str
    position: str
    stack_depth: str
    mode: str
    action: str  # push/fold or call/fold
    scenario: Optional[str] = None


class DrillEvaluateResponse(BaseModel):
    is_correct: bool
    correct_action: str
    explanation: str
    explanation_zh: str
    range_count: int
    range_pct: float


def get_random_hand() -> str:
    """Generate a random hand."""
    return random.choice(ALL_HANDS)


def generate_edge_hand(range_set: Set[str]) -> str:
    """Generate a hand near the push/fold edge for interesting decisions."""
    edge_hands = []

    # Add hands from range
    range_list = list(range_set)
    if range_list:
        edge_hands.extend(random.sample(range_list, min(20, len(range_list))))

    # Add hands just outside range (will be folded)
    fold_hands = set(ALL_HANDS) - range_set
    fold_list = list(fold_hands)
    if fold_list:
        edge_hands.extend(random.sample(fold_list, min(20, len(fold_list))))

    if edge_hands:
        return random.choice(edge_hands)

    return get_random_hand()


@router.post("/drill/generate", response_model=DrillSpotResponse)
def generate_drill_spot(request: DrillSpotRequest):
    """Generate a random push/fold drill spot."""
    try:
        mode = request.mode

        if mode == "push":
            # Standard push/fold
            data = get_mtt_data("push_fold")
            format_data = data.get("6max", {})

            # Filter available stack depths
            available_stacks = [s for s in request.enabled_stack_depths if s in format_data]
            if not available_stacks:
                available_stacks = list(format_data.keys())[:5]

            stack_depth = random.choice(available_stacks)
            stack_data = format_data.get(stack_depth, {})

            # Filter available positions
            available_positions = [p for p in request.enabled_positions if p in stack_data]
            if not available_positions:
                available_positions = list(stack_data.keys())

            position = random.choice(available_positions)
            push_range = set(stack_data.get(position, []))

            # 60% edge hands, 40% random
            if random.random() < 0.6 and push_range:
                hand = generate_edge_hand(push_range)
            else:
                hand = get_random_hand()

            return DrillSpotResponse(
                hand=hand,
                position=position,
                stack_depth=stack_depth,
                mode=mode,
                available_actions=["push", "fold"]
            )

        elif mode == "defense":
            # Defense vs shove
            data = get_mtt_data("defense")
            format_data = data.get("6max", {})

            scenarios = request.enabled_scenarios or list(format_data.keys())
            available_scenarios = [s for s in scenarios if s in format_data]
            if not available_scenarios:
                available_scenarios = list(format_data.keys())

            scenario = random.choice(available_scenarios)
            scenario_data = format_data.get(scenario, {})

            available_stacks = [s for s in request.enabled_stack_depths if s in scenario_data]
            if not available_stacks:
                available_stacks = list(scenario_data.keys())

            stack_depth = random.choice(available_stacks)
            call_range = set(scenario_data.get(stack_depth, []))

            # Extract defender position
            position = scenario.split("_")[0]

            # 60% edge hands, 40% random
            if random.random() < 0.6 and call_range:
                hand = generate_edge_hand(call_range)
            else:
                hand = get_random_hand()

            # Format scenario display
            scenario_display = scenario.replace("_", " ").replace("vs", "vs").replace("shove", "Shove")

            return DrillSpotResponse(
                hand=hand,
                position=position,
                stack_depth=stack_depth,
                mode=mode,
                scenario=scenario,
                scenario_display=scenario_display,
                available_actions=["call", "fold"]
            )

        elif mode == "resteal":
            # Resteal (3bet shove)
            data = get_mtt_data("resteal")
            format_data = data.get("6max", {})

            scenarios = request.enabled_scenarios or list(format_data.keys())
            available_scenarios = [s for s in scenarios if s in format_data]
            if not available_scenarios:
                available_scenarios = list(format_data.keys())

            scenario = random.choice(available_scenarios)
            scenario_data = format_data.get(scenario, {})

            available_stacks = [s for s in request.enabled_stack_depths if s in scenario_data]
            if not available_stacks:
                available_stacks = list(scenario_data.keys())

            stack_depth = random.choice(available_stacks)
            resteal_range = set(scenario_data.get(stack_depth, []))

            # Extract hero position
            position = scenario.split("_")[0]

            if random.random() < 0.6 and resteal_range:
                hand = generate_edge_hand(resteal_range)
            else:
                hand = get_random_hand()

            # Format scenario display
            scenario_display = scenario.replace("_", " ").replace("resteal", "3bet Shove").replace("vs", "vs")

            return DrillSpotResponse(
                hand=hand,
                position=position,
                stack_depth=stack_depth,
                mode=mode,
                scenario=scenario,
                scenario_display=scenario_display,
                available_actions=["shove", "fold"]
            )

        elif mode == "hu":
            # Heads Up
            data = get_mtt_data("hu")
            format_data = data.get("hu", {})

            scenarios = request.enabled_scenarios or list(format_data.keys())
            available_scenarios = [s for s in scenarios if s in format_data]
            if not available_scenarios:
                available_scenarios = list(format_data.keys())

            scenario = random.choice(available_scenarios)
            scenario_data = format_data.get(scenario, {})

            available_stacks = [s for s in request.enabled_stack_depths if s in scenario_data]
            if not available_stacks:
                available_stacks = list(scenario_data.keys())

            stack_depth = random.choice(available_stacks)
            hu_range = set(scenario_data.get(stack_depth, []))

            position = scenario.split("_")[0]

            if random.random() < 0.6 and hu_range:
                hand = generate_edge_hand(hu_range)
            else:
                hand = get_random_hand()

            # Determine action type based on scenario
            if "call" in scenario:
                available_actions = ["call", "fold"]
            else:
                available_actions = ["push", "fold"]

            scenario_display = scenario.replace("_", " ")

            return DrillSpotResponse(
                hand=hand,
                position=position,
                stack_depth=stack_depth,
                mode=mode,
                scenario=scenario,
                scenario_display=scenario_display,
                available_actions=available_actions
            )

        else:
            raise HTTPException(status_code=400, detail=f"Unknown mode: {mode}")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/drill/evaluate", response_model=DrillEvaluateResponse)
def evaluate_drill_answer(request: DrillEvaluateRequest):
    """Evaluate a push/fold drill answer."""
    try:
        mode = request.mode
        hand = request.hand
        position = request.position
        stack_depth = request.stack_depth
        action = request.action
        scenario = request.scenario

        range_set: Set[str] = set()

        if mode == "push":
            data = get_mtt_data("push_fold")
            format_data = data.get("6max", {})
            stack_data = format_data.get(stack_depth, {})
            range_set = set(stack_data.get(position, []))

            should_action = hand in range_set
            correct_action = "push" if should_action else "fold"
            is_correct = action == correct_action

            range_pct = round(len(range_set) / 169 * 100, 1)

            if should_action:
                explanation = f"{hand} is in the {position} push range at {stack_depth}. Push range is {range_pct}% of hands."
                explanation_zh = f"{hand} 在 {position} {stack_depth} 的推入範圍內。推入範圍為 {range_pct}% 的手牌。"
            else:
                explanation = f"{hand} is outside the {position} push range at {stack_depth}. Fold this hand."
                explanation_zh = f"{hand} 在 {position} {stack_depth} 的推入範圍外。棄掉這手牌。"

        elif mode == "defense":
            data = get_mtt_data("defense")
            format_data = data.get("6max", {})
            scenario_data = format_data.get(scenario, {})
            range_set = set(scenario_data.get(stack_depth, []))

            should_action = hand in range_set
            correct_action = "call" if should_action else "fold"
            is_correct = action == correct_action

            range_pct = round(len(range_set) / 169 * 100, 1)

            if should_action:
                explanation = f"{hand} is in the call range for {scenario} at {stack_depth}. Call range is {range_pct}%."
                explanation_zh = f"{hand} 在 {scenario} {stack_depth} 的跟注範圍內。跟注範圍為 {range_pct}%。"
            else:
                explanation = f"{hand} is outside the call range. Fold against the shove."
                explanation_zh = f"{hand} 在跟注範圍外。面對全下應棄牌。"

        elif mode == "resteal":
            data = get_mtt_data("resteal")
            format_data = data.get("6max", {})
            scenario_data = format_data.get(scenario, {})
            range_set = set(scenario_data.get(stack_depth, []))

            should_action = hand in range_set
            correct_action = "shove" if should_action else "fold"
            is_correct = action == correct_action

            range_pct = round(len(range_set) / 169 * 100, 1)

            if should_action:
                explanation = f"{hand} is in the 3bet shove range for {scenario} at {stack_depth}. Resteal range is {range_pct}%."
                explanation_zh = f"{hand} 在 {scenario} {stack_depth} 的 3bet 全下範圍內。Resteal 範圍為 {range_pct}%。"
            else:
                explanation = f"{hand} is outside the resteal range. Just fold preflop."
                explanation_zh = f"{hand} 在 resteal 範圍外。翻前直接棄牌。"

        elif mode == "hu":
            data = get_mtt_data("hu")
            format_data = data.get("hu", {})
            scenario_data = format_data.get(scenario, {})
            range_set = set(scenario_data.get(stack_depth, []))

            should_action = hand in range_set
            if "call" in scenario:
                correct_action = "call" if should_action else "fold"
            else:
                correct_action = "push" if should_action else "fold"
            is_correct = action == correct_action

            range_pct = round(len(range_set) / 169 * 100, 1)

            if should_action:
                explanation = f"{hand} is in the {scenario} range at {stack_depth}. Range is {range_pct}%."
                explanation_zh = f"{hand} 在 {scenario} {stack_depth} 的範圍內。範圍為 {range_pct}%。"
            else:
                explanation = f"{hand} is outside the range for this HU scenario."
                explanation_zh = f"{hand} 在此單挑場景的範圍外。"

        else:
            raise HTTPException(status_code=400, detail=f"Unknown mode: {mode}")

        return DrillEvaluateResponse(
            is_correct=is_correct,
            correct_action=correct_action,
            explanation=explanation,
            explanation_zh=explanation_zh,
            range_count=len(range_set),
            range_pct=range_pct
        )

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
