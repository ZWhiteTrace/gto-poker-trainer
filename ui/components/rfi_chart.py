"""
RFI Quick Reference Charts for 6-max.
Two styles:
  A) Multi-position overlay - shows all positions that can open each hand
  B) Earliest position - shows the earliest position that can open each hand
"""
import streamlit as st
from typing import Dict, List
from core.evaluator import Evaluator
from core.position import Position
from core.scenario import Scenario, ActionType
from trainer.drill import get_drillable_hands

RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']


def get_drillable_set():
    """動態取得 drillable hands，避免快取問題"""
    return set(get_drillable_hands())

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

POSITION_ORDER = ["UTG", "HJ", "CO", "BTN", "SB"]


def hex_to_rgba(hex_color: str, opacity: float) -> str:
    """Convert hex color to rgba with opacity."""
    hex_color = hex_color.lstrip('#')
    r = int(hex_color[0:2], 16)
    g = int(hex_color[2:4], 16)
    b = int(hex_color[4:6], 16)
    return f"rgba({r}, {g}, {b}, {opacity})"


def get_all_rfi_ranges(evaluator: Evaluator, format: str = "6max") -> Dict[str, List[str]]:
    """Get RFI ranges for all positions."""
    ranges = {}
    for pos_name in POSITION_ORDER:
        pos = Position(pos_name)
        scenario = Scenario(hero_position=pos, action_type=ActionType.RFI)
        range_data = evaluator.get_range_for_scenario(scenario, format=format)
        # Get hands with raise frequency > 0
        freq_data = evaluator.get_frequencies_for_scenario(scenario, format=format)
        raise_hands = []
        for hand, freq in freq_data.items():
            if freq.get("raise", 0) > 0:
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
    """
    ranges = get_all_rfi_ranges(evaluator)

    title = "RFI 速記表 - 所有可開池位置" if lang == "zh" else "RFI Chart - All Opening Positions"
    st.subheader(title)

    # Legend
    legend_html = '<div style="display: flex; gap: 15px; justify-content: center; margin: 10px 0; flex-wrap: wrap;">'
    for pos, color in POSITION_COLORS.items():
        legend_html += f'<span style="display: flex; align-items: center; gap: 4px;"><span style="background: {color}; width: 20px; height: 14px; border-radius: 2px; display: inline-block;"></span> {pos}</span>'
    legend_html += '<span style="display: flex; align-items: center; gap: 4px;"><span style="background: #374151; width: 20px; height: 14px; border-radius: 2px; display: inline-block;"></span> Fold</span>'
    legend_html += '</div>'
    st.markdown(legend_html, unsafe_allow_html=True)

    # Build grid HTML - 使用 inline style 確保生效
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

            # 基礎 cell 樣式 - min-width:0 確保可縮小
            cell_base = "aspect-ratio:1; display:flex; align-items:center; justify-content:center; border-radius:3px; position:relative; overflow:hidden; color:white; text-shadow:0 1px 2px rgba(0,0,0,0.5); min-width:0;"
            hand_style = "font-size:clamp(8px,2.5vw,14px); font-weight:bold; z-index:2; position:relative;"

            if positions:
                # Create color bars for each position
                bars_html = '<div style="position:absolute; bottom:0; left:0; right:0; display:flex; height:100%;">'
                for pos in positions:
                    color = POSITION_COLORS[pos]
                    bars_html += f'<div style="flex:1; height:100%; background:{color};"></div>'
                bars_html += '</div>'
                html += f'<div style="{cell_base}">{bars_html}<span style="{hand_style}">{hand}</span></div>'
            elif hand in get_drillable_set():
                html += f'<div style="{cell_base} background:#374151;"><span style="{hand_style}">{hand}</span></div>'
            else:
                html += f'<div style="{cell_base} background:#374151; color:#6b7280; text-shadow:none;"><span style="{hand_style}">{hand}</span></div>'

    # Close grid and add caption inside container
    desc = "每格顯示所有可開池的位置（顏色條）。例如 AA 有5條顏色 = 所有位置都開。" if lang == "zh" else "Each cell shows all positions that can open (color bars). e.g., AA has 5 colors = all positions open."
    html += f'</div><p style="width:100%; text-align:center; color:#9ca3af; font-size:13px; margin-top:12px; max-width:555px; line-height:1.4;">{desc}</p></div>'
    st.markdown(html, unsafe_allow_html=True)


def display_rfi_chart_earliest(evaluator: Evaluator, lang: str = "zh"):
    """
    Display RFI chart showing earliest opening position.
    Each cell shows only the color of the earliest position that can open.
    """
    ranges = get_all_rfi_ranges(evaluator)

    title = "RFI 速記表 - 最早可開池位置" if lang == "zh" else "RFI Chart - Earliest Opening Position"
    st.subheader(title)

    # Legend
    legend_html = '<div style="display: flex; gap: 15px; justify-content: center; margin: 10px 0; flex-wrap: wrap;">'
    for pos, color in POSITION_COLORS.items():
        legend_html += f'<span style="display: flex; align-items: center; gap: 4px;"><span style="background: {color}; width: 20px; height: 14px; border-radius: 2px; display: inline-block;"></span> {pos}</span>'
    legend_html += '<span style="display: flex; align-items: center; gap: 4px;"><span style="background: #374151; width: 20px; height: 14px; border-radius: 2px; display: inline-block;"></span> Fold</span>'
    legend_html += '</div>'
    st.markdown(legend_html, unsafe_allow_html=True)

    # Build grid HTML - 使用 inline style 確保生效
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

            # 基礎 cell 樣式 - min-width:0 確保可縮小
            cell_base = "aspect-ratio:1; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:0px; border-radius:3px; color:white; text-shadow:0 1px 2px rgba(0,0,0,0.5); line-height:1.15; overflow:hidden; min-width:0;"
            hand_style = "font-size:clamp(11px,3.2vw,17px); font-weight:500; color:rgba(255,255,255,0.8);"
            pos_style = "font-size:clamp(9px,2.8vw,14px); font-weight:500; color:rgba(255,255,255,0.9);"

            if earliest:
                hex_color = POSITION_COLORS[earliest]

                # Adjust text opacity for readability on different backgrounds
                text_opacity = {"UTG": 0.95, "HJ": 1.0, "CO": 1.0, "BTN": 1.0, "SB": 1.0}
                opacity = text_opacity.get(earliest, 1.0)
                text_color = f"color:rgba(255,255,255,{opacity});"

                html += f'<div style="{cell_base} background:{hex_color}; {text_color}"><span style="{hand_style}">{hand}</span><span style="{pos_style}">{earliest}</span></div>'
            elif hand in get_drillable_set():
                html += f'<div style="{cell_base} background:#374151;"><span style="{hand_style}">{hand}</span></div>'
            else:
                html += f'<div style="{cell_base} background:#374151; color:#6b7280; text-shadow:none;"><span style="{hand_style}">{hand}</span></div>'

    # Close grid and add caption inside container
    desc = "每格顯示「最早可開池」的位置顏色。深紅=緊，淺紅=鬆。" if lang == "zh" else "Each cell shows the earliest position that can open. Dark red=tight, light red=loose."
    html += f'</div><p style="width:100%; text-align:center; color:#9ca3af; font-size:13px; margin-top:12px; max-width:555px; line-height:1.4;">{desc}</p></div>'
    st.markdown(html, unsafe_allow_html=True)


def display_rfi_charts(evaluator: Evaluator, lang: str = "zh"):
    """Display both RFI chart styles."""
    tab_labels = ["📍 最早可開位置", "🎨 所有位置疊加"] if lang == "zh" else ["📍 Earliest Position", "🎨 All Positions"]

    tab1, tab2 = st.tabs(tab_labels)

    with tab1:
        display_rfi_chart_earliest(evaluator, lang)

    with tab2:
        display_rfi_chart_overlay(evaluator, lang)
