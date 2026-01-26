"""
MTT Push/Fold drill engine for short stack training.
Based on Nash equilibrium push/fold ranges.
"""
import random
import json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Set

from core.hand import Hand, random_hand, ALL_HANDS


# Available positions for push/fold (6-max)
PUSH_FOLD_POSITIONS = ["UTG", "HJ", "CO", "BTN", "SB"]

# Available stack depths
STACK_DEPTHS = ["3bb", "4bb", "5bb", "8bb", "10bb", "12bb", "15bb", "20bb", "25bb"]

# Stack depth labels for UI
STACK_DEPTH_LABELS = {
    "3bb": {"zh": "3 BB (絕境)", "en": "3 BB (Desperate)"},
    "4bb": {"zh": "4 BB (極短)", "en": "4 BB (Extreme Short)"},
    "5bb": {"zh": "5 BB (短碼)", "en": "5 BB (Short)"},
    "8bb": {"zh": "8 BB", "en": "8 BB"},
    "10bb": {"zh": "10 BB (標準短)", "en": "10 BB (Standard Short)"},
    "12bb": {"zh": "12 BB", "en": "12 BB"},
    "15bb": {"zh": "15 BB", "en": "15 BB"},
    "20bb": {"zh": "20 BB (邊緣)", "en": "20 BB (Borderline)"},
    "25bb": {"zh": "25 BB (過渡)", "en": "25 BB (Transitional)"},
}

# Defense scenarios (defender_position vs shover_position)
DEFENSE_SCENARIOS = [
    "BB_vs_SB_shove",
    "BB_vs_BTN_shove",
    "SB_vs_BTN_shove",
    "BB_vs_CO_shove",
    "BB_vs_HJ_shove",
]

# Defense scenario labels for UI
DEFENSE_SCENARIO_LABELS = {
    "BB_vs_SB_shove": {"zh": "BB vs SB 全下", "en": "BB vs SB Shove"},
    "BB_vs_BTN_shove": {"zh": "BB vs BTN 全下", "en": "BB vs BTN Shove"},
    "SB_vs_BTN_shove": {"zh": "SB vs BTN 全下", "en": "SB vs BTN Shove"},
    "BB_vs_CO_shove": {"zh": "BB vs CO 全下", "en": "BB vs CO Shove"},
    "BB_vs_HJ_shove": {"zh": "BB vs HJ 全下", "en": "BB vs HJ Shove"},
}


def load_push_fold_data() -> dict:
    """Load push/fold ranges from JSON file."""
    data_path = Path(__file__).parent.parent / "data" / "ranges" / "mtt" / "push_fold.json"
    try:
        with open(data_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Failed to load push/fold data: {e}")
        return {}


def load_defense_data() -> dict:
    """Load defense vs shove ranges from JSON file."""
    data_path = Path(__file__).parent.parent / "data" / "ranges" / "mtt" / "defense_vs_shove.json"
    try:
        with open(data_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Failed to load defense data: {e}")
        return {}


# Load data at module level for efficiency
_PUSH_FOLD_DATA = load_push_fold_data()
_DEFENSE_DATA = load_defense_data()


@dataclass
class PushFoldSpot:
    """Represents a single push/fold training spot."""
    hand: Hand
    position: str
    stack_depth: str
    is_defense: bool = False  # True for defense vs shove scenarios
    defense_scenario: str = None  # e.g., "BB_vs_SB_shove"
    timestamp: datetime = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()

    def to_dict(self) -> dict:
        result = {
            "hand": str(self.hand),
            "position": self.position,
            "stack_depth": self.stack_depth,
            "timestamp": self.timestamp.isoformat(),
        }
        if self.is_defense:
            result["is_defense"] = True
            result["defense_scenario"] = self.defense_scenario
        return result


@dataclass
class PushFoldResult:
    """Result of a push/fold evaluation."""
    is_correct: bool
    correct_action: str  # "push" or "fold"
    explanation: str
    push_range_count: int  # Number of hands in push range
    push_range_pct: float  # Percentage of hands pushed


class PushFoldDrill:
    """
    Drill engine for MTT push/fold training.
    Supports both push (open-shove) and defense (call vs shove) scenarios.
    """

    def __init__(self):
        self.data = _PUSH_FOLD_DATA
        self.defense_data = _DEFENSE_DATA
        self.enabled_positions = list(PUSH_FOLD_POSITIONS)
        self.enabled_stack_depths = list(STACK_DEPTHS)
        self.enabled_defense_scenarios = list(DEFENSE_SCENARIOS)
        self._build_push_ranges()
        self._build_call_ranges()

    def _build_push_ranges(self):
        """Build push range sets for quick lookup."""
        self.push_ranges = {}
        if "6max" not in self.data:
            return

        for stack in self.data["6max"]:
            self.push_ranges[stack] = {}
            for pos in self.data["6max"][stack]:
                self.push_ranges[stack][pos] = set(self.data["6max"][stack][pos])

    def _build_call_ranges(self):
        """Build call range sets for defense scenarios."""
        self.call_ranges = {}
        if "6max" not in self.defense_data:
            return

        for scenario in self.defense_data["6max"]:
            self.call_ranges[scenario] = {}
            for stack in self.defense_data["6max"][scenario]:
                self.call_ranges[scenario][stack] = set(self.defense_data["6max"][scenario][stack])

    def set_enabled_positions(self, positions: List[str]):
        """Set which positions to practice."""
        self.enabled_positions = positions

    def set_enabled_stack_depths(self, stack_depths: List[str]):
        """Set which stack depths to practice."""
        self.enabled_stack_depths = stack_depths

    def set_enabled_defense_scenarios(self, scenarios: List[str]):
        """Set which defense scenarios to practice."""
        self.enabled_defense_scenarios = scenarios

    def get_push_range(self, stack_depth: str, position: str) -> Set[str]:
        """Get the push range for a given stack depth and position."""
        return self.push_ranges.get(stack_depth, {}).get(position, set())

    def is_push(self, hand: Hand, stack_depth: str, position: str) -> bool:
        """Check if a hand should be pushed at the given stack depth and position."""
        push_range = self.get_push_range(stack_depth, position)
        return str(hand) in push_range

    def get_call_range(self, scenario: str, stack_depth: str) -> Set[str]:
        """Get the call range for a given defense scenario and stack depth."""
        return self.call_ranges.get(scenario, {}).get(stack_depth, set())

    def get_available_stack_depths_for_scenario(self, scenario: str) -> List[str]:
        """Get available stack depths for a defense scenario."""
        if scenario in self.call_ranges:
            return list(self.call_ranges[scenario].keys())
        return []

    def is_call(self, hand: Hand, scenario: str, stack_depth: str) -> bool:
        """Check if a hand should call at the given defense scenario and stack depth."""
        call_range = self.get_call_range(scenario, stack_depth)
        return str(hand) in call_range

    def generate_spot(self) -> PushFoldSpot:
        """Generate a random push/fold spot."""
        position = random.choice(self.enabled_positions)
        stack_depth = random.choice(self.enabled_stack_depths)

        # Generate a hand that's interesting to practice
        # Mix of push and fold hands based on position/stack
        push_range = self.get_push_range(stack_depth, position)

        # 60% chance to pick a hand near the edge (interesting decisions)
        # 40% chance to pick any random hand
        if random.random() < 0.6:
            hand = self._generate_edge_hand(push_range, position, stack_depth)
        else:
            hand = random_hand()

        return PushFoldSpot(hand=hand, position=position, stack_depth=stack_depth)

    def generate_defense_spot(self) -> Optional[PushFoldSpot]:
        """Generate a random defense vs shove spot."""
        if not self.enabled_defense_scenarios:
            return None

        scenario = random.choice(self.enabled_defense_scenarios)

        # Get available stack depths for this scenario
        available_stacks = self.get_available_stack_depths_for_scenario(scenario)
        if not available_stacks:
            return None

        stack_depth = random.choice(available_stacks)
        call_range = self.get_call_range(scenario, stack_depth)

        # Extract defender position from scenario (e.g., "BB_vs_SB_shove" -> "BB")
        defender_pos = scenario.split("_")[0]

        # 60% chance to pick a hand near the edge
        if random.random() < 0.6:
            hand = self._generate_defense_edge_hand(call_range)
        else:
            hand = random_hand()

        return PushFoldSpot(
            hand=hand,
            position=defender_pos,
            stack_depth=stack_depth,
            is_defense=True,
            defense_scenario=scenario,
        )

    def _generate_defense_edge_hand(self, call_range: Set[str]) -> Hand:
        """Generate a hand near the call/fold edge for defense scenarios."""
        all_hands = set(ALL_HANDS)
        edge_hands = []

        # Add hands from call range
        call_list = list(call_range)
        if call_list:
            edge_hands.extend(random.sample(call_list, min(20, len(call_list))))

        # Add hands just outside call range (will be folded)
        fold_hands = all_hands - call_range
        fold_list = list(fold_hands)
        if fold_list:
            edge_hands.extend(random.sample(fold_list, min(20, len(fold_list))))

        if edge_hands:
            hand_str = random.choice(edge_hands)
            return Hand(hand_str)

        return random_hand()

    def _generate_edge_hand(self, push_range: Set[str], position: str, stack_depth: str) -> Hand:
        """Generate a hand near the push/fold edge for more interesting decisions."""
        # Get hands that are close to the boundary
        all_hands = set(ALL_HANDS)

        # Include some hands from push range and some just outside
        edge_hands = []

        # Add hands from push range (will be pushed)
        push_list = list(push_range)
        if push_list:
            edge_hands.extend(random.sample(push_list, min(20, len(push_list))))

        # Add hands just outside push range (will be folded)
        fold_hands = all_hands - push_range
        fold_list = list(fold_hands)
        if fold_list:
            edge_hands.extend(random.sample(fold_list, min(20, len(fold_list))))

        if edge_hands:
            hand_str = random.choice(edge_hands)
            return Hand(hand_str)

        return random_hand()

    def check_answer(self, spot: PushFoldSpot, player_action: str) -> PushFoldResult:
        """
        Check if the player's action is correct.

        Args:
            spot: The push/fold spot being evaluated
            player_action: "push" or "fold"

        Returns:
            PushFoldResult with correctness and explanation
        """
        should_push = self.is_push(spot.hand, spot.stack_depth, spot.position)
        correct_action = "push" if should_push else "fold"

        # Normalize player action
        player_action = player_action.lower().strip()
        if player_action in ["push", "all-in", "allin", "shove"]:
            player_action = "push"
        elif player_action in ["fold", "muck"]:
            player_action = "fold"

        is_correct = (player_action == correct_action)

        # Get range info for explanation
        push_range = self.get_push_range(spot.stack_depth, spot.position)
        push_count = len(push_range)
        push_pct = (push_count / 169) * 100

        # Generate explanation
        explanation = self._generate_explanation(
            spot, correct_action, is_correct, push_pct
        )

        return PushFoldResult(
            is_correct=is_correct,
            correct_action=correct_action,
            explanation=explanation,
            push_range_count=push_count,
            push_range_pct=push_pct,
        )

    def check_defense_answer(self, spot: PushFoldSpot, player_action: str) -> PushFoldResult:
        """
        Check if the player's defense action is correct.

        Args:
            spot: The defense spot being evaluated
            player_action: "call" or "fold"

        Returns:
            PushFoldResult with correctness and explanation
        """
        if not spot.is_defense or not spot.defense_scenario:
            raise ValueError("This is not a defense spot")

        should_call = self.is_call(spot.hand, spot.defense_scenario, spot.stack_depth)
        correct_action = "call" if should_call else "fold"

        # Normalize player action
        player_action = player_action.lower().strip()
        if player_action in ["call", "all-in", "allin"]:
            player_action = "call"
        elif player_action in ["fold", "muck"]:
            player_action = "fold"

        is_correct = (player_action == correct_action)

        # Get range info for explanation
        call_range = self.get_call_range(spot.defense_scenario, spot.stack_depth)
        call_count = len(call_range)
        call_pct = (call_count / 169) * 100

        # Generate explanation
        explanation = self._generate_defense_explanation(
            spot, correct_action, is_correct, call_pct
        )

        return PushFoldResult(
            is_correct=is_correct,
            correct_action=correct_action,
            explanation=explanation,
            push_range_count=call_count,  # Reusing field for call range
            push_range_pct=call_pct,
        )

    def _generate_defense_explanation(
        self, spot: PushFoldSpot, correct_action: str, is_correct: bool, call_pct: float
    ) -> str:
        """Generate explanation for defense result."""
        hand_str = str(spot.hand)
        scenario = spot.defense_scenario
        stack = spot.stack_depth

        # Get human-readable scenario name
        scenario_label = DEFENSE_SCENARIO_LABELS.get(scenario, {}).get("zh", scenario)

        if is_correct:
            if correct_action == "call":
                return f"{hand_str} 在 {scenario_label} {stack} 屬於 Call 範圍 ({call_pct:.0f}% 手牌 call)"
            else:
                return f"{hand_str} 在 {scenario_label} {stack} 不在 Call 範圍內，應該 Fold"
        else:
            if correct_action == "call":
                return f"錯誤！{hand_str} 在 {scenario_label} {stack} 應該 Call (範圍 {call_pct:.0f}%)"
            else:
                return f"錯誤！{hand_str} 在 {scenario_label} {stack} 不在 Call 範圍，應該 Fold"

    def _generate_explanation(
        self, spot: PushFoldSpot, correct_action: str, is_correct: bool, push_pct: float
    ) -> str:
        """Generate explanation for the result."""
        hand_str = str(spot.hand)
        pos = spot.position
        stack = spot.stack_depth

        if is_correct:
            if correct_action == "push":
                return f"{hand_str} 在 {pos} {stack} 深度屬於 Push 範圍 ({push_pct:.0f}% 手牌 push)"
            else:
                return f"{hand_str} 在 {pos} {stack} 深度不在 Push 範圍內，應該 Fold"
        else:
            if correct_action == "push":
                return f"錯誤！{hand_str} 在 {pos} {stack} 應該 Push (範圍 {push_pct:.0f}%)"
            else:
                return f"錯誤！{hand_str} 在 {pos} {stack} 不在 Push 範圍，應該 Fold"


# Singleton instance for easy access
_drill_instance = None


def get_push_fold_drill() -> PushFoldDrill:
    """Get the singleton PushFoldDrill instance."""
    global _drill_instance
    if _drill_instance is None:
        _drill_instance = PushFoldDrill()
    return _drill_instance
