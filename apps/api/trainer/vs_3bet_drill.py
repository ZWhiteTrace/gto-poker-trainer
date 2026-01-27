"""
Facing 3bet drill engine for cash game training.
Practice 4bet/call/fold decisions when facing a 3bet.
"""
import random
import json
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Set

from core.hand import Hand, random_hand, ALL_HANDS


# Available scenarios for facing 3bet
VS_3BET_SCENARIOS = [
    "BTN_vs_BB_3bet",
    "BTN_vs_SB_3bet",
    "CO_vs_BTN_3bet",
    "CO_vs_BB_3bet",
    "HJ_vs_CO_3bet",
    "HJ_vs_BTN_3bet",
    "HJ_vs_BB_3bet",
    "UTG_vs_BTN_3bet",
    "UTG_vs_BB_3bet",
    "SB_vs_BB_3bet",
]

# Scenario labels for UI
VS_3BET_SCENARIO_LABELS = {
    "BTN_vs_BB_3bet": {"zh": "BTN 開池 vs BB 3bet", "en": "BTN Open vs BB 3bet"},
    "BTN_vs_SB_3bet": {"zh": "BTN 開池 vs SB 3bet", "en": "BTN Open vs SB 3bet"},
    "CO_vs_BTN_3bet": {"zh": "CO 開池 vs BTN 3bet", "en": "CO Open vs BTN 3bet"},
    "CO_vs_BB_3bet": {"zh": "CO 開池 vs BB 3bet", "en": "CO Open vs BB 3bet"},
    "HJ_vs_CO_3bet": {"zh": "HJ 開池 vs CO 3bet", "en": "HJ Open vs CO 3bet"},
    "HJ_vs_BTN_3bet": {"zh": "HJ 開池 vs BTN 3bet", "en": "HJ Open vs BTN 3bet"},
    "HJ_vs_BB_3bet": {"zh": "HJ 開池 vs BB 3bet", "en": "HJ Open vs BB 3bet"},
    "UTG_vs_BTN_3bet": {"zh": "UTG 開池 vs BTN 3bet", "en": "UTG Open vs BTN 3bet"},
    "UTG_vs_BB_3bet": {"zh": "UTG 開池 vs BB 3bet", "en": "UTG Open vs BB 3bet"},
    "SB_vs_BB_3bet": {"zh": "SB 開池 vs BB 3bet", "en": "SB Open vs BB 3bet"},
}


def load_vs_3bet_data() -> dict:
    """Load facing 3bet ranges from JSON file."""
    data_path = Path(__file__).parent.parent / "data" / "ranges" / "cash" / "vs_3bet.json"
    try:
        with open(data_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Failed to load vs 3bet data: {e}")
        return {}


# Load data at module level for efficiency
_VS_3BET_DATA = load_vs_3bet_data()


@dataclass
class Vs3betSpot:
    """Represents a single facing 3bet training spot."""
    hand: Hand
    scenario: str  # e.g., "BTN_vs_BB_3bet"
    hero_position: str  # e.g., "BTN"
    villain_position: str  # e.g., "BB"
    timestamp: datetime = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now()

    def to_dict(self) -> dict:
        return {
            "hand": str(self.hand),
            "scenario": self.scenario,
            "hero_position": self.hero_position,
            "villain_position": self.villain_position,
            "timestamp": self.timestamp.isoformat(),
        }


@dataclass
class Vs3betResult:
    """Result of a facing 3bet evaluation."""
    is_correct: bool
    correct_action: str  # "4bet", "call", or "fold"
    explanation: str
    fourbet_range_count: int
    call_range_count: int
    fourbet_pct: float
    call_pct: float


class Vs3betDrill:
    """
    Drill engine for facing 3bet training.
    Practice 4bet/call/fold decisions.
    """

    def __init__(self):
        self.data = _VS_3BET_DATA
        self.enabled_scenarios = list(VS_3BET_SCENARIOS)
        self._build_ranges()

    def _build_ranges(self):
        """Build range sets for quick lookup."""
        self.fourbet_ranges = {}
        self.call_ranges = {}

        if "6max" not in self.data:
            return

        for scenario in self.data["6max"]:
            scenario_data = self.data["6max"][scenario]
            self.fourbet_ranges[scenario] = set(scenario_data.get("4bet", []))
            self.call_ranges[scenario] = set(scenario_data.get("call", []))

    def set_enabled_scenarios(self, scenarios: List[str]):
        """Set which scenarios to practice."""
        self.enabled_scenarios = scenarios

    def get_fourbet_range(self, scenario: str) -> Set[str]:
        """Get the 4bet range for a given scenario."""
        return self.fourbet_ranges.get(scenario, set())

    def get_call_range(self, scenario: str) -> Set[str]:
        """Get the call range for a given scenario."""
        return self.call_ranges.get(scenario, set())

    def get_correct_action(self, hand: Hand, scenario: str) -> str:
        """Determine the correct action for a hand in a scenario."""
        hand_str = str(hand)

        if hand_str in self.fourbet_ranges.get(scenario, set()):
            return "4bet"
        elif hand_str in self.call_ranges.get(scenario, set()):
            return "call"
        else:
            return "fold"

    def generate_spot(self) -> Optional[Vs3betSpot]:
        """Generate a random facing 3bet spot."""
        if not self.enabled_scenarios:
            return None

        scenario = random.choice(self.enabled_scenarios)

        # Extract positions from scenario (e.g., "BTN_vs_BB_3bet" -> BTN, BB)
        parts = scenario.split("_")
        hero_pos = parts[0]
        villain_pos = parts[2]

        # Get ranges for this scenario
        fourbet_range = self.get_fourbet_range(scenario)
        call_range = self.get_call_range(scenario)

        # 60% chance to pick a hand near the edge (interesting decisions)
        if random.random() < 0.6:
            hand = self._generate_edge_hand(fourbet_range, call_range)
        else:
            hand = random_hand()

        return Vs3betSpot(
            hand=hand,
            scenario=scenario,
            hero_position=hero_pos,
            villain_position=villain_pos,
        )

    def _generate_edge_hand(self, fourbet_range: Set[str], call_range: Set[str]) -> Hand:
        """Generate a hand near decision boundaries for interesting practice."""
        all_hands = set(ALL_HANDS)
        edge_hands = []

        # Add hands from 4bet range (small sample)
        fourbet_list = list(fourbet_range)
        if fourbet_list:
            edge_hands.extend(random.sample(fourbet_list, min(5, len(fourbet_list))))

        # Add hands from call range (larger sample - most common decision)
        call_list = list(call_range)
        if call_list:
            edge_hands.extend(random.sample(call_list, min(15, len(call_list))))

        # Add hands just outside ranges (fold hands)
        fold_hands = all_hands - fourbet_range - call_range
        fold_list = list(fold_hands)
        if fold_list:
            edge_hands.extend(random.sample(fold_list, min(15, len(fold_list))))

        if edge_hands:
            hand_str = random.choice(edge_hands)
            return Hand(hand_str)

        return random_hand()

    def check_answer(self, spot: Vs3betSpot, player_action: str) -> Vs3betResult:
        """
        Check if the player's action is correct.

        Args:
            spot: The facing 3bet spot being evaluated
            player_action: "4bet", "call", or "fold"

        Returns:
            Vs3betResult with correctness and explanation
        """
        correct_action = self.get_correct_action(spot.hand, spot.scenario)

        # Normalize player action
        player_action = player_action.lower().strip()
        if player_action in ["4bet", "4-bet", "raise", "reraise"]:
            player_action = "4bet"
        elif player_action in ["call", "flat"]:
            player_action = "call"
        elif player_action in ["fold", "muck"]:
            player_action = "fold"

        is_correct = (player_action == correct_action)

        # Get range info for explanation
        fourbet_range = self.get_fourbet_range(spot.scenario)
        call_range = self.get_call_range(spot.scenario)
        fourbet_count = len(fourbet_range)
        call_count = len(call_range)
        fourbet_pct = (fourbet_count / 169) * 100
        call_pct = (call_count / 169) * 100

        # Generate explanation
        explanation = self._generate_explanation(
            spot, correct_action, is_correct, fourbet_pct, call_pct
        )

        return Vs3betResult(
            is_correct=is_correct,
            correct_action=correct_action,
            explanation=explanation,
            fourbet_range_count=fourbet_count,
            call_range_count=call_count,
            fourbet_pct=fourbet_pct,
            call_pct=call_pct,
        )

    def _generate_explanation(
        self, spot: Vs3betSpot, correct_action: str, is_correct: bool,
        fourbet_pct: float, call_pct: float
    ) -> str:
        """Generate explanation for the result."""
        hand_str = str(spot.hand)
        scenario = spot.scenario

        # Get human-readable scenario name
        scenario_label = VS_3BET_SCENARIO_LABELS.get(scenario, {}).get("zh", scenario)

        action_labels = {"4bet": "4bet", "call": "Call", "fold": "Fold"}
        correct_label = action_labels.get(correct_action, correct_action)

        if is_correct:
            if correct_action == "4bet":
                return f"{hand_str} 在 {scenario_label} 屬於 4bet 範圍 ({fourbet_pct:.0f}% 手牌)"
            elif correct_action == "call":
                return f"{hand_str} 在 {scenario_label} 屬於 Call 範圍 ({call_pct:.0f}% 手牌)"
            else:
                return f"{hand_str} 在 {scenario_label} 不在 4bet/Call 範圍內，應該 Fold"
        else:
            if correct_action == "4bet":
                return f"錯誤！{hand_str} 在 {scenario_label} 應該 4bet (範圍 {fourbet_pct:.0f}%)"
            elif correct_action == "call":
                return f"錯誤！{hand_str} 在 {scenario_label} 應該 Call (範圍 {call_pct:.0f}%)"
            else:
                return f"錯誤！{hand_str} 在 {scenario_label} 應該 Fold (不在 4bet/Call 範圍)"


# Singleton instance for easy access
_drill_instance = None


def get_vs_3bet_drill() -> Vs3betDrill:
    """Get the singleton Vs3betDrill instance."""
    global _drill_instance
    if _drill_instance is None:
        _drill_instance = Vs3betDrill()
    return _drill_instance
