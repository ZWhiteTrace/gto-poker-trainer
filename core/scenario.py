"""
Scenario definitions for preflop training.
"""
from dataclasses import dataclass
from enum import Enum
from typing import Optional, List
from .position import Position


class ActionType(Enum):
    """Types of preflop scenarios."""
    RFI = "rfi"              # Raise First In (everyone folded to you)
    VS_RFI = "vs_rfi"        # Facing an open raise
    VS_3BET = "vs_3bet"      # You opened, facing a 3-bet
    VS_4BET = "vs_4bet"      # You 3-bet, facing a 4-bet
    BLINDS = "blinds"        # Special blind vs blind scenarios


@dataclass
class Scenario:
    """
    Defines a preflop scenario for training.

    Examples:
    - RFI from UTG: hero_position=UTG, action_type=RFI
    - BTN vs UTG open: hero_position=BTN, villain_position=UTG, action_type=VS_RFI
    - UTG vs HJ 3bet: hero_position=UTG, villain_position=HJ, action_type=VS_3BET
    """
    hero_position: Position
    action_type: ActionType
    villain_position: Optional[Position] = None

    @property
    def available_actions(self) -> List[str]:
        """Return available actions for this scenario."""
        if self.action_type == ActionType.RFI:
            # SB has call (limp) option in GTO
            if self.hero_position == Position.SB:
                return ["raise", "call", "fold"]
            return ["raise", "fold"]
        elif self.action_type == ActionType.VS_RFI:
            # All positions can potentially call (except SB in some cases, but data handles this)
            # BB, BTN, CO, HJ all have call ranges in GTO data
            if self.hero_position in [Position.SB]:
                # SB typically 3bets or folds, very rarely calls
                return ["3bet", "fold"]
            else:
                return ["3bet", "call", "fold"]
        elif self.action_type == ActionType.VS_3BET:
            return ["4bet", "call", "fold"]
        elif self.action_type == ActionType.VS_4BET:
            return ["5bet", "call", "fold"]
        elif self.action_type == ActionType.BLINDS:
            return ["raise", "call", "fold"]
        return ["fold"]

    @property
    def scenario_key(self) -> str:
        """
        Generate a unique key for this scenario.
        Used for looking up ranges in data files.
        """
        if self.action_type == ActionType.RFI:
            return f"rfi_{self.hero_position.value}"
        elif self.action_type == ActionType.VS_RFI:
            return f"vs_rfi_{self.hero_position.value}_vs_{self.villain_position.value}"
        elif self.action_type == ActionType.VS_3BET:
            return f"vs_3bet_{self.hero_position.value}_vs_{self.villain_position.value}"
        elif self.action_type == ActionType.VS_4BET:
            return f"vs_4bet_{self.hero_position.value}_vs_{self.villain_position.value}"
        return f"unknown_{self.hero_position.value}"

    @property
    def description(self) -> str:
        """Human-readable description of the scenario."""
        hero = self.hero_position.value

        if self.action_type == ActionType.RFI:
            return f"You are on {hero}. Everyone folds to you."
        elif self.action_type == ActionType.VS_RFI:
            villain = self.villain_position.value
            return f"You are on {hero}. {villain} raises 2.5bb."
        elif self.action_type == ActionType.VS_3BET:
            villain = self.villain_position.value
            return f"You opened from {hero}. {villain} 3-bets."
        elif self.action_type == ActionType.VS_4BET:
            villain = self.villain_position.value
            return f"You 3-bet from {hero}. {villain} 4-bets."
        return f"Unknown scenario at {hero}"

    @property
    def description_zh(self) -> str:
        """Chinese description of the scenario."""
        hero = self.hero_position.value

        if self.action_type == ActionType.RFI:
            return f"你在 {hero} 位置。前面都蓋牌。"
        elif self.action_type == ActionType.VS_RFI:
            villain = self.villain_position.value
            return f"你在 {hero} 位置。{villain} 加注 2.5bb。"
        elif self.action_type == ActionType.VS_3BET:
            villain = self.villain_position.value
            return f"你從 {hero} 開池。{villain} 3-bet。"
        elif self.action_type == ActionType.VS_4BET:
            villain = self.villain_position.value
            return f"你從 {hero} 3-bet。{villain} 4-bet。"
        return f"未知場景，位置 {hero}"
