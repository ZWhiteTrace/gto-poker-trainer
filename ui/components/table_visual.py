"""
Poker table visualization component.
Shows seat positions and highlights hero/villain.
"""
import streamlit as st
import streamlit.components.v1 as components
from typing import Optional
from core.position import Position, POSITIONS_6MAX


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
    Uses stadium (racetrack) shape with perfectly even seat distribution.

    Stadium shape: straight top/bottom edges + semicircular left/right ends
    6 seats at 60° intervals around the perimeter.

    Layout:
           [SB]    [BB]       ← top straight edge
        [BTN]          [UTG]  ← semicircular ends
           [CO]    [HJ]       ← bottom straight edge

    Args:
        folded_positions: List of positions that have folded (shown as gray/inactive)
    """
    # 6-max positions - adjusted for better visual balance
    # Fine-tuned: SB/BB up 2%, BTN/UTG up 1% with slight horizontal adjustments
    positions_6max = {
        Position.SB: ("38%", "20%"),   # top-left (up 2%)
        Position.BB: ("62%", "20%"),   # top-right (up 2%)
        Position.UTG: ("85%", "49%"),  # right side (up 1%, left 1%)
        Position.HJ: ("62%", "78%"),   # bottom-right
        Position.CO: ("38%", "78%"),   # bottom-left
        Position.BTN: ("15%", "49%"),  # left side (up 1%, right 1%)
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

    components.html(html, height=230)


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
        height: 225px;
        margin: 0 auto;
        padding: 8px 12px;
        overflow: visible;
    }
    .poker-table {
        position: absolute;
        width: 58%;
        height: 58%;
        left: 21%;
        top: 20%;
        background: linear-gradient(145deg, #1a5f3c 0%, #0d3d25 100%);
        border-radius: 9999px;
        border: 6px solid #8B4513;
        box-shadow: 0 4px 15px rgba(0,0,0,0.5), inset 0 0 30px rgba(0,0,0,0.3);
    }
    .table-label {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        color: rgba(255,255,255,0.25);
        font-size: 14px;
        font-weight: bold;
        letter-spacing: 2px;
    }
    .seat {
        position: absolute;
        width: 52px;
        height: 52px;
        border-radius: 50%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-size: 14px;
        font-weight: bold;
        transform: translate(-50%, -50%);
        transition: all 0.2s ease;
        border: 3px solid transparent;
    }
    .seat-stack {
        font-size: 9px;
        opacity: 0.85;
        margin-top: 1px;
    }
    .seat-stack-dim {
        opacity: 0.5;
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
        font-size: 14px;
        position: absolute;
        bottom: -22px;
        left: 50%;
        transform: translateX(-50%);
        color: #000;
        white-space: nowrap;
        font-weight: bold;
        background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
        padding: 3px 16px;
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

    /* Tablet responsive (515-768px) */
    @media (max-width: 768px) and (min-width: 515px) {
        .poker-table-container {
            max-width: 100%;
            height: 215px;
            padding: 6px 10px;
        }
        .poker-table {
            width: 60%;
            left: 20%;
            height: 56%;
            top: 20%;
        }
        .seat {
            width: 48px;
            height: 48px;
            font-size: 13px;
        }
    }

    /* Small tablet / large phone (480-640px) */
    @media (max-width: 640px) and (min-width: 481px) {
        .poker-table-container {
            max-width: 100%;
            height: 200px;
            padding: 4px 8px;
        }
        .poker-table {
            width: 62%;
            left: 19%;
            height: 55%;
            top: 22%;
        }
        .seat {
            width: 44px;
            height: 44px;
            font-size: 12px;
        }
        .seat-label {
            font-size: 11px;
            padding: 2px 10px;
            bottom: -18px;
        }
    }

    /* Mobile responsive */
    @media (max-width: 480px) {
        .poker-table-container {
            max-width: 100%;
            height: 190px;
            padding: 3px 6px;
        }
        .poker-table {
            width: 64%;
            left: 18%;
            height: 54%;
            top: 24%;
        }
        .seat {
            width: 40px;
            height: 40px;
            font-size: 11px;
        }
        .seat-label {
            font-size: 10px;
            padding: 2px 8px;
            bottom: -18px;
        }
        .chips-label {
            font-size: 8px;
        }
        .legend {
            font-size: 9px;
            gap: 10px;
        }
    }
    </style>
    </head>
    <body>
    """

    html = css + '''
    <div class="poker-table-container">
        <div class="poker-table">
            <div class="table-label">6-MAX</div>
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
                chips_html = f'<span class="chips-label chips-bet hero-chips">{bets[pos]}</span>'
        elif pos == villain_position:
            seat_class += " villain"
            if show_action:
                action_html = f'<div class="action-indicator">{show_action}</div>'
            if pos in bets:
                chips_html = f'<span class="chips-label chips-bet">{bets[pos]}</span>'
        elif is_folded:
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
    """Display 6-max poker table.

    Args:
        bets: Optional dict mapping Position to bet amount string, e.g. {Position.UTG: "2.5bb"}
        lang: Language code ("zh" or "en") for hero label
        folded_positions: List of positions that have folded (shown as gray/inactive)
    """
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

    # Flop only - no turn/river placeholders for cleaner look

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
            max-width: 280px;
            height: 280px;
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
