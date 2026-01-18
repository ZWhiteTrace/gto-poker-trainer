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
# 出題範圍設計邏輯：專注練習「邊界區域」的牌
#
# 設計原則：
#   1. 排除 100% 開的牌（太明顯）
#   2. 保留 25-75% 邊緣牌（核心練習）
#   3. 保留「接近邊界」的 0% 牌（練習 fold 決策）
#   4. 排除遠離邊界的垃圾牌（不需要記）
#
# 每個位置的邊界不同，專注在該位置的決策邊界
# ============================================================================

# 頂級牌：所有位置都 100% 開，不需要練習
PREMIUM_HANDS = {
    "AA", "KK", "QQ",      # 頂級對子
    "AKs", "AKo",          # 大 AK
}

# 絕對垃圾牌：任何位置都 0% 開，離邊緣太遠
TRASH_HANDS = {
    # Suited junk - 最爛的同花牌
    "T2s", "92s", "82s", "72s", "62s",
    "93s", "83s", "73s",
    "94s",  # 84s 移除 - SB 可能開
    # Offsuit junk - 最爛的不同花
    "72o", "62o",
}

# 基礎排除 = 頂級 + 垃圾
BASE_EXCLUDED_HANDS = PREMIUM_HANDS | TRASH_HANDS

# ============================================================================
# 位置專屬排除列表
#
# UTG 出題範圍 (保留的牌)：
#   - 對子: 55(75%), 44/33/22(25%)
#   - K: K5s(75%), K4s(0%邊界)
#   - Q: Q8s(75%), Q7s(0%邊界)
#   - J: J9s(75%), J8s(0%邊界)
#   - T: T9s(75%), T8s(0%邊界)
#   - 9: 98s(25%), 97s(0%邊界)
#   - 8: 87s(25%), 86s(0%邊界)
#   - 低同花連張: 76s/65s/54s(25%), 43s/53s/64s/75s(0%邊界)
#   - Offsuit: A9o/KTo/QTo(25%)
# ============================================================================

POSITION_EXCLUDED_HANDS = {
    "UTG": BASE_EXCLUDED_HANDS | {
        # === 100% 開的牌（不用練）===
        "JJ", "TT", "99", "88", "77",
        # 66, A8o, K9o, Q9o 移到可練習
        "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s",
        "KQs", "KJs", "KTs", "K9s", "K8s", "K7s", "K6s",
        "QJs", "QTs", "Q9s",
        "JTs",  # JTs 不考
        "AQo", "AJo",
        "KQo",
        # === 離邊界太遠的 suited ===
        "K3s", "K2s",
        "Q6s", "Q5s", "Q4s", "Q3s", "Q2s",
        "J7s", "J6s", "J5s", "J4s", "J3s", "J2s",
        "T7s", "T6s", "T5s", "T4s", "T3s",
        "96s", "95s",
        "85s", "84s",  # 84s 不考
        "63s", "74s",
        "32s", "42s", "52s",
        # === 離邊界太遠的 offsuit ===
        "A7o", "A6o", "A5o", "A4o", "A3o", "A2o",
        # A8o 移到可練習
        "K8o", "K7o", "K6o", "K5o", "K4o", "K3o", "K2o",
        # K9o 移到可練習
        "Q8o", "Q7o", "Q6o", "Q5o", "Q4o", "Q3o", "Q2o",
        # Q9o 移到可練習
        "J9o", "J8o", "J7o", "J6o", "J5o", "J4o", "J3o", "J2o",
        "T8o", "T7o", "T6o", "T5o", "T4o", "T3o", "T2o",
        "97o", "96o", "95o", "94o", "93o", "92o",
        "87o",
        "86o", "85o", "84o", "83o", "82o",
        "76o", "75o", "74o", "73o",
        "65o", "64o", "63o",
        "54o", "53o", "43o", "32o", "42o", "52o",
    },
    "HJ": BASE_EXCLUDED_HANDS | {
        # === 100% 開的牌 ===
        "JJ", "TT", "99", "88", "77", "66",
        # 55 移到可練習
        "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s",
        "KQs", "KJs", "KTs", "K9s", "K8s", "K7s", "K6s", "K5s",
        "QJs", "QTs", "Q9s",
        # Q8s 移到可練習
        "JTs", "J9s",
        # Q5s, 87s, 65s, 86s 移到可練習
        "AQo", "AJo", "ATo",
        "KQo", "KJo",
        # QJo 移到可練習
        # A7o, A6o, A4o 移到可練習
        # === 離邊界太遠的 suited ===
        "K2s",
        "Q3s", "Q2s",
        "J6s", "J5s", "J4s", "J3s", "J2s",
        "T6s", "T5s", "T4s", "T3s",
        "96s", "95s",
        "85s", "84s",  # 84s 不考
        "63s", "74s",
        # 75s, 64s, 53s 移到可練習
        "32s", "42s", "52s",
        # === 離邊界太遠的 offsuit ===
        "A3o", "A2o",
        # A7o, A6o, A4o 移到可練習
        "K8o", "K7o", "K6o", "K5o", "K4o", "K3o", "K2o",
        "Q8o", "Q7o", "Q6o", "Q5o", "Q4o", "Q3o", "Q2o",
        "J8o", "J7o", "J6o", "J5o", "J4o", "J3o", "J2o",
        "T8o", "T7o", "T6o", "T5o", "T4o", "T3o", "T2o",
        "97o", "96o", "95o", "94o", "93o", "92o",
        "87o",
        "86o", "85o", "84o", "83o", "82o",
        "76o", "75o", "74o", "73o",
        "65o", "64o", "63o",
        "54o", "53o", "43o", "32o", "42o", "52o",
    },
    "CO": BASE_EXCLUDED_HANDS | {
        # === 100% 開的牌 ===
        "JJ", "TT", "99", "88", "77", "66",
        "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s",
        "KQs", "KJs", "KTs", "K9s", "K8s", "K7s", "K6s", "K5s", "K4s",
        "QJs", "QTs", "Q9s", "Q8s", "Q7s", "Q6s",
        "JTs", "J9s", "J8s",
        "T9s",
        # Q4s, J6s, Q9o, K8o, A6o, A4o, 32s, J8o 移到可練習
        "AQo", "AJo", "ATo", "A9o",
        "KQo", "KJo",
        "QJo",
        # === 離邊界太遠的 suited ===
        "J4s", "J3s", "J2s",
        "T5s", "T4s", "T3s",
        "95s",
        "85s", "84s",  # 84s 不考
        "63s", "74s",
        "42s", "52s",
        # === 離邊界太遠的 offsuit ===
        "A3o", "A2o",
        "K7o", "K6o", "K5o", "K4o", "K3o", "K2o",
        "Q8o", "Q7o", "Q6o", "Q5o", "Q4o", "Q3o", "Q2o",  # Q8o 不考
        # J8o 移到可練習
        "J7o", "J6o", "J5o", "J4o", "J3o", "J2o",
        "T8o", "T7o", "T6o", "T5o", "T4o", "T3o", "T2o",
        "97o", "96o", "95o", "94o", "93o", "92o",
        "86o", "85o", "84o", "83o", "82o",
        "76o", "75o", "74o", "73o",
        "65o", "64o", "63o",
        "54o", "53o", "43o", "32o", "42o", "52o",
    },
    "BTN": BASE_EXCLUDED_HANDS | {
        # === 100% 開的牌 ===
        "JJ", "TT", "99", "88", "77", "66", "55", "44",
        "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s",
        "KQs", "KJs", "KTs", "K9s", "K8s", "K7s", "K6s", "K5s", "K4s", "K3s",
        "QJs", "QTs", "Q9s", "Q8s", "Q7s", "Q6s", "Q5s", "Q4s",
        "JTs", "J9s", "J8s", "J7s", "J6s",
        "T9s", "T8s", "T7s",
        "98s", "97s",
        "87s",
        # J4s, 32s, Q8o, T4s, 65s, 42s, 97o, T7o, J7o 移到可練習
        "AQo", "AJo", "ATo", "A9o", "A8o", "A7o", "A6o", "A5o",
        "KQo", "KJo", "KTo",
        "QJo", "QTo",
        "JTo",
        # === 離邊界太遠的 suited ===
        "T3s",
        "63s",
        "84s",  # 84s 不考
        "52s",  # BTN 不考
        # === 離邊界太遠的 offsuit ===
        "K5o", "K4o", "K3o", "K2o",
        "Q7o", "Q6o", "Q5o", "Q4o", "Q3o", "Q2o",
        # J7o 移到可練習
        "J6o", "J5o", "J4o", "J3o", "J2o",
        # T7o 移到可練習
        "T6o", "T5o", "T4o", "T3o", "T2o",
        # 97o 移到可練習
        "96o", "95o", "94o", "93o", "92o",
        "86o", "85o", "84o", "83o", "82o",
        "76o", "75o", "74o", "73o",
        "65o", "64o", "63o",
        "54o", "53o", "43o", "32o", "42o", "52o",
    },
    "SB": BASE_EXCLUDED_HANDS | {
        # === 100% 開的牌 ===
        "JJ", "TT", "99", "88", "77", "66", "55", "44", "33",
        "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s",
        "KQs", "KJs", "KTs", "K9s", "K8s", "K7s", "K6s", "K5s", "K4s", "K3s", "K2s",
        "QJs", "QTs", "Q9s", "Q8s", "Q7s", "Q6s", "Q5s", "Q4s",
        "JTs", "J9s", "J8s", "J7s", "J6s", "J5s",
        "T9s", "T8s", "T7s",
        "98s", "97s",
        "87s", "86s",
        "76s",
        "65s",
        # J7o, T7o, 97o, 86o, 76o, 32s, 42s, 52s, 84s 移到可練習
        "AQo", "AJo", "ATo", "A9o", "A8o", "A7o", "A6o", "A5o",
        "KQo", "KJo", "KTo",
        "QJo", "QTo",
        "JTo",
        # === 離邊界太遠的 suited ===
        "T3s",
        # === 離邊界太遠的 offsuit ===
        "K5o", "K4o", "K3o", "K2o",
        "Q7o", "Q6o", "Q5o", "Q4o", "Q3o", "Q2o",
        "J6o", "J5o", "J4o", "J3o", "J2o",
        "T6o", "T5o", "T4o", "T3o", "T2o",
        "96o", "95o", "94o", "93o", "92o",
        "85o", "84o", "83o", "82o",
        "75o", "74o", "73o",
        "65o", "64o", "63o",
        "54o", "53o", "43o", "32o",
        "42o", "52o",  # SB 不考
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

    從 drillable hands 中選擇，確保只出現在練習範圍內的牌。
    優先選擇有動作的牌（raise/call/3bet 等），但也會出 fold 邊緣牌。

    Args:
        range_data: Range data for the scenario
        scenario_type: Type of scenario
        position: Position name for position-specific drillable hands
    """
    # 取得該位置的可練習手牌
    drillable = set(get_drillable_hands(position=position))

    # 收集有動作的手牌（非 fold），但必須在 drillable 範圍內
    action_hands = []
    for action in ["raise", "3bet", "4bet", "5bet", "call"]:
        if action in range_data:
            for h in range_data[action]:
                if h in drillable:
                    action_hands.append(h)
    action_hands = list(set(action_hands))

    if random.random() < 0.8 and action_hands:
        # 80%: 從有動作且在 drillable 範圍的手牌選
        hand_str = random.choice(action_hands)
        return Hand(hand_str)
    else:
        # 20%: 從所有可練習手牌選（包含 fold 邊緣牌）
        drillable_list = list(drillable)
        if drillable_list:
            return Hand(random.choice(drillable_list))
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

    def generate_comprehensive_rfi_spots(self) -> List[Spot]:
        """
        Generate ALL drillable RFI spots for comprehensive practice.
        Returns a shuffled list of all position+hand combinations.

        認真模式：所有位置的所有可練習手牌，打散隨機排列。
        """
        all_spots = []

        # RFI positions (exclude BB)
        rfi_positions = [p for p in self.enabled_positions if p != Position.BB]

        for pos in rfi_positions:
            # Get drillable hands for this position
            drillable = get_drillable_hands(position=pos.value)

            for hand_str in drillable:
                scenario = Scenario(
                    hero_position=pos,
                    action_type=ActionType.RFI,
                )
                spot = Spot(hand=Hand(hand_str), scenario=scenario)
                all_spots.append(spot)

        # Shuffle all spots
        random.shuffle(all_spots)
        return all_spots
