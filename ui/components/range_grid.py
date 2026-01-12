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
):
    """
    Display an interactive range grid using Streamlit.
    Supports mixed frequency hands with gradient colors.

    Args:
        drillable_hands: If provided, hands NOT in this list will be dimmed.
                         Used to show which hands are in the drilling focus.
    """
    raise_hands = raise_hands or []
    call_hands = call_hands or []
    mixed_raise = mixed_raise or []
    mixed_call = mixed_call or []

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

            if hand in raise_set:
                action = "raise"
            elif hand in call_set:
                action = "call"
            elif hand in mixed_raise_set:
                action = "mixed-raise"
            elif hand in mixed_call_set:
                action = "mixed-call"
            else:
                action = "fold"

            is_highlight = (highlight_hand == hand)
            is_drillable = drillable_set is None or hand in drillable_set

            row_data.append({
                "hand": hand,
                "type": hand_type,
                "action": action,
                "highlight": is_highlight,
                "drillable": is_drillable,
            })
        grid_data.append(row_data)

    # Display using custom HTML/CSS for better visualization
    html = _generate_grid_html(grid_data, highlight_hand)
    st.markdown(html, unsafe_allow_html=True)

    if show_legend:
        has_mixed = len(mixed_raise) > 0 or len(mixed_call) > 0
        has_drillable = drillable_set is not None
        has_call = len(call_hands) > 0 or len(mixed_call) > 0
        _display_legend(show_mixed=has_mixed, show_drillable=has_drillable, show_call=has_call)

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


def _generate_grid_html(grid_data: List[List[Dict]], highlight_hand: str = None) -> str:
    """Generate HTML for the range grid with mixed frequency support."""
    css = """
    <style>
    .range-grid {
        display: grid;
        grid-template-columns: repeat(13, 1fr);
        gap: 2px;
        max-width: 500px;
        margin: 10px auto;
    }
    .range-cell {
        aspect-ratio: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: bold;
        border-radius: 3px;
        cursor: default;
        min-width: 32px;
        min-height: 32px;
        position: relative;
    }
    .range-cell.raise {
        background-color: #22c55e;
        color: white;
    }
    .range-cell.call {
        background-color: #3b82f6;
        color: white;
    }
    .range-cell.fold {
        background-color: #374151;
        color: #9ca3af;
    }
    /* Mixed raise: green with diagonal stripes */
    .range-cell.mixed-raise {
        background: linear-gradient(
            135deg,
            #22c55e 25%,
            #374151 25%,
            #374151 50%,
            #22c55e 50%,
            #22c55e 75%,
            #374151 75%,
            #374151 100%
        );
        background-size: 8px 8px;
        color: white;
        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    }
    /* Mixed call: blue with diagonal stripes */
    .range-cell.mixed-call {
        background: linear-gradient(
            135deg,
            #3b82f6 25%,
            #374151 25%,
            #374151 50%,
            #3b82f6 50%,
            #3b82f6 75%,
            #374151 75%,
            #374151 100%
        );
        background-size: 8px 8px;
        color: white;
        text-shadow: 0 1px 2px rgba(0,0,0,0.5);
    }
    .range-cell.highlight {
        background: #f59e0b !important;
        color: black !important;
        box-shadow: 0 0 0 3px #fbbf24;
        text-shadow: none;
    }
    .range-cell.pair {
        font-style: normal;
    }
    .range-cell.suited {
        font-style: normal;
    }
    .range-cell.offsuit {
        font-style: normal;
    }
    /* Tooltip for mixed hands */
    .range-cell.mixed-raise:hover::after,
    .range-cell.mixed-call:hover::after {
        content: "Mixed";
        position: absolute;
        bottom: -20px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 9px;
        white-space: nowrap;
        z-index: 10;
    }
    /* Dimmed hands (not in drilling focus) */
    .range-cell.dimmed {
        opacity: 0.35;
        filter: grayscale(30%);
    }
    .range-cell.dimmed:not(.highlight) {
        transform: scale(0.95);
    }
    </style>
    """

    html = css + '<div class="range-grid">'

    for row in grid_data:
        for cell in row:
            classes = f"range-cell {cell['action']} {cell['type']}"
            if cell['highlight']:
                classes += " highlight"
            if not cell.get('drillable', True):
                classes += " dimmed"
            html += f'<div class="{classes}">{cell["hand"]}</div>'

    html += '</div>'
    return html


def _display_legend(show_mixed: bool = False, show_drillable: bool = False, show_call: bool = True):
    """Display the color legend with optional mixed frequency and drillable indicators."""
    mixed_html = '<span style="margin-right: 10px;"><span style="background: linear-gradient(135deg, #22c55e 50%, #374151 50%); color: white; padding: 2px 8px; border-radius: 3px; text-shadow: 0 1px 2px rgba(0,0,0,0.5);">M</span> Mixed</span>' if show_mixed else ""
    drillable_html = '<span style="margin-right: 10px;"><span style="background: #374151; color: #9ca3af; padding: 2px 8px; border-radius: 3px; opacity: 0.35;">dim</span> 非出題範圍</span>' if show_drillable else ""
    call_html = '<span style="margin-right: 10px;"><span style="background: #3b82f6; color: white; padding: 2px 8px; border-radius: 3px;">C</span> Call</span>' if show_call else ""

    # Use single-line HTML to avoid rendering issues
    html = f'<div style="display: flex; gap: 15px; justify-content: center; margin: 10px 0; flex-wrap: wrap;"><span style="margin-right: 10px;"><span style="background: #22c55e; color: white; padding: 2px 8px; border-radius: 3px;">R</span> Raise/3bet</span>{call_html}<span style="margin-right: 10px;"><span style="background: #374151; color: #9ca3af; padding: 2px 8px; border-radius: 3px;">F</span> Fold</span>{mixed_html}<span><span style="background: #f59e0b; color: black; padding: 2px 8px; border-radius: 3px;">H</span> Current Hand</span>{drillable_html}</div>'
    st.markdown(html, unsafe_allow_html=True)


def display_simple_grid(hands_in_range: Set[str], title: str = "Range"):
    """Display a simple range grid without interactivity."""
    st.subheader(title)
    display_range_grid(raise_hands=list(hands_in_range), show_legend=False)
