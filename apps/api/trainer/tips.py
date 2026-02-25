"""
Position-specific tips for RFI ranges.
Helps players memorize range boundaries by highlighting edge hands.

v2.0: edge_hands now dynamically computed from rfi_utils
"""

# Import dynamic functions
try:
    from core.rfi_utils import RANKS, get_drillable_hands, get_opening_hands, get_rfi_data

    HAS_RFI_UTILS = True
except ImportError:
    HAS_RFI_UTILS = False


def get_dynamic_edge_hands(position: str) -> list[str]:
    """Get edge hands dynamically from rfi_utils."""
    if not HAS_RFI_UTILS:
        return []
    return get_drillable_hands(position)


def get_range_boundary(position: str, prefix: str, suffix: str = "s") -> str:
    """
    Get the range boundary string dynamically.
    e.g., get_range_boundary('UTG', 'K', 's') -> 'K8s+'
    """
    if not HAS_RFI_UTILS:
        return ""

    opening = get_opening_hands(position)
    hands = [h for h in opening if h.startswith(prefix) and h.endswith(suffix)]

    if not hands:
        return ""

    # Find lowest opening hand
    lowest_idx = max(RANKS.index(h[1]) for h in hands)
    lowest = RANKS[lowest_idx]

    # Check if opens all (e.g., A2s+)
    if lowest == "2":
        return f"{prefix}2{suffix}+"

    return f"{prefix}{lowest}{suffix}+"


def get_hand_start_position(hand: str) -> str:
    """
    Dynamically find from which position a hand starts to open.
    Returns the earliest position that opens this hand.
    """
    if not HAS_RFI_UTILS:
        return ""

    POSITION_ORDER = ["UTG", "HJ", "CO", "BTN", "SB"]

    for pos in POSITION_ORDER:
        opening = get_opening_hands(pos)
        if hand in opening:
            return pos

    return ""  # Not opened from any position


def get_dynamic_range_tip(position: str, lang: str = "zh") -> str:
    """
    Generate a fully dynamic range tip from frequency data.
    """
    if not HAS_RFI_UTILS:
        return ""

    pos_upper = position.upper()
    data = get_rfi_data()
    pos_data = data.get(pos_upper, {})
    frequencies = pos_data.get("frequencies", {})
    stats = pos_data.get("stats", {})

    # Count hands
    raise_100 = sum(1 for h, f in frequencies.items() if f.get("raise", 0) == 100)
    raise_mixed = sum(1 for h, f in frequencies.items() if 1 <= f.get("raise", 0) < 100)
    stats.get("estimated_vpip_contribution", 0)

    # Get boundaries dynamically
    boundaries = []
    for prefix in ["A", "K", "Q", "J"]:
        suited_range = get_range_boundary(pos_upper, prefix, "s")
        if suited_range:
            boundaries.append(f"{prefix}x同花: {suited_range}")

    # Get dynamic edge hands
    edges = get_dynamic_edge_hands(pos_upper)

    if lang == "zh":
        lines = [f"💡 {pos_upper} 開池範圍 (動態)："]
        lines.append(f"• 100% 開池: {raise_100} 手")
        lines.append(f"• 混合頻率: {raise_mixed} 手")
        if boundaries:
            lines.append(f"• 範圍邊界: {', '.join(boundaries[:4])}")
        if edges:
            lines.append(f"• ⚠️ 邊緣牌 ({len(edges)}): {', '.join(edges[:8])}...")
    else:
        lines = [f"💡 {pos_upper} Opening Range (Dynamic):"]
        lines.append(f"• 100% opens: {raise_100} hands")
        lines.append(f"• Mixed frequency: {raise_mixed} hands")
        if boundaries:
            lines.append(f"• Range boundaries: {', '.join(boundaries[:4])}")
        if edges:
            lines.append(f"• ⚠️ Edge hands ({len(edges)}): {', '.join(edges[:8])}...")

    return "\n".join(lines)


# RFI 各位置的範圍邊界提示
# 簡化版 - 大部分 100%/0%，只有少數 50%
RFI_RANGE_TIPS = {
    "UTG": {
        "range_pct": "~10%",
        "pairs": "55+ (100%)",
        "suited_aces": "A2s+ (100%)",
        "suited_kings": "K9s+ (100%)",
        "suited_broadways": "QJs-QTs (100%), JTs (100%), T9s (100%)",
        "suited_connectors": "無",
        "offsuit_aces": "ATo+ (100%)",
        "offsuit_broadways": "KQo (100%)",
        "edge_hands": ["A2s", "T9s", "K9s", "55", "ATo", "KQo"],
        "tip_zh": "UTG 收緊版。55+、A2s+、K9s+、QTs+、JTs、T9s、ATo+、KQo",
        "tip_en": "UTG tightened. 55+, A2s+, K9s+, QTs+, JTs, T9s, ATo+, KQo",
    },
    "HJ": {
        "range_pct": "~15%",
        "pairs": "33+ (100%)",
        "suited_aces": "A2s+",
        "suited_kings": "K7s+ (100%)",
        "suited_broadways": "Q9s+ (100%), J9s+ (100%)",
        "suited_connectors": "T9s (100%), 98s-65s (100%)",
        "offsuit_aces": "ATo+ (100%)",
        "offsuit_broadways": "KJo+ (100%)",
        "edge_hands": ["33", "K7s", "98s", "87s", "76s", "65s"],
        "tip_zh": "HJ 收緊版：33+、K7s+、同花連張 98s-65s（移除 T8s/54s/QJo）",
        "tip_en": "HJ tightened: 33+, K7s+, suited connectors 98s-65s (removed T8s/54s/QJo)",
    },
    "CO": {
        "range_pct": "~22%",
        "pairs": "22+ (100%)",
        "suited_aces": "A2s+",
        "suited_kings": "K3s+ (100%)",
        "suited_queens": "Q6s+ (100%)",
        "suited_broadways": "J7s+ (100%), T7s+ (100%)",
        "suited_connectors": "97s+ (100%), 87s (100%), 86s (100%), 76s (100%), 65s (100%), 54s (100%)",
        "offsuit_aces": "A8o+ (100%)",
        "offsuit_broadways": "KTo+ (100%), QTo+ (100%), JTo (100%)",
        "edge_hands": ["22", "K3s", "J7s", "T7s", "97s", "86s", "A8o"],
        "tip_zh": "CO：22+ 全開、K3s+ 全開、Q6s+ 全開、A8o+ 全開",
        "tip_en": "CO: 22+ always, K3s+ always, Q6s+ always, A8o+ always",
    },
    "BTN": {
        "range_pct": "~32%",
        "pairs": "22+ (100%)",
        "suited_aces": "A2s+",
        "suited_kings": "K2s+ (100%)",
        "suited_queens": "Q2s+ (100%)",
        "suited_jacks": "J4s+ (100%)",
        "suited_broadways": "T6s+ (100%)",
        "suited_connectors": "96s+ (100%), 85s+ (100%), 75s+ (100%), 64s+ (100%), 54s (100%)",
        "offsuit_aces": "A4o+ (100%)",
        "offsuit_broadways": "K8o+ (100%), Q9o+ (100%), J8o+ (100%), T8o+ (100%), 98o (100%)",
        "edge_hands": ["K2s", "Q2s", "J4s", "85s", "75s", "64s", "22", "K8o", "T8o", "98o"],
        "tip_zh": "BTN：22+ 全開、K2s+ 全開、Q2s+ 全開、J4s+ 全開",
        "tip_en": "BTN: 22+ always, K2s+ always, Q2s+ always, J4s+ always",
    },
    "SB": {
        "range_pct": "~32%",
        "pairs": "22+ (100%)",
        "suited_aces": "A2s+",
        "suited_kings": "K2s+",
        "suited_queens": "Q2s+",
        "suited_jacks": "J4s+ (100%)",
        "suited_connectors": "T6s+ (100%), 96s+ (100%), 85s+ (100%), 75s+ (100%), 64s+ (100%), 54s (100%)",
        "offsuit_aces": "A4o+ (100%)",
        "offsuit_broadways": "K8o+ (100%), Q9o+ (100%), J8o+ (100%), T8o+ (100%), 98o (100%)",
        "edge_hands": ["同 BTN"],
        "tip_zh": "SB vs BB：加注範圍同 BTN。Raise or fold，不 limp",
        "tip_en": "SB vs BB: Raise range same as BTN. Raise or fold, never limp",
    },
}


def get_rfi_tip(position: str, lang: str = "zh") -> dict | None:
    """
    Get RFI range tip for a position.

    Returns:
        Dictionary with range info, or None if position not found
    """
    pos_upper = position.upper()
    if pos_upper not in RFI_RANGE_TIPS:
        return None
    return RFI_RANGE_TIPS[pos_upper]


def format_rfi_tip(position: str, lang: str = "zh") -> str:
    """
    Format RFI tip as a readable string for display.

    Args:
        position: Position name (UTG, HJ, CO, BTN, SB)
        lang: Language code (zh or en)

    Returns:
        Formatted tip string
    """
    tip_data = get_rfi_tip(position, lang)
    if not tip_data:
        return ""

    pos_upper = position.upper()

    if lang == "zh":
        lines = [f"💡 {pos_upper} 開池範圍 ({tip_data['range_pct']})："]

        # 對子
        if "pairs" in tip_data:
            lines.append(f"• 對子：{tip_data['pairs']}")

        # 同花 A
        if "suited_aces" in tip_data:
            lines.append(f"• 同花A：{tip_data['suited_aces']}")

        # 同花 K (if exists)
        if "suited_kings" in tip_data:
            lines.append(f"• 同花K：{tip_data['suited_kings']}")

        # 同花 Q (if exists)
        if "suited_queens" in tip_data:
            lines.append(f"• 同花Q：{tip_data['suited_queens']}")

        # 同花百搭
        if "suited_broadways" in tip_data:
            lines.append(f"• 同花百搭：{tip_data['suited_broadways']}")

        # 同花連張
        if "suited_connectors" in tip_data:
            lines.append(f"• 同花連張：{tip_data['suited_connectors']}")

        # 不同花 A
        if "offsuit_aces" in tip_data:
            lines.append(f"• 不同花A：{tip_data['offsuit_aces']}")

        # 不同花百搭
        if "offsuit_broadways" in tip_data:
            lines.append(f"• 不同花百搭：{tip_data['offsuit_broadways']}")

        # 邊緣牌 - 使用動態算法
        dynamic_edges = get_dynamic_edge_hands(pos_upper)
        if dynamic_edges:
            # 只顯示前 10 個，避免太長
            display_edges = dynamic_edges[:10]
            if len(dynamic_edges) > 10:
                edge_str = ", ".join(display_edges) + f" ... (+{len(dynamic_edges) - 10})"
            else:
                edge_str = ", ".join(display_edges)
            lines.append(f"• ⚠️ 邊緣牌：{edge_str}")

        # 記憶提示
        lines.append(f"📝 {tip_data.get('tip_zh', '')}")

    else:  # English
        lines = [f"💡 {pos_upper} Opening Range ({tip_data['range_pct']}):"]

        if "pairs" in tip_data:
            lines.append(f"• Pairs: {tip_data['pairs']}")
        if "suited_aces" in tip_data:
            lines.append(f"• Suited Aces: {tip_data['suited_aces']}")
        if "suited_kings" in tip_data:
            lines.append(f"• Suited Kings: {tip_data['suited_kings']}")
        if "suited_broadways" in tip_data:
            lines.append(f"• Suited Broadways: {tip_data['suited_broadways']}")
        if "suited_connectors" in tip_data:
            lines.append(f"• Suited Connectors: {tip_data['suited_connectors']}")
        if "offsuit_aces" in tip_data:
            lines.append(f"• Offsuit Aces: {tip_data['offsuit_aces']}")
        if "offsuit_broadways" in tip_data:
            lines.append(f"• Offsuit Broadways: {tip_data['offsuit_broadways']}")

        # Edge hands - use dynamic algorithm
        dynamic_edges = get_dynamic_edge_hands(pos_upper)
        if dynamic_edges:
            display_edges = dynamic_edges[:10]
            if len(dynamic_edges) > 10:
                edge_str = ", ".join(display_edges) + f" ... (+{len(dynamic_edges) - 10})"
            else:
                edge_str = ", ".join(display_edges)
            lines.append(f"• ⚠️ Edge hands: {edge_str}")

        lines.append(f"📝 {tip_data.get('tip_en', '')}")

    return "\n".join(lines)


def get_hand_category_tip(hand: str, position: str, correct_action: str, lang: str = "zh") -> str:
    """
    Get a specific tip based on the hand type and what went wrong.

    Args:
        hand: The hand that was played (e.g., "A9o", "76s")
        position: Position name
        correct_action: What the correct action was
        lang: Language code

    Returns:
        Specific tip string for this hand type
    """
    # Determine hand type
    is_suited = hand.endswith("s")
    is_pair = len(hand) == 2 or (len(hand) == 3 and hand[0] == hand[1])

    # Extract ranks
    if is_pair:
        hand[0]
    else:
        hand[0]
        hand[1]

    tips = {
        "zh": {
            "fold_should_raise_pair": "小對子在大多數位置都可以開池，因為有 set value",
            "fold_should_raise_suited_connector": "同花連張有很好的可玩性，即使沒中也容易放棄",
            "fold_should_raise_suited_ace": "同花 Ax 有 blocker 價值和堅果同花潛力",
            "fold_should_raise_offsuit": "這手牌在此位置是開池範圍的一部分",
            "raise_should_fold_weak": "這手牌太弱，不在此位置的開池範圍內",
            "raise_should_fold_offsuit": "不同花牌在前位要更謹慎，可玩性較差",
        },
        "en": {
            "fold_should_raise_pair": "Small pairs can open from most positions for set value",
            "fold_should_raise_suited_connector": "Suited connectors have great playability and easy to fold when missing",
            "fold_should_raise_suited_ace": "Suited Ax has blocker value and nut flush potential",
            "fold_should_raise_offsuit": "This hand is part of the opening range for this position",
            "raise_should_fold_weak": "This hand is too weak for this position's opening range",
            "raise_should_fold_offsuit": "Offsuit hands need to be played more carefully in early position",
        },
    }

    t = tips.get(lang, tips["zh"])

    if correct_action.lower() == "raise":
        # Player folded but should have raised
        if is_pair:
            return t["fold_should_raise_pair"]
        elif is_suited and not is_pair:
            if hand[0] == "A":
                return t["fold_should_raise_suited_ace"]
            # Check if connector (ranks are adjacent)
            ranks = "AKQJT98765432"
            if hand[0] in ranks and hand[1] in ranks:
                idx1 = ranks.index(hand[0])
                idx2 = ranks.index(hand[1])
                if abs(idx1 - idx2) <= 2:  # connector or one-gapper
                    return t["fold_should_raise_suited_connector"]
        return t["fold_should_raise_offsuit"]
    else:
        # Player raised but should have folded
        if not is_suited and not is_pair:
            return t["raise_should_fold_offsuit"]
        return t["raise_should_fold_weak"]


def get_hand_category(hand: str) -> str:
    """
    識別手牌的類型。

    Returns:
        類型名稱: pairs, suited_aces, suited_kings, suited_queens, suited_jacks,
                  suited_broadways, suited_connectors, offsuit_aces, offsuit_broadways
    """
    is_suited = hand.endswith("s")
    hand.endswith("o")

    # 對子
    if len(hand) == 2 or (len(hand) == 3 and hand[0] == hand[1]):
        return "pairs"

    high_rank = hand[0]
    low_rank = hand[1]
    ranks = "AKQJT98765432"

    if is_suited:
        # 同花 A
        if high_rank == "A":
            return "suited_aces"
        # 同花 K
        elif high_rank == "K":
            return "suited_kings"
        # 同花 Q
        elif high_rank == "Q":
            return "suited_queens"
        # 同花 J
        elif high_rank == "J":
            return "suited_jacks"
        # 同花連張 (相鄰或間隔1-2)
        elif high_rank in ranks and low_rank in ranks:
            idx1 = ranks.index(high_rank)
            idx2 = ranks.index(low_rank)
            if abs(idx1 - idx2) <= 2:
                return "suited_connectors"
        return "suited_broadways"
    else:
        # 不同花 A
        if high_rank == "A":
            return "offsuit_aces"
        # 不同花百搭
        return "offsuit_broadways"


def format_relevant_range_tip(hand: str, position: str, lang: str = "zh") -> str:
    """
    根據手牌類型，只返回相關的範圍提示。

    例如 KJs 在 BTN 只顯示「同花K：K2s+」
    """
    tip_data = get_rfi_tip(position, lang)
    if not tip_data:
        return ""

    category = get_hand_category(hand)
    pos_upper = position.upper()

    # 類型到 tip_data key 的映射
    category_map = {
        "pairs": ("pairs", "對子", "Pairs"),
        "suited_aces": ("suited_aces", "同花A", "Suited Aces"),
        "suited_kings": ("suited_kings", "同花K", "Suited Kings"),
        "suited_queens": ("suited_queens", "同花Q", "Suited Queens"),
        "suited_jacks": ("suited_jacks", "同花J", "Suited Jacks"),
        "suited_broadways": ("suited_broadways", "同花百搭", "Suited Broadways"),
        "suited_connectors": ("suited_connectors", "同花連張", "Suited Connectors"),
        "offsuit_aces": ("offsuit_aces", "不同花A", "Offsuit Aces"),
        "offsuit_broadways": ("offsuit_broadways", "不同花百搭", "Offsuit Broadways"),
    }

    if category not in category_map:
        return ""

    key, label_zh, label_en = category_map[category]

    # 檢查這個類型在該位置是否有定義
    if key not in tip_data:
        # 此位置沒有這類手牌的範圍定義，表示通常不開這類牌
        label = label_zh if lang == "zh" else label_en
        if lang == "zh":
            return f"💡 {pos_upper} 通常不開 {label} 類型的牌"
        else:
            return f"💡 {pos_upper} typically doesn't open {label}"

    range_str = tip_data[key]
    label = label_zh if lang == "zh" else label_en

    if lang == "zh":
        return f"💡 {pos_upper} {label}：{range_str}"
    else:
        return f"💡 {pos_upper} {label}: {range_str}"


# 記憶訣竅 - 快速記住各類手牌從哪個位置開始玩
# Memory mnemonics - quick patterns to remember when to play each hand type
# 簡化版 - 大部分 100%/0%，只有少數 50%
RANGE_MNEMONICS = {
    "suited_connectors": {
        "title_zh": "同花連張 (Suited Connectors) - 簡化版",
        "title_en": "Suited Connectors - Simplified",
        "patterns": [
            {
                "hands": "T9s",
                "start_pos": "UTG (100%)",
                "note_zh": "T9s 從 UTG 開始全開",
                "note_en": "T9s always open from UTG",
            },
            {
                "hands": "98s-65s",
                "start_pos": "UTG (50%)",
                "note_zh": "98s/87s/76s/65s 從 UTG 開始 (50%)，HJ+ 全開",
                "note_en": "98s/87s/76s/65s starts at UTG (50%), always from HJ+",
            },
            {
                "hands": "54s",
                "start_pos": "HJ (100%)",
                "note_zh": "54s 從 HJ 開始全開",
                "note_en": "54s always open from HJ",
            },
        ],
        "mnemonic_zh": "口訣：T9 UTG 全開、98-65 UTG(50%)/HJ+ 全開、54 HJ+",
        "mnemonic_en": "Pattern: T9 UTG always, 98-65 UTG(50%)/HJ+ always, 54 HJ+",
    },
    "suited_gappers": {
        "title_zh": "同花隔張 (Suited Gappers) - 簡化版",
        "title_en": "Suited Gappers - Simplified",
        "patterns": [
            {
                "hands": "T8s",
                "start_pos": "HJ (100%)",
                "note_zh": "T8s 從 HJ 開始全開",
                "note_en": "T8s always open from HJ",
            },
            {
                "hands": "97s",
                "start_pos": "CO (100%)",
                "note_zh": "97s 從 CO 開始全開",
                "note_en": "97s always open from CO",
            },
            {
                "hands": "86s",
                "start_pos": "CO (100%)",
                "note_zh": "86s 從 CO 開始全開",
                "note_en": "86s always open from CO",
            },
            {
                "hands": "85s, 75s",
                "start_pos": "BTN (100%)",
                "note_zh": "85s/75s 從 BTN 開始全開",
                "note_en": "85s/75s always open from BTN",
            },
            {
                "hands": "64s",
                "start_pos": "BTN (100%)",
                "note_zh": "64s 從 BTN 開始全開",
                "note_en": "64s always open from BTN",
            },
        ],
        "mnemonic_zh": "口訣：T8 HJ、97/86 CO、85/75/64 BTN",
        "mnemonic_en": "Pattern: T8 HJ, 97/86 CO, 85/75/64 BTN",
    },
    "small_pairs": {
        "title_zh": "小對子 (Small Pairs) - 簡化版",
        "title_en": "Small Pairs - Simplified",
        "patterns": [
            {
                "hands": "66+",
                "start_pos": "UTG (100%)",
                "note_zh": "66+ 全場都開",
                "note_en": "66+ always open everywhere",
            },
            {
                "hands": "55",
                "start_pos": "UTG (100%)",
                "note_zh": "55 從 UTG 開始全開",
                "note_en": "55 always open from UTG",
            },
            {
                "hands": "44, 33",
                "start_pos": "HJ (100%)",
                "note_zh": "44/33 從 HJ 開始全開",
                "note_en": "44/33 always open from HJ",
            },
            {
                "hands": "22",
                "start_pos": "CO (100%)",
                "note_zh": "22 從 CO 開始全開",
                "note_en": "22 always open from CO",
            },
        ],
        "mnemonic_zh": "口訣：55+ UTG、44/33 HJ、22 CO",
        "mnemonic_en": "Pattern: 55+ UTG, 44/33 HJ, 22 CO",
    },
    "suited_aces": {
        "title_zh": "同花 Ax (Suited Aces) - 簡化版",
        "title_en": "Suited Aces - Simplified",
        "patterns": [
            {
                "hands": "A2s+",
                "start_pos": "UTG (100%)",
                "note_zh": "A2s+ 從 UTG 開始全開",
                "note_en": "A2s+ always open from UTG",
            },
        ],
        "mnemonic_zh": "口訣：A2s+ UTG 全開（最簡單）",
        "mnemonic_en": "Pattern: A2s+ UTG always (simplest)",
    },
    "suited_kings": {
        "title_zh": "同花 Kx (Suited Kings) - 簡化版",
        "title_en": "Suited Kings - Simplified",
        "patterns": [
            {
                "hands": "K9s+",
                "start_pos": "UTG (100%)",
                "note_zh": "K9s+ 從 UTG 開始全開",
                "note_en": "K9s+ always open from UTG",
            },
            {
                "hands": "K7s-K8s",
                "start_pos": "HJ (100%)",
                "note_zh": "K7s-K8s 從 HJ 開始全開",
                "note_en": "K7s-K8s always open from HJ",
            },
            {
                "hands": "K4s-K6s",
                "start_pos": "CO (100%)",
                "note_zh": "K4s-K6s 從 CO 開始全開",
                "note_en": "K4s-K6s always open from CO",
            },
            {
                "hands": "K3s",
                "start_pos": "CO (100%)",
                "note_zh": "K3s 從 CO 開始全開",
                "note_en": "K3s always open from CO",
            },
            {
                "hands": "K2s",
                "start_pos": "BTN (100%)",
                "note_zh": "K2s 從 BTN 開始全開",
                "note_en": "K2s always open from BTN",
            },
        ],
        "mnemonic_zh": "口訣：K9 UTG、K7 HJ、K3-K6 CO、K2 BTN",
        "mnemonic_en": "Pattern: K9 UTG, K7 HJ, K3-K6 CO, K2 BTN",
    },
    "suited_queens": {
        "title_zh": "同花 Qx (Suited Queens) - 簡化版",
        "title_en": "Suited Queens - Simplified",
        "patterns": [
            {
                "hands": "QTs+",
                "start_pos": "UTG (100%)",
                "note_zh": "QTs+ 從 UTG 開始全開",
                "note_en": "QTs+ always open from UTG",
            },
            {
                "hands": "Q9s",
                "start_pos": "HJ (100%)",
                "note_zh": "Q9s 從 HJ 開始全開",
                "note_en": "Q9s always open from HJ",
            },
            {
                "hands": "Q6s-Q8s",
                "start_pos": "CO (100%)",
                "note_zh": "Q6s-Q8s 從 CO 開始全開",
                "note_en": "Q6s-Q8s always open from CO",
            },
            {
                "hands": "Q4s-Q5s",
                "start_pos": "BTN (100%)",
                "note_zh": "Q4s/Q5s 從 BTN 開始全開",
                "note_en": "Q4s/Q5s always open from BTN",
            },
            {
                "hands": "Q2s-Q3s",
                "start_pos": "BTN (100%)",
                "note_zh": "Q2s/Q3s 從 BTN 開始全開",
                "note_en": "Q2s/Q3s always open from BTN",
            },
        ],
        "mnemonic_zh": "口訣：QTs UTG、Q9 HJ、Q6-Q8 CO、Q2-Q5 BTN",
        "mnemonic_en": "Pattern: QTs UTG, Q9 HJ, Q6-Q8 CO, Q2-Q5 BTN",
    },
    "offsuit_aces": {
        "title_zh": "不同花 Ax (Offsuit Aces) - 簡化版",
        "title_en": "Offsuit Aces - Simplified",
        "patterns": [
            {
                "hands": "ATo+",
                "start_pos": "UTG (100%)",
                "note_zh": "ATo+ 從 UTG 開始全開",
                "note_en": "ATo+ always open from UTG",
            },
            {
                "hands": "A8o-A9o",
                "start_pos": "CO (100%)",
                "note_zh": "A8o/A9o 從 CO 開始全開",
                "note_en": "A8o/A9o always open from CO",
            },
            {
                "hands": "A4o-A7o",
                "start_pos": "BTN (100%)",
                "note_zh": "A4o-A7o 從 BTN 開始全開",
                "note_en": "A4o-A7o always open from BTN",
            },
        ],
        "mnemonic_zh": "口訣：ATo UTG、A8o CO、A4o BTN",
        "mnemonic_en": "Pattern: ATo UTG, A8o CO, A4o BTN",
    },
    "offsuit_broadways": {
        "title_zh": "不同花大牌 (Offsuit Broadways) - 簡化版",
        "title_en": "Offsuit Broadways - Simplified",
        "patterns": [
            {
                "hands": "KQo",
                "start_pos": "UTG (100%)",
                "note_zh": "KQo 從 UTG 開始全開",
                "note_en": "KQo always open from UTG",
            },
            {
                "hands": "KJo",
                "start_pos": "HJ (100%)",
                "note_zh": "KJo 從 HJ 開始全開",
                "note_en": "KJo always open from HJ",
            },
            {
                "hands": "KTo, QTo, JTo",
                "start_pos": "CO (100%)",
                "note_zh": "KTo/QTo/JTo 從 CO 開始全開",
                "note_en": "KTo/QTo/JTo always open from CO",
            },
            {
                "hands": "K8o-K9o",
                "start_pos": "BTN (100%)",
                "note_zh": "K8o/K9o 從 BTN 開始全開",
                "note_en": "K8o/K9o always open from BTN",
            },
            {
                "hands": "Q9o, J9o, T8o, T9o, 98o, J8o",
                "start_pos": "BTN (100%)",
                "note_zh": "Q9o/J9o/T8o/T9o/98o/J8o 從 BTN 開始全開",
                "note_en": "Q9o/J9o/T8o/T9o/98o/J8o always open from BTN",
            },
        ],
        "mnemonic_zh": "口訣：KQo UTG、KJo HJ、KTo/QTo/JTo CO、K8o-J8o BTN",
        "mnemonic_en": "Pattern: KQo UTG, KJo HJ, KTo/QTo/JTo CO, K8o-J8o BTN",
    },
}


def get_range_mnemonics(lang: str = "zh") -> dict:
    """Get all range memory mnemonics."""
    return RANGE_MNEMONICS


def format_mnemonic_for_hand_type(hand_type: str, lang: str = "zh") -> str:
    """Format mnemonic for a specific hand type."""
    if hand_type not in RANGE_MNEMONICS:
        return ""

    data = RANGE_MNEMONICS[hand_type]
    title = data.get(f"title_{lang}", data.get("title_zh", ""))
    mnemonic = data.get(f"mnemonic_{lang}", data.get("mnemonic_zh", ""))

    lines = [f"📝 {title}", mnemonic, ""]
    for p in data.get("patterns", []):
        note = p.get(f"note_{lang}", p.get("note_zh", ""))
        lines.append(f"• {p['hands']}: {p['start_pos']} — {note}")

    return "\n".join(lines)


# VS RFI tips (facing an open raise)
VS_RFI_TIPS = {
    "vs_UTG": {
        "tip_zh": "面對 UTG 開池要非常緊，只用強牌 3-bet 或 call",
        "tip_en": "Very tight vs UTG open, only 3-bet or call with strong hands",
        "3bet_hands": "QQ+, AKs, AKo (value); A5s-A4s, 76s-65s (bluff)",
        "call_hands": "JJ-99, AQs, AJs, KQs (position dependent)",
    },
    "vs_HJ": {
        "tip_zh": "面對 HJ 開池稍微放寬，但仍然要有選擇性",
        "tip_en": "Slightly wider vs HJ, but still selective",
        "3bet_hands": "JJ+, AKs, AQs, AKo (value); A5s-A2s, suited connectors (bluff)",
        "call_hands": "TT-88, AJs, KQs, QJs",
    },
    "vs_CO": {
        "tip_zh": "面對 CO 開池可以更積極 3-bet，尤其在 BTN",
        "tip_en": "More aggressive 3-betting vs CO, especially from BTN",
    },
    "vs_BTN": {
        "tip_zh": "從盲位面對 BTN 開池，要積極防守但也不能太寬",
        "tip_en": "Defend actively from blinds vs BTN, but don't over-defend",
    },
}


def format_vs_rfi_tip(hero_pos: str, villain_pos: str, lang: str = "zh") -> str:
    """Format a tip for facing an open raise."""
    key = f"vs_{villain_pos.upper()}"
    tip_data = VS_RFI_TIPS.get(key, {})

    if not tip_data:
        return ""

    tip_key = "tip_zh" if lang == "zh" else "tip_en"
    tip = tip_data.get(tip_key, "")

    lines = [f"💡 {hero_pos} vs {villain_pos} open:"]
    lines.append(tip)

    if "3bet_hands" in tip_data:
        label = "3-bet 範圍" if lang == "zh" else "3-bet range"
        lines.append(f"• {label}: {tip_data['3bet_hands']}")

    if "call_hands" in tip_data:
        label = "Call 範圍" if lang == "zh" else "Call range"
        lines.append(f"• {label}: {tip_data['call_hands']}")

    return "\n".join(lines)
