"""
Preflop drill engine for GTO training.
"""
import random
from dataclasses import dataclass, field
from typing import List, Optional, Tuple
from datetime import datetime

from core.hand import Hand, random_hand, ALL_HANDS
from core.position import Position, POSITIONS_6MAX, positions_before
from core.scenario import Scenario, ActionType
from core.evaluator import Evaluator, EvalResult


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
        self._positions = POSITIONS_6MAX if format == "6max" else POSITIONS_6MAX

        # Drill configuration
        self.enabled_action_types: List[ActionType] = [ActionType.RFI]
        self.enabled_positions: List[Position] = list(self._positions)

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
        hand = random_hand()

        scenario = Scenario(
            hero_position=hero_pos,
            action_type=ActionType.RFI,
        )

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

        hero_pos = random.choice(valid_hero_positions)

        # Villain must be in earlier position
        earlier_positions = positions_before(hero_pos, self.format)
        if not earlier_positions:
            earlier_positions = [Position.UTG]

        villain_pos = random.choice(earlier_positions)
        hand = random_hand()

        scenario = Scenario(
            hero_position=hero_pos,
            action_type=ActionType.VS_RFI,
            villain_position=villain_pos,
        )

        return Spot(hand=hand, scenario=scenario)

    def _generate_vs_3bet_spot(self) -> Spot:
        """Generate a facing-3bet spot (you opened, villain 3bet)."""
        # Hero opened from some position, villain 3bet from later position
        valid_hero_positions = [
            p for p in self.enabled_positions
            if p not in [Position.BB]  # BB doesn't open
        ]
        if not valid_hero_positions:
            valid_hero_positions = [Position.BTN]

        hero_pos = random.choice(valid_hero_positions)

        # Villain 3bets from later position or blinds
        hero_idx = self._positions.index(hero_pos)
        later_positions = self._positions[hero_idx + 1:]

        if not later_positions:
            later_positions = [Position.BB]

        villain_pos = random.choice(later_positions)
        hand = random_hand()

        scenario = Scenario(
            hero_position=hero_pos,
            action_type=ActionType.VS_3BET,
            villain_position=villain_pos,
        )

        return Spot(hand=hand, scenario=scenario)

    def _generate_vs_4bet_spot(self) -> Spot:
        """Generate a facing-4bet spot (you 3bet, villain 4bet)."""
        # Hero 3bet from some position, villain (original raiser) 4bets
        valid_hero_positions = [
            p for p in self.enabled_positions
            if p not in [Position.UTG]  # UTG can't 3bet
        ]
        if not valid_hero_positions:
            valid_hero_positions = [Position.BB]

        hero_pos = random.choice(valid_hero_positions)

        # Villain is the original raiser (earlier position)
        earlier_positions = positions_before(hero_pos, self.format)
        if not earlier_positions:
            earlier_positions = [Position.UTG]

        villain_pos = random.choice(earlier_positions)
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
