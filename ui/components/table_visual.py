"""
Poker table visualization component.
Shows seat positions and highlights hero/villain.
"""
import streamlit as st
from typing import Optional
from core.position import Position, POSITIONS_6MAX, POSITIONS_9MAX


def display_table_6max(
    hero_position: Position,
    villain_position: Optional[Position] = None,
    show_action: str = None,
):
    """
    Display a 6-max poker table with positions highlighted.

    Layout (oval table from above):

            [SB]  [BB]
        [BTN]        [UTG]
            [CO]  [HJ]
    """

    # Position coordinates for 6-max (relative positions)
    # Format: (left%, top%)
    positions_6max = {
        Position.SB: ("35%", "5%"),
        Position.BB: ("55%", "5%"),
        Position.UTG: ("80%", "40%"),
        Position.HJ: ("60%", "75%"),
        Position.CO: ("30%", "75%"),
        Position.BTN: ("10%", "40%"),
    }

    html = _generate_table_html(
        positions=positions_6max,
        hero_position=hero_position,
        villain_position=villain_position,
        show_action=show_action,
        table_type="6-max",
    )

    st.markdown(html, unsafe_allow_html=True)


def display_table_9max(
    hero_position: Position,
    villain_position: Optional[Position] = None,
    show_action: str = None,
):
    """
    Display a 9-max poker table with positions highlighted.
    """
    # Position coordinates for 9-max
    positions_9max = {
        Position.SB: ("40%", "5%"),
        Position.BB: ("55%", "5%"),
        Position.UTG: ("75%", "15%"),
        Position.UTG1: ("85%", "35%"),
        Position.UTG2: ("85%", "55%"),
        Position.MP: ("75%", "75%"),
        Position.HJ: ("55%", "85%"),
        Position.CO: ("35%", "85%"),
        Position.BTN: ("15%", "55%"),
    }

    html = _generate_table_html(
        positions=positions_9max,
        hero_position=hero_position,
        villain_position=villain_position,
        show_action=show_action,
        table_type="9-max",
    )

    st.markdown(html, unsafe_allow_html=True)


def _generate_table_html(
    positions: dict,
    hero_position: Position,
    villain_position: Optional[Position],
    show_action: str,
    table_type: str,
) -> str:
    """Generate HTML for the poker table visualization."""

    css = """
    <style>
    .poker-table-container {
        position: relative;
        width: 100%;
        max-width: 400px;
        height: 200px;
        margin: 10px auto;
    }
    .poker-table {
        position: absolute;
        width: 80%;
        height: 70%;
        left: 10%;
        top: 15%;
        background: linear-gradient(145deg, #1a5f3c 0%, #0d3d25 100%);
        border-radius: 100px;
        border: 8px solid #8B4513;
        box-shadow: 0 4px 15px rgba(0,0,0,0.5), inset 0 0 30px rgba(0,0,0,0.3);
    }
    .table-label {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: rgba(255,255,255,0.3);
        font-size: 14px;
        font-weight: bold;
    }
    .seat {
        position: absolute;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 11px;
        font-weight: bold;
        transform: translate(-50%, -50%);
        transition: all 0.3s ease;
        border: 3px solid transparent;
    }
    .seat.empty {
        background: #374151;
        color: #9ca3af;
        border-color: #4b5563;
    }
    .seat.hero {
        background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
        color: #000;
        border-color: #fcd34d;
        box-shadow: 0 0 15px rgba(251, 191, 36, 0.6);
        animation: pulse-hero 2s infinite;
    }
    .seat.villain {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: #fff;
        border-color: #f87171;
        box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
    }
    .seat.folded {
        background: #1f2937;
        color: #6b7280;
        border-color: #374151;
        opacity: 0.5;
    }
    .seat-label {
        font-size: 10px;
        position: absolute;
        bottom: -18px;
        left: 50%;
        transform: translateX(-50%);
        color: #9ca3af;
        white-space: nowrap;
    }
    .hero .seat-label {
        color: #fbbf24;
        font-weight: bold;
    }
    .villain .seat-label {
        color: #ef4444;
    }
    .action-indicator {
        position: absolute;
        top: -20px;
        left: 50%;
        transform: translateX(-50%);
        background: #ef4444;
        color: white;
        padding: 2px 8px;
        border-radius: 10px;
        font-size: 10px;
        white-space: nowrap;
    }
    .dealer-button {
        position: absolute;
        width: 20px;
        height: 20px;
        background: white;
        color: #000;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 8px;
        font-weight: bold;
        border: 2px solid #ccc;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    }
    @keyframes pulse-hero {
        0%, 100% { box-shadow: 0 0 15px rgba(251, 191, 36, 0.6); }
        50% { box-shadow: 0 0 25px rgba(251, 191, 36, 0.9); }
    }
    .legend {
        display: flex;
        justify-content: center;
        gap: 20px;
        margin-top: 5px;
        font-size: 11px;
    }
    .legend-item {
        display: flex;
        align-items: center;
        gap: 5px;
    }
    .legend-dot {
        width: 12px;
        height: 12px;
        border-radius: 50%;
    }
    .legend-dot.hero { background: #fbbf24; }
    .legend-dot.villain { background: #ef4444; }
    .legend-dot.folded { background: #374151; }
    </style>
    """

    html = css + f'''
    <div class="poker-table-container">
        <div class="poker-table">
            <div class="table-label">{table_type}</div>
        </div>
    '''

    # Add seats
    for pos, (left, top) in positions.items():
        seat_class = "seat"
        action_html = ""

        if pos == hero_position:
            seat_class += " hero"
        elif pos == villain_position:
            seat_class += " villain"
            if show_action:
                action_html = f'<div class="action-indicator">{show_action}</div>'
        else:
            seat_class += " folded"

        # Add dealer button near BTN
        dealer_html = ""
        if pos == Position.BTN:
            dealer_html = '<div class="dealer-button" style="position: absolute; top: -5px; right: -5px;">D</div>'

        html += f'''
        <div class="{seat_class}" style="left: {left}; top: {top};">
            {action_html}
            {pos.value}
            {dealer_html}
            <span class="seat-label">{"YOU" if pos == hero_position else ("" if pos == villain_position else "")}</span>
        </div>
        '''

    html += '''
    </div>
    <div class="legend">
        <div class="legend-item"><div class="legend-dot hero"></div>You</div>
        <div class="legend-item"><div class="legend-dot villain"></div>Opponent</div>
        <div class="legend-item"><div class="legend-dot folded"></div>Folded</div>
    </div>
    '''

    return html


def display_table(
    hero_position: Position,
    villain_position: Optional[Position] = None,
    show_action: str = None,
    format: str = "6max",
):
    """Display poker table based on format."""
    if format == "9max":
        display_table_9max(hero_position, villain_position, show_action)
    else:
        display_table_6max(hero_position, villain_position, show_action)
