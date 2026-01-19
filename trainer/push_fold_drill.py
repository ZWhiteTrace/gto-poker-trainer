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
STACK_DEPTHS = ["10bb", "15bb", "20bb"]

# Stack depth labels for UI
STACK_DEPTH_LABELS = {
    "10bb": {"zh": "10 BB (標準短)", "en": "10 BB (Standard Short)"},
    "15bb": {"zh": "15 BB", "en": "15 BB"},
    "20bb": {"zh": "20 BB (邊緣)", "en": "20 BB (Borderline)"},
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


# Load data at module level for efficiency
_PUSH_FOLD_DATA = load_push_fold_data()


@dataclass
class PushFoldSpot:
    """Represents a single push/fold training spot."""
    hand: Hand
    position: str
    stack_depth: str
    timestamp: datetime = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()

    def to_dict(self) -> dict:
        return {
            "hand": str(self.hand),
            "position": self.position,
            "stack_depth": self.stack_depth,
            "timestamp": self.timestamp.isoformat(),
        }


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
    """

    def __init__(self):
        self.data = _PUSH_FOLD_DATA
        self.enabled_positions = list(PUSH_FOLD_POSITIONS)
        self.enabled_stack_depths = list(STACK_DEPTHS)
        self._build_push_ranges()

    def _build_push_ranges(self):
        """Build push range sets for quick lookup."""
        self.push_ranges = {}
        if "6max" not in self.data:
            return

        for stack in self.data["6max"]:
            self.push_ranges[stack] = {}
            for pos in self.data["6max"][stack]:
                self.push_ranges[stack][pos] = set(self.data["6max"][stack][pos])

    def set_enabled_positions(self, positions: List[str]):
        """Set which positions to practice."""
        self.enabled_positions = positions

    def set_enabled_stack_depths(self, stack_depths: List[str]):
        """Set which stack depths to practice."""
        self.enabled_stack_depths = stack_depths

    def get_push_range(self, stack_depth: str, position: str) -> Set[str]:
        """Get the push range for a given stack depth and position."""
        return self.push_ranges.get(stack_depth, {}).get(position, set())

    def is_push(self, hand: Hand, stack_depth: str, position: str) -> bool:
        """Check if a hand should be pushed at the given stack depth and position."""
        push_range = self.get_push_range(stack_depth, position)
        return str(hand) in push_range

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
