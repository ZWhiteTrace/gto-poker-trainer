"""
Position-specific tips for RFI ranges.
Helps players memorize range boundaries by highlighting edge hands.
"""
from typing import Dict, Optional

# RFI 各位置的範圍邊界提示
# 重點標註「最弱可開牌」和「混合頻率牌」
RFI_RANGE_TIPS = {
    "UTG": {
        "range_pct": "~15%",
        "pairs": "JJ-22",
        "suited_aces": "ATs+, A5s-A2s",
        "suited_broadways": "KQs-KTs, QJs-QTs, JTs",
        "suited_connectors": "T9s, 98s, 87s, 76s, 65s, 54s",
        "offsuit_aces": "ATo",
        "offsuit_broadways": "KJo, KTo, QJo, QTo, JTo",
        "edge_hands": ["A9o (25%)", "K9s", "Q9s", "J9s", "Q8s", "K5s"],
        "tip_zh": "UTG 最緊，只開強牌。記住：小對子全開、同花連張54s起、blocker A5s-A2s",
        "tip_en": "UTG is tightest. Remember: all pairs, suited connectors 54s+, blocker A5s-A2s",
    },
    "HJ": {
        "range_pct": "~18%",
        "pairs": "JJ-22",
        "suited_aces": "ATs+, A5s-A2s",
        "suited_broadways": "KQs-K9s, QJs-Q9s, JTs-J9s",
        "suited_connectors": "T9s, 98s, 87s, 76s, 65s, 54s",
        "offsuit_aces": "ATo, A9o",
        "offsuit_broadways": "KJo, KTo, QJo, QTo, JTo",
        "edge_hands": ["A8o (50%)", "K8s", "Q8s", "J8s", "T8s", "97s"],
        "tip_zh": "HJ 比 UTG 稍寬，加入 A9o、更多同花 gapper",
        "tip_en": "HJ slightly wider than UTG, adds A9o and more suited gappers",
    },
    "CO": {
        "range_pct": "~27%",
        "pairs": "JJ-22",
        "suited_aces": "A2s+",
        "suited_kings": "K2s+",
        "suited_broadways": "QJs-Q8s, JTs-J8s, T9s-T8s",
        "suited_connectors": "98s, 87s, 76s, 65s, 54s, 43s",
        "offsuit_aces": "ATo, A9o, A8o, A7o, A6o, A5o",
        "offsuit_broadways": "KJo, KTo, QJo, QTo, JTo, J9o",
        "edge_hands": ["A4o (50%)", "K9o", "Q9o", "97s", "86s", "75s", "64s", "53s"],
        "tip_zh": "CO 大幅放寬，同花K全開、同花A全開、小同花連張加入",
        "tip_en": "CO significantly wider: all suited K, all suited A, small suited connectors",
    },
    "BTN": {
        "range_pct": "~43%",
        "pairs": "22+",
        "suited_aces": "A2s+",
        "suited_kings": "K2s+",
        "suited_queens": "Q2s+",
        "suited_broadways": "JTs-J6s, T9s-T6s",
        "suited_connectors": "98s-32s",
        "offsuit_aces": "A2o+",
        "offsuit_broadways": "KTo+, QTo+, JTo, J9o, T9o",
        "edge_hands": ["K8o", "Q8o", "J8o", "T8o", "98o", "96s", "85s", "74s", "63s", "52s"],
        "tip_zh": "BTN 最寬！同花幾乎全開，不同花 Ax 全開，重點記不開的牌",
        "tip_en": "BTN widest! Almost all suited hands, all Axo. Focus on what NOT to open",
    },
    "SB": {
        "range_pct": "~40%",
        "pairs": "22+",
        "suited_aces": "A2s+",
        "suited_kings": "K2s+",
        "suited_queens": "Q4s+",
        "suited_jacks": "J6s+",
        "suited_connectors": "T8s+, 97s+, 86s+, 75s+, 64s+, 53s+, 43s",
        "offsuit_aces": "A2o+",
        "offsuit_broadways": "KTo+, QTo+, JTo, J9o, T9o",
        "edge_hands": ["Q3s", "J5s", "T7s", "96s", "85s", "74s", "K9o", "Q9o"],
        "tip_zh": "SB 對抗 BB，範圍寬但要考慮位置劣勢。記住：raise or fold，不 limp",
        "tip_en": "SB vs BB, wide but positional disadvantage. Remember: raise or fold, no limp",
    },
}


def get_rfi_tip(position: str, lang: str = "zh") -> Optional[Dict]:
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

        # 邊緣牌
        if "edge_hands" in tip_data and tip_data["edge_hands"]:
            edge_str = ", ".join(tip_data["edge_hands"])
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
        if "edge_hands" in tip_data and tip_data["edge_hands"]:
            edge_str = ", ".join(tip_data["edge_hands"])
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
    is_suited = hand.endswith('s')
    is_pair = len(hand) == 2 or (len(hand) == 3 and hand[0] == hand[1])

    # Extract ranks
    if is_pair:
        rank = hand[0]
    else:
        high_rank = hand[0]
        low_rank = hand[1]

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
        }
    }

    t = tips.get(lang, tips["zh"])

    if correct_action.lower() == "raise":
        # Player folded but should have raised
        if is_pair:
            return t["fold_should_raise_pair"]
        elif is_suited and not is_pair:
            if hand[0] == 'A':
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
    is_suited = hand.endswith('s')
    is_offsuit = hand.endswith('o')

    # 對子
    if len(hand) == 2 or (len(hand) == 3 and hand[0] == hand[1]):
        return "pairs"

    high_rank = hand[0]
    low_rank = hand[1]
    ranks = "AKQJT98765432"

    if is_suited:
        # 同花 A
        if high_rank == 'A':
            return "suited_aces"
        # 同花 K
        elif high_rank == 'K':
            return "suited_kings"
        # 同花 Q
        elif high_rank == 'Q':
            return "suited_queens"
        # 同花 J
        elif high_rank == 'J':
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
        if high_rank == 'A':
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
