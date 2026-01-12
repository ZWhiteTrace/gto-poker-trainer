"""
Poker table visualization component.
Shows seat positions and highlights hero/villain.
"""
import streamlit as st
import streamlit.components.v1 as components
from typing import Optional
from core.position import Position, POSITIONS_6MAX, POSITIONS_9MAX


def display_table_6max(
    hero_position: Position,
    villain_position: Optional[Position] = None,
    show_action: str = None,
    bets: dict = None,
    lang: str = "zh",
    folded_positions: list = None,
):
    """
    Display a 6-max poker table with positions highlighted.
    Layout:    [SB]  [BB]
           [BTN]        [UTG]
               [CO]  [HJ]

    Args:
        folded_positions: List of positions that have folded (shown as gray/inactive)
    """
    # Table spans 17.5% to 82.5% (width 65%, centered at 50%)
    # All positions symmetric around center (50%)
    positions_6max = {
        Position.SB: ("38%", "18%"),   # 12% left of center
        Position.BB: ("62%", "18%"),   # 12% right of center (symmetric with SB)
        Position.UTG: ("86%", "47%"),  # 3.5% from table right edge
        Position.HJ: ("62%", "76%"),   # Match BB horizontal (symmetric)
        Position.CO: ("38%", "76%"),   # Match SB horizontal (symmetric)
        Position.BTN: ("14%", "47%"),  # 3.5% from table left edge
    }

    html = _generate_table_html_6max(
        positions=positions_6max,
        hero_position=hero_position,
        villain_position=villain_position,
        show_action=show_action,
        bets=bets,
        lang=lang,
        folded_positions=folded_positions or [],
    )

    components.html(html, height=355)


def display_table_9max(
    hero_position: Position,
    villain_position: Optional[Position] = None,
    show_action: str = None,
    bets: dict = None,
    lang: str = "zh",
):
    """
    Display a 9-max poker table with positions highlighted.
    Uses a larger container with even seat distribution around an oval.
    """
    # 9-max positions based on standard poker table layout
    # Adjusted for better visual balance around the oval table
    positions_9max = {
        # Bottom row (Late positions + Blinds)
        Position.BTN: ("62%", "82%"),      # Bottom right (Dealer)
        Position.SB: ("38%", "82%"),       # Bottom center-left
        Position.BB: ("10%", "65%"),       # Left side lower - slightly left
        # Left side (Early positions)
        Position.UTG: ("10%", "35%"),      # Left side upper - slightly left & up
        # Top row (Early-Mid positions) - moved down closer to table
        Position.UTG1: ("28%", "24%"),     # Top left (UTG+1) - closer to table
        Position.UTG2: ("50%", "24%"),     # Top center (MP-1) - closer to table
        Position.MP: ("72%", "24%"),       # Top right (MP-2/LJ) - closer to table
        # Right side (Middle-Late positions)
        Position.HJ: ("90%", "35%"),       # Right side upper - slightly right & up
        Position.CO: ("90%", "65%"),       # Right side lower - slightly right
    }

    html = _generate_table_html_9max(
        positions=positions_9max,
        hero_position=hero_position,
        villain_position=villain_position,
        show_action=show_action,
        bets=bets,
        lang=lang,
    )

    components.html(html, height=400)


def _generate_table_html_6max(
    positions: dict,
    hero_position: Position,
    villain_position: Optional[Position],
    show_action: str,
    bets: dict = None,
    lang: str = "zh",
    folded_positions: list = None,
) -> str:
    """Generate HTML for 6-max poker table (original structure).

    Args:
        folded_positions: List of positions that have folded (shown as gray/inactive)
    """
    bets = bets or {}
    folded_positions = folded_positions or []
    hero_label = "我" if lang == "zh" else "ME"

    css = """
    <!DOCTYPE html>
    <html>
    <head>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            background: transparent;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
    .poker-table-container {
        position: relative;
        width: 100%;
        max-width: 520px;
        height: 320px;
        margin: 5px auto;
        padding-top: 10px;
        overflow: visible;
    }
    .poker-table {
        position: absolute;
        width: 65%;
        height: 50%;
        left: 17.5%;
        top: 24%;
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
        width: 60px;
        height: 60px;
        border-radius: 50%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: bold;
        transform: translate(-50%, -50%);
        transition: all 0.3s ease;
        border: 3px solid transparent;
    }
    .seat.hero {
        background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
        color: #000;
        border: 4px solid #ffffff;
        box-shadow: 0 0 20px rgba(251, 191, 36, 0.8), 0 0 0 2px #fbbf24;
        animation: pulse-hero 2s infinite;
    }
    .seat.villain {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: #fff;
        border-color: #f87171;
        box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
    }
    .seat.blind {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: #fff;
        border-color: #60a5fa;
        box-shadow: 0 0 8px rgba(59, 130, 246, 0.5);
    }
    .seat.folded {
        background: #1f2937;
        color: #6b7280;
        border-color: #374151;
        opacity: 0.5;
    }
    .seat-label {
        font-size: 13px;
        position: absolute;
        bottom: -22px;
        left: 50%;
        transform: translateX(-50%);
        color: #000;
        white-space: nowrap;
        font-weight: bold;
        background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
        padding: 3px 14px;
        border-radius: 12px;
        box-shadow: 0 0 12px rgba(251, 191, 36, 0.8);
        animation: label-pulse 1.5s ease-in-out infinite;
    }
    .seat-label::before {
        content: "▶";
        position: absolute;
        left: -14px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 10px;
        color: #fbbf24;
        animation: arrow-bounce-left 0.8s ease-in-out infinite;
    }
    .seat-label::after {
        content: "◀";
        position: absolute;
        right: -14px;
        top: 50%;
        transform: translateY(-50%);
        font-size: 10px;
        color: #fbbf24;
        animation: arrow-bounce-right 0.8s ease-in-out infinite;
    }
    @keyframes label-pulse {
        0%, 100% {
            box-shadow: 0 0 12px rgba(251, 191, 36, 0.8);
            transform: translateX(-50%) scale(1);
        }
        50% {
            box-shadow: 0 0 20px rgba(251, 191, 36, 1);
            transform: translateX(-50%) scale(1.05);
        }
    }
    @keyframes arrow-bounce-left {
        0%, 100% { transform: translateY(-50%) translateX(0); }
        50% { transform: translateY(-50%) translateX(-3px); }
    }
    @keyframes arrow-bounce-right {
        0%, 100% { transform: translateY(-50%) translateX(0); }
        50% { transform: translateY(-50%) translateX(3px); }
    }
    .chips-label {
        font-size: 11px;
        position: absolute;
        bottom: -16px;
        left: 50%;
        transform: translateX(-50%);
        color: #60a5fa;
        white-space: nowrap;
        background: rgba(0,0,0,0.6);
        padding: 2px 6px;
        border-radius: 4px;
    }
    .chips-bet {
        color: #fca5a5;
        background: rgba(220, 38, 38, 0.8);
        border: 1px solid #ef4444;
    }
    /* Hero's chips positioned below the YOU label to avoid overlap */
    .hero-chips {
        bottom: -42px;
    }
    .action-indicator {
        position: absolute;
        top: -24px;
        left: 50%;
        transform: translateX(-50%);
        background: #ef4444;
        color: white;
        padding: 3px 10px;
        border-radius: 10px;
        font-size: 13px;
        font-weight: bold;
        white-space: nowrap;
    }
    .dealer-button {
        position: absolute;
        top: -5px;
        right: -5px;
        width: 18px;
        height: 18px;
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
        gap: 18px;
        margin-top: 8px;
        font-size: 12px;
        color: #a0aec0;
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
    .legend-dot.blind { background: #3b82f6; }
    .legend-dot.folded { background: #374151; }
    </style>
    </head>
    <body>
    """

    html = css + '''
    <div class="poker-table-container">
        <div class="poker-table">
            <div class="table-label">6-max</div>
        </div>
    '''

    for pos, (left, top) in positions.items():
        seat_class = "seat"
        action_html = ""
        label_html = ""
        chips_html = ""
        dealer_html = ""

        # Check if this position has folded (overrides blind display)
        is_folded = pos in folded_positions

        if pos == hero_position:
            seat_class += " hero"
            label_html = f'<span class="seat-label">{hero_label}</span>'
            if pos in bets:
                # Use hero-chips class to position below YOU label
                chips_html = f'<span class="chips-label chips-bet hero-chips">{bets[pos]}</span>'
        elif pos == villain_position:
            seat_class += " villain"
            if show_action:
                action_html = f'<div class="action-indicator">{show_action}</div>'
            if pos in bets:
                chips_html = f'<span class="chips-label chips-bet">{bets[pos]}</span>'
        elif is_folded:
            # Folded positions (including SB/BB in later streets)
            seat_class += " folded"
        elif pos == Position.SB:
            seat_class += " blind"
            chips_html = '<span class="chips-label">0.5bb</span>'
        elif pos == Position.BB:
            seat_class += " blind"
            chips_html = '<span class="chips-label">1bb</span>'
        else:
            seat_class += " folded"

        if pos == Position.BTN:
            dealer_html = '<div class="dealer-button">D</div>'

        html += f'''
        <div class="{seat_class}" style="left: {left}; top: {top};">
            {action_html}
            {pos.value}
            {dealer_html}
            {label_html}
            {chips_html}
        </div>
        '''

    html += '''
    </div>
    <div class="legend">
        <div class="legend-item"><div class="legend-dot hero"></div>You</div>
        <div class="legend-item"><div class="legend-dot villain"></div>Raiser</div>
        <div class="legend-item"><div class="legend-dot blind"></div>Blinds</div>
        <div class="legend-item"><div class="legend-dot folded"></div>Folded</div>
    </div>
    </body>
    </html>
    '''

    return html


def _generate_table_html(
    positions: dict,
    hero_position: Position,
    villain_position: Optional[Position],
    show_action: str,
    table_type: str,
    bets: dict = None,
) -> str:
    """Generate HTML for the poker table visualization."""
    bets = bets or {}

    # Generate seats HTML
    seats_html = ""
    for pos, (left, top) in positions.items():
        seat_class = "gto-seat"
        action_html = ""
        label_text = ""
        chips_html = ""

        if pos == hero_position:
            seat_class += " gto-hero"
            label_text = hero_label
            # Show hero's bet if any (use hero-chips class to position below hero label)
            if pos in bets:
                chips_html = f'<div class="gto-chips gto-chips-bet gto-hero-chips">{bets[pos]}</div>'
        elif pos == villain_position:
            seat_class += " gto-villain"
            if show_action:
                action_html = f'<div class="gto-action">{show_action}</div>'
            # Show villain's bet if any
            if pos in bets:
                chips_html = f'<div class="gto-chips gto-chips-bet">{bets[pos]}</div>'
        elif pos == Position.SB:
            # SB always shows as active (posted blind)
            seat_class += " gto-blind"
            chips_html = '<div class="gto-chips">0.5bb</div>'
        elif pos == Position.BB:
            # BB always shows as active (posted blind)
            seat_class += " gto-blind"
            chips_html = '<div class="gto-chips">1bb</div>'
        else:
            seat_class += " gto-folded"

        # Dealer button
        dealer_html = ""
        if pos == Position.BTN:
            dealer_html = '<div class="gto-dealer">D</div>'

        seats_html += f'''
        <div class="{seat_class}" style="left: {left}; top: {top};">
            {action_html}
            <span class="gto-pos-name">{pos.value}</span>
            {dealer_html}
            {chips_html}
            <span class="gto-label">{label_text}</span>
        </div>
        '''

    html = f'''
    <!DOCTYPE html>
    <html>
    <head>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            background: transparent;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }}
        .gto-container {{
            position: relative;
            width: 100%;
            max-width: 400px;
            height: 200px;
            margin: 10px auto;
        }}
        .gto-table {{
            position: absolute;
            width: 80%;
            height: 70%;
            left: 10%;
            top: 15%;
            background: linear-gradient(145deg, #1a5f3c 0%, #0d3d25 100%);
            border-radius: 100px;
            border: 5px solid #8B4513;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5), inset 0 0 30px rgba(0,0,0,0.3);
        }}
        .gto-table-label {{
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: rgba(255,255,255,0.2);
            font-size: 12px;
            font-weight: bold;
        }}
        .gto-seat {{
            position: absolute;
            width: 44px;
            height: 44px;
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-size: 10px;
            font-weight: bold;
            transform: translate(-50%, -50%);
            border: 3px solid transparent;
        }}
        .gto-pos-name {{
            font-size: 10px;
            font-weight: bold;
        }}
        .gto-hero {{
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
            color: #000;
            border-color: #fcd34d;
            box-shadow: 0 0 20px rgba(251, 191, 36, 0.8);
            animation: gto-pulse 1.5s ease-in-out infinite;
            z-index: 10;
        }}
        .gto-villain {{
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: #fff;
            border-color: #f87171;
            box-shadow: 0 0 15px rgba(239, 68, 68, 0.6);
            z-index: 9;
        }}
        .gto-blind {{
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: #fff;
            border-color: #60a5fa;
            box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
        }}
        .gto-folded {{
            background: #2d3748;
            color: #718096;
            border-color: #4a5568;
            opacity: 0.5;
        }}
        .gto-label {{
            position: absolute;
            bottom: -15px;
            font-size: 8px;
            color: #fbbf24;
            font-weight: bold;
        }}
        .gto-chips {{
            position: absolute;
            bottom: -14px;
            font-size: 8px;
            color: #60a5fa;
            font-weight: bold;
            background: rgba(0,0,0,0.5);
            padding: 1px 4px;
            border-radius: 3px;
        }}
        .gto-chips-bet {{
            color: #fca5a5;
            background: rgba(220, 38, 38, 0.7);
            border: 1px solid #ef4444;
        }}
        /* Hero's chips positioned below YOU label to avoid overlap */
        .gto-hero-chips {{
            bottom: -26px;
        }}
        .gto-action {{
            position: absolute;
            top: -20px;
            background: #dc2626;
            color: white;
            padding: 2px 6px;
            border-radius: 8px;
            font-size: 8px;
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }}
        .gto-dealer {{
            position: absolute;
            top: -6px;
            right: -6px;
            width: 16px;
            height: 16px;
            background: white;
            color: #000;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8px;
            font-weight: bold;
            border: 2px solid #e2e8f0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }}
        @keyframes gto-pulse {{
            0%, 100% {{ box-shadow: 0 0 20px rgba(251, 191, 36, 0.8); }}
            50% {{ box-shadow: 0 0 30px rgba(251, 191, 36, 1); }}
        }}
        .gto-legend {{
            display: flex;
            justify-content: center;
            gap: 12px;
            margin-top: 5px;
            font-size: 10px;
            color: #a0aec0;
        }}
        .gto-legend-item {{
            display: flex;
            align-items: center;
            gap: 4px;
        }}
        .gto-dot {{
            width: 8px;
            height: 8px;
            border-radius: 50%;
        }}
        .gto-dot-hero {{ background: #fbbf24; }}
        .gto-dot-villain {{ background: #ef4444; }}
        .gto-dot-blind {{ background: #3b82f6; }}
        .gto-dot-fold {{ background: #4a5568; }}
    </style>
    </head>
    <body>
        <div class="gto-container">
            <div class="gto-table">
                <div class="gto-table-label">{table_type}</div>
            </div>
            {seats_html}
        </div>
        <div class="gto-legend">
            <div class="gto-legend-item"><div class="gto-dot gto-dot-hero"></div>You</div>
            <div class="gto-legend-item"><div class="gto-dot gto-dot-villain"></div>Raiser</div>
            <div class="gto-legend-item"><div class="gto-dot gto-dot-blind"></div>Blinds</div>
            <div class="gto-legend-item"><div class="gto-dot gto-dot-fold"></div>Folded</div>
        </div>
    </body>
    </html>
    '''

    return html


def _generate_table_html_9max(
    positions: dict,
    hero_position: Position,
    villain_position: Optional[Position],
    show_action: str,
    bets: dict = None,
    lang: str = "zh",
) -> str:
    """Generate HTML for the 9-max poker table with optimized layout."""
    bets = bets or {}
    hero_label = "我" if lang == "zh" else "ME"

    # Generate seats HTML
    seats_html = ""
    for pos, (left, top) in positions.items():
        seat_class = "gto-seat"
        action_html = ""
        label_html = ""
        chips_html = ""

        if pos == hero_position:
            seat_class += " gto-hero"
            label_html = f'<span class="gto-label">{hero_label}</span>'
            # Show hero's bet if any (use hero-chips class to position below hero label)
            if pos in bets:
                chips_html = f'<div class="gto-chips gto-chips-bet gto-hero-chips">{bets[pos]}</div>'
        elif pos == villain_position:
            seat_class += " gto-villain"
            if show_action:
                action_html = f'<div class="gto-action">{show_action}</div>'
            # Show villain's bet if any
            if pos in bets:
                chips_html = f'<div class="gto-chips gto-chips-bet">{bets[pos]}</div>'
        elif pos == Position.SB:
            seat_class += " gto-blind"
            chips_html = '<div class="gto-chips">0.5bb</div>'
        elif pos == Position.BB:
            seat_class += " gto-blind"
            chips_html = '<div class="gto-chips">1bb</div>'
        else:
            seat_class += " gto-folded"

        # Dealer button
        dealer_html = ""
        if pos == Position.BTN:
            dealer_html = '<div class="gto-dealer">D</div>'

        # Position display name (show aliases for some positions)
        display_name = pos.value
        if pos == Position.MP:
            display_name = "LJ"  # Lojack alias

        seats_html += f'''
        <div class="{seat_class}" style="left: {left}; top: {top};">
            {action_html}
            <span class="gto-pos-name">{display_name}</span>
            {dealer_html}
            {chips_html}
            {label_html}
        </div>
        '''

    html = f'''
    <!DOCTYPE html>
    <html>
    <head>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        body {{
            background: transparent;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }}
        .gto-container {{
            position: relative;
            width: 100%;
            max-width: 580px;
            height: 360px;
            margin: 8px auto 0 auto;
        }}
        .gto-table {{
            position: absolute;
            width: 70%;
            height: 45%;
            left: 15%;
            top: 28%;
            background: linear-gradient(145deg, #1a5f3c 0%, #0d3d25 100%);
            border-radius: 100px;
            border: 5px solid #8B4513;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5), inset 0 0 30px rgba(0,0,0,0.3);
        }}
        .gto-table-label {{
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: rgba(255,255,255,0.2);
            font-size: 13px;
            font-weight: bold;
        }}
        .gto-seat {{
            position: absolute;
            width: 52px;
            height: 52px;
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
            transform: translate(-50%, -50%);
            border: 3px solid transparent;
        }}
        .gto-pos-name {{
            font-size: 12px;
            font-weight: bold;
        }}
        .gto-hero {{
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
            color: #000;
            border: 4px solid #ffffff;
            box-shadow: 0 0 20px rgba(251, 191, 36, 0.8), 0 0 0 2px #fbbf24;
            animation: gto-pulse 1.5s ease-in-out infinite;
            z-index: 10;
        }}
        .gto-villain {{
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: #fff;
            border-color: #f87171;
            box-shadow: 0 0 12px rgba(239, 68, 68, 0.6);
            z-index: 9;
        }}
        .gto-blind {{
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: #fff;
            border-color: #60a5fa;
            box-shadow: 0 0 8px rgba(59, 130, 246, 0.5);
        }}
        .gto-folded {{
            background: #2d3748;
            color: #718096;
            border-color: #4a5568;
            opacity: 0.5;
        }}
        .gto-label {{
            position: absolute;
            bottom: -22px;
            font-size: 12px;
            color: #000;
            font-weight: bold;
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
            padding: 3px 10px;
            border-radius: 12px;
            box-shadow: 0 0 12px rgba(251, 191, 36, 0.8);
            animation: gto-label-pulse 1.5s ease-in-out infinite;
        }}
        .gto-label::before {{
            content: "▼";
            position: absolute;
            top: -12px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 10px;
            color: #fbbf24;
            animation: gto-arrow-bounce 1s ease-in-out infinite;
        }}
        @keyframes gto-label-pulse {{
            0%, 100% {{
                box-shadow: 0 0 12px rgba(251, 191, 36, 0.8);
                transform: scale(1);
            }}
            50% {{
                box-shadow: 0 0 20px rgba(251, 191, 36, 1);
                transform: scale(1.05);
            }}
        }}
        @keyframes gto-arrow-bounce {{
            0%, 100% {{ transform: translateX(-50%) translateY(0); }}
            50% {{ transform: translateX(-50%) translateY(-4px); }}
        }}
        .gto-chips {{
            position: absolute;
            bottom: -16px;
            font-size: 10px;
            color: #60a5fa;
            font-weight: bold;
            background: rgba(0,0,0,0.6);
            padding: 2px 5px;
            border-radius: 4px;
        }}
        .gto-chips-bet {{
            color: #fca5a5;
            background: rgba(220, 38, 38, 0.8);
            border: 1px solid #ef4444;
        }}
        /* Hero's chips positioned below YOU label to avoid overlap */
        .gto-hero-chips {{
            bottom: -42px;
        }}
        .gto-action {{
            position: absolute;
            top: -22px;
            background: #dc2626;
            color: white;
            padding: 3px 8px;
            border-radius: 8px;
            font-size: 11px;
            font-weight: bold;
            white-space: nowrap;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }}
        .gto-dealer {{
            position: absolute;
            top: -5px;
            right: -5px;
            width: 18px;
            height: 18px;
            background: white;
            color: #000;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 9px;
            font-weight: bold;
            border: 2px solid #e2e8f0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }}
        @keyframes gto-pulse {{
            0%, 100% {{ box-shadow: 0 0 16px rgba(251, 191, 36, 0.8); }}
            50% {{ box-shadow: 0 0 24px rgba(251, 191, 36, 1); }}
        }}
        .gto-legend {{
            display: flex;
            justify-content: center;
            gap: 14px;
            margin-top: 10px;
            font-size: 11px;
            color: #a0aec0;
            flex-wrap: wrap;
        }}
        .gto-legend-item {{
            display: flex;
            align-items: center;
            gap: 4px;
        }}
        .gto-dot {{
            width: 9px;
            height: 9px;
            border-radius: 50%;
        }}
        .gto-dot-hero {{ background: #fbbf24; }}
        .gto-dot-villain {{ background: #ef4444; }}
        .gto-dot-blind {{ background: #3b82f6; }}
        .gto-dot-fold {{ background: #4a5568; }}
    </style>
    </head>
    <body>
        <div class="gto-container">
            <div class="gto-table">
                <div class="gto-table-label">9-max</div>
            </div>
            {seats_html}
        </div>
        <div class="gto-legend">
            <div class="gto-legend-item"><div class="gto-dot gto-dot-hero"></div>You</div>
            <div class="gto-legend-item"><div class="gto-dot gto-dot-villain"></div>Raiser</div>
            <div class="gto-legend-item"><div class="gto-dot gto-dot-blind"></div>Blinds</div>
            <div class="gto-legend-item"><div class="gto-dot gto-dot-fold"></div>Folded</div>
        </div>
    </body>
    </html>
    '''

    return html


def display_table(
    hero_position: Position,
    villain_position: Optional[Position] = None,
    show_action: str = None,
    format: str = "6max",
    bets: dict = None,
    lang: str = "zh",
    folded_positions: list = None,
):
    """Display poker table based on format.

    Args:
        bets: Optional dict mapping Position to bet amount string, e.g. {Position.UTG: "2.5bb"}
        lang: Language code ("zh" or "en") for hero label
        folded_positions: List of positions that have folded (shown as gray/inactive)
    """
    if format == "9max":
        display_table_9max(hero_position, villain_position, show_action, bets, lang)
    else:
        display_table_6max(hero_position, villain_position, show_action, bets, lang, folded_positions)


def display_postflop_table(
    hero_position: str,
    villain_position: str,
    flop_cards: list,  # List of (rank, suit) tuples
    pot_size: str = "5.5bb",
    hero_stack: str = "97bb",
    villain_stack: str = "97bb",
    lang: str = "zh",
):
    """
    Display a postflop poker table with community cards in the center.

    Args:
        hero_position: Hero's position (e.g., "BTN")
        villain_position: Villain's position (e.g., "BB")
        flop_cards: List of (rank, suit) tuples, e.g., [("A", "s"), ("7", "d"), ("2", "c")]
        pot_size: Current pot size string
        hero_stack: Hero's remaining stack
        villain_stack: Villain's remaining stack
        lang: Language code
    """
    hero_label = "我" if lang == "zh" else "ME"

    # 4-color deck
    def get_suit_color(suit):
        colors = {'s': '#1a1a2e', 'h': '#ef4444', 'd': '#3b82f6', 'c': '#22c55e'}
        return colors.get(suit, '#1a1a2e')

    def get_suit_symbol(suit):
        symbols = {'s': '♠', 'h': '♥', 'd': '♦', 'c': '♣'}
        return symbols.get(suit, suit)

    def fmt_rank(rank):
        return "10" if rank == "T" else rank

    # Generate flop cards HTML (larger size for readability)
    flop_cards_html = ""
    for rank, suit in flop_cards:
        color = get_suit_color(suit)
        symbol = get_suit_symbol(suit)
        flop_cards_html += f'''
        <div style="width:46px;height:64px;background:linear-gradient(145deg,#ffffff 0%,#f0f0f0 100%);
                    border-radius:5px;display:flex;flex-direction:column;align-items:center;
                    justify-content:center;color:{color};font-weight:bold;
                    box-shadow:0 2px 6px rgba(0,0,0,0.4);">
            <span style="font-size:22px;line-height:1;">{fmt_rank(rank)}</span>
            <span style="font-size:18px;line-height:1;">{symbol}</span>
        </div>
        '''

    # Turn and river placeholders
    for _ in range(2):
        flop_cards_html += '''
        <div style="width:46px;height:64px;background:linear-gradient(145deg,#374151 0%,#1f2937 100%);
                    border-radius:5px;display:flex;align-items:center;justify-content:center;
                    color:#6b7280;font-size:18px;font-weight:bold;
                    box-shadow:0 2px 6px rgba(0,0,0,0.4);border:1px dashed #4b5563;">
            ?
        </div>
        '''

    # Simple 2-player heads-up layout (positions on opposite sides)
    # Hero at bottom, Villain at top - seats overlap table edge for compact design
    html = f'''
    <!DOCTYPE html>
    <html>
    <head>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            background: transparent;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }}
        .postflop-container {{
            position: relative;
            width: 100%;
            max-width: 340px;
            height: 320px;
            margin: 0 auto;
            padding: 10px 0;
        }}
        .table {{
            position: absolute;
            width: 95%;
            height: 55%;
            left: 2.5%;
            top: 23%;
            background: linear-gradient(145deg, #1a5f3c 0%, #0d3d25 100%);
            border-radius: 50px;
            border: 6px solid #8B4513;
            box-shadow: 0 4px 15px rgba(0,0,0,0.5), inset 0 0 20px rgba(0,0,0,0.3);
        }}
        .community-cards {{
            position: absolute;
            top: 40%;
            left: 50%;
            transform: translate(-50%, -50%);
            display: flex;
            gap: 4px;
        }}
        .pot-label {{
            position: absolute;
            top: 75%;
            left: 50%;
            transform: translateX(-50%);
            color: #fbbf24;
            font-size: 16px;
            font-weight: bold;
            text-shadow: 0 1px 3px rgba(0,0,0,0.5);
        }}
        .seat {{
            position: absolute;
            width: 62px;
            height: 62px;
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            font-size: 15px;
            font-weight: bold;
            transform: translate(-50%, -50%);
        }}
        .seat.hero {{
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
            color: #000;
            border: 3px solid #ffffff;
            box-shadow: 0 0 15px rgba(251, 191, 36, 0.7);
        }}
        .seat.villain {{
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
            color: #fff;
            border: 3px solid #f87171;
            box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
        }}
        .seat-position {{
            font-size: 15px;
            font-weight: bold;
        }}
        .seat-stack {{
            font-size: 12px;
            opacity: 0.9;
        }}
        .seat-label {{
            position: absolute;
            font-size: 13px;
            font-weight: bold;
            background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
            color: #000;
            padding: 2px 10px;
            border-radius: 10px;
            box-shadow: 0 0 8px rgba(251, 191, 36, 0.6);
            white-space: nowrap;
        }}
        .hero-seat {{ left: 50%; top: 88%; }}
        .hero-label {{ bottom: -16px; left: 50%; transform: translateX(-50%); }}
        .villain-seat {{ left: 50%; top: 12%; }}
    </style>
    </head>
    <body>
        <div class="postflop-container">
            <div class="table">
                <div class="community-cards">
                    {flop_cards_html}
                </div>
                <div class="pot-label">POT: {pot_size}</div>
            </div>

            <!-- Villain (top) -->
            <div class="seat villain villain-seat">
                <span class="seat-position">{villain_position}</span>
                <span class="seat-stack">{villain_stack}</span>
            </div>

            <!-- Hero (bottom) -->
            <div class="seat hero hero-seat">
                <span class="seat-position">{hero_position}</span>
                <span class="seat-stack">{hero_stack}</span>
                <div class="seat-label hero-label">{hero_label}</div>
            </div>
        </div>
    </body>
    </html>
    '''

    components.html(html, height=340)
