"""
Preflop drill engine for GTO training.
"""
import random
from dataclasses import dataclass, field
from typing import List, Optional, Tuple
from datetime import datetime

from core.hand import Hand, random_hand, ALL_HANDS, RANKS
from core.position import Position, POSITIONS_6MAX, POSITIONS_9MAX, positions_before
from core.scenario import Scenario, ActionType
from core.evaluator import Evaluator, EvalResult


# Borderline hands - hands near decision boundaries that are more educational
# Expanded to cover essentially ALL hands that could be playable from any position
# This ensures late position (BTN, SB) scenarios have comprehensive drillable coverage
BORDERLINE_HANDS = {
    # Premium - always play
    "premium": ["AA", "KK", "QQ", "JJ", "TT", "AKs", "AKo", "AQs", "AQo"],

    # Strong - play from most positions
    "strong": ["99", "88", "77", "66", "55", "44", "33", "22",
               "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s",
               "AJo", "ATo", "KQs", "KQo", "KJs", "KJo", "QJs", "QJo"],

    # Medium suited - all suited hands that could be played
    "medium_suited": [
        "KTs", "K9s", "K8s", "K7s", "K6s", "K5s", "K4s", "K3s", "K2s",
        "QTs", "Q9s", "Q8s", "Q7s", "Q6s", "Q5s", "Q4s", "Q3s", "Q2s",
        "JTs", "J9s", "J8s", "J7s", "J6s", "J5s", "J4s", "J3s",
        "T9s", "T8s", "T7s", "T6s", "T5s", "T4s",
        "98s", "97s", "96s", "95s",
        "87s", "86s", "85s", "84s",
        "76s", "75s", "74s", "73s",
        "65s", "64s", "63s",
        "54s", "53s", "52s",
        "43s",
        "32s"
    ],

    # Medium offsuit - playable hands from late position
    "medium_offsuit": [
        "A9o", "A8o", "A7o", "A6o", "A5o", "A4o", "A3o",
        "KTo", "K9o", "K8o", "K7o",
        "QTo", "Q9o", "Q8o",
        "JTo", "J9o", "J8o", "J7o",
        "T9o", "T8o", "T7o",
        "98o", "97o",
        "87o",
        "76o",
        "65o",
        "54o",
        "43o"
    ],

    # Trap hands - look playable but should fold (test range boundaries)
    "trap": []
}

def get_drillable_hands(range_data: dict, scenario_type: str = "vs_rfi") -> List[str]:
    """
    Get all hands that are in the drilling focus for a scenario.

    These are hands where the decision is meaningful:
    - Hands in the action ranges (raise, call, 3bet, etc.)
    - All playable hands from any position

    Returns:
        List of hand strings that should be highlighted in drilling
    """
    candidates = []

    # Add hands from the ranges (these are the correct actions)
    for action in ["raise", "3bet", "4bet", "5bet", "call"]:
        if action in range_data:
            candidates.extend(range_data[action])

    # Add all borderline/playable hands
    for category in BORDERLINE_HANDS.values():
        candidates.extend(category)

    # Remove duplicates
    return list(set(candidates))


def get_interesting_hand(range_data: dict, scenario_type: str = "vs_rfi") -> Hand:
    """
    Generate an 'interesting' hand for drilling - one near decision boundaries.

    Instead of random hands like Q2o (obvious fold), focus on hands where
    the decision actually matters: borderline 3bet/call/fold hands.

    70% of time: Pick from action ranges or borderline hands
    30% of time: Pick random (to occasionally test obvious cases)
    """
    if random.random() < 0.3:
        # 30% chance: random hand (test obvious cases occasionally)
        return random_hand()

    # 70% chance: pick an interesting hand
    candidates = get_drillable_hands(range_data, scenario_type)

    if candidates:
        hand_str = random.choice(candidates)
        return Hand(hand_str)
    else:
        return random_hand()


@dataclass
class Spot:
    """A single training spot (hand + scenario)."""
    hand: Hand
    scenario: Scenario
    timestamp: datetime = field(default_factory=datetime.now)

    @property
    def display_hand(self) -> str:
        """Get display string for the hand with suit symbols."""
        return self.hand.to_display(with_suits=True)

    def to_dict(self) -> dict:
        return {
            "hand": str(self.hand),
            "scenario": self.scenario.scenario_key,
            "hero_position": self.scenario.hero_position.value,
            "villain_position": self.scenario.villain_position.value if self.scenario.villain_position else None,
            "action_type": self.scenario.action_type.value,
            "timestamp": self.timestamp.isoformat(),
        }


class PreflopDrill:
    """
    Core drill engine for generating and evaluating preflop spots.
    """

    def __init__(self, format: str = "6max"):
        self.format = format
        self.evaluator = Evaluator()
        self._positions = POSITIONS_6MAX if format == "6max" else POSITIONS_9MAX

        # Drill configuration
        self.enabled_action_types: List[ActionType] = [ActionType.RFI]
        self.enabled_positions: List[Position] = list(self._positions)
        self.enabled_villain_positions: Optional[List[Position]] = None  # None = all

    def enable_action_type(self, action_type: ActionType):
        """Enable a specific action type for drilling."""
        if action_type not in self.enabled_action_types:
            self.enabled_action_types.append(action_type)

    def disable_action_type(self, action_type: ActionType):
        """Disable a specific action type."""
        if action_type in self.enabled_action_types:
            self.enabled_action_types.remove(action_type)

    def set_enabled_positions(self, positions: List[Position]):
        """Set which positions to practice."""
        self.enabled_positions = positions

    def generate_spot(self) -> Spot:
        """Generate a random training spot based on enabled settings."""
        action_type = random.choice(self.enabled_action_types)

        if action_type == ActionType.RFI:
            return self._generate_rfi_spot()
        elif action_type == ActionType.VS_RFI:
            return self._generate_vs_rfi_spot()
        elif action_type == ActionType.VS_3BET:
            return self._generate_vs_3bet_spot()
        elif action_type == ActionType.VS_4BET:
            return self._generate_vs_4bet_spot()
        else:
            return self._generate_rfi_spot()

    def _generate_rfi_spot(self) -> Spot:
        """Generate a RFI (Raise First In) spot."""
        # RFI can be from any position except BB
        valid_positions = [p for p in self.enabled_positions if p != Position.BB]
        if not valid_positions:
            valid_positions = [Position.BTN]

        hero_pos = random.choice(valid_positions)

        scenario = Scenario(
            hero_position=hero_pos,
            action_type=ActionType.RFI,
        )

        # Use interesting hands focused on borderline decisions
        range_data = self.evaluator.get_range_for_scenario(scenario, format=self.format) or {}
        hand = get_interesting_hand(range_data, "rfi")

        return Spot(hand=hand, scenario=scenario)

    def _generate_vs_rfi_spot(self) -> Spot:
        """Generate a facing-open-raise spot."""
        # Need at least one position before hero
        valid_hero_positions = [
            p for p in self.enabled_positions
            if p not in [Position.UTG]  # UTG can't face a raise
        ]
        if not valid_hero_positions:
            valid_hero_positions = [Position.BB]

        # Try to find a valid hero/villain combination with data
        max_attempts = 20
        for _ in range(max_attempts):
            hero_pos = random.choice(valid_hero_positions)

            # Villain must be in earlier position
            earlier_positions = positions_before(hero_pos, self.format)
            if not earlier_positions:
                continue

            # Filter by enabled villain positions if set
            if self.enabled_villain_positions:
                earlier_positions = [p for p in earlier_positions if p in self.enabled_villain_positions]
                if not earlier_positions:
                    continue

            villain_pos = random.choice(earlier_positions)

            scenario = Scenario(
                hero_position=hero_pos,
                action_type=ActionType.VS_RFI,
                villain_position=villain_pos,
            )

            # Check if data exists for this scenario
            range_data = self.evaluator.get_range_for_scenario(scenario, format=self.format)
            if range_data and ("3bet" in range_data or "call" in range_data):
                # Use interesting hands instead of random to focus on borderline decisions
                hand = get_interesting_hand(range_data, "vs_rfi")
                return Spot(hand=hand, scenario=scenario)

        # Fallback: return any valid scenario (may have no data)
        hero_pos = random.choice(valid_hero_positions)
        earlier_positions = positions_before(hero_pos, self.format)
        if not earlier_positions:
            earlier_positions = [Position.UTG]
        # Filter by enabled villain positions if set
        if self.enabled_villain_positions:
            filtered = [p for p in earlier_positions if p in self.enabled_villain_positions]
            if filtered:
                earlier_positions = filtered
        villain_pos = random.choice(earlier_positions)

        scenario = Scenario(
            hero_position=hero_pos,
            action_type=ActionType.VS_RFI,
            villain_position=villain_pos,
        )
        # Fallback also uses interesting hands
        range_data = self.evaluator.get_range_for_scenario(scenario, format=self.format) or {}
        hand = get_interesting_hand(range_data, "vs_rfi")
        return Spot(hand=hand, scenario=scenario)

    def _generate_vs_3bet_spot(self) -> Spot:
        """Generate a facing-3bet spot (you opened, villain 3bet).

        IMPORTANT: Hand must be in hero's RFI range, since hero opened first.
        """
        # Hero opened from some position, villain 3bet from later position
        valid_hero_positions = [
            p for p in self.enabled_positions
            if p not in [Position.BB]  # BB doesn't open
        ]
        if not valid_hero_positions:
            valid_hero_positions = [Position.BTN]

        # Try to find a valid hero/villain combination with data
        max_attempts = 30
        for _ in range(max_attempts):
            hero_pos = random.choice(valid_hero_positions)

            # Villain 3bets from later position or blinds
            hero_idx = self._positions.index(hero_pos)
            later_positions = self._positions[hero_idx + 1:]

            if not later_positions:
                continue

            # Filter by enabled villain positions if set
            if self.enabled_villain_positions:
                later_positions = [p for p in later_positions if p in self.enabled_villain_positions]
                if not later_positions:
                    continue

            villain_pos = random.choice(later_positions)

            scenario = Scenario(
                hero_position=hero_pos,
                action_type=ActionType.VS_3BET,
                villain_position=villain_pos,
            )

            # Check if data exists for this scenario
            range_data = self.evaluator.get_range_for_scenario(scenario, format=self.format)
            if range_data and ("4bet" in range_data or "call" in range_data):
                # Get hero's RFI range - hand must be in opening range
                rfi_scenario = Scenario(hero_position=hero_pos, action_type=ActionType.RFI)
                rfi_range = self.evaluator.get_range_for_scenario(rfi_scenario, format=self.format)
                rfi_hands = rfi_range.get("raise", [])

                if rfi_hands:
                    hand_str = random.choice(rfi_hands)
                    hand = Hand(hand_str)
                    return Spot(hand=hand, scenario=scenario)

        # Fallback: return any valid scenario with a hand from RFI range
        hero_pos = random.choice(valid_hero_positions)
        hero_idx = self._positions.index(hero_pos)
        later_positions = self._positions[hero_idx + 1:]
        if not later_positions:
            later_positions = [Position.BB]
        # Filter by enabled villain positions if set
        if self.enabled_villain_positions:
            filtered = [p for p in later_positions if p in self.enabled_villain_positions]
            if filtered:
                later_positions = filtered
        villain_pos = random.choice(later_positions)

        # Get hand from RFI range
        rfi_scenario = Scenario(hero_position=hero_pos, action_type=ActionType.RFI)
        rfi_range = self.evaluator.get_range_for_scenario(rfi_scenario, format=self.format)
        rfi_hands = rfi_range.get("raise", [])
        if rfi_hands:
            hand_str = random.choice(rfi_hands)
            hand = Hand(hand_str)
        else:
            hand = random_hand()

        scenario = Scenario(
            hero_position=hero_pos,
            action_type=ActionType.VS_3BET,
            villain_position=villain_pos,
        )
        return Spot(hand=hand, scenario=scenario)

    def _generate_vs_4bet_spot(self) -> Spot:
        """Generate a facing-4bet spot (you 3bet, villain 4bet).

        IMPORTANT: Hand must be in hero's 3-bet range vs villain's open,
        since hero 3-bet first before facing 4-bet.
        """
        # Hero 3bet from some position, villain (original raiser) 4bets
        valid_hero_positions = [
            p for p in self.enabled_positions
            if p not in [Position.UTG]  # UTG can't 3bet
        ]
        if not valid_hero_positions:
            valid_hero_positions = [Position.BB]

        # Try to find a valid hero/villain combination with data
        max_attempts = 30
        for _ in range(max_attempts):
            hero_pos = random.choice(valid_hero_positions)

            # Villain is the original raiser (earlier position)
            earlier_positions = positions_before(hero_pos, self.format)
            if not earlier_positions:
                continue

            # Filter by enabled villain positions if set
            if self.enabled_villain_positions:
                earlier_positions = [p for p in earlier_positions if p in self.enabled_villain_positions]
                if not earlier_positions:
                    continue

            villain_pos = random.choice(earlier_positions)

            scenario = Scenario(
                hero_position=hero_pos,
                action_type=ActionType.VS_4BET,
                villain_position=villain_pos,
            )

            # Check if data exists for this scenario
            range_data = self.evaluator.get_range_for_scenario(scenario, format=self.format)
            if range_data and ("5bet" in range_data or "call" in range_data):
                # Get hero's 3-bet range vs villain's open - hand must be in 3-bet range
                vs_rfi_scenario = Scenario(
                    hero_position=hero_pos,
                    action_type=ActionType.VS_RFI,
                    villain_position=villain_pos,
                )
                vs_rfi_range = self.evaluator.get_range_for_scenario(vs_rfi_scenario, format=self.format)
                threbet_hands = vs_rfi_range.get("3bet", [])

                if threbet_hands:
                    hand_str = random.choice(threbet_hands)
                    hand = Hand(hand_str)
                    return Spot(hand=hand, scenario=scenario)

        # Fallback: return any valid scenario with a hand from 3-bet range
        hero_pos = random.choice(valid_hero_positions)
        earlier_positions = positions_before(hero_pos, self.format)
        if not earlier_positions:
            earlier_positions = [Position.UTG]
        # Filter by enabled villain positions if set
        if self.enabled_villain_positions:
            filtered = [p for p in earlier_positions if p in self.enabled_villain_positions]
            if filtered:
                earlier_positions = filtered
        villain_pos = random.choice(earlier_positions)

        # Get hand from 3-bet range
        vs_rfi_scenario = Scenario(
            hero_position=hero_pos,
            action_type=ActionType.VS_RFI,
            villain_position=villain_pos,
        )
        vs_rfi_range = self.evaluator.get_range_for_scenario(vs_rfi_scenario, format=self.format)
        threbet_hands = vs_rfi_range.get("3bet", [])
        if threbet_hands:
            hand_str = random.choice(threbet_hands)
            hand = Hand(hand_str)
        else:
            hand = random_hand()

        scenario = Scenario(
            hero_position=hero_pos,
            action_type=ActionType.VS_4BET,
            villain_position=villain_pos,
        )
        return Spot(hand=hand, scenario=scenario)

    def check_answer(self, spot: Spot, player_action: str) -> EvalResult:
        """Check if the player's action is correct."""
        return self.evaluator.evaluate(
            hand=spot.hand,
            scenario=spot.scenario,
            player_action=player_action,
            format=self.format,
        )

    def get_correct_action(self, spot: Spot) -> str:
        """Get the correct action for a spot."""
        return self.evaluator.get_correct_action(
            hand=spot.hand,
            scenario=spot.scenario,
            format=self.format,
        )

    def get_available_actions(self, spot: Spot) -> List[str]:
        """Get available actions for a spot."""
        return spot.scenario.available_actions

    def get_range_for_spot(self, spot: Spot) -> dict:
        """Get the full range data for a spot's scenario."""
        return self.evaluator.get_range_for_scenario(
            scenario=spot.scenario,
            format=self.format,
        )

    def get_drillable_hands_for_spot(self, spot: Spot) -> List[str]:
        """Get the list of drillable hands for a spot (borderline decisions)."""
        range_data = self.get_range_for_spot(spot) or {}
        scenario_type = spot.scenario.action_type.value
        return get_drillable_hands(range_data, scenario_type)
