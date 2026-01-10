"""
13x13 Range Grid component for visualizing poker ranges.
"""
import streamlit as st
import pandas as pd
from typing import List, Dict, Set

RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']


def create_range_grid(
    raise_hands: List[str] = None,
    call_hands: List[str] = None,
    fold_hands: List[str] = None,
    highlight_hand: str = None,
) -> pd.DataFrame:
    """
    Create a 13x13 DataFrame representing the range grid.

    Returns DataFrame with values:
    - 'R' for raise/3bet/4bet/5bet
    - 'C' for call
    - 'F' for fold
    - 'H' for highlighted hand
    """
    raise_hands = set(raise_hands or [])
    call_hands = set(call_hands or [])

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
            else:
                row.append('F')
        grid.append(row)

    return pd.DataFrame(grid, index=RANKS, columns=RANKS)


def display_range_grid(
    raise_hands: List[str] = None,
    call_hands: List[str] = None,
    highlight_hand: str = None,
    show_legend: bool = True,
    key: str = "range_grid",
):
    """
    Display an interactive range grid using Streamlit.
    """
    raise_hands = raise_hands or []
    call_hands = call_hands or []

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

            if hand in raise_hands:
                action = "raise"
            elif hand in call_hands:
                action = "call"
            else:
                action = "fold"

            is_highlight = (highlight_hand == hand)

            row_data.append({
                "hand": hand,
                "type": hand_type,
                "action": action,
                "highlight": is_highlight,
            })
        grid_data.append(row_data)

    # Display using custom HTML/CSS for better visualization
    html = _generate_grid_html(grid_data, highlight_hand)
    st.markdown(html, unsafe_allow_html=True)

    if show_legend:
        _display_legend()

    # Show stats
    total = len(raise_hands) + len(call_hands)
    st.caption(f"Range: {len(raise_hands)} raise, {len(call_hands)} call ({total}/169 = {total/169*100:.1f}%)")


def _generate_grid_html(grid_data: List[List[Dict]], highlight_hand: str = None) -> str:
    """Generate HTML for the range grid."""
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
    .range-cell.highlight {
        background-color: #f59e0b !important;
        color: black !important;
        box-shadow: 0 0 0 3px #fbbf24;
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
    </style>
    """

    html = css + '<div class="range-grid">'

    for row in grid_data:
        for cell in row:
            classes = f"range-cell {cell['action']} {cell['type']}"
            if cell['highlight']:
                classes += " highlight"
            html += f'<div class="{classes}">{cell["hand"]}</div>'

    html += '</div>'
    return html


def _display_legend():
    """Display the color legend."""
    st.markdown("""
    <div style="display: flex; gap: 20px; justify-content: center; margin: 10px 0;">
        <span><span style="background: #22c55e; color: white; padding: 2px 8px; border-radius: 3px;">R</span> Raise/3bet</span>
        <span><span style="background: #3b82f6; color: white; padding: 2px 8px; border-radius: 3px;">C</span> Call</span>
        <span><span style="background: #374151; color: #9ca3af; padding: 2px 8px; border-radius: 3px;">F</span> Fold</span>
        <span><span style="background: #f59e0b; color: black; padding: 2px 8px; border-radius: 3px;">H</span> Current Hand</span>
    </div>
    """, unsafe_allow_html=True)


def display_simple_grid(hands_in_range: Set[str], title: str = "Range"):
    """Display a simple range grid without interactivity."""
    st.subheader(title)
    display_range_grid(raise_hands=list(hands_in_range), show_legend=False)
