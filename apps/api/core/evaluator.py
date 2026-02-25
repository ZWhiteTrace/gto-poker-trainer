"""
Evaluator for checking if an action matches GTO strategy.
"""

import json
from dataclasses import dataclass
from pathlib import Path

from .hand import Hand
from .position import Position
from .scenario import ActionType, Scenario


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
    # Simplified learning mode: any action with >0% frequency is acceptable
    ACCEPTABLE_THRESHOLD = 1  # Actions with >=1% frequency are acceptable (not wrong)
    PRIMARY_ACTION_THRESHOLD = 75  # Actions with >=75% frequency are "correct"

    def __init__(self, data_dir: Path = None):
        if data_dir is None:
            data_dir = Path(__file__).parent.parent / "data" / "ranges"
        self.data_dir = data_dir
        self._ranges_cache: dict[str, dict] = {}
        self._frequencies_cache: dict[str, dict] = {}

    def load_ranges(self, format: str = "6max") -> dict:
        """Load range data for given format."""
        if format in self._ranges_cache:
            return self._ranges_cache[format]

        range_dir = self.data_dir / format
        ranges = {}

        # Load all JSON files in the format directory
        for json_file in range_dir.glob("*.json"):
            with open(json_file) as f:
                data = json.load(f)
                ranges[json_file.stem] = data

        self._ranges_cache[format] = ranges
        return ranges

    def load_frequencies(self, format: str = "6max") -> dict:
        """Load frequency data for given format."""
        if format in self._frequencies_cache:
            return self._frequencies_cache[format]

        range_dir = self.data_dir / format
        frequencies = {}

        # Try to load frequency files (e.g., rfi_frequencies.json)
        for json_file in range_dir.glob("*_frequencies.json"):
            with open(json_file) as f:
                data = json.load(f)
                # Extract the base name (e.g., "rfi" from "rfi_frequencies.json")
                base_name = json_file.stem.replace("_frequencies", "")
                frequencies[base_name] = data

        self._frequencies_cache[format] = frequencies
        return frequencies

    def get_rfi_frequencies(self, position: str, format: str = "6max") -> dict[str, dict]:
        """Get RFI frequency data for a position. Returns {hand: {action: freq}}."""
        frequencies = self.load_frequencies(format)
        rfi_freq = frequencies.get("rfi", {})
        position_data = rfi_freq.get(
            position.upper() if isinstance(position, str) else position.value, {}
        )
        return position_data.get("frequencies", {})

    def get_vs_rfi_frequencies(
        self, hero_position: str, villain_position: str, format: str = "6max"
    ) -> dict[str, dict]:
        """Get vs RFI frequency data for a position pair. Returns {hand: {action: freq}}."""
        frequencies = self.load_frequencies(format)
        vs_rfi_freq = frequencies.get("vs_rfi", {})
        hero = hero_position.upper() if isinstance(hero_position, str) else hero_position.value
        villain = (
            villain_position.upper()
            if isinstance(villain_position, str)
            else villain_position.value
        )
        key = f"{hero}_vs_{villain}"
        position_data = vs_rfi_freq.get(key, {})
        return position_data.get("frequencies", {})

    def get_vs_3bet_frequencies(
        self, hero_position: str, villain_position: str, format: str = "6max"
    ) -> dict[str, dict]:
        """Get vs 3bet frequency data for a position pair. Returns {hand: {action: freq}}."""
        frequencies = self.load_frequencies(format)
        vs_3bet_freq = frequencies.get("vs_3bet", {})
        hero = hero_position.upper() if isinstance(hero_position, str) else hero_position.value
        villain = (
            villain_position.upper()
            if isinstance(villain_position, str)
            else villain_position.value
        )
        key = f"{hero}_vs_{villain}"
        position_data = vs_3bet_freq.get(key, {})
        return position_data.get("frequencies", {})

    def get_vs_4bet_frequencies(
        self, hero_position: str, villain_position: str, format: str = "6max"
    ) -> dict[str, dict]:
        """Get vs 4bet frequency data for a position pair. Returns {hand: {action: freq}}."""
        frequencies = self.load_frequencies(format)
        vs_4bet_freq = frequencies.get("vs_4bet", {})
        hero = hero_position.upper() if isinstance(hero_position, str) else hero_position.value
        villain = (
            villain_position.upper()
            if isinstance(villain_position, str)
            else villain_position.value
        )
        key = f"{hero}_vs_{villain}"
        position_data = vs_4bet_freq.get(key, {})
        return position_data.get("frequencies", {})

    def get_scenario_drillable(
        self,
        scenario_type: str,
        hero_position: str,
        villain_position: str = None,
        format: str = "6max",
    ) -> list:
        """Get pre-defined drillable hands from JSON for a scenario."""
        frequencies = self.load_frequencies(format)
        hero = hero_position.upper() if isinstance(hero_position, str) else hero_position.value

        if scenario_type == "rfi":
            rfi_freq = frequencies.get("rfi", {})
            position_data = rfi_freq.get(hero, {})
            return position_data.get("drillable", [])

        villain = (
            villain_position.upper()
            if isinstance(villain_position, str)
            else villain_position.value
        )
        key = f"{hero}_vs_{villain}"

        if scenario_type == "vs_rfi":
            vs_rfi_freq = frequencies.get("vs_rfi", {})
            position_data = vs_rfi_freq.get(key, {})
        elif scenario_type == "vs_3bet":
            vs_3bet_freq = frequencies.get("vs_3bet", {})
            position_data = vs_3bet_freq.get(key, {})
        elif scenario_type == "vs_4bet":
            vs_4bet_freq = frequencies.get("vs_4bet", {})
            position_data = vs_4bet_freq.get(key, {})
        else:
            return []

        return position_data.get("drillable", [])

    def get_hand_frequencies(
        self, hand: Hand, scenario: Scenario, format: str = "6max"
    ) -> dict[str, int]:
        """
        Get frequencies for all actions for a hand in a scenario.
        Returns: {"raise": 75, "fold": 25} or {"3bet": 50, "call": 30, "fold": 20}
        """
        frequencies = self.load_frequencies(format)
        hand_str = str(hand)

        if scenario.action_type == ActionType.RFI:
            rfi_freq = frequencies.get("rfi", {})
            position_data = rfi_freq.get(scenario.hero_position.value, {})
            freq_data = position_data.get("frequencies", {})
            hand_freq = freq_data.get(hand_str, {})

            if hand_freq:
                raise_freq = hand_freq.get("raise", 0)
                call_freq = hand_freq.get("call", 0)
                fold_freq = 100 - raise_freq - call_freq

                # SB has call option
                if scenario.hero_position == Position.SB:
                    return {"raise": raise_freq, "call": call_freq, "fold": max(0, fold_freq)}
                return {"raise": raise_freq, "fold": 100 - raise_freq}

        elif scenario.action_type == ActionType.VS_RFI:
            vs_rfi_freq = frequencies.get("vs_rfi", {})
            key = f"{scenario.hero_position.value}_vs_{scenario.villain_position.value}"
            position_data = vs_rfi_freq.get(key, {})
            freq_data = position_data.get("frequencies", {})
            hand_freq = freq_data.get(hand_str, {})

            if hand_freq:
                bet3_freq = hand_freq.get("3bet", 0)
                call_freq = hand_freq.get("call", 0)
                fold_freq = 100 - bet3_freq - call_freq
                return {"3bet": bet3_freq, "call": call_freq, "fold": max(0, fold_freq)}

        elif scenario.action_type == ActionType.VS_3BET:
            vs_3bet_freq = frequencies.get("vs_3bet", {})
            key = f"{scenario.hero_position.value}_vs_{scenario.villain_position.value}"
            position_data = vs_3bet_freq.get(key, {})
            freq_data = position_data.get("frequencies", {})
            hand_freq = freq_data.get(hand_str, {})

            if hand_freq:
                bet4_freq = hand_freq.get("4bet", 0)
                call_freq = hand_freq.get("call", 0)
                fold_freq = 100 - bet4_freq - call_freq
                return {"4bet": bet4_freq, "call": call_freq, "fold": max(0, fold_freq)}

        elif scenario.action_type == ActionType.VS_4BET:
            vs_4bet_freq = frequencies.get("vs_4bet", {})
            key = f"{scenario.hero_position.value}_vs_{scenario.villain_position.value}"
            position_data = vs_4bet_freq.get(key, {})
            freq_data = position_data.get("frequencies", {})
            hand_freq = freq_data.get(hand_str, {})

            if hand_freq:
                bet5_freq = hand_freq.get("5bet", 0)
                call_freq = hand_freq.get("call", 0)
                fold_freq = 100 - bet5_freq - call_freq
                return {"5bet": bet5_freq, "call": call_freq, "fold": max(0, fold_freq)}

        return {}

    def get_correct_action(self, hand: Hand, scenario: Scenario, format: str = "6max") -> str:
        """
        Get the GTO-correct action for a hand in a scenario.
        Returns: "raise", "fold", "call", "3bet", "4bet", "5bet"

        For RFI: Uses frequency data directly (>= PRIMARY_ACTION_THRESHOLD = raise)
        For SB RFI: Also considers call option
        """
        if scenario.action_type == ActionType.RFI:
            # Use frequencies directly - single source of truth
            frequencies = self.load_frequencies(format)
            rfi_freq = frequencies.get("rfi", {})
            position_data = rfi_freq.get(scenario.hero_position.value, {})
            freq_data = position_data.get("frequencies", {})
            hand_freq = freq_data.get(str(hand), {})

            raise_freq = hand_freq.get("raise", 0)
            call_freq = hand_freq.get("call", 0)

            # For SB, consider call as well
            if scenario.hero_position == Position.SB:
                # Return the action with highest frequency (if >= threshold)
                if raise_freq >= self.PRIMARY_ACTION_THRESHOLD:
                    return "raise"
                if call_freq >= self.PRIMARY_ACTION_THRESHOLD:
                    return "call"
                # If both have some frequency but neither is dominant, prefer raise if it's higher
                if raise_freq > call_freq and raise_freq >= self.ACCEPTABLE_THRESHOLD:
                    return "raise"
                if call_freq > raise_freq and call_freq >= self.ACCEPTABLE_THRESHOLD:
                    return "call"
                # Default to fold if neither action is strong enough
                if raise_freq == 0 and call_freq == 0:
                    return "fold"
                # If mixed, return the higher frequency action
                return "raise" if raise_freq >= call_freq else "call"

            # For other positions, simple raise/fold
            if raise_freq >= self.PRIMARY_ACTION_THRESHOLD:
                return "raise"
            return "fold"

        # Try to use frequency data first, fall back to old range format
        frequencies = self.load_frequencies(format)
        hand_str = str(hand)

        if scenario.action_type == ActionType.VS_RFI:
            key = f"{scenario.hero_position.value}_vs_{scenario.villain_position.value}"

            # Try frequency data first
            vs_rfi_freq = frequencies.get("vs_rfi", {})
            position_data = vs_rfi_freq.get(key, {})
            freq_data = position_data.get("frequencies", {})
            hand_freq = freq_data.get(hand_str, {})

            if hand_freq:
                bet3_freq = hand_freq.get("3bet", 0)
                call_freq = hand_freq.get("call", 0)

                if bet3_freq >= self.PRIMARY_ACTION_THRESHOLD:
                    return "3bet"
                if call_freq >= self.PRIMARY_ACTION_THRESHOLD:
                    return "call"
                # Mixed: prefer higher frequency action if >= ACCEPTABLE
                if bet3_freq >= self.ACCEPTABLE_THRESHOLD and bet3_freq >= call_freq:
                    return "3bet"
                if call_freq >= self.ACCEPTABLE_THRESHOLD and call_freq > bet3_freq:
                    return "call"
                if bet3_freq == 0 and call_freq == 0:
                    return "fold"
                return "3bet" if bet3_freq >= call_freq else "call"

            # Fall back to old range format
            ranges = self.load_ranges(format)
            vs_rfi_data = ranges.get("vs_rfi", {})
            position_data = vs_rfi_data.get(key, {})
            if hand_str in position_data.get("3bet", []):
                return "3bet"
            if hand_str in position_data.get("call", []):
                return "call"
            return "fold"

        elif scenario.action_type == ActionType.VS_3BET:
            key = f"{scenario.hero_position.value}_vs_{scenario.villain_position.value}"

            # Try frequency data first
            vs_3bet_freq = frequencies.get("vs_3bet", {})
            position_data = vs_3bet_freq.get(key, {})
            freq_data = position_data.get("frequencies", {})
            hand_freq = freq_data.get(hand_str, {})

            if hand_freq:
                bet4_freq = hand_freq.get("4bet", 0)
                call_freq = hand_freq.get("call", 0)

                if bet4_freq >= self.PRIMARY_ACTION_THRESHOLD:
                    return "4bet"
                if call_freq >= self.PRIMARY_ACTION_THRESHOLD:
                    return "call"
                if bet4_freq >= self.ACCEPTABLE_THRESHOLD and bet4_freq >= call_freq:
                    return "4bet"
                if call_freq >= self.ACCEPTABLE_THRESHOLD and call_freq > bet4_freq:
                    return "call"
                if bet4_freq == 0 and call_freq == 0:
                    return "fold"
                return "4bet" if bet4_freq >= call_freq else "call"

            # Fall back to old range format
            ranges = self.load_ranges(format)
            vs_3bet_data = ranges.get("vs_3bet", {})
            position_data = vs_3bet_data.get(key, {})
            if hand_str in position_data.get("4bet", []):
                return "4bet"
            if hand_str in position_data.get("call", []):
                return "call"
            return "fold"

        elif scenario.action_type == ActionType.VS_4BET:
            key = f"{scenario.hero_position.value}_vs_{scenario.villain_position.value}"

            # Try frequency data first
            vs_4bet_freq = frequencies.get("vs_4bet", {})
            position_data = vs_4bet_freq.get(key, {})
            freq_data = position_data.get("frequencies", {})
            hand_freq = freq_data.get(hand_str, {})

            if hand_freq:
                bet5_freq = hand_freq.get("5bet", 0)
                call_freq = hand_freq.get("call", 0)

                if bet5_freq >= self.PRIMARY_ACTION_THRESHOLD:
                    return "5bet"
                if call_freq >= self.PRIMARY_ACTION_THRESHOLD:
                    return "call"
                if bet5_freq >= self.ACCEPTABLE_THRESHOLD and bet5_freq >= call_freq:
                    return "5bet"
                if call_freq >= self.ACCEPTABLE_THRESHOLD and call_freq > bet5_freq:
                    return "call"
                if bet5_freq == 0 and call_freq == 0:
                    return "fold"
                return "5bet" if bet5_freq >= call_freq else "call"

            # Fall back to old range format
            ranges = self.load_ranges(format)
            vs_4bet_data = ranges.get("vs_4bet", {})
            position_data = vs_4bet_data.get(key, {})
            if hand_str in position_data.get("5bet", []):
                return "5bet"
            if hand_str in position_data.get("call", []):
                return "call"
            return "fold"

        return "fold"

    def evaluate(
        self, hand: Hand, scenario: Scenario, player_action: str, format: str = "6max"
    ) -> EvalResult:
        """
        Evaluate a player's action against GTO.
        Now supports mixed strategies with frequency-based evaluation.
        """
        correct_action = self.get_correct_action(hand, scenario, format)
        is_correct = player_action.lower() == correct_action.lower()

        # Get frequency data
        frequencies = self.get_hand_frequencies(hand, scenario, format)
        correct_freq = frequencies.get(correct_action.lower(), 100) if frequencies else 100
        player_freq = (
            frequencies.get(player_action.lower(), 0) if frequencies else (100 if is_correct else 0)
        )

        # Determine if player's action is acceptable (mixed strategy)
        is_acceptable = player_freq >= self.ACCEPTABLE_THRESHOLD

        explanation = self._generate_explanation(
            hand, scenario, correct_action, is_correct, frequencies
        )
        explanation_zh = self._generate_explanation_zh(
            hand, scenario, correct_action, is_correct, frequencies
        )

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

    def _generate_explanation(
        self,
        hand: Hand,
        scenario: Scenario,
        correct_action: str,
        is_correct: bool,
        frequencies: dict = None,
    ) -> str:
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
            elif correct_action == "call":
                return f"{hand_str} should limp (call) from SB for pot odds.{freq_info}"
            else:
                return f"{hand_str} is too weak to open from {pos}.{freq_info}"

        elif scenario.action_type == ActionType.VS_RFI:
            villain = scenario.villain_position.value
            if correct_action == "3bet":
                return f"{hand_str} is strong enough to 3-bet vs {villain}'s open.{freq_info}"
            elif correct_action == "call":
                return f"{hand_str} has good implied odds to call vs {villain}'s open.{freq_info}"
            else:
                return (
                    f"{hand_str} is not strong enough to continue vs {villain}'s range.{freq_info}"
                )

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

    def _generate_explanation_zh(
        self,
        hand: Hand,
        scenario: Scenario,
        correct_action: str,
        is_correct: bool,
        frequencies: dict = None,
    ) -> str:
        """Generate Chinese explanation for the answer."""
        hand_str = str(hand)
        pos = scenario.hero_position.value

        action_names = {
            "raise": "加注",
            "fold": "蓋牌",
            "call": "跟注",
            "3bet": "3-bet",
            "4bet": "4-bet",
            "5bet": "5-bet",
        }
        action_zh = action_names.get(correct_action, correct_action)

        # Add frequency info if available
        freq_info = ""
        if frequencies:
            freq_parts = [
                f"{action_names.get(k, k)}: {v}%" for k, v in frequencies.items() if v > 0
            ]
            if freq_parts:
                freq_info = f" (GTO: {' | '.join(freq_parts)})"

        if scenario.action_type == ActionType.RFI:
            if correct_action == "raise":
                return f"{hand_str} 在 {pos} 是開池手牌。{freq_info}"
            elif correct_action == "call":
                return f"{hand_str} 從 SB 應該跟注 (limp)，利用底池賠率。{freq_info}"
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

    def get_range_for_scenario(
        self, scenario: Scenario, format: str = "6max"
    ) -> dict[str, list[str]]:
        """Get full range data for a scenario. Derives raise/fold/call lists from frequencies for RFI."""
        if scenario.action_type == ActionType.RFI:
            # Derive from frequencies - single source of truth
            frequencies = self.load_frequencies(format)
            rfi_freq = frequencies.get("rfi", {})
            position_data = rfi_freq.get(scenario.hero_position.value, {})
            freq_data = position_data.get("frequencies", {})

            raise_hands = []
            call_hands = []
            fold_hands = []

            for hand, freq in freq_data.items():
                raise_freq = freq.get("raise", 0)
                call_freq = freq.get("call", 0)

                # For SB, handle call separately
                if scenario.hero_position == Position.SB:
                    if raise_freq >= self.PRIMARY_ACTION_THRESHOLD:
                        raise_hands.append(hand)
                    elif call_freq >= self.PRIMARY_ACTION_THRESHOLD:
                        call_hands.append(hand)
                    elif raise_freq == 0 and call_freq == 0:
                        fold_hands.append(hand)
                    # Mixed hands go to the dominant action list if >= ACCEPTABLE
                    elif raise_freq >= self.ACCEPTABLE_THRESHOLD:
                        raise_hands.append(hand)
                    elif call_freq >= self.ACCEPTABLE_THRESHOLD:
                        call_hands.append(hand)
                else:
                    # Other positions: just raise/fold
                    if raise_freq >= self.PRIMARY_ACTION_THRESHOLD:
                        raise_hands.append(hand)
                    elif raise_freq == 0:
                        fold_hands.append(hand)

            result = {"raise": raise_hands, "fold": fold_hands}
            if call_hands:
                result["call"] = call_hands
            return result

        # Try frequency data first, fall back to old range format
        frequencies = self.load_frequencies(format)
        key = f"{scenario.hero_position.value}_vs_{scenario.villain_position.value}"

        if scenario.action_type == ActionType.VS_RFI:
            # Try frequency data first
            vs_rfi_freq = frequencies.get("vs_rfi", {})
            position_data = vs_rfi_freq.get(key, {})
            freq_data = position_data.get("frequencies", {})

            if freq_data:
                return self._derive_range_from_frequencies(freq_data, ["3bet", "call"])

            # Fall back to old range format
            ranges = self.load_ranges(format)
            vs_rfi_data = ranges.get("vs_rfi", {})
            return vs_rfi_data.get(key, {})

        elif scenario.action_type == ActionType.VS_3BET:
            # Try frequency data first
            vs_3bet_freq = frequencies.get("vs_3bet", {})
            position_data = vs_3bet_freq.get(key, {})
            freq_data = position_data.get("frequencies", {})

            if freq_data:
                return self._derive_range_from_frequencies(freq_data, ["4bet", "call"])

            # Fall back to old range format
            ranges = self.load_ranges(format)
            vs_3bet_data = ranges.get("vs_3bet", {})
            return vs_3bet_data.get(key, {})

        elif scenario.action_type == ActionType.VS_4BET:
            # Try frequency data first
            vs_4bet_freq = frequencies.get("vs_4bet", {})
            position_data = vs_4bet_freq.get(key, {})
            freq_data = position_data.get("frequencies", {})

            if freq_data:
                return self._derive_range_from_frequencies(freq_data, ["5bet", "call"])

            # Fall back to old range format
            ranges = self.load_ranges(format)
            vs_4bet_data = ranges.get("vs_4bet", {})
            return vs_4bet_data.get(key, {})

        return {}

    def _derive_range_from_frequencies(
        self, freq_data: dict, action_types: list[str]
    ) -> dict[str, list[str]]:
        """
        Derive hand lists from frequency data.
        action_types: ["3bet", "call"] or ["4bet", "call"] or ["5bet", "call"]
        """
        result = {action: [] for action in action_types}
        result["fold"] = []

        for hand, freq in freq_data.items():
            action_freqs = [(action, freq.get(action, 0)) for action in action_types]
            max_action, max_freq = max(action_freqs, key=lambda x: x[1])

            if max_freq >= self.PRIMARY_ACTION_THRESHOLD:
                result[max_action].append(hand)
            elif max_freq >= self.ACCEPTABLE_THRESHOLD:
                result[max_action].append(hand)
            elif max_freq == 0:
                # All actions are 0, it's a fold
                all_zero = all(freq.get(action, 0) == 0 for action in action_types)
                if all_zero:
                    result["fold"].append(hand)
                else:
                    # Has some frequency but below threshold, still assign to highest
                    result[max_action].append(hand)
            else:
                # Low frequency but not zero
                result[max_action].append(hand)

        return result

    def get_frequencies_for_scenario(
        self, scenario: Scenario, format: str = "6max"
    ) -> dict[str, dict[str, int]]:
        """
        Get all hand frequencies for a scenario.
        Returns: {"AA": {"raise": 100}, "A5s": {"raise": 70, "fold": 30}, ...}
        """
        frequencies = self.load_frequencies(format)

        if scenario.action_type == ActionType.RFI:
            rfi_freq = frequencies.get("rfi", {})
            position_data = rfi_freq.get(scenario.hero_position.value, {})
            return position_data.get("frequencies", {})

        key = f"{scenario.hero_position.value}_vs_{scenario.villain_position.value}"

        if scenario.action_type == ActionType.VS_RFI:
            vs_rfi_freq = frequencies.get("vs_rfi", {})
            position_data = vs_rfi_freq.get(key, {})
            return position_data.get("frequencies", {})

        elif scenario.action_type == ActionType.VS_3BET:
            vs_3bet_freq = frequencies.get("vs_3bet", {})
            position_data = vs_3bet_freq.get(key, {})
            return position_data.get("frequencies", {})

        elif scenario.action_type == ActionType.VS_4BET:
            vs_4bet_freq = frequencies.get("vs_4bet", {})
            position_data = vs_4bet_freq.get(key, {})
            return position_data.get("frequencies", {})

        return {}
