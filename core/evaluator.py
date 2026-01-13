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
    frequency: int = 100  # Frequency of correct action (0-100)
    player_action_frequency: int = 0  # Frequency of player's chosen action
    is_acceptable: bool = False  # True if player action has >0 frequency (mixed strategy)


class Evaluator:
    """
    Evaluates player actions against GTO ranges.
    """

    # Threshold for "acceptable" actions in mixed strategies
    ACCEPTABLE_THRESHOLD = 30  # Actions with >=30% frequency are acceptable
    PRIMARY_ACTION_THRESHOLD = 75  # Actions with >=75% frequency are "correct"

    def __init__(self, data_dir: Path = None):
        if data_dir is None:
            data_dir = Path(__file__).parent.parent / "data" / "ranges"
        self.data_dir = data_dir
        self._ranges_cache: Dict[str, Dict] = {}
        self._frequencies_cache: Dict[str, Dict] = {}

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

    def load_frequencies(self, format: str = "6max") -> Dict:
        """Load frequency data for given format."""
        if format in self._frequencies_cache:
            return self._frequencies_cache[format]

        range_dir = self.data_dir / format
        frequencies = {}

        # Try to load frequency files (e.g., rfi_frequencies.json)
        for json_file in range_dir.glob("*_frequencies.json"):
            with open(json_file, 'r') as f:
                data = json.load(f)
                # Extract the base name (e.g., "rfi" from "rfi_frequencies.json")
                base_name = json_file.stem.replace("_frequencies", "")
                frequencies[base_name] = data

        self._frequencies_cache[format] = frequencies
        return frequencies

    def get_hand_frequencies(self, hand: Hand, scenario: Scenario, format: str = "6max") -> Dict[str, int]:
        """
        Get frequencies for all actions for a hand in a scenario.
        Returns: {"raise": 75, "fold": 25} or {"3bet": 50, "call": 30, "fold": 20}
        """
        frequencies = self.load_frequencies(format)

        if scenario.action_type == ActionType.RFI:
            rfi_freq = frequencies.get("rfi", {})
            position_data = rfi_freq.get(scenario.hero_position.value, {})
            freq_data = position_data.get("frequencies", {})
            hand_freq = freq_data.get(str(hand), {})

            if hand_freq:
                raise_freq = hand_freq.get("raise", 0)
                return {"raise": raise_freq, "fold": 100 - raise_freq}

        # For non-RFI scenarios, fall back to binary (100/0) based on simple ranges
        # TODO: Add frequency data for vs_rfi, vs_3bet, vs_4bet
        return {}

    def get_correct_action(self, hand: Hand, scenario: Scenario, format: str = "6max") -> str:
        """
        Get the GTO-correct action for a hand in a scenario.
        Returns: "raise", "fold", "call", "3bet", "4bet", "5bet"

        For RFI: Uses frequency data directly (>= PRIMARY_ACTION_THRESHOLD = raise)
        """
        if scenario.action_type == ActionType.RFI:
            # Use frequencies directly - single source of truth
            frequencies = self.load_frequencies(format)
            rfi_freq = frequencies.get("rfi", {})
            position_data = rfi_freq.get(scenario.hero_position.value, {})
            freq_data = position_data.get("frequencies", {})
            hand_freq = freq_data.get(str(hand), {})

            raise_freq = hand_freq.get("raise", 0)
            if raise_freq >= self.PRIMARY_ACTION_THRESHOLD:
                return "raise"
            return "fold"

        # For other scenarios, still use load_ranges (TODO: migrate to frequencies)
        ranges = self.load_ranges(format)

        if scenario.action_type == ActionType.VS_RFI:
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
        Now supports mixed strategies with frequency-based evaluation.
        """
        correct_action = self.get_correct_action(hand, scenario, format)
        is_correct = player_action.lower() == correct_action.lower()

        # Get frequency data
        frequencies = self.get_hand_frequencies(hand, scenario, format)
        correct_freq = frequencies.get(correct_action.lower(), 100) if frequencies else 100
        player_freq = frequencies.get(player_action.lower(), 0) if frequencies else (100 if is_correct else 0)

        # Determine if player's action is acceptable (mixed strategy)
        is_acceptable = player_freq >= self.ACCEPTABLE_THRESHOLD

        explanation = self._generate_explanation(hand, scenario, correct_action, is_correct, frequencies)
        explanation_zh = self._generate_explanation_zh(hand, scenario, correct_action, is_correct, frequencies)

        return EvalResult(
            is_correct=is_correct,
            correct_action=correct_action,
            player_action=player_action,
            explanation=explanation,
            explanation_zh=explanation_zh,
            frequency=correct_freq,
            player_action_frequency=player_freq,
            is_acceptable=is_acceptable,
        )

    def _generate_explanation(self, hand: Hand, scenario: Scenario, correct_action: str, is_correct: bool, frequencies: Dict = None) -> str:
        """Generate English explanation for the answer."""
        hand_str = str(hand)
        pos = scenario.hero_position.value

        # Add frequency info if available
        freq_info = ""
        if frequencies:
            freq_parts = [f"{k}: {v}%" for k, v in frequencies.items() if v > 0]
            if freq_parts:
                freq_info = f" (GTO: {' | '.join(freq_parts)})"

        if scenario.action_type == ActionType.RFI:
            if correct_action == "raise":
                return f"{hand_str} is in the opening range from {pos}.{freq_info}"
            else:
                return f"{hand_str} is too weak to open from {pos}.{freq_info}"

        elif scenario.action_type == ActionType.VS_RFI:
            villain = scenario.villain_position.value
            if correct_action == "3bet":
                return f"{hand_str} is strong enough to 3-bet vs {villain}'s open.{freq_info}"
            elif correct_action == "call":
                return f"{hand_str} has good implied odds to call vs {villain}'s open.{freq_info}"
            else:
                return f"{hand_str} is not strong enough to continue vs {villain}'s range.{freq_info}"

        elif scenario.action_type == ActionType.VS_3BET:
            if correct_action == "4bet":
                return f"{hand_str} is premium enough to 4-bet for value.{freq_info}"
            elif correct_action == "call":
                return f"{hand_str} has good equity to call the 3-bet.{freq_info}"
            else:
                return f"{hand_str} doesn't have enough equity vs the 3-bet.{freq_info}"

        elif scenario.action_type == ActionType.VS_4BET:
            villain = scenario.villain_position.value
            if correct_action == "5bet":
                return f"{hand_str} is strong enough to 5-bet all-in.{freq_info}"
            elif correct_action == "call":
                return f"{hand_str} has sufficient equity to call the 4-bet.{freq_info}"
            else:
                return f"{hand_str} doesn't have enough equity vs the 4-bet.{freq_info}"

        return f"The correct action is {correct_action}.{freq_info}"

    def _generate_explanation_zh(self, hand: Hand, scenario: Scenario, correct_action: str, is_correct: bool, frequencies: Dict = None) -> str:
        """Generate Chinese explanation for the answer."""
        hand_str = str(hand)
        pos = scenario.hero_position.value

        action_names = {
            "raise": "加注", "fold": "蓋牌", "call": "跟注",
            "3bet": "3-bet", "4bet": "4-bet", "5bet": "5-bet"
        }
        action_zh = action_names.get(correct_action, correct_action)

        # Add frequency info if available
        freq_info = ""
        if frequencies:
            freq_parts = [f"{action_names.get(k, k)}: {v}%" for k, v in frequencies.items() if v > 0]
            if freq_parts:
                freq_info = f" (GTO: {' | '.join(freq_parts)})"

        if scenario.action_type == ActionType.RFI:
            if correct_action == "raise":
                return f"{hand_str} 在 {pos} 是開池手牌。{freq_info}"
            else:
                return f"{hand_str} 從 {pos} 開池太弱。{freq_info}"

        elif scenario.action_type == ActionType.VS_RFI:
            villain = scenario.villain_position.value
            if correct_action == "3bet":
                return f"{hand_str} 可以對 {villain} 的開池 3-bet。{freq_info}"
            elif correct_action == "call":
                return f"{hand_str} 可以跟注 {villain} 的開池。{freq_info}"
            else:
                return f"{hand_str} 無法對抗 {villain} 的範圍。{freq_info}"

        elif scenario.action_type == ActionType.VS_3BET:
            if correct_action == "4bet":
                return f"{hand_str} 可以 4-bet 獲取價值。{freq_info}"
            elif correct_action == "call":
                return f"{hand_str} 可以跟注 3-bet。{freq_info}"
            else:
                return f"{hand_str} 無法對抗 3-bet。{freq_info}"

        elif scenario.action_type == ActionType.VS_4BET:
            villain = scenario.villain_position.value
            if correct_action == "5bet":
                return f"{hand_str} 可以全押 5-bet。{freq_info}"
            elif correct_action == "call":
                return f"{hand_str} 可以跟注 4-bet。{freq_info}"
            else:
                return f"{hand_str} 無法對抗 4-bet。{freq_info}"

        return f"正確動作是{action_zh}。{freq_info}"

    def get_range_for_scenario(self, scenario: Scenario, format: str = "6max") -> Dict[str, List[str]]:
        """Get full range data for a scenario. Derives raise/fold lists from frequencies for RFI."""
        if scenario.action_type == ActionType.RFI:
            # Derive from frequencies - single source of truth
            frequencies = self.load_frequencies(format)
            rfi_freq = frequencies.get("rfi", {})
            position_data = rfi_freq.get(scenario.hero_position.value, {})
            freq_data = position_data.get("frequencies", {})

            raise_hands = []
            fold_hands = []
            for hand, freq in freq_data.items():
                raise_freq = freq.get("raise", 0)
                if raise_freq >= self.PRIMARY_ACTION_THRESHOLD:
                    raise_hands.append(hand)
                elif raise_freq == 0:
                    fold_hands.append(hand)
                # Mixed hands (0 < freq < 75) go to neither list explicitly

            return {"raise": raise_hands, "fold": fold_hands}

        ranges = self.load_ranges(format)

        if scenario.action_type == ActionType.VS_RFI:
            vs_rfi_data = ranges.get("vs_rfi", {})
            key = f"{scenario.hero_position.value}_vs_{scenario.villain_position.value}"
            return vs_rfi_data.get(key, {})

        elif scenario.action_type == ActionType.VS_3BET:
            vs_3bet_data = ranges.get("vs_3bet", {})
            key = f"{scenario.hero_position.value}_vs_{scenario.villain_position.value}"
            return vs_3bet_data.get(key, {})

        elif scenario.action_type == ActionType.VS_4BET:
            vs_4bet_data = ranges.get("vs_4bet", {})
            key = f"{scenario.hero_position.value}_vs_{scenario.villain_position.value}"
            return vs_4bet_data.get(key, {})

        return {}

    def get_frequencies_for_scenario(self, scenario: Scenario, format: str = "6max") -> Dict[str, Dict[str, int]]:
        """
        Get all hand frequencies for a scenario.
        Returns: {"AA": {"raise": 100}, "A5s": {"raise": 70, "fold": 30}, ...}
        """
        frequencies = self.load_frequencies(format)

        if scenario.action_type == ActionType.RFI:
            rfi_freq = frequencies.get("rfi", {})
            position_data = rfi_freq.get(scenario.hero_position.value, {})
            return position_data.get("frequencies", {})

        # TODO: Add frequency data for other scenarios
        return {}
