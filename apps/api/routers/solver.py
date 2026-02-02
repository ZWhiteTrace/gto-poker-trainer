"""
GTO Solver API - Precomputed postflop strategies from Desktop Postflop.
"""
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Dict, List, Optional
from pathlib import Path
import json

router = APIRouter()

# Cache for solver data
_solver_cache: Dict[str, Dict] = {}


class SolverStrategy(BaseModel):
    bet_33: Optional[float] = None
    bet_50: Optional[float] = None
    bet_66: Optional[float] = None
    bet_75: Optional[float] = None
    bet_100: Optional[float] = None
    check: Optional[float] = None


class SolverScenario(BaseModel):
    scenario_id: str
    position: str
    villain: str
    pot_type: str
    board: List[str]
    texture: str
    texture_zh: str
    strategies: Dict[str, Dict[str, float]]


class SolverQueryResponse(BaseModel):
    found: bool
    scenario_id: Optional[str] = None
    position: Optional[str] = None
    villain: Optional[str] = None
    board: Optional[List[str]] = None
    texture: Optional[str] = None
    texture_zh: Optional[str] = None
    hand: Optional[str] = None
    strategy: Optional[Dict[str, float]] = None
    message: Optional[str] = None


class BoardTextureInfo(BaseModel):
    texture: str
    texture_zh: str
    count: int


def get_solver_data() -> List[Dict]:
    """Load all solver scenario data."""
    if "all" in _solver_cache:
        return _solver_cache["all"]

    data_dir = Path(__file__).parent.parent / "data" / "solver"
    if not data_dir.exists():
        return []

    all_scenarios = []
    for json_file in data_dir.glob("*.json"):
        try:
            with open(json_file) as f:
                data = json.load(f)
                if isinstance(data, list):
                    all_scenarios.extend(data)
                elif isinstance(data, dict) and "scenarios" in data:
                    all_scenarios.extend(data["scenarios"])
        except Exception:
            continue

    _solver_cache["all"] = all_scenarios
    return all_scenarios


def normalize_board(board: str) -> List[str]:
    """Convert board string to card list. 'AhKs5d' -> ['Ah', 'Ks', '5d']"""
    cards = []
    i = 0
    while i < len(board):
        if i + 1 < len(board):
            cards.append(board[i:i+2])
            i += 2
        else:
            i += 1
    return cards


def normalize_hand(hand: str) -> str:
    """Normalize hand format: 'AK' -> 'AKo', 'AKs' stays, 'AA' stays.

    Output format: Uppercase ranks + lowercase suit indicator (s/o).
    Examples: AA, KK, AKs, AKo, QJs, T9o
    """
    hand = hand.strip()
    if len(hand) == 0:
        return ""

    # Extract ranks (uppercase) and suit indicator (lowercase)
    if len(hand) == 2:
        ranks = hand.upper()
        if ranks[0] == ranks[1]:
            return ranks  # Pocket pair (no suffix)
        return ranks + "o"  # Default to offsuit
    elif len(hand) == 3:
        ranks = hand[:2].upper()
        suit = hand[2].lower()
        if suit in ('s', 'o'):
            return ranks + suit
        return ranks + "o"  # Invalid suffix, default to offsuit
    return hand.upper()[:2]  # Truncate invalid input


def boards_match(board1: List[str], board2: List[str]) -> bool:
    """Check if two boards match (rank-only comparison, suits flexible)."""
    if len(board1) != len(board2):
        return False

    ranks1 = sorted([c[0].upper() for c in board1])
    ranks2 = sorted([c[0].upper() for c in board2])
    return ranks1 == ranks2


def find_matching_scenario(
    board: List[str],
    position: str,
    villain: str,
    pot_type: str = "srp"
) -> Optional[Dict]:
    """Find a scenario matching the given parameters."""
    # First try exact scenario data
    scenarios = get_solver_data()

    for scenario in scenarios:
        if scenario.get("position") != position:
            continue
        if scenario.get("villain") != villain:
            continue
        if scenario.get("pot_type") != pot_type:
            continue
        if boards_match(board, scenario.get("board", [])):
            return scenario

    # Fall back to Level 1 texture data (BTN vs BB SRP only for now)
    if position == "BTN" and villain == "BB" and pot_type == "srp":
        level1_data = get_level1_data()
        textures = level1_data.get("textures", [])

        for texture in textures:
            if boards_match(board, texture.get("representative_board", [])):
                return {
                    "scenario_id": f"level1_{texture.get('texture_id')}",
                    "position": position,
                    "villain": villain,
                    "pot_type": pot_type,
                    "board": texture.get("representative_board"),
                    "texture": texture.get("texture_id"),
                    "texture_zh": texture.get("texture_zh"),
                    "strategies": texture.get("strategies", {})
                }

    return None


@router.get("/postflop", response_model=SolverQueryResponse)
def get_postflop_strategy(
    board: str = Query(..., description="Board cards, e.g., 'AhKs5d'"),
    hand: str = Query(..., description="Hero hand, e.g., 'AKo' or 'QQ'"),
    position: str = Query(..., description="Hero position, e.g., 'BTN'"),
    villain: str = Query(..., description="Villain position, e.g., 'BB'"),
    pot_type: str = Query(default="srp", description="Pot type: srp, 3bet"),
):
    """Query precomputed GTO strategy for a postflop scenario."""
    try:
        board_cards = normalize_board(board)
        normalized_hand = normalize_hand(hand)

        scenario = find_matching_scenario(
            board_cards,
            position.upper(),
            villain.upper(),
            pot_type.lower()
        )

        if not scenario:
            return SolverQueryResponse(
                found=False,
                message=f"No precomputed data for {position} vs {villain} on {board}"
            )

        strategies = scenario.get("strategies", {})
        hand_strategy = strategies.get(normalized_hand)

        if not hand_strategy:
            # Try suited/offsuit variants
            if normalized_hand.endswith("o"):
                hand_strategy = strategies.get(normalized_hand[:-1] + "s")
            elif normalized_hand.endswith("s"):
                hand_strategy = strategies.get(normalized_hand[:-1] + "o")

        # Clean strategy data - remove non-numeric fields like 'note'
        if hand_strategy:
            hand_strategy = {k: v for k, v in hand_strategy.items() if isinstance(v, (int, float))}

        if not hand_strategy:
            return SolverQueryResponse(
                found=True,
                scenario_id=scenario.get("scenario_id"),
                position=scenario.get("position"),
                villain=scenario.get("villain"),
                board=scenario.get("board"),
                texture=scenario.get("texture"),
                texture_zh=scenario.get("texture_zh"),
                hand=normalized_hand,
                strategy=None,
                message=f"Hand {normalized_hand} not found in this scenario"
            )

        return SolverQueryResponse(
            found=True,
            scenario_id=scenario.get("scenario_id"),
            position=scenario.get("position"),
            villain=scenario.get("villain"),
            board=scenario.get("board"),
            texture=scenario.get("texture"),
            texture_zh=scenario.get("texture_zh"),
            hand=normalized_hand,
            strategy=hand_strategy,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/textures")
def list_solver_textures():
    """List all available board textures in solver data."""
    scenarios = get_solver_data()

    textures: Dict[str, BoardTextureInfo] = {}
    for s in scenarios:
        texture = s.get("texture")
        texture_zh = s.get("texture_zh", "")
        if texture:
            if texture in textures:
                textures[texture].count += 1
            else:
                textures[texture] = BoardTextureInfo(
                    texture=texture,
                    texture_zh=texture_zh,
                    count=1
                )

    return {
        "textures": [t.model_dump() for t in textures.values()],
        "total_scenarios": len(scenarios)
    }


@router.get("/scenarios")
def list_solver_scenarios(
    position: Optional[str] = Query(default=None, description="Filter by hero position"),
    villain: Optional[str] = Query(default=None, description="Filter by villain position"),
    pot_type: Optional[str] = Query(default=None, description="Filter by pot type"),
    texture: Optional[str] = Query(default=None, description="Filter by board texture"),
    limit: int = Query(default=20, le=100),
):
    """List available solver scenarios with optional filtering."""
    scenarios = get_solver_data()

    filtered = scenarios
    if position:
        filtered = [s for s in filtered if s.get("position") == position.upper()]
    if villain:
        filtered = [s for s in filtered if s.get("villain") == villain.upper()]
    if pot_type:
        filtered = [s for s in filtered if s.get("pot_type") == pot_type.lower()]
    if texture:
        filtered = [s for s in filtered if s.get("texture") == texture]

    return {
        "total": len(filtered),
        "scenarios": [
            {
                "scenario_id": s.get("scenario_id"),
                "position": s.get("position"),
                "villain": s.get("villain"),
                "pot_type": s.get("pot_type"),
                "board": s.get("board"),
                "texture": s.get("texture"),
                "texture_zh": s.get("texture_zh"),
                "hand_count": len(s.get("strategies", {}))
            }
            for s in filtered[:limit]
        ]
    }


@router.get("/boards")
def list_available_boards(
    position: str = Query(..., description="Hero position, e.g., 'BTN'"),
    villain: str = Query(..., description="Villain position, e.g., 'BB'"),
    pot_type: str = Query(default="srp", description="Pot type: srp, 3bet"),
):
    """List all precomputed boards for a specific position matchup."""
    scenarios = get_solver_data()

    boards = []
    for s in scenarios:
        if s.get("position") == position.upper() and \
           s.get("villain") == villain.upper() and \
           s.get("pot_type") == pot_type.lower():
            boards.append({
                "board": s.get("board"),
                "texture": s.get("texture"),
                "texture_zh": s.get("texture_zh"),
            })

    return {
        "position": position.upper(),
        "villain": villain.upper(),
        "pot_type": pot_type,
        "boards": boards,
        "count": len(boards)
    }


@router.delete("/cache")
def clear_solver_cache():
    """Clear solver data cache (for development/testing)."""
    _solver_cache.clear()
    return {"message": "Solver cache cleared"}


# ============ Level 1: Texture Learning System ============

import random

def get_level1_data() -> Dict:
    """Load Level 1 texture learning data."""
    if "level1" in _solver_cache:
        return _solver_cache["level1"]

    data_path = Path(__file__).parent.parent / "data" / "solver" / "level1_textures.json"
    if not data_path.exists():
        return {"textures": []}

    with open(data_path, encoding="utf-8") as f:
        data = json.load(f)

    _solver_cache["level1"] = data
    return data


class TextureConcept(BaseModel):
    title: str
    summary: str
    key_points: List[str]
    common_mistakes: List[str]


class TextureInfo(BaseModel):
    texture_id: str
    texture_zh: str
    category: str
    difficulty: int
    representative_board: List[str]
    concept: TextureConcept
    hand_count: int


class TextureDrillQuestion(BaseModel):
    texture_id: str
    texture_zh: str
    board: List[str]
    hand: str
    hand_note: Optional[str]
    options: List[str]


class TextureDrillAnswer(BaseModel):
    correct: bool
    user_action: str
    correct_strategy: Dict[str, float]
    note: Optional[str]
    concept_summary: str


@router.get("/level1/textures")
def list_level1_textures():
    """List all 12 texture categories for Level 1 learning."""
    data = get_level1_data()
    textures = data.get("textures", [])

    return {
        "total": len(textures),
        "categories": {
            "dry": [t for t in textures if t.get("category") == "dry"],
            "paired": [t for t in textures if t.get("category") == "paired"],
            "wet": [t for t in textures if t.get("category") == "wet"],
            "connected": [t for t in textures if t.get("category") == "connected"],
        },
        "textures": [
            {
                "texture_id": t.get("texture_id"),
                "texture_zh": t.get("texture_zh"),
                "category": t.get("category"),
                "difficulty": t.get("difficulty"),
                "representative_board": t.get("representative_board"),
                "hand_count": len(t.get("strategies", {}))
            }
            for t in textures
        ]
    }


@router.get("/level1/texture/{texture_id}", response_model=TextureInfo)
def get_texture_detail(texture_id: str):
    """Get detailed information about a specific texture for learning."""
    data = get_level1_data()
    textures = data.get("textures", [])

    texture = None
    for t in textures:
        if t.get("texture_id") == texture_id:
            texture = t
            break

    if not texture:
        raise HTTPException(status_code=404, detail=f"Texture '{texture_id}' not found")

    return TextureInfo(
        texture_id=texture.get("texture_id"),
        texture_zh=texture.get("texture_zh"),
        category=texture.get("category"),
        difficulty=texture.get("difficulty"),
        representative_board=texture.get("representative_board"),
        concept=TextureConcept(**texture.get("concept", {})),
        hand_count=len(texture.get("strategies", {}))
    )


@router.get("/level1/drill")
def get_texture_drill(
    texture_id: Optional[str] = Query(default=None, description="Specific texture to drill"),
    difficulty: Optional[int] = Query(default=None, ge=1, le=3, description="Filter by difficulty"),
):
    """Get a random drill question for texture training."""
    data = get_level1_data()
    textures = data.get("textures", [])

    # Filter textures
    filtered = textures
    if texture_id:
        filtered = [t for t in filtered if t.get("texture_id") == texture_id]
    if difficulty:
        filtered = [t for t in filtered if t.get("difficulty") == difficulty]

    if not filtered:
        raise HTTPException(status_code=404, detail="No textures match the criteria")

    # Pick random texture
    texture = random.choice(filtered)
    strategies = texture.get("strategies", {})

    if not strategies:
        raise HTTPException(status_code=404, detail="No strategies in this texture")

    # Pick random hand
    hand = random.choice(list(strategies.keys()))
    hand_data = strategies[hand]

    # Build options based on what actions are available
    options = []
    if "bet_33" in hand_data or "bet_50" in hand_data or "bet_66" in hand_data or "bet_75" in hand_data:
        options.extend(["bet_33", "bet_50", "bet_66", "bet_75"])
    if "check" in hand_data:
        options.append("check")

    # Ensure we have standard options
    if not options:
        options = ["bet_33", "bet_50", "bet_75", "check"]

    return {
        "texture_id": texture.get("texture_id"),
        "texture_zh": texture.get("texture_zh"),
        "category": texture.get("category"),
        "difficulty": texture.get("difficulty"),
        "board": texture.get("representative_board"),
        "hand": hand,
        "options": list(set(options)),  # Remove duplicates
        "concept_hint": texture.get("concept", {}).get("title", "")
    }


@router.post("/level1/evaluate")
def evaluate_texture_drill(
    texture_id: str = Query(..., description="Texture ID"),
    hand: str = Query(..., description="Hand being evaluated"),
    user_action: str = Query(..., description="User's chosen action"),
):
    """Evaluate user's answer for a texture drill."""
    data = get_level1_data()
    textures = data.get("textures", [])

    # Find texture
    texture = None
    for t in textures:
        if t.get("texture_id") == texture_id:
            texture = t
            break

    if not texture:
        raise HTTPException(status_code=404, detail=f"Texture '{texture_id}' not found")

    strategies = texture.get("strategies", {})
    hand_data = strategies.get(hand)

    if not hand_data:
        raise HTTPException(status_code=404, detail=f"Hand '{hand}' not found in texture")

    # Extract note if present
    note = hand_data.pop("note", None) if isinstance(hand_data, dict) else None

    # Calculate if correct (within 20% of optimal frequency)
    user_action_base = user_action.split("_")[0] if "_" in user_action else user_action

    # Find the highest frequency action
    max_freq = 0
    best_action = "check"
    strategy_clean = {k: v for k, v in hand_data.items() if k != "note"}

    for action, freq in strategy_clean.items():
        if freq > max_freq:
            max_freq = freq
            best_action = action

    # User is correct if they chose an action with >= 30% frequency
    user_freq = strategy_clean.get(user_action, 0)
    is_correct = user_freq >= 30

    return {
        "correct": is_correct,
        "user_action": user_action,
        "user_frequency": user_freq,
        "best_action": best_action,
        "best_frequency": max_freq,
        "full_strategy": strategy_clean,
        "note": note,
        "concept_summary": texture.get("concept", {}).get("summary", ""),
        "key_points": texture.get("concept", {}).get("key_points", [])
    }


@router.get("/level1/texture/{texture_id}/hands")
def get_texture_hands(texture_id: str):
    """Get all hands and their strategies for a specific texture."""
    data = get_level1_data()
    textures = data.get("textures", [])

    texture = None
    for t in textures:
        if t.get("texture_id") == texture_id:
            texture = t
            break

    if not texture:
        raise HTTPException(status_code=404, detail=f"Texture '{texture_id}' not found")

    strategies = texture.get("strategies", {})

    # Organize by hand strength
    hands_by_category = {
        "strong_value": [],  # Sets, two pair, strong top pair
        "medium_value": [],  # Top pair medium kicker, overpair
        "draws": [],         # Flush draws, straight draws
        "bluffs": [],        # Air with blockers
        "check_mostly": []   # Hands that mostly check
    }

    for hand, data in strategies.items():
        note = data.get("note", "")
        check_freq = data.get("check", 0)

        # Categorize based on note and frequencies
        if "set" in note.lower() or "兩對" in note or "順子" in note or "同花" in note:
            hands_by_category["strong_value"].append({"hand": hand, **data})
        elif "overpair" in note.lower() or "頂對" in note:
            hands_by_category["medium_value"].append({"hand": hand, **data})
        elif "聽牌" in note or "draw" in note.lower():
            hands_by_category["draws"].append({"hand": hand, **data})
        elif check_freq >= 60:
            hands_by_category["check_mostly"].append({"hand": hand, **data})
        else:
            hands_by_category["bluffs"].append({"hand": hand, **data})

    return {
        "texture_id": texture_id,
        "texture_zh": texture.get("texture_zh"),
        "board": texture.get("representative_board"),
        "concept": texture.get("concept"),
        "hands_by_category": hands_by_category,
        "total_hands": len(strategies)
    }
