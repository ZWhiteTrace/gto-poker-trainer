"""
Evaluator for checking if an action matches GTO strategy.
"""
import json
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional
from .hand import Hand
from .scenario import Scenario, ActionType
from .position import Position


@dataclass
class EvalResult:
    """Result of evaluating a player's action."""
    is_correct: bool
    correct_action: str
    player_action: str
    explanation: str
    explanation_zh: str


class Evaluator:
    """
    Evaluates player actions against GTO ranges.
    """

    def __init__(self, data_dir: Path = None):
        if data_dir is None:
            data_dir = Path(__file__).parent.parent / "data" / "ranges"
        self.data_dir = data_dir
        self._ranges_cache: Dict[str, Dict] = {}

    def load_ranges(self, format: str = "6max") -> Dict:
        """Load range data for given format."""
        if format in self._ranges_cache:
            return self._ranges_cache[format]

        range_dir = self.data_dir / format
        ranges = {}

        # Load all JSON files in the format directory
        for json_file in range_dir.glob("*.json"):
            with open(json_file, 'r') as f:
                data = json.load(f)
                ranges[json_file.stem] = data

        self._ranges_cache[format] = ranges
        return ranges

    def get_correct_action(self, hand: Hand, scenario: Scenario, format: str = "6max") -> str:
        """
        Get the GTO-correct action for a hand in a scenario.
        Returns: "raise", "fold", "call", "3bet", "4bet", "5bet"
        """
        ranges = self.load_ranges(format)

        if scenario.action_type == ActionType.RFI:
            rfi_data = ranges.get("rfi", {})
            position_data = rfi_data.get(scenario.hero_position.value, {})
            raise_hands = position_data.get("raise", [])

            if str(hand) in raise_hands:
                return "raise"
            return "fold"

        elif scenario.action_type == ActionType.VS_RFI:
            vs_rfi_data = ranges.get("vs_rfi", {})
            key = f"{scenario.hero_position.value}_vs_{scenario.villain_position.value}"
            position_data = vs_rfi_data.get(key, {})

            if str(hand) in position_data.get("3bet", []):
                return "3bet"
            if str(hand) in position_data.get("call", []):
                return "call"
            return "fold"

        elif scenario.action_type == ActionType.VS_3BET:
            vs_3bet_data = ranges.get("vs_3bet", {})
            key = f"{scenario.hero_position.value}_vs_{scenario.villain_position.value}"
            position_data = vs_3bet_data.get(key, {})

            if str(hand) in position_data.get("4bet", []):
                return "4bet"
            if str(hand) in position_data.get("call", []):
                return "call"
            return "fold"

        elif scenario.action_type == ActionType.VS_4BET:
            vs_4bet_data = ranges.get("vs_4bet", {})
            key = f"{scenario.hero_position.value}_vs_{scenario.villain_position.value}"
            position_data = vs_4bet_data.get(key, {})

            if str(hand) in position_data.get("5bet", []):
                return "5bet"
            if str(hand) in position_data.get("call", []):
                return "call"
            return "fold"

        return "fold"

    def evaluate(self, hand: Hand, scenario: Scenario, player_action: str, format: str = "6max") -> EvalResult:
        """
        Evaluate a player's action against GTO.
        """
        correct_action = self.get_correct_action(hand, scenario, format)
        is_correct = player_action.lower() == correct_action.lower()

        explanation = self._generate_explanation(hand, scenario, correct_action, is_correct)
        explanation_zh = self._generate_explanation_zh(hand, scenario, correct_action, is_correct)

        return EvalResult(
            is_correct=is_correct,
            correct_action=correct_action,
            player_action=player_action,
            explanation=explanation,
            explanation_zh=explanation_zh,
        )

    def _generate_explanation(self, hand: Hand, scenario: Scenario, correct_action: str, is_correct: bool) -> str:
        """Generate English explanation for the answer."""
        hand_str = str(hand)
        pos = scenario.hero_position.value

        if scenario.action_type == ActionType.RFI:
            if correct_action == "raise":
                return f"{hand_str} is in the opening range from {pos}. It has good playability and equity."
            else:
                return f"{hand_str} is too weak to open from {pos}. Fold and wait for a better spot."

        elif scenario.action_type == ActionType.VS_RFI:
            villain = scenario.villain_position.value
            if correct_action == "3bet":
                return f"{hand_str} is strong enough to 3-bet vs {villain}'s open from {pos}."
            elif correct_action == "call":
                return f"{hand_str} has good implied odds to call vs {villain}'s open."
            else:
                return f"{hand_str} is not strong enough to continue vs {villain}'s range."

        elif scenario.action_type == ActionType.VS_3BET:
            if correct_action == "4bet":
                return f"{hand_str} is premium enough to 4-bet for value."
            elif correct_action == "call":
                return f"{hand_str} has good equity and playability to call the 3-bet."
            else:
                return f"{hand_str} doesn't have enough equity to continue vs the 3-bet."

        return f"The correct action is {correct_action}."

    def _generate_explanation_zh(self, hand: Hand, scenario: Scenario, correct_action: str, is_correct: bool) -> str:
        """Generate Chinese explanation for the answer."""
        hand_str = str(hand)
        pos = scenario.hero_position.value

        action_names = {
            "raise": "加注", "fold": "蓋牌", "call": "跟注",
            "3bet": "3-bet", "4bet": "4-bet", "5bet": "5-bet"
        }
        action_zh = action_names.get(correct_action, correct_action)

        if scenario.action_type == ActionType.RFI:
            if correct_action == "raise":
                return f"{hand_str} 在 {pos} 是標準開池手牌。具有良好的可玩性和權益。"
            else:
                return f"{hand_str} 從 {pos} 開池太弱。蓋牌等待更好的機會。"

        elif scenario.action_type == ActionType.VS_RFI:
            villain = scenario.villain_position.value
            if correct_action == "3bet":
                return f"{hand_str} 足夠強，可以對 {villain} 的開池進行 3-bet。"
            elif correct_action == "call":
                return f"{hand_str} 有好的隱含賠率，可以跟注 {villain} 的開池。"
            else:
                return f"{hand_str} 不夠強，無法對抗 {villain} 的範圍。"

        elif scenario.action_type == ActionType.VS_3BET:
            if correct_action == "4bet":
                return f"{hand_str} 是頂級手牌，可以 4-bet 獲取價值。"
            elif correct_action == "call":
                return f"{hand_str} 有足夠的權益和可玩性來跟注 3-bet。"
            else:
                return f"{hand_str} 沒有足夠的權益來對抗 3-bet。"

        return f"正確動作是{action_zh}。"

    def get_range_for_scenario(self, scenario: Scenario, format: str = "6max") -> Dict[str, List[str]]:
        """Get full range data for a scenario."""
        ranges = self.load_ranges(format)

        if scenario.action_type == ActionType.RFI:
            rfi_data = ranges.get("rfi", {})
            return rfi_data.get(scenario.hero_position.value, {})

        elif scenario.action_type == ActionType.VS_RFI:
            vs_rfi_data = ranges.get("vs_rfi", {})
            key = f"{scenario.hero_position.value}_vs_{scenario.villain_position.value}"
            return vs_rfi_data.get(key, {})

        elif scenario.action_type == ActionType.VS_3BET:
            vs_3bet_data = ranges.get("vs_3bet", {})
            key = f"{scenario.hero_position.value}_vs_{scenario.villain_position.value}"
            return vs_3bet_data.get(key, {})

        return {}
