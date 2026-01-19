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
        "pairs": "66+ (100%), 55 (50%)",
        "suited_aces": "A3s+ (100%), A2s (25%)",
        "suited_kings": "K6s+ (100%), K5s (25%)",
        "suited_broadways": "Q9s+ (100%), Q8s (75%), JTs (100%), J9s (75%)",
        "suited_connectors": "T9s (50%), 98s-76s (25%)",
        "offsuit_aces": "ATo+ (100%), A9o (25%)",
        "offsuit_broadways": "KJo+ (100%), QJo (100%), KTo/QTo (25%)",
        "edge_hands": ["55 (50%)", "A2s (25%)", "K5s (25%)", "Q8s (75%)", "J9s (75%)", "T9s (50%)"],
        "tip_zh": "UTG 最緊（高抽水）。66+ 全開、A3s+ 全開、K6s+ 全開、小對子44以下不開",
        "tip_en": "UTG tightest (high rake). 66+ always, A3s+ always, K6s+ always, no pairs below 44",
    },
    "HJ": {
        "range_pct": "~18%",
        "pairs": "55+ (100%), 44 (25%)",
        "suited_aces": "A2s+",
        "suited_kings": "K5s+ (100%), K4s (25%)",
        "suited_broadways": "Q8s+ (100%), J9s (100%), J8s (50%)",
        "suited_connectors": "T9s (100%), T8s (50%), 98s (50%), 87s-54s (25%)",
        "offsuit_aces": "ATo+ (100%), A9o (25%)",
        "offsuit_broadways": "KTo+ (100%), QJo (100%), QTo (50%), JTo (50%)",
        "edge_hands": ["44 (25%)", "K4s (25%)", "J8s (50%)", "T8s (50%)", "98s (50%)", "A9o (25%)"],
        "tip_zh": "HJ（高抽水）：55+ 全開、K5s+ 全開、A9o 降到 25%、Q7s/Q6s/Q5s 不開",
        "tip_en": "HJ (high rake): 55+ always, K5s+ always, A9o at 25%, no Q7s/Q6s/Q5s",
    },
    "CO": {
        "range_pct": "~24%",
        "pairs": "44+ (100%), 33 (25%)",
        "suited_aces": "A2s+",
        "suited_kings": "K4s+ (100%)",
        "suited_queens": "Q6s+ (100%), Q5s (25%)",
        "suited_broadways": "J8s+ (100%), J7s (25%), T8s+ (100%), T7s (25%)",
        "suited_connectors": "98s (100%), 97s (50%), 87s-54s (25%)",
        "offsuit_aces": "A9o+ (100%), A8o (50%), A7o (25%), A5o (100%)",
        "offsuit_broadways": "KTo+ (100%), K9o (25%), QTo+ (100%), JTo (100%), J9o (25%)",
        "edge_hands": ["33 (25%)", "Q5s (25%)", "J7s (25%)", "97s (50%)", "A8o (50%)", "A7o (25%)"],
        "tip_zh": "CO（高抽水）：44+ 全開、K4s+ 全開、K3s/K2s 不開、Q5s 降到 25%、Q4s 不開",
        "tip_en": "CO (high rake): 44+ always, K4s+ always, no K3s/K2s, Q5s at 25%, no Q4s",
    },
    "BTN": {
        "range_pct": "~38%",
        "pairs": "33+ (100%), 22 (25%)",
        "suited_aces": "A2s+",
        "suited_kings": "K3s+ (100%)",
        "suited_queens": "Q4s+ (100%)",
        "suited_jacks": "J6s+ (100%)",
        "suited_broadways": "T6s+ (100%)",
        "suited_connectors": "96s+ (100%), 86s+ (100%), 76s (100%), 75s (25%), 65s (100%), 54s (25%)",
        "offsuit_aces": "A4o+ (100%), A3o (25%)",
        "offsuit_broadways": "K9o+ (100%), K8o (50%), Q9o+ (100%), J9o+ (100%), T9o (100%), T8o (25%), 98o (50%)",
        "edge_hands": ["22 (25%)", "75s (25%)", "54s (25%)", "K8o (50%)", "T8o (25%)", "A3o (25%)"],
        "tip_zh": "BTN（高抽水）：33+ 全開、K3s+ 全開、Q4s+ 全開、J6s+ 全開",
        "tip_en": "BTN (high rake): 33+ always, K3s+ always, Q4s+ always, J6s+ always",
    },
    "SB": {
        "range_pct": "~44%",
        "pairs": "22+ (100%)",
        "suited_aces": "A2s+",
        "suited_kings": "K2s+",
        "suited_queens": "Q2s+",
        "suited_jacks": "J4s+ (100%)",
        "suited_connectors": "T6s+ (100%), 96s+ (100%), 85s+ (100%), 75s+ (100%), 64s+ (100%), 54s (100%), 53s (50%)",
        "offsuit_aces": "A4o+ (100%), A3o (50%)",
        "offsuit_broadways": "K9o+ (100%), K8o (75%), Q9o+ (100%), J9o+ (100%), T9o (100%), T8o (75%), 98o (75%)",
        "edge_hands": ["53s (50%)", "A3o (50%)", "K8o (75%)", "T8o (75%)", "98o (75%)"],
        "tip_zh": "SB vs BB（高抽水）：22+ 全開、同花幾乎全開。raise or fold，極少 limp (只有 K7o/A2o)",
        "tip_en": "SB vs BB (high rake): 22+ always, almost all suited. Raise or fold, minimal limp (K7o/A2o only)",
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


# 記憶訣竅 - 快速記住各類手牌從哪個位置開始玩
# Memory mnemonics - quick patterns to remember when to play each hand type
RANGE_MNEMONICS = {
    "suited_connectors": {
        "title_zh": "同花連張 (Suited Connectors) - 高抽水版",
        "title_en": "Suited Connectors - High Rake",
        "patterns": [
            {"hands": "T9s", "start_pos": "UTG (50%)", "note_zh": "T9s 是最強連張，UTG 可開 (50%)", "note_en": "T9s is strongest connector, open from UTG (50%)"},
            {"hands": "98s-76s", "start_pos": "UTG (25%)", "note_zh": "98s-76s 從 UTG 開始但只有 25%", "note_en": "98s-76s starts at UTG but only 25%"},
            {"hands": "65s", "start_pos": "HJ (25%)", "note_zh": "65s 從 HJ 開始 (25%)，BTN 全開", "note_en": "65s starts at HJ (25%), always from BTN"},
            {"hands": "54s", "start_pos": "HJ (25%)", "note_zh": "54s 從 HJ 開始 (25%)，BTN (25%)", "note_en": "54s starts at HJ (25%), BTN (25%)"},
        ],
        "mnemonic_zh": "口訣：T9 UTG(50%) → 98-76 UTG(25%) → 65/54 HJ(25%)",
        "mnemonic_en": "Pattern: T9 UTG(50%) → 98-76 UTG(25%) → 65/54 HJ(25%)",
    },
    "suited_gappers": {
        "title_zh": "同花隔張 (Suited Gappers) - 高抽水版",
        "title_en": "Suited Gappers - High Rake",
        "patterns": [
            {"hands": "T8s", "start_pos": "HJ (50%)", "note_zh": "T8s 從 HJ 開始 (50%)", "note_en": "T8s starts at HJ (50%)"},
            {"hands": "97s", "start_pos": "CO (50%)", "note_zh": "97s 從 CO 開始 (50%)", "note_en": "97s starts at CO (50%)"},
            {"hands": "86s", "start_pos": "BTN (100%)", "note_zh": "86s 從 BTN 開始", "note_en": "86s starts at BTN"},
            {"hands": "75s", "start_pos": "BTN (25%)", "note_zh": "75s 從 BTN 開始 (25%)", "note_en": "75s starts at BTN (25%)"},
            {"hands": "64s", "start_pos": "CO (100%)", "note_zh": "64s 從 CO 開始", "note_en": "64s starts at CO"},
            {"hands": "53s", "start_pos": "SB (50%)", "note_zh": "53s 從 SB 開始 (50%)", "note_en": "53s starts at SB (50%)"},
        ],
        "mnemonic_zh": "口訣：T8 HJ、97 CO、86 BTN、75 BTN(25%)、64 CO、53 SB",
        "mnemonic_en": "Pattern: T8 HJ, 97 CO, 86 BTN, 75 BTN(25%), 64 CO, 53 SB",
    },
    "small_pairs": {
        "title_zh": "小對子 (Small Pairs) - 高抽水版",
        "title_en": "Small Pairs - High Rake",
        "patterns": [
            {"hands": "66", "start_pos": "UTG (100%)", "note_zh": "66+ 全場都開", "note_en": "66+ always open everywhere"},
            {"hands": "55", "start_pos": "UTG (50%)", "note_zh": "55 從 UTG 開始 (50%)", "note_en": "55 starts at UTG (50%)"},
            {"hands": "44", "start_pos": "HJ (25%)", "note_zh": "44 從 HJ 開始 (25%)", "note_en": "44 starts at HJ (25%)"},
            {"hands": "33", "start_pos": "BTN (100%)", "note_zh": "33 從 BTN 開始全開", "note_en": "33 always open from BTN"},
            {"hands": "22", "start_pos": "BTN (25%)", "note_zh": "22 從 BTN 開始 (25%)，SB 全開", "note_en": "22 starts at BTN (25%), always from SB"},
        ],
        "mnemonic_zh": "口訣：66 全開、55 UTG(50%)、44 HJ(25%)、33 BTN、22 BTN(25%)",
        "mnemonic_en": "Pattern: 66 always, 55 UTG(50%), 44 HJ(25%), 33 BTN, 22 BTN(25%)",
    },
    "suited_aces": {
        "title_zh": "同花 Ax (Suited Aces) - 高抽水版",
        "title_en": "Suited Aces - High Rake",
        "patterns": [
            {"hands": "A3s+", "start_pos": "UTG (100%)", "note_zh": "A3s+ 從 UTG 全開", "note_en": "A3s+ always open from UTG"},
            {"hands": "A2s", "start_pos": "UTG (25%)", "note_zh": "A2s 從 UTG 開始 (25%)，HJ+ 全開", "note_en": "A2s starts at UTG (25%), always from HJ+"},
        ],
        "mnemonic_zh": "口訣：A3s+ 全場通吃、A2s UTG(25%)/HJ+",
        "mnemonic_en": "Pattern: A3s+ everywhere, A2s UTG(25%)/HJ+",
    },
    "suited_kings": {
        "title_zh": "同花 Kx (Suited Kings) - 高抽水版",
        "title_en": "Suited Kings - High Rake",
        "patterns": [
            {"hands": "K6s+", "start_pos": "UTG (100%)", "note_zh": "K6s+ 從 UTG 開始", "note_en": "K6s+ starts at UTG"},
            {"hands": "K5s", "start_pos": "UTG (25%)", "note_zh": "K5s 從 UTG 開始 (25%)", "note_en": "K5s starts at UTG (25%)"},
            {"hands": "K4s", "start_pos": "HJ (25%)", "note_zh": "K4s 從 HJ 開始 (25%)", "note_en": "K4s starts at HJ (25%)"},
            {"hands": "K3s", "start_pos": "BTN (100%)", "note_zh": "K3s 從 BTN 開始", "note_en": "K3s starts at BTN"},
            {"hands": "K2s", "start_pos": "SB (100%)", "note_zh": "K2s 只在 SB 開", "note_en": "K2s only from SB"},
        ],
        "mnemonic_zh": "口訣：K6 UTG、K5/K4 邊緣25%、K3 BTN、K2 SB",
        "mnemonic_en": "Pattern: K6 UTG, K5/K4 edge 25%, K3 BTN, K2 SB",
    },
    "suited_queens": {
        "title_zh": "同花 Qx (Suited Queens) - 高抽水版",
        "title_en": "Suited Queens - High Rake",
        "patterns": [
            {"hands": "Q9s+", "start_pos": "UTG (100%)", "note_zh": "Q9s+ 從 UTG 開始", "note_en": "Q9s+ starts at UTG"},
            {"hands": "Q8s", "start_pos": "UTG (75%)", "note_zh": "Q8s 從 UTG 開始 (75%)", "note_en": "Q8s starts at UTG (75%)"},
            {"hands": "Q7s, Q6s", "start_pos": "CO (100%)", "note_zh": "Q7s/Q6s 從 CO 開始（HJ 不開）", "note_en": "Q7s/Q6s starts at CO (skip HJ)"},
            {"hands": "Q5s", "start_pos": "CO (25%)", "note_zh": "Q5s 從 CO 開始 (25%)", "note_en": "Q5s starts at CO (25%)"},
            {"hands": "Q4s", "start_pos": "BTN (100%)", "note_zh": "Q4s 從 BTN 開始", "note_en": "Q4s starts at BTN"},
            {"hands": "Q3s, Q2s", "start_pos": "SB (100%)", "note_zh": "Q3s/Q2s 只在 SB 開", "note_en": "Q3s/Q2s only from SB"},
        ],
        "mnemonic_zh": "口訣：Q9 UTG、Q8 UTG(75%)、Q7/Q6 CO、Q5 CO(25%)、Q4 BTN、Q3/Q2 SB",
        "mnemonic_en": "Pattern: Q9 UTG, Q8 UTG(75%), Q7/Q6 CO, Q5 CO(25%), Q4 BTN, Q3/Q2 SB",
    },
    "offsuit_aces": {
        "title_zh": "不同花 Ax (Offsuit Aces) - 高抽水版",
        "title_en": "Offsuit Aces - High Rake",
        "patterns": [
            {"hands": "ATo+", "start_pos": "UTG (100%)", "note_zh": "ATo+ 從 UTG 開始", "note_en": "ATo+ starts at UTG"},
            {"hands": "A9o", "start_pos": "UTG (25%)", "note_zh": "A9o 從 UTG 開始 (25%)，CO 全開", "note_en": "A9o starts at UTG (25%), always from CO"},
            {"hands": "A8o", "start_pos": "CO (50%)", "note_zh": "A8o 從 CO 開始 (50%)", "note_en": "A8o starts at CO (50%)"},
            {"hands": "A5o", "start_pos": "CO (100%)", "note_zh": "A5o 從 CO 開始（wheel 潛力）", "note_en": "A5o starts at CO (wheel potential)"},
            {"hands": "A4o", "start_pos": "BTN (100%)", "note_zh": "A4o 從 BTN 開始", "note_en": "A4o starts at BTN"},
            {"hands": "A3o", "start_pos": "BTN (25%)", "note_zh": "A3o 從 BTN 開始 (25%)", "note_en": "A3o starts at BTN (25%)"},
        ],
        "mnemonic_zh": "口訣：ATo UTG、A9o UTG(25%)/CO、A8o CO(50%)、A5o CO、A4o BTN、A3o BTN(25%)",
        "mnemonic_en": "Pattern: ATo UTG, A9o UTG(25%)/CO, A8o CO(50%), A5o CO, A4o BTN, A3o BTN(25%)",
    },
    "offsuit_broadways": {
        "title_zh": "不同花大牌 (Offsuit Broadways) - 高抽水版",
        "title_en": "Offsuit Broadways - High Rake",
        "patterns": [
            {"hands": "KJo+, QJo", "start_pos": "UTG (100%)", "note_zh": "KJo+, QJo 從 UTG 開始", "note_en": "KJo+, QJo starts at UTG"},
            {"hands": "KTo", "start_pos": "HJ (100%)", "note_zh": "KTo 從 HJ 開始", "note_en": "KTo starts at HJ"},
            {"hands": "QTo, JTo", "start_pos": "HJ (50%)", "note_zh": "QTo/JTo 從 HJ 開始 (50%)，CO 全開", "note_en": "QTo/JTo starts at HJ (50%), always from CO"},
            {"hands": "K9o", "start_pos": "BTN (100%)", "note_zh": "K9o 從 BTN 開始", "note_en": "K9o starts at BTN"},
            {"hands": "K8o", "start_pos": "BTN (50%)", "note_zh": "K8o 從 BTN 開始 (50%)", "note_en": "K8o starts at BTN (50%)"},
            {"hands": "Q9o, J9o", "start_pos": "BTN (100%)", "note_zh": "Q9o/J9o 從 BTN 開始", "note_en": "Q9o/J9o starts at BTN"},
        ],
        "mnemonic_zh": "口訣：KJo/QJo UTG、KTo HJ、QTo/JTo HJ(50%)、K9o/K8o BTN",
        "mnemonic_en": "Pattern: KJo/QJo UTG, KTo HJ, QTo/JTo HJ(50%), K9o/K8o BTN",
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
