"""
13x13 Range Grid component for visualizing poker ranges.
Supports mixed frequency visualization with gradient colors.
"""
import streamlit as st
import pandas as pd
from typing import List, Dict, Set, Optional

RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']


def create_range_grid(
    raise_hands: List[str] = None,
    call_hands: List[str] = None,
    fold_hands: List[str] = None,
    highlight_hand: str = None,
    mixed_raise: List[str] = None,
    mixed_call: List[str] = None,
) -> pd.DataFrame:
    """
    Create a 13x13 DataFrame representing the range grid.

    Returns DataFrame with values:
    - 'R' for raise/3bet/4bet/5bet
    - 'C' for call
    - 'F' for fold
    - 'H' for highlighted hand
    - 'MR' for mixed raise (raise with some frequency)
    - 'MC' for mixed call (call with some frequency)
    """
    raise_hands = set(raise_hands or [])
    call_hands = set(call_hands or [])
    mixed_raise = set(mixed_raise or [])
    mixed_call = set(mixed_call or [])

    grid = []
    for i, r1 in enumerate(RANKS):
        row = []
        for j, r2 in enumerate(RANKS):
            if i == j:
                # Pocket pair (diagonal)
                hand = f"{r1}{r2}"
            elif i < j:
                # Suited (above diagonal)
                hand = f"{r1}{r2}s"
            else:
                # Offsuit (below diagonal)
                hand = f"{r2}{r1}o"

            if highlight_hand and hand == highlight_hand:
                row.append('H')
            elif hand in raise_hands:
                row.append('R')
            elif hand in call_hands:
                row.append('C')
            elif hand in mixed_raise:
                row.append('MR')
            elif hand in mixed_call:
                row.append('MC')
            else:
                row.append('F')
        grid.append(row)

    return pd.DataFrame(grid, index=RANKS, columns=RANKS)


def display_range_grid(
    raise_hands: List[str] = None,
    call_hands: List[str] = None,
    highlight_hand: str = None,
    show_legend: bool = True,
    show_stats: bool = True,
    key: str = "range_grid",
    mixed_raise: List[str] = None,
    mixed_call: List[str] = None,
    drillable_hands: List[str] = None,
    frequencies: Dict[str, Dict[str, int]] = None,
):
    """
    Display an interactive range grid using Streamlit.
    Supports mixed frequency hands with gradient colors.

    Args:
        drillable_hands: If provided, hands NOT in this list will be dimmed.
                         Used to show which hands are in the drilling focus.
        frequencies: Dict of hand -> {action: frequency%}, e.g. {"A5s": {"raise": 70}}
    """
    raise_hands = raise_hands or []
    call_hands = call_hands or []
    mixed_raise = mixed_raise or []
    mixed_call = mixed_call or []
    frequencies = frequencies or {}

    # Create sets for faster lookup
    raise_set = set(raise_hands)
    call_set = set(call_hands)
    mixed_raise_set = set(mixed_raise)
    mixed_call_set = set(mixed_call)
    drillable_set = set(drillable_hands) if drillable_hands else None

    # Create the grid data
    grid_data = []
    for i, r1 in enumerate(RANKS):
        row_data = []
        for j, r2 in enumerate(RANKS):
            if i == j:
                hand = f"{r1}{r2}"
                hand_type = "pair"
            elif i < j:
                hand = f"{r1}{r2}s"
                hand_type = "suited"
            else:
                hand = f"{r2}{r1}o"
                hand_type = "offsuit"

            # Get frequency for this hand
            hand_freq = frequencies.get(hand, {})
            # Support multiple action types: raise, 3bet, 4bet, 5bet
            raise_freq = hand_freq.get("raise", 0) or hand_freq.get("3bet", 0) or hand_freq.get("4bet", 0) or hand_freq.get("5bet", 0)
            call_freq = hand_freq.get("call", 0)

            # Determine action based on frequency or existing logic
            if frequencies:
                # GTOWizard style: Red=Raise/3bet/4bet, Green=Call, Blue=Fold
                if raise_freq >= 100:
                    action = "raise"
                    freq = 100
                elif call_freq >= 100:
                    action = "call"
                    freq = 100
                elif raise_freq >= 70 and call_freq == 0:
                    action = "raise"  # Solid raise
                    freq = raise_freq
                elif call_freq >= 70 and raise_freq == 0:
                    action = "call"  # Solid call
                    freq = call_freq
                elif raise_freq > 0 and call_freq > 0:
                    # Mixed raise/call - show split based on dominant action
                    if raise_freq >= call_freq:
                        action = "mixed-raise-call"
                        freq = raise_freq
                    else:
                        action = "mixed-call-raise"
                        freq = call_freq
                elif raise_freq > 0:
                    # Mixed raise/fold
                    if raise_freq >= 50:
                        action = "raise-mixed"
                    else:
                        action = "fold-mixed"
                    freq = raise_freq
                elif call_freq > 0:
                    # Mixed call/fold
                    if call_freq >= 50:
                        action = "call-mixed"
                    else:
                        action = "fold-mixed-call"
                    freq = call_freq
                else:
                    action = "fold"
                    freq = 0
            else:
                # Legacy logic
                if hand in raise_set:
                    action = "raise"
                    freq = 100
                elif hand in call_set:
                    action = "call"
                    freq = 100
                elif hand in mixed_raise_set:
                    action = "mixed-raise"
                    freq = 50
                elif hand in mixed_call_set:
                    action = "mixed-call"
                    freq = 50
                else:
                    action = "fold"
                    freq = 0

            is_highlight = (highlight_hand == hand)
            is_drillable = drillable_set is None or hand in drillable_set

            # Compute raise_freq and call_freq for legacy mode
            if frequencies:
                legacy_raise_freq = raise_freq
                legacy_call_freq = call_freq
            else:
                # Legacy: action determines freq
                if action == "raise":
                    legacy_raise_freq = 100
                elif action in ("mixed-raise", "raise-mixed"):
                    legacy_raise_freq = 50
                else:
                    legacy_raise_freq = 0

                if action == "call":
                    legacy_call_freq = 100
                elif action in ("mixed-call", "call-mixed"):
                    legacy_call_freq = 50
                else:
                    legacy_call_freq = 0

            row_data.append({
                "hand": hand,
                "type": hand_type,
                "action": action,
                "highlight": is_highlight,
                "drillable": is_drillable,
                "freq": freq,
                "raise_freq": legacy_raise_freq,
                "call_freq": legacy_call_freq,
            })
        grid_data.append(row_data)

    # Use containers to control display order:
    # - Legend (radio) runs FIRST to update session state
    # - Grid displays AFTER with updated filter value
    grid_container = st.container()
    legend_container = st.container()

    # Step 1: Display legend FIRST (to update session state)
    active_filter = None
    if show_legend:
        with legend_container:
            has_mixed = len(mixed_raise) > 0 or len(mixed_call) > 0
            has_drillable = drillable_set is not None
            has_call = len(call_hands) > 0 or len(mixed_call) > 0
            has_frequency = bool(frequencies)
            active_filter = _display_legend(show_mixed=has_mixed, show_drillable=has_drillable, show_call=has_call, show_frequency=has_frequency, key=key)

    # Step 2: Display grid with updated filter
    with grid_container:
        html = _generate_grid_html(grid_data, highlight_hand, active_filter)
        st.markdown(html, unsafe_allow_html=True)

    # Show stats (optional)
    if show_stats:
        total_pure = len(raise_hands) + len(call_hands)
        total_mixed = len(mixed_raise) + len(mixed_call)
        total = total_pure + total_mixed
        stats_text = f"Range: {len(raise_hands)} raise, {len(call_hands)} call"
        if total_mixed > 0:
            stats_text += f", {total_mixed} mixed"
        stats_text += f" ({total}/169 = {total/169*100:.1f}%)"
        st.caption(stats_text)


def _generate_grid_html(grid_data: List[List[Dict]], highlight_hand: str = None, active_filter: str = None) -> str:
    """Generate HTML for the range grid with GTOWizard-style proportional gradients.

    Args:
        active_filter: If set, only hands matching this filter are shown brightly.
                      Options: "raise", "call", "fold", "mixed", "highlight", "non_drillable"
    """
    css = """
    <style>
    .range-grid {
        display: grid;
        grid-template-columns: repeat(13, 1fr);
        gap: 1px;
        width: 100%;
        max-width: min(100%, 500px);
        margin: 8px auto;
        overflow: visible;
    }
    @media (min-width: 768px) {
        .range-grid {
            max-width: min(100%, 520px);
        }
    }
    .range-cell {
        aspect-ratio: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: clamp(10px, 3vw, 15px);
        font-weight: bold;
        border-radius: 2px;
        cursor: pointer;
        min-width: 0;
        min-height: 0;
        position: relative;
        overflow: visible;
        color: white;
        text-shadow: 0 1px 2px rgba(0,0,0,0.3);
        transition: transform 0.15s ease, z-index 0s;
    }
    .range-cell:hover {
        transform: scale(1.3);
        z-index: 100;
        box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    }
    .range-cell.highlight {
        box-shadow: 0 0 0 3px white;
        z-index: 1;
    }
    .range-cell.dimmed {
        opacity: 0.80;
    }
    .range-cell.filtered-out {
        opacity: 0.5 !important;
        filter: grayscale(50%);
    }
    /* Custom tooltip - default shows above */
    .range-cell .tooltip {
        visibility: hidden;
        opacity: 0;
        position: absolute;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(15, 23, 42, 0.95);
        color: white;
        padding: 6px 10px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: normal;
        white-space: nowrap;
        z-index: 1000;
        pointer-events: none;
        transition: opacity 0.2s ease, visibility 0.2s ease;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        margin-bottom: 6px;
        text-shadow: none;
    }
    .range-cell .tooltip::after {
        content: '';
        position: absolute;
        top: 100%;
        left: 50%;
        transform: translateX(-50%);
        border: 6px solid transparent;
        border-top-color: rgba(15, 23, 42, 0.95);
    }
    /* Top rows: show tooltip below instead */
    .range-cell.top-row .tooltip {
        bottom: auto;
        top: 100%;
        margin-bottom: 0;
        margin-top: 6px;
    }
    .range-cell.top-row .tooltip::after {
        top: auto;
        bottom: 100%;
        border-top-color: transparent;
        border-bottom-color: rgba(15, 23, 42, 0.95);
    }
    .range-cell:hover .tooltip {
        visibility: visible;
        opacity: 1;
    }
    .tooltip .freq-raise { color: #f87171; font-weight: bold; }
    .tooltip .freq-call { color: #4ade80; font-weight: bold; }
    .tooltip .freq-fold { color: #60a5fa; font-weight: bold; }
    .tooltip .hand-name { color: #fbbf24; font-weight: bold; margin-right: 6px; }
    </style>
    """

    # GTOWizard colors: Red=Raise, Green=Call, Blue=Fold
    COLOR_RAISE = "#ef4444"
    COLOR_CALL = "#22c55e"
    COLOR_FOLD = "#3b82f6"

    html = css + '<div style="width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch;"><div class="range-grid">'

    for row_idx, row in enumerate(grid_data):
        for cell in row:
            raise_freq = cell.get('raise_freq', 0)
            call_freq = cell.get('call_freq', 0)
            fold_freq = 100 - raise_freq - call_freq
            is_mixed = raise_freq > 0 and raise_freq < 100

            # Determine if this cell matches the active filter
            matches_filter = True
            if active_filter:
                if active_filter == "raise":
                    matches_filter = raise_freq > 0
                elif active_filter == "call":
                    matches_filter = call_freq > 0
                elif active_filter == "fold":
                    matches_filter = fold_freq > 0  # 包含有 fold 成分的手牌
                elif active_filter == "mixed":
                    matches_filter = is_mixed or (call_freq > 0 and call_freq < 100)
                elif active_filter == "highlight":
                    matches_filter = cell.get('highlight', False)
                elif active_filter == "non_drillable":
                    matches_filter = not cell.get('drillable', True)

            # Build inline background style based on frequencies
            if cell['highlight']:
                classes = f"range-cell {cell['type']} highlight"
            else:
                classes = f"range-cell {cell['type']}"
                if not cell.get('drillable', True):
                    classes += " dimmed"

            # Apply filter dimming (stronger than drillable dimming)
            if active_filter and not matches_filter:
                classes += " filtered-out"

            # Add top-row class for first 2 rows (tooltip shows below)
            if row_idx < 2:
                classes += " top-row"

            # Generate GTOWizard-style proportional gradient (top to bottom)
            if raise_freq >= 100:
                bg_style = f"background:{COLOR_RAISE};"
            elif call_freq >= 100:
                bg_style = f"background:{COLOR_CALL};"
            elif raise_freq == 0 and call_freq == 0:
                bg_style = f"background:{COLOR_FOLD};"
            else:
                # Mixed strategy: build gradient stops
                # Order: Raise (top/red) → Call (middle/green) → Fold (bottom/blue)
                stops = []
                current_pos = 0

                if raise_freq > 0:
                    stops.append(f"{COLOR_RAISE} {current_pos}%")
                    current_pos += raise_freq
                    stops.append(f"{COLOR_RAISE} {current_pos}%")

                if call_freq > 0:
                    stops.append(f"{COLOR_CALL} {current_pos}%")
                    current_pos += call_freq
                    stops.append(f"{COLOR_CALL} {current_pos}%")

                if fold_freq > 0:
                    stops.append(f"{COLOR_FOLD} {current_pos}%")
                    stops.append(f"{COLOR_FOLD} 100%")

                bg_style = f"background:linear-gradient(to right,{','.join(stops)});"

            # Build styled tooltip with frequency info
            tooltip_html = ""
            if raise_freq > 0 or call_freq > 0:
                tooltip_parts = []
                tooltip_parts.append(f'<span class="hand-name">{cell["hand"]}</span>')
                if raise_freq > 0:
                    tooltip_parts.append(f'<span class="freq-raise">R:{raise_freq}%</span>')
                if call_freq > 0:
                    tooltip_parts.append(f'<span class="freq-call">C:{call_freq}%</span>')
                if fold_freq > 0:
                    tooltip_parts.append(f'<span class="freq-fold">F:{fold_freq}%</span>')
                tooltip_html = f'<span class="tooltip">{" ".join(tooltip_parts)}</span>'
            elif fold_freq == 100:
                tooltip_html = f'<span class="tooltip"><span class="hand-name">{cell["hand"]}</span> <span class="freq-fold">Fold 100%</span></span>'

            html += f'<div class="{classes}" style="{bg_style}">{cell["hand"]}{tooltip_html}</div>'

    html += '</div></div>'
    return html


def _display_legend(show_mixed: bool = False, show_drillable: bool = False, show_call: bool = True, show_frequency: bool = False, key: str = "range_grid"):
    """Display colored legend with filter selection - GTOWizard style."""

    # Initialize filter state
    filter_key = f"{key}_filter"
    if filter_key not in st.session_state:
        st.session_state[filter_key] = "全部"

    # Build original colored HTML legend
    drillable_html = '<span style="margin-left: 10px;"><span style="background: #374151; color: #9ca3af; padding: 2px 8px; border-radius: 3px; opacity: 0.80;">⬛</span> 非出題範圍</span>' if show_drillable else ""
    call_html = '<span style="margin-right: 10px;"><span style="background: #22c55e; color: white; padding: 2px 8px; border-radius: 3px;">C</span> Call</span>' if show_call else ""
    mixed_html = ""
    if show_mixed or show_frequency:
        mixed_html = '<span style="margin-right: 10px;"><span style="background: linear-gradient(to right, #ef4444 0%, #ef4444 70%, #3b82f6 70%, #3b82f6 100%); color: white; padding: 2px 8px; border-radius: 3px; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">M</span> Mixed</span>'

    html = f'<div style="display: flex; gap: 15px; justify-content: center; margin: 8px 0; flex-wrap: wrap; font-size: 14px;"><span style="margin-right: 10px;"><span style="background: #ef4444; color: white; padding: 2px 8px; border-radius: 3px;">R</span> Raise</span>{call_html}<span style="margin-right: 10px;"><span style="background: #3b82f6; color: white; padding: 2px 8px; border-radius: 3px;">F</span> Fold</span>{mixed_html}{drillable_html}</div>'
    st.markdown(html, unsafe_allow_html=True)

    # Filter options - fixed order: 全部, Raise, Call, Fold, Mixed, 非出題
    filter_options = ["全部", "🔴 Raise"]
    if show_call:
        filter_options.append("🟢 Call")
    filter_options.append("🔵 Fold")
    if show_mixed or show_frequency:
        filter_options.append("🟣 Mixed")
    if show_drillable:
        filter_options.append("⬛ 非出題")

    # Center the radio using columns
    col1, col2, col3 = st.columns([1, 6, 1])
    with col2:
        selected = st.radio(
            "篩選顯示",
            filter_options,
            index=filter_options.index(st.session_state[filter_key]) if st.session_state[filter_key] in filter_options else 0,
            key=f"{key}_filter_radio",
            horizontal=True,
            label_visibility="collapsed"
        )
    st.session_state[filter_key] = selected

    # Convert selection to filter name
    filter_map = {
        "全部": None,
        "🔴 Raise": "raise",
        "🟢 Call": "call",
        "🔵 Fold": "fold",
        "🟣 Mixed": "mixed",
        "⬛ 非出題": "non_drillable",
    }
    return filter_map.get(selected, None)


def display_simple_grid(hands_in_range: Set[str], title: str = "Range"):
    """Display a simple range grid without interactivity."""
    st.subheader(title)
    display_range_grid(raise_hands=list(hands_in_range), show_legend=False)
