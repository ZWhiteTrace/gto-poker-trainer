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

# Position colors (warm gradient: smooth transition from tight to loose)
POSITION_COLORS = {
    "UTG": "#ec4899",  # Pink/Magenta - tightest
    "HJ": "#ef4444",   # Red
    "CO": "#f97316",   # Orange
    "BTN": "#eab308",  # Yellow
    "SB": "#84cc16",   # Yellow-Green/Lime - loosest
}

# Position opacity (earlier = more opaque, later = more transparent)
POSITION_OPACITY = {
    "UTG": 1.0,    # 100% - tightest, most visible
    "HJ": 0.9,     # 90%
    "CO": 0.8,     # 80%
    "BTN": 0.7,    # 70%
    "SB": 0.6,     # 60% - loosest, most transparent
}

# Premium hands worth 3-betting (shown with white border in UTG range)
PREMIUM_3BET_HANDS = {
    "AA", "KK", "QQ", "JJ", "TT",
    "AKs", "AKo", "AQs", "AQo", "AJs",
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

    # Build grid HTML
    css = """
    <style>
    .rfi-overlay-grid {
        display: grid;
        grid-template-columns: repeat(13, 1fr);
        gap: 2px;
        width: 100%;
        max-width: min(600px, calc(100vw - 40px));
        margin: 10px auto;
        background: #1a1a2e;
        padding: 8px;
        border-radius: 8px;
    }
    .rfi-overlay-cell {
        aspect-ratio: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-size: clamp(10px, 3vw, 16px);
        font-weight: bold;
        border-radius: 3px;
        position: relative;
        overflow: hidden;
        color: white;
        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    }
    .rfi-overlay-cell .hand-name {
        z-index: 2;
        position: relative;
    }
    .rfi-overlay-cell .pos-bars {
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        display: flex;
        height: 100%;
    }
    .rfi-overlay-cell .pos-bar {
        flex: 1;
        height: 100%;
    }
    </style>
    """

    html = css + '<div class="rfi-overlay-grid">'

    for i, r1 in enumerate(RANKS):
        for j, r2 in enumerate(RANKS):
            if i == j:
                hand = f"{r1}{r2}"
            elif i < j:
                hand = f"{r1}{r2}s"
            else:
                hand = f"{r2}{r1}o"

            positions = get_hand_positions(hand, ranges)

            if positions:
                # Create color bars for each position
                bars_html = '<div class="pos-bars">'
                for pos in positions:
                    color = POSITION_COLORS[pos]
                    bars_html += f'<div class="pos-bar" style="background: {color};"></div>'
                bars_html += '</div>'
                bg_style = ""
                text_style = ""
            elif hand in get_drillable_set():
                bars_html = ""
                bg_style = "background: #374151;"
                text_style = ""
            else:
                # Garbage hand - light gray text
                bars_html = ""
                bg_style = "background: #374151;"
                text_style = "color: #6b7280; text-shadow: none;"

            html += f'<div class="rfi-overlay-cell" style="{bg_style}">{bars_html}<span class="hand-name" style="{text_style}">{hand}</span></div>'

    html += '</div>'
    st.markdown(html, unsafe_allow_html=True)

    # Description
    desc = "每格顯示所有可開池的位置（顏色條）。例如 AA 有5條顏色 = 所有位置都開。" if lang == "zh" else "Each cell shows all positions that can open (color bars). e.g., AA has 5 colors = all positions open."
    st.caption(desc)


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

    # Build grid HTML
    css = """
    <style>
    .rfi-earliest-grid {
        display: grid;
        grid-template-columns: repeat(13, 1fr);
        gap: 2px;
        width: 100%;
        max-width: min(555px, calc(100vw - 40px));
        margin: 10px auto;
        background: #1a1a2e;
        padding: 8px;
        border-radius: 8px;
    }
    .rfi-earliest-cell {
        aspect-ratio: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        padding-top: 4px;
        border-radius: 3px;
        color: white;
        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
        padding-left: 2px;
        padding-right: 2px;
        line-height: 1.1;
    }
    .rfi-earliest-cell .hand-name {
        font-size: clamp(11px, 3vw, 16px);
        font-weight: bold;
    }
    .rfi-earliest-cell .pos-name {
        font-size: clamp(9px, 2.5vw, 14px);
        font-weight: normal;
        opacity: 0.9;
    }
    .rfi-earliest-cell.fold {
        background: #374151;
        color: white;
        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    }
    .rfi-earliest-cell.garbage {
        background: #374151;
        color: #6b7280;
        text-shadow: none;
    }
    </style>
    """

    html = css + '<div class="rfi-earliest-grid">'

    for i, r1 in enumerate(RANKS):
        for j, r2 in enumerate(RANKS):
            if i == j:
                hand = f"{r1}{r2}"
            elif i < j:
                hand = f"{r1}{r2}s"
            else:
                hand = f"{r2}{r1}o"

            earliest = get_earliest_position(hand, ranges)

            if earliest:
                hex_color = POSITION_COLORS[earliest]
                opacity = POSITION_OPACITY[earliest]
                rgba_color = hex_to_rgba(hex_color, opacity)

                # Add white border for premium 3-bet hands in UTG range
                if earliest == "UTG" and hand in PREMIUM_3BET_HANDS:
                    border_style = "border: 2px solid white;"
                else:
                    border_style = ""

                html += f'<div class="rfi-earliest-cell" style="background: {rgba_color}; {border_style}"><span class="hand-name">{hand}</span><span class="pos-name">{earliest}</span></div>'
            elif hand in get_drillable_set():
                html += f'<div class="rfi-earliest-cell fold"><span class="hand-name">{hand}</span></div>'
            else:
                html += f'<div class="rfi-earliest-cell garbage"><span class="hand-name">{hand}</span></div>'

    html += '</div>'
    st.markdown(html, unsafe_allow_html=True)

    # Description
    desc = "每格顯示「最早可開池」的位置顏色。白框 = 適合3bet的強牌。透明度越低表示位置越後面。" if lang == "zh" else "Each cell shows the earliest position that can open. White border = premium 3-bet hands. Lower opacity = later position."
    st.caption(desc)


def display_rfi_charts(evaluator: Evaluator, lang: str = "zh"):
    """Display both RFI chart styles."""
    tab_labels = ["📍 最早可開位置", "🎨 所有位置疊加"] if lang == "zh" else ["📍 Earliest Position", "🎨 All Positions"]

    tab1, tab2 = st.tabs(tab_labels)

    with tab1:
        display_rfi_chart_earliest(evaluator, lang)

    with tab2:
        display_rfi_chart_overlay(evaluator, lang)
