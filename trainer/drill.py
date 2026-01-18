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


# ============================================================================
# 出題範圍設計邏輯：專注練習「邊緣牌」
#
# 排除兩類牌：
#   1. 頂級牌 (100% raise) - AA, KK, QQ, AKs 等，答案太明顯
#   2. 垃圾牌 (0% raise) - 離邊緣太遠，不需要記
#
# 保留：邊緣決策牌 - 這才是需要記憶的位置邊界
# ============================================================================

# 頂級牌：任何位置都 100% 開，不需要練習
PREMIUM_HANDS = {
    "AA", "KK", "QQ",      # 頂級對子
    "AKs", "AKo",          # 大 AK
}

# 絕對垃圾牌：任何位置都 0% 開，離邊緣太遠
TRASH_HANDS = {
    # Suited junk
    "T2s", "92s", "82s", "72s", "62s", "52s", "42s", "32s",
    "T3s", "93s", "83s", "73s", "63s",
    "94s", "84s", "74s",
    # Offsuit junk
    "72o", "62o", "52o", "42o", "32o",
}

# 基礎排除 = 頂級 + 垃圾
BASE_EXCLUDED_HANDS = PREMIUM_HANDS | TRASH_HANDS

# ============================================================================
# 位置專屬排除列表
#
# 設計原則：排除「距離該位置邊緣太遠」的牌
# - 該位置 100% 開的牌 → 排除（太簡單）
# - 該位置 0% 開且離邊緣很遠的牌 → 排除（不用記）
# - 保留：邊緣牌（需要記憶「這個位置開不開」）
# ============================================================================

POSITION_EXCLUDED_HANDS = {
    "UTG": BASE_EXCLUDED_HANDS | {
        # === 100% 開的牌（不用練）===
        "JJ", "TT",
        "AQs", "AQo",
        # === 離邊緣太遠的 offsuit ===
        "A7o", "A6o", "A5o", "A4o", "A3o", "A2o",
        "K7o", "K6o", "K5o", "K4o", "K3o", "K2o",
        "Q8o", "Q7o", "Q6o", "Q5o", "Q4o", "Q3o", "Q2o",
        "J8o", "J7o", "J6o", "J5o", "J4o", "J3o", "J2o",
        "T7o", "T6o", "T5o", "T4o", "T3o", "T2o",
        "97o", "96o", "95o", "94o", "93o", "92o",
        "86o", "85o", "84o", "83o", "82o",
        "76o", "75o", "74o", "73o",
        "65o", "64o", "63o",
        "54o", "53o", "43o",
        # === 離邊緣太遠的 suited ===
        "K4s", "K3s", "K2s",
        "Q6s", "Q5s", "Q4s", "Q3s", "Q2s",
        "J7s", "J6s", "J5s", "J4s", "J3s", "J2s",
        "T7s", "T6s", "T5s", "T4s",
        "96s", "95s",
        "85s",
        "75s", "64s", "53s", "43s",
        # === 離邊緣太遠的小對子 ===
        "44", "33", "22",
    },
    "HJ": BASE_EXCLUDED_HANDS | {
        # === 100% 開的牌（不用練）===
        "JJ", "TT",
        "AQs",
        # === 離邊緣太遠的 offsuit ===
        "A6o", "A5o", "A4o", "A3o", "A2o",
        "K7o", "K6o", "K5o", "K4o", "K3o", "K2o",
        "Q8o", "Q7o", "Q6o", "Q5o", "Q4o", "Q3o", "Q2o",
        "J8o", "J7o", "J6o", "J5o", "J4o", "J3o", "J2o",
        "T7o", "T6o", "T5o", "T4o", "T3o", "T2o",
        "97o", "96o", "95o", "94o", "93o", "92o",
        "86o", "85o", "84o", "83o", "82o",
        "76o", "75o", "74o", "73o",
        "65o", "64o", "63o",
        "54o", "53o", "43o",
        # === 離邊緣太遠的 suited ===
        "K3s", "K2s",
        "Q5s", "Q4s", "Q3s", "Q2s",
        "J6s", "J5s", "J4s", "J3s", "J2s",
        "T6s", "T5s", "T4s",
        "96s", "95s",
        "85s",
        "75s", "64s", "53s", "43s",
        # === 離邊緣太遠的小對子 ===
        "33", "22",
    },
    "CO": BASE_EXCLUDED_HANDS | {
        # === 100% 開的牌（不用練）===
        "JJ", "TT", "99",
        "AQs", "AJs",
        # === 離邊緣太遠的 offsuit ===
        "A5o", "A4o", "A3o", "A2o",
        "K7o", "K6o", "K5o", "K4o", "K3o", "K2o",
        "Q8o", "Q7o", "Q6o", "Q5o", "Q4o", "Q3o", "Q2o",
        "J8o", "J7o", "J6o", "J5o", "J4o", "J3o", "J2o",
        "T7o", "T6o", "T5o", "T4o", "T3o", "T2o",
        "97o", "96o", "95o", "94o", "93o", "92o",
        "86o", "85o", "84o", "83o", "82o",
        "76o", "75o", "74o", "73o",
        "65o", "64o", "63o",
        "54o", "53o", "43o",
        # === 離邊緣太遠的 suited ===
        "Q4s", "Q3s", "Q2s",
        "J5s", "J4s", "J3s", "J2s",
        "T5s", "T4s",
        "95s",
        "85s",
        "64s", "53s", "43s",
        # === 離邊緣太遠的小對子 ===
        "22",
    },
    "BTN": BASE_EXCLUDED_HANDS | {
        # === 100% 開的牌（不用練）===
        "JJ", "TT", "99", "88", "77",
        "AQs", "AJs", "ATs",
        "AQo",
        # === 離邊緣太遠的 offsuit ===
        "K6o", "K5o", "K4o", "K3o", "K2o",
        "Q7o", "Q6o", "Q5o", "Q4o", "Q3o", "Q2o",
        "J7o", "J6o", "J5o", "J4o", "J3o", "J2o",
        "T6o", "T5o", "T4o", "T3o", "T2o",
        "96o", "95o", "94o", "93o", "92o",
        "85o", "84o", "83o", "82o",
        "75o", "74o", "73o",
        "64o", "63o",
        "53o", "43o",
        # === 離邊緣太遠的 suited ===
        "J2s",
        "T4s",
        "53s",
    },
    "SB": BASE_EXCLUDED_HANDS | {
        # === 100% 開的牌（不用練）===
        "JJ", "TT", "99", "88", "77", "66",
        "AQs", "AJs", "ATs", "A9s",
        "AQo", "AJo",
        # === 離邊緣太遠的 offsuit ===
        "K6o", "K5o", "K4o", "K3o", "K2o",
        "Q7o", "Q6o", "Q5o", "Q4o", "Q3o", "Q2o",
        "J7o", "J6o", "J5o", "J4o", "J3o", "J2o",
        "T6o", "T5o", "T4o", "T3o", "T2o",
        "96o", "95o", "94o", "93o", "92o",
        "85o", "84o", "83o", "82o",
        "75o", "74o", "73o",
        "64o", "63o",
        "53o", "43o",
        # === 離邊緣太遠的 suited ===
        "T4s",
    },
}

# 向後相容：預設排除列表使用 SB（最寬範圍）
EXCLUDED_HANDS = POSITION_EXCLUDED_HANDS["SB"]

def get_drillable_hands(range_data: dict = None, scenario_type: str = "vs_rfi", position = None) -> List[str]:
    """
    Get all hands that are in the drilling focus.

    位置專屬邏輯：169 手牌 - POSITION_EXCLUDED_HANDS[position] = 可練習範圍

    Args:
        range_data: Optional range data (not used currently)
        scenario_type: Type of scenario (not used currently)
        position: Position name (UTG, HJ, CO, BTN, SB) or Position enum. If None, uses SB (widest range).

    Returns:
        List of hand strings that should be highlighted in drilling
    """
    # Handle Position enum or string
    if position is None:
        pos_upper = "SB"
    elif hasattr(position, 'value'):
        pos_upper = position.value.upper()
    else:
        pos_upper = str(position).upper()
    excluded = POSITION_EXCLUDED_HANDS.get(pos_upper, EXCLUDED_HANDS)
    return [h for h in ALL_HANDS if h not in excluded]


def get_interesting_hand(range_data: dict, scenario_type: str = "vs_rfi", position: str = None) -> Hand:
    """
    Generate an 'interesting' hand for drilling.

    80%: 從 action ranges 選（有實際決策的手牌：raise/call/3bet/4bet/5bet）
    20%: 從 drillable hands 隨機選（練習 fold 決策）

    Args:
        range_data: Range data for the scenario
        scenario_type: Type of scenario
        position: Position name for position-specific drillable hands
    """
    # 收集有動作的手牌（非 fold）
    action_hands = []
    for action in ["raise", "3bet", "4bet", "5bet", "call"]:
        if action in range_data:
            action_hands.extend(range_data[action])
    action_hands = list(set(action_hands))

    if random.random() < 0.8 and action_hands:
        # 80%: 從有動作的手牌選
        hand_str = random.choice(action_hands)
        return Hand(hand_str)
    else:
        # 20%: 從所有可練習手牌選（包含 fold 邊緣牌）
        drillable = get_drillable_hands(position=position)
        if drillable:
            return Hand(random.choice(drillable))
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

        # Use interesting hands focused on borderline decisions (position-specific)
        range_data = self.evaluator.get_range_for_scenario(scenario, format=self.format) or {}
        hand = get_interesting_hand(range_data, "rfi", position=hero_pos.value)

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
        """Get the list of drillable hands for a spot (position-specific)."""
        range_data = self.get_range_for_spot(spot) or {}
        scenario_type = spot.scenario.action_type.value
        position = spot.scenario.hero_position.value
        return get_drillable_hands(range_data, scenario_type, position=position)
