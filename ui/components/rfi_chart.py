"""
RFI Quick Reference Charts for 6-max.
Two styles:
  A) Multi-position overlay - shows all positions that can open each hand
  B) Earliest position - shows the earliest position that can open each hand
"""
import streamlit as st
from typing import Dict, List, Set
from core.evaluator import Evaluator
from core.position import Position
from core.scenario import Scenario, ActionType
from trainer.drill import get_visual_constants
from core.rfi_utils import get_drillable_hands as get_drillable_dynamic

RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']


# ============================================================================
# 視覺常數：優先從 JSON 讀取 (v5.0)
# ============================================================================

def _get_utg_key_edges() -> Set[str]:
    """從 JSON 讀取 UTG 邊緣牌，fallback 到靜態常數"""
    try:
        visual = get_visual_constants()
        if visual and "utg_key_edges" in visual:
            return set(visual["utg_key_edges"])
    except Exception:
        pass
    return _UTG_KEY_EDGES_STATIC


def _get_btn_key_edges() -> Set[str]:
    """從 JSON 讀取 BTN 邊緣牌，fallback 到靜態常數"""
    try:
        visual = get_visual_constants()
        if visual and "btn_key_edges" in visual:
            return set(visual["btn_key_edges"])
    except Exception:
        pass
    return _BTN_KEY_EDGES_STATIC


def _get_obvious_hands() -> Set[str]:
    """從 JSON 讀取明顯牌，fallback 到靜態常數"""
    try:
        visual = get_visual_constants()
        if visual and "obvious_hands" in visual:
            return set(visual["obvious_hands"])
    except Exception:
        pass
    return _OBVIOUS_HANDS_STATIC


def get_drillable_set(position: str = None) -> set:
    """
    動態計算 drillable hands（使用 rfi_utils 算法）。

    Args:
        position: 位置名稱 (UTG, HJ, CO, BTN, SB)。
                  若為 None，返回所有位置的聯集。
    """
    if position:
        return set(get_drillable_dynamic(position))

    # 聯集：任何位置的 drillable 手牌
    all_drillable = set()
    for pos in ["UTG", "HJ", "CO", "BTN", "SB"]:
        all_drillable |= set(get_drillable_dynamic(pos))
    return all_drillable


def get_sb_limp_hands(evaluator: Evaluator) -> set:
    """取得 SB 的 limp 手牌列表"""
    try:
        from core.scenario import Scenario, ActionType
        from core.position import Position
        scenario = Scenario(hero_position=Position.SB, action_type=ActionType.RFI)
        freq_data = evaluator.get_frequencies_for_scenario(scenario, "6max")
        return {hand for hand, freq in freq_data.items() if freq.get("limp", 0) > 0}
    except Exception:
        return set()

# Position colors (red gradient: dark red to light red)
POSITION_COLORS = {
    "UTG": "#7f1d1d",  # Dark red - tightest
    "HJ": "#b91c1c",   # Red
    "CO": "#dc2626",   # Medium red
    "BTN": "#ef4444",  # Light red
    "SB": "#fca5a5",   # Lightest red/pink - loosest
}

# Position opacity (all solid, no transparency)
POSITION_OPACITY = {
    "UTG": 1.0,
    "HJ": 1.0,
    "CO": 1.0,
    "BTN": 1.0,
    "SB": 1.0,
}

# Premium hands worth 3-betting (shown with white border in UTG range)
PREMIUM_3BET_HANDS = {
    "AA", "KK", "QQ", "JJ", "TT",
    "AKs", "AKo", "AQs", "AQo", "KQs",
}

# ============================================================================
# 靜態常數（v5.0 後作為 fallback，主要從 JSON 讀取）
# ============================================================================

# UTG key edge hands - gold border (靜態 fallback)
_UTG_KEY_EDGES_STATIC = {
    "K9s", "T9s", "A2s", "55",  # 100% 邊緣 opens
    "K8s", "Q9s", "J9s",        # 邊緣 folds (剛移除)
    "ATo", "KQo",               # offsuit 邊緣
}

# BTN key edge hands - white border (靜態 fallback)
_BTN_KEY_EDGES_STATIC = {
    "K2s", "Q2s", "J4s", "T6s", "96s", "85s", "75s", "64s",  # 同花
    "A4o", "K8o", "Q9o", "T8o", "98o",                          # 不同花
}

# SB hands that are obvious (fade to 50%)
# Note: SB now uses same range as BTN, so no SB-first hands
SB_OBVIOUS_HANDS = set()

# "Obvious" hands that don't need memorization - fade these to highlight edge cases
# NOTE: Don't include UTG edge hands here! They need emphasis, not fading.
_OBVIOUS_HANDS_STATIC = {
    # Pairs 66+ (55 is UTG edge - lowest pair UTG opens)
    "AA", "KK", "QQ", "JJ", "TT", "99", "88", "77", "66",
    # Suited Ax (A3s+ 明顯, but A2s is UTG edge)
    "AKs", "AQs", "AJs", "ATs", "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s",
    # Suited Kx (KTs+ 明顯, K9s is UTG edge)
    "KQs", "KJs", "KTs",
    # Suited Qx (QJs 明顯, QTs is edge since Q9s removed)
    "QJs",
    # Suited connectors (JTs 明顯, T9s is UTG edge)
    "JTs",
    # Offsuit (AJo+ 明顯, ATo/KQo are UTG edge)
    "AKo", "AQo", "AJo",
}

POSITION_ORDER = ["UTG", "HJ", "CO", "BTN", "SB"]


def hex_to_rgba(hex_color: str, opacity: float) -> str:
    """Convert hex color to rgba with opacity."""
    hex_color = hex_color.lstrip('#')
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)
    return f"rgba({r}, {g}, {b}, {opacity})"


def get_all_rfi_ranges(evaluator: Evaluator, format: str = "6max", min_freq: int = 50) -> Dict[str, List[str]]:
    """Get RFI ranges for all positions.

    Args:
        evaluator: The evaluator instance
        format: Table format (6max)
        min_freq: Minimum raise frequency (%) to be considered opening. Default 50%.
    """
    ranges = {}
    for pos_name in POSITION_ORDER:
        pos = Position(pos_name)
        scenario = Scenario(hero_position=pos, action_type=ActionType.RFI)
        range_data = evaluator.get_range_for_scenario(scenario, format=format)
        # Get hands with raise frequency >= min_freq
        freq_data = evaluator.get_frequencies_for_scenario(scenario, format=format)
        raise_hands = []
        for hand, freq in freq_data.items():
            if freq.get("raise", 0) >= min_freq:
                raise_hands.append(hand)
        ranges[pos_name] = raise_hands
    return ranges


def get_hand_positions(hand: str, ranges: Dict[str, List[str]]) -> List[str]:
    """Get list of positions that can open this hand."""
    positions = []
    for pos in POSITION_ORDER:
        if hand in ranges.get(pos, []):
            positions.append(pos)
    return positions


def get_earliest_position(hand: str, ranges: Dict[str, List[str]]) -> str:
    """Get the earliest position that can open this hand."""
    for pos in POSITION_ORDER:
        if hand in ranges.get(pos, []):
            return pos
    return None


def display_rfi_chart_overlay(evaluator: Evaluator, lang: str = "zh"):
    """
    Display RFI chart with multi-position overlay.
    Each cell shows colored bars for all positions that can open that hand.
    With position filter to highlight specific position ranges.
    """
    ranges = get_all_rfi_ranges(evaluator)
    sb_limp_hands = get_sb_limp_hands(evaluator)

    title = "RFI 速記表 - 所有可開池位置" if lang == "zh" else "RFI Chart - All Opening Positions"
    st.subheader(title)

    # Legend with colored position indicators
    legend_html = '<div style="display: flex; gap: 15px; justify-content: center; margin: 10px 0; flex-wrap: wrap;">'
    for pos, color in POSITION_COLORS.items():
        legend_html += f'<span style="display: flex; align-items: center; gap: 4px;"><span style="background: {color}; width: 20px; height: 14px; border-radius: 2px; display: inline-block;"></span> {pos}</span>'
    legend_html += '<span style="display: flex; align-items: center; gap: 4px;"><span style="background: #374151; width: 20px; height: 14px; border-radius: 2px; display: inline-block;"></span> Fold</span>'
    legend_html += '</div>'
    st.markdown(legend_html, unsafe_allow_html=True)

    # Position filter radio buttons
    filter_key = "rfi_overlay_filter"
    if filter_key not in st.session_state:
        st.session_state[filter_key] = "全部"

    filter_options = ["全部", "UTG", "HJ", "CO", "BTN", "SB"]
    col1, col2, col3 = st.columns([1, 6, 1])
    with col2:
        selected_filter = st.radio(
            "篩選位置" if lang == "zh" else "Filter Position",
            filter_options,
            index=filter_options.index(st.session_state[filter_key]) if st.session_state[filter_key] in filter_options else 0,
            key=f"{filter_key}_radio",
            horizontal=True,
            label_visibility="collapsed"
        )
    st.session_state[filter_key] = selected_filter

    # Build grid HTML
    html = '''<div style="width:100%; display:flex; flex-direction:column; align-items:center;">
    <div style="display:grid; grid-template-columns:repeat(13,minmax(0,1fr)); gap:2px; width:100%; max-width:555px; background:#1a1a2e; padding:8px; border-radius:8px; box-sizing:border-box;">'''

    for i, r1 in enumerate(RANKS):
        for j, r2 in enumerate(RANKS):
            if i == j:
                hand = f"{r1}{r2}"
            elif i < j:
                hand = f"{r1}{r2}s"
            else:
                hand = f"{r2}{r1}o"

            positions = get_hand_positions(hand, ranges)

            # Determine if this cell matches the filter
            if selected_filter == "全部":
                matches_filter = True
            else:
                matches_filter = selected_filter in positions

            # Opacity based on filter match
            filter_opacity = "1.0" if matches_filter else "0.35"

            # 基礎 cell 樣式
            cell_base = f"aspect-ratio:1; display:flex; align-items:center; justify-content:center; border-radius:3px; position:relative; overflow:hidden; color:white; text-shadow:0 1px 2px rgba(0,0,0,0.5); min-width:0; opacity:{filter_opacity}; transition:opacity 0.2s ease;"
            hand_style = "font-size:clamp(8px,2.5vw,14px); font-weight:bold; z-index:2; position:relative;"

            if positions:
                # Create color bars for each position
                bars_html = '<div style="position:absolute; bottom:0; left:0; right:0; display:flex; height:100%;">'
                for pos in positions:
                    color = POSITION_COLORS[pos]
                    bars_html += f'<div style="flex:1; height:100%; background:{color};"></div>'
                bars_html += '</div>'
                # Fade "obvious" hands to highlight edge cases
                if hand in _get_obvious_hands():
                    cell_opacity = float(filter_opacity) * 0.5
                    html += f'<div style="{cell_base} opacity:{cell_opacity};">{bars_html}<span style="{hand_style}">{hand}</span></div>'
                else:
                    html += f'<div style="{cell_base}">{bars_html}<span style="{hand_style}">{hand}</span></div>'
            elif hand in sb_limp_hands:
                # Limp hands: 70% opacity
                limp_opacity = float(filter_opacity) * 0.5
                html += f'<div style="{cell_base} background:#374151; opacity:{limp_opacity};"><span style="{hand_style}">{hand}</span></div>'
            elif hand in get_drillable_set():
                # Edge hands: 100% opacity
                html += f'<div style="{cell_base} background:#374151;"><span style="{hand_style}">{hand}</span></div>'
            else:
                # Trash hands: 40% opacity
                html += f'<div style="{cell_base} background:#2d3748; color:#4a5568; text-shadow:none; opacity:{float(filter_opacity) * 0.33};"><span style="{hand_style}">{hand}</span></div>'

    # Close grid and add caption
    if selected_filter == "全部":
        desc = "每格顯示所有可開池的位置（顏色條）。例如 AA 有5條顏色 = 所有位置都開。" if lang == "zh" else "Each cell shows all positions that can open (color bars). e.g., AA has 5 colors = all positions open."
    else:
        count = len(ranges.get(selected_filter, []))
        desc = f"{selected_filter} 開池範圍：{count} 手牌" if lang == "zh" else f"{selected_filter} opening range: {count} hands"

    html += f'</div><p style="width:100%; text-align:center; color:#9ca3af; font-size:13px; margin-top:12px; max-width:555px; line-height:1.4;">{desc}</p></div>'
    st.markdown(html, unsafe_allow_html=True)


def display_rfi_chart_earliest(evaluator: Evaluator, lang: str = "zh"):
    """
    Display RFI chart showing earliest opening position.
    Each cell shows only the color of the earliest position that can open.
    With position filter to highlight specific position ranges.
    """
    ranges = get_all_rfi_ranges(evaluator)

    title = "RFI 速記表 - 最早可開池位置" if lang == "zh" else "RFI Chart - Earliest Opening Position"
    st.subheader(title)

    # Legend with colored position indicators
    legend_html = '<div style="display: flex; gap: 12px; justify-content: center; margin: 10px 0; flex-wrap: wrap;">'
    for pos, color in POSITION_COLORS.items():
        legend_html += f'<span style="display: flex; align-items: center; gap: 4px;"><span style="background: {color}; width: 20px; height: 14px; border-radius: 2px; display: inline-block;"></span> {pos}</span>'
    legend_html += '<span style="display: flex; align-items: center; gap: 4px;"><span style="background: #374151; width: 20px; height: 14px; border-radius: 2px; display: inline-block;"></span> Fold</span>'
    legend_html += '</div>'
    st.markdown(legend_html, unsafe_allow_html=True)

    # Position filter - get value first (will render after grid)
    filter_key = "rfi_earliest_filter"
    if filter_key not in st.session_state:
        st.session_state[filter_key] = "全部"
    selected_filter = st.session_state[filter_key]

    # Build grid HTML
    html = '''<div style="width:100%; display:flex; flex-direction:column; align-items:center;">
    <div style="display:grid; grid-template-columns:repeat(13,minmax(0,1fr)); gap:2px; width:100%; max-width:555px; background:#1a1a2e; padding:8px; border-radius:8px; box-sizing:border-box;">'''

    for i, r1 in enumerate(RANKS):
        for j, r2 in enumerate(RANKS):
            if i == j:
                hand = f"{r1}{r2}"
            elif i < j:
                hand = f"{r1}{r2}s"
            else:
                hand = f"{r2}{r1}o"

            earliest = get_earliest_position(hand, ranges)
            positions = get_hand_positions(hand, ranges)

            # Determine if this cell matches the filter
            if selected_filter == "全部":
                matches_filter = True
            else:
                # Hand matches only if this position is the EARLIEST opener
                # This highlights the "new" hands for each position
                matches_filter = earliest == selected_filter

            # Opacity based on filter match
            filter_opacity = "1.0" if matches_filter else "0.35"

            # 基礎 cell 樣式
            cell_base = f"aspect-ratio:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0px; border-radius:3px; color:white; text-shadow:0 1px 2px rgba(0,0,0,0.5); line-height:1.15; overflow:hidden; min-width:0; opacity:{filter_opacity}; transition:opacity 0.2s ease;"
            hand_style = "font-size:clamp(11px,3.2vw,17px); font-weight:500; color:rgba(255,255,255,0.8);"
            pos_style = "font-size:clamp(9px,2.8vw,14px); font-weight:500; color:rgba(255,255,255,0.9);"

            if earliest:
                hex_color = POSITION_COLORS[earliest]

                # Adjust text opacity for readability on different backgrounds
                text_opacity = {"UTG": 0.95, "HJ": 1.0, "CO": 1.0, "BTN": 1.0, "SB": 1.0}
                opacity = text_opacity.get(earliest, 1.0)
                text_color = f"color:rgba(255,255,255,{opacity});"

                # When filtering by position: show all matching hands at full opacity
                # Edge hands get white inner border for emphasis
                if selected_filter != "全部" and matches_filter:
                    # Position filter active and this hand matches
                    if hand in _get_obvious_hands():
                        # Obvious hand - no border, full opacity
                        html += f'<div style="{cell_base} background:{hex_color}; {text_color}"><span style="{hand_style}">{hand}</span><span style="{pos_style}">{earliest}</span></div>'
                    else:
                        # Edge hand - white inner border to highlight
                        html += f'<div style="{cell_base} background:{hex_color}; {text_color} box-shadow: inset 0 0 0 2px rgba(255,255,255,0.8);"><span style="{hand_style}">{hand}</span><span style="{pos_style}">{earliest}</span></div>'
                else:
                    # "全部" view - show key edges with gold/white borders
                    if hand in _get_utg_key_edges() and earliest == "UTG":
                        # UTG key edge - gold border
                        html += f'<div style="{cell_base} background:{hex_color}; {text_color} box-shadow: inset 0 0 0 2px #fbbf24;"><span style="{hand_style}">{hand}</span><span style="{pos_style}">{earliest}</span></div>'
                    elif hand in _get_btn_key_edges() and earliest == "BTN":
                        # BTN key edge - white border
                        html += f'<div style="{cell_base} background:{hex_color}; {text_color} box-shadow: inset 0 0 0 2px rgba(255,255,255,0.9);"><span style="{hand_style}">{hand}</span><span style="{pos_style}">{earliest}</span></div>'
                    elif hand in SB_OBVIOUS_HANDS and earliest == "SB":
                        # SB obvious hands - fade background only (not text)
                        faded_bg = hex_to_rgba(hex_color, 0.5)
                        html += f'<div style="{cell_base} background:{faded_bg}; {text_color}"><span style="{hand_style}">{hand}</span><span style="{pos_style}">{earliest}</span></div>'
                    elif hand in _get_obvious_hands():
                        # Obvious hand - fade
                        cell_opacity = float(filter_opacity) * 0.5
                        html += f'<div style="{cell_base} background:{hex_color}; {text_color} opacity:{cell_opacity};"><span style="{hand_style}">{hand}</span><span style="{pos_style}">{earliest}</span></div>'
                    else:
                        # Other edge hands - full opacity, no border
                        html += f'<div style="{cell_base} background:{hex_color}; {text_color}"><span style="{hand_style}">{hand}</span><span style="{pos_style}">{earliest}</span></div>'
            elif hand in get_drillable_set():
                # 邊緣 Fold 牌 - 需要記住是 fold
                html += f'<div style="{cell_base} background:#374151;"><span style="{hand_style}">{hand}</span></div>'
            else:
                # 垃圾牌 - 淡化
                html += f'<div style="{cell_base} background:#2d3748; color:#4a5568; text-shadow:none; opacity:{float(filter_opacity) * 0.33};"><span style="{hand_style}">{hand}</span></div>'

    # Close grid and add caption
    if selected_filter == "全部":
        desc = "每格顯示「最早可開池」的位置顏色。深紅=緊，淺紅=鬆。" if lang == "zh" else "Each cell shows the earliest position that can open. Dark red=tight, light red=loose."
    else:
        # Count hands where this position is the earliest opener
        earliest_count = sum(1 for h in ranges.get(selected_filter, []) if get_earliest_position(h, ranges) == selected_filter)
        total_count = len(ranges.get(selected_filter, []))
        desc = f"{selected_filter} 新增開池：{earliest_count} 手牌（總共 {total_count} 手）" if lang == "zh" else f"{selected_filter} new opens: {earliest_count} hands (total {total_count})"

    html += f'</div><p style="width:100%; text-align:center; color:#9ca3af; font-size:13px; margin-top:12px; max-width:555px; line-height:1.4;">{desc}</p></div>'
    st.markdown(html, unsafe_allow_html=True)

    # Position filter radio buttons - centered using columns
    filter_options = ["全部", "UTG", "HJ", "CO", "BTN", "SB"]

    # Use columns to center: empty | radio | empty
    _, center_col, _ = st.columns([1, 4, 1])
    with center_col:
        new_filter = st.radio(
            "篩選位置" if lang == "zh" else "Filter Position",
            filter_options,
            index=filter_options.index(selected_filter) if selected_filter in filter_options else 0,
            key=f"{filter_key}_radio",
            horizontal=True,
            label_visibility="collapsed"
        )
    if new_filter != selected_filter:
        st.session_state[filter_key] = new_filter
        st.rerun()


def display_rfi_charts(evaluator: Evaluator, lang: str = "zh"):
    """Display RFI chart - earliest opening position only."""
    # 直接顯示最早可開位置表，移除了「所有位置疊加」TAB
    display_rfi_chart_earliest(evaluator, lang)
