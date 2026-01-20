"""
Preflop drill engine for GTO training.
"""
import random
from dataclasses import dataclass, field
from typing import List, Optional, Tuple
from datetime import datetime

from core.hand import Hand, random_hand, ALL_HANDS, RANKS
from core.position import Position, POSITIONS_6MAX, positions_before
from core.scenario import Scenario, ActionType
from core.evaluator import Evaluator, EvalResult


# ============================================================================
# 出題範圍設計邏輯：專注練習「邊界區域」的牌 (簡化版 v4.0)
#
# 設計原則：
#   1. 排除明顯 100% 開的牌（太簡單）
#   2. 保留邊緣 100% 牌（記憶重點）
#   3. 保留 50% 混合頻率牌（核心練習）
#   4. 保留「接近邊界」的 0% 牌（練習 fold 決策）
#   5. 排除遠離邊界的垃圾牌（不需要記）
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
    "94s",
    # Offsuit junk - 最爛的不同花
    "72o", "62o",
}

# 基礎排除 = 頂級 + 垃圾
BASE_EXCLUDED_HANDS = PREMIUM_HANDS | TRASH_HANDS

# ============================================================================
# 位置專屬排除列表 (簡化版 v4.0)
#
# 簡化版範圍：
#   UTG: 55+, A2s+, K8s+, Q9s+, JTs, J9s, T9s, KJo+, ATo+ (50%: 98s/87s/76s/65s)
#   HJ: 33+, A2s+, K7s+, Q9s+, J9s+, T8s-54s, KJo+, ATo+
#   CO: 22+, A2s+, K3s+, Q6s+, J7s+, T7s+, 97s-54s, 86s, KTo+, QTo+, JTo, A8o+
#   BTN: 22+, A2s+, K2s+, Q2s+, J4s+, T6s+, 96s+, 85s+, 75s+, 64s+, 54s,
#        K8o+, Q9o+, J9o+, T8o+, 98o, A4o+ (50%: J8o)
#   SB: 同 BTN
# ============================================================================

POSITION_EXCLUDED_HANDS = {
    "UTG": BASE_EXCLUDED_HANDS | {
        # === 明顯 100% 牌（不用練）===
        "JJ", "TT", "99", "88", "77", "66",  # 66+ 明顯
        "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s",  # A3s+ 明顯
        "KQs", "KJs", "KTs", "K9s",  # K9s+ 明顯 (K8s 是邊緣，要考)
        "QJs", "QTs",  # QTs+ 明顯 (Q9s 是邊緣，要考)
        "JTs",  # JTs 明顯
        "AQo", "AJo",  # AJo+ 明顯
        "KQo",  # KQo 明顯
        # === 遠離邊界的 0% 牌（不用練）===
        # 同花 K (K7s 以下都是 0%，但 K7s 是邊緣要考)
        "K6s", "K5s", "K4s", "K3s", "K2s",  # 不考
        # 同花 Q (Q8s 以下是 0%)
        "Q8s", "Q7s", "Q6s", "Q5s", "Q4s", "Q3s", "Q2s",  # Q7s 不考
        # 同花 J (J8s 以下是 0%)
        "J8s", "J7s", "J6s", "J5s", "J4s", "J3s", "J2s",
        # 同花 T (T8s 以下是 0%)
        "T8s", "T7s", "T6s", "T5s", "T4s", "T3s",
        # 同花隔張
        "97s", "96s", "95s",
        "86s", "85s", "84s",
        "75s", "74s",
        "64s", "63s",
        "53s", "43s",
        "33", "22",  # 小對子 0%
        "32s", "42s", "52s",
        # === Offsuit 牌（大部分不考）===
        "A9o", "A8o", "A7o", "A6o", "A5o", "A4o", "A3o", "A2o",  # A9o 不考
        "K9o", "K8o", "K7o", "K6o", "K5o", "K4o", "K3o", "K2o",  # 但 KTo 要考
        "QTo", "Q9o", "Q8o", "Q7o", "Q6o", "Q5o", "Q4o", "Q3o", "Q2o",  # QTo 不考
        "J9o", "J8o", "J7o", "J6o", "J5o", "J4o", "J3o", "J2o",  # 但 JTo 要考
        "T8o", "T7o", "T6o", "T5o", "T4o", "T3o", "T2o",
        "97o", "96o", "95o", "94o", "93o", "92o",
        "87o", "86o", "85o", "84o", "83o", "82o",
        "76o", "75o", "74o", "73o",
        "65o", "64o", "63o",
        "54o", "53o", "43o", "32o", "42o", "52o",
    },
    # === UTG 要考的牌 (不在排除列表) ===
    # K8s (100% 邊緣), K7s (0% 邊緣), Q9s (100% 邊緣)
    # J9s (100%), T9s (100%), 55 (100% 邊緣)
    # 98s/87s/76s/65s (50% 混合)
    # KJo (100% 邊緣), ATo (100% 邊緣)
    # JTo (0% 邊緣), KTo (0% 邊緣)

    "HJ": BASE_EXCLUDED_HANDS | {
        # === 明顯 100% 牌（不用練）===
        "JJ", "TT", "99", "88", "77", "66", "55", "44",  # 44+ 明顯 (33 是邊緣，要考)
        "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s",
        "KQs", "KJs", "KTs", "K9s", "K8s",  # K8s+ 明顯 (K7s 是邊緣，要考)
        "QJs", "QTs",  # QTs+ 明顯 (Q9s 是邊緣，要考)
        "JTs",  # JTs 明顯
        "T9s",  # T9s 明顯
        "AQo", "AJo", "ATo",  # ATo+ 明顯
        "KQo",  # KQo 明顯 (KJo 是邊緣，要考)
        # === 遠離邊界的 0% 牌（不用練）===
        "K5s", "K4s", "K3s", "K2s",  # 不考
        "Q8s", "Q7s", "Q6s", "Q5s", "Q4s", "Q3s", "Q2s",  # Q7s 不考
        "J7s", "J6s", "J5s", "J4s", "J3s", "J2s",  # J7s 不考
        "T6s", "T5s", "T4s", "T3s",
        "96s", "95s",
        "86s", "85s", "84s",
        "75s", "74s",
        "64s", "63s",
        "53s",  # 53s 不考 (43s 是邊緣，要考)
        "32s", "42s", "52s",
        # === Offsuit 牌 ===
        "A9o", "A8o", "A7o", "A6o", "A5o", "A4o", "A3o", "A2o",
        "K9o", "K8o", "K7o", "K6o", "K5o", "K4o", "K3o", "K2o",  # K9o 不考
        "Q9o", "Q8o", "Q7o", "Q6o", "Q5o", "Q4o", "Q3o", "Q2o",  # Q9o 不考
        "J9o", "J8o", "J7o", "J6o", "J5o", "J4o", "J3o", "J2o",  # J9o 不考
        "T9o", "T8o", "T7o", "T6o", "T5o", "T4o", "T3o", "T2o",
        "98o", "97o", "96o", "95o", "94o", "93o", "92o",
        "87o", "86o", "85o", "84o", "83o", "82o",
        "76o", "75o", "74o", "73o",
        "65o", "64o", "63o",
        "54o", "53o", "43o", "32o", "42o", "52o",
    },
    # === HJ 要考的牌 ===
    # K7s (100% 邊緣), K6s (0% 邊緣), Q9s (100% 邊緣)
    # J9s (100%), T8s (100%), 98s-54s (100%)
    # 33 (100% 邊緣), 22 (0% 邊緣)
    # 43s (0% 邊緣)
    # KJo (100% 邊緣)

    "CO": BASE_EXCLUDED_HANDS | {
        # === 明顯 100% 牌（不用練）===
        "JJ", "TT", "99", "88", "77", "66", "55", "44", "33",  # 33+ 明顯 (22 是邊緣，要考)
        "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s",
        "KQs", "KJs", "KTs", "K9s", "K8s", "K7s", "K6s", "K5s", "K4s",  # K4s+ 明顯 (K3s 是邊緣)
        "QJs", "QTs", "Q9s", "Q8s", "Q7s",  # Q7s+ 明顯 (Q6s 是邊緣)
        "JTs", "J9s", "J8s",  # J8s+ 明顯 (J7s 是邊緣)
        "T9s", "T8s",  # T8s+ 明顯 (T7s 是邊緣)
        "98s",  # 98s 明顯
        "87s", "86s", "76s", "65s", "54s",  # 連張明顯
        "AQo", "AJo", "ATo", "A9o",  # A9o+ 明顯 (A8o 是邊緣)
        "KQo", "KJo",  # KJo+ 明顯
        "QJo",  # QJo 明顯
        # === 遠離邊界的 0% 牌（不用練）===
        "K2s",  # 不考
        "Q5s", "Q4s", "Q3s", "Q2s",
        "J5s", "J4s", "J3s", "J2s",  # J6s 是邊緣，要考
        "T5s", "T4s", "T3s",
        "96s", "95s",
        "85s", "84s",
        "75s", "74s",
        "64s", "63s",
        "53s", "43s",
        "32s", "42s", "52s",
        # === Offsuit 牌 ===
        "A7o", "A6o", "A5o", "A4o", "A3o", "A2o",  # A6o 以下不考
        "K9o", "K8o", "K7o", "K6o", "K5o", "K4o", "K3o", "K2o",  # K9o 不考
        "Q9o", "Q8o", "Q7o", "Q6o", "Q5o", "Q4o", "Q3o", "Q2o",  # Q9o 不考 (QTo 是邊緣)
        "J9o", "J8o", "J7o", "J6o", "J5o", "J4o", "J3o", "J2o",  # J9o 不考 (JTo 是邊緣)
        "T8o", "T7o", "T6o", "T5o", "T4o", "T3o", "T2o",
        "98o", "97o", "96o", "95o", "94o", "93o", "92o",
        "87o", "86o", "85o", "84o", "83o", "82o",
        "76o", "75o", "74o", "73o",
        "65o", "64o", "63o",
        "54o", "53o", "43o", "32o", "42o", "52o",
    },
    # === CO 要考的牌 ===
    # K3s (100% 邊緣), K2s (0% 邊緣)
    # Q6s (100% 邊緣), J7s (100% 邊緣), J6s (100% 邊緣)
    # T7s (100% 邊緣), 97s (100% 邊緣)
    # 22 (100% 邊緣)
    # A8o (100% 邊緣), KTo (100% 邊緣), QTo (100% 邊緣), JTo (100% 邊緣)

    "BTN": BASE_EXCLUDED_HANDS | {
        # === 明顯 100% 牌（不用練）===
        "JJ", "TT", "99", "88", "77", "66", "55", "44", "33",
        "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s",  # (A2s 是邊緣)
        "KQs", "KJs", "KTs", "K9s", "K8s", "K7s", "K6s", "K5s", "K4s", "K3s",  # (K2s 是邊緣)
        "QJs", "QTs", "Q9s", "Q8s", "Q7s", "Q6s", "Q5s", "Q4s",  # (Q3s, Q2s 是邊緣)
        "JTs", "J9s", "J8s", "J7s", "J6s", "J5s",  # (J4s 是邊緣)
        "T9s", "T8s", "T7s", "T6s",  # T6s+ 明顯
        "98s", "97s", "96s",  # 96s+ 明顯
        "87s", "86s",  # 86s+ 明顯
        "76s",  # 76s 明顯 (75s 要考)
        "65s",  # 65s 明顯 (64s 要考)
        "54s",  # 54s 明顯
        "AQo", "AJo", "ATo", "A9o", "A8o", "A7o", "A6o", "A5o",  # (A4o 是邊緣)
        "KQo", "KJo", "KTo", "K9o",  # (K8o 是邊緣)
        "QJo", "QTo",  # QTo+ 明顯
        "JTo", "J9o",  # J9o+ 明顯
        "T9o",  # (T8o 是邊緣)
        # === 遠離邊界的 0% 牌（不用練）===
        "J2s",
        "T4s", "T3s",
        "95s",
        "73s", "52s", "42s", "32s",  # 63s 要考
        # === Offsuit 牌 ===
        "A3o", "A2o",  # 不考 (A4o 是邊緣)
        "K7o", "K6o", "K5o", "K4o", "K3o", "K2o",  # K7o 不考
        "Q8o", "Q7o", "Q6o", "Q5o", "Q4o", "Q3o", "Q2o",  # Q8o 不考
        "J6o", "J5o", "J4o", "J3o", "J2o",  # J6o 不考 (J7o 要考)
        "T6o", "T5o", "T4o", "T3o", "T2o",  # T6o 不考 (T7o 要考)
        "97o", "96o", "95o", "94o", "93o", "92o",  # 97o 不考
        "86o", "85o", "84o", "83o", "82o",  # 86o 不考 (87o 要考)
        "76o", "75o", "74o", "73o",
        "65o", "64o", "63o",
        "54o", "53o", "43o", "32o", "42o", "52o",
    },
    # === BTN 要考的牌 ===
    # A2s (100% 邊緣), K2s (100% 邊緣), Q3s/Q2s (100% 邊緣)
    # J4s/J3s (100% 邊緣), 85s (100% 邊緣), 75s (100% 邊緣)
    # 84s/74s (100% 邊緣), 64s (100% 邊緣), 53s/43s (100% 邊緣)
    # 22 (100% 邊緣)
    # A4o (100% 邊緣), K8o (100% 邊緣), T8o (100% 邊緣), 98o (100% 邊緣)
    # J8o (50% 混合), J7o/T7o/87o (0% 邊緣)

    "SB": BASE_EXCLUDED_HANDS | {
        # === SB 與 BTN 相同（raise range 相同）===
        "JJ", "TT", "99", "88", "77", "66", "55", "44", "33",
        "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s",
        "KQs", "KJs", "KTs", "K9s", "K8s", "K7s", "K6s", "K5s", "K4s", "K3s",
        "QJs", "QTs", "Q9s", "Q8s", "Q7s", "Q6s", "Q5s", "Q4s",
        "JTs", "J9s", "J8s", "J7s", "J6s", "J5s",
        "T9s", "T8s", "T7s", "T6s",
        "98s", "97s", "96s",
        "87s", "86s",
        "76s",  # 75s 要考
        "65s",  # 64s 要考
        "54s",
        "AQo", "AJo", "ATo", "A9o", "A8o", "A7o", "A6o", "A5o",
        "KQo", "KJo", "KTo", "K9o",
        "QJo", "QTo",
        "JTo", "J9o",
        "T9o",
        # === 遠離邊界的 0% 牌（不用練）===
        "J2s",
        "T4s", "T3s",
        "95s",
        "73s", "52s", "42s", "32s",  # 63s 要考
        # === Offsuit 牌 ===
        "A3o", "A2o",
        "K7o", "K6o", "K5o", "K4o", "K3o", "K2o",
        "Q8o", "Q7o", "Q6o", "Q5o", "Q4o", "Q3o", "Q2o",
        "J6o", "J5o", "J4o", "J3o", "J2o",
        "T6o", "T5o", "T4o", "T3o", "T2o",
        "97o", "96o", "95o", "94o", "93o", "92o",
        "86o", "85o", "84o", "83o", "82o",
        "76o", "75o", "74o", "73o",
        "65o", "64o", "63o",
        "54o", "53o", "43o", "32o", "42o", "52o",
    },
    # === SB 要考的牌（同 BTN）===
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


def get_drillable_hands_dynamic(frequency_data: dict, scenario_type: str = "rfi") -> List[str]:
    """
    動態計算出題範圍（方案 C）。

    根據頻率數據自動識別「有趣」的手牌：
    1. 排除 100% 動作牌（太簡單）
    2. 排除 0% 垃圾牌（太遠）
    3. 保留混合頻率牌（1-99%）
    4. 保留接近邊界的牌

    Args:
        frequency_data: 頻率數據，格式為 {"hand": {"action": frequency}, ...}
        scenario_type: 場景類型 ("rfi", "vs_rfi", "vs_3bet", "vs_4bet")

    Returns:
        List of interesting hand strings for drilling
    """
    if not frequency_data:
        return ALL_HANDS

    interesting_hands = []

    # 定義各場景的主要動作
    primary_actions = {
        "rfi": ["raise"],
        "vs_rfi": ["3bet", "call"],
        "vs_3bet": ["4bet", "call"],
        "vs_4bet": ["5bet", "call"],
    }

    actions_to_check = primary_actions.get(scenario_type, ["raise", "3bet", "4bet", "5bet", "call"])

    for hand, actions in frequency_data.items():
        if not isinstance(actions, dict):
            continue

        # 計算該手牌的最高動作頻率
        max_action_freq = 0
        has_mixed = False
        total_action_freq = 0

        for action in actions_to_check:
            freq = actions.get(action, 0)
            if freq > max_action_freq:
                max_action_freq = freq
            total_action_freq += freq

            # 檢查是否為混合頻率 (1-99%)
            if 1 <= freq <= 99:
                has_mixed = True

        # 決定是否為有趣的手牌
        is_interesting = False

        # 規則 1: 混合頻率牌一定有趣
        if has_mixed:
            is_interesting = True

        # 規則 2: 邊界牌（有動作但不是 100%）
        elif 1 <= max_action_freq <= 75:
            is_interesting = True

        # 規則 3: 接近邊界的 100% 牌也可能有趣（如果是中等牌力）
        # 例如：JJ 100% 3bet vs UTG，但在 vs HJ 可能不同
        elif max_action_freq == 100 and total_action_freq == 100:
            # 100% 單一動作，可能是確定性決策
            # 但我們排除頂級牌（AA, KK, AKs 等）
            if hand not in PREMIUM_HANDS:
                # 保留部分 100% 牌以測試基礎知識
                # 但降低權重（不特別標記為 drillable）
                pass

        # 規則 4: 有任何正向動作的牌（總頻率 > 0）
        elif total_action_freq > 0 and total_action_freq < 100:
            is_interesting = True

        if is_interesting:
            interesting_hands.append(hand)

    # 如果沒有找到有趣的牌，返回所有有動作的牌
    if not interesting_hands:
        for hand, actions in frequency_data.items():
            if isinstance(actions, dict):
                for action in actions_to_check:
                    if actions.get(action, 0) > 0:
                        interesting_hands.append(hand)
                        break

    return list(set(interesting_hands))


def get_drillable_hands_for_scenario(
    evaluator: 'Evaluator',
    table_format: str,
    scenario_type: str,
    hero_position: str = None,
    villain_position: str = None
) -> List[str]:
    """
    取得特定場景的出題範圍。

    整合靜態排除列表和動態頻率計算。

    Args:
        evaluator: Evaluator instance
        table_format: "6max"
        scenario_type: "rfi", "vs_rfi", "vs_3bet", "vs_4bet"
        hero_position: Hero position name
        villain_position: Villain position name (for vs scenarios)

    Returns:
        List of drillable hand strings
    """
    # RFI 場景：使用靜態列表（因為大部分是 100% 動作，但仍需記憶）
    if scenario_type == "rfi":
        return get_drillable_hands(position=hero_position)

    # vs 場景：使用動態計算（混合策略多，適合動態識別邊界牌）
    freq_data = None

    if scenario_type == "vs_rfi" and hero_position and villain_position:
        freq_data = evaluator.get_vs_rfi_frequencies(hero_position, villain_position, table_format)
    elif scenario_type == "vs_3bet" and hero_position and villain_position:
        freq_data = evaluator.get_vs_3bet_frequencies(hero_position, villain_position, table_format)
    elif scenario_type == "vs_4bet" and hero_position and villain_position:
        freq_data = evaluator.get_vs_4bet_frequencies(hero_position, villain_position, table_format)

    if freq_data:
        # vs 場景用動態計算
        return get_drillable_hands_dynamic(freq_data, scenario_type)
    else:
        # 回退到靜態列表
        return get_drillable_hands(position=hero_position)


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
        self._positions = POSITIONS_6MAX

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
        """Get the list of drillable hands for a spot (動態計算)."""
        # 使用動態計算取得出題範圍
        action_type_map = {"rfi": "rfi", "vs_rfi": "vs_rfi", "vs_3bet": "vs_3bet", "vs_4bet": "vs_4bet"}
        scenario_type = action_type_map.get(spot.scenario.action_type.value, "rfi")
        hero_pos = spot.scenario.hero_position.value
        villain_pos = spot.scenario.villain_position.value if spot.scenario.villain_position else None

        return get_drillable_hands_for_scenario(
            self.evaluator, self.format, scenario_type,
            hero_position=hero_pos, villain_position=villain_pos
        )

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
