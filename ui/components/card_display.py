"""
Playing card display component.
Shows hands as two visual cards.
"""
import streamlit as st
import streamlit.components.v1 as components
import random
from core.hand import Hand, SUITS, SUIT_SYMBOLS


def _display_rank(rank: str) -> str:
    """Convert rank notation to display format. T becomes 10 on visual cards."""
    return "10" if rank == "T" else rank


def display_hand_cards(hand: Hand, size: str = "large", animate: bool = True, feedback: str = None, seed: str = None):
    """
    Display a poker hand as two visual playing cards with optional animations.

    Args:
        hand: Hand object (e.g., Hand("AKs"))
        size: "large", "medium", or "small"
        animate: Whether to show dealing animation
        feedback: "correct", "incorrect", or None for feedback animation
        seed: Optional seed string for consistent suit generation across re-renders
    """
    # Generate specific cards from hand notation
    r1, r2 = _display_rank(hand.rank1), _display_rank(hand.rank2)

    # Use seeded random if seed provided, otherwise use global random
    if seed:
        rng = random.Random(seed)
    else:
        rng = random

    if hand.is_pair:
        # Pocket pair - random two different suits
        suits = rng.sample(SUITS, 2)
        s1, s2 = suits[0], suits[1]
    elif hand.is_suited:
        # Suited - same suit
        s1 = s2 = rng.choice(SUITS)
    else:
        # Offsuit - different suits
        suits = rng.sample(SUITS, 2)
        s1, s2 = suits[0], suits[1]

    # 4-color deck: spades=black, hearts=red, diamonds=blue, clubs=green
    def get_color(suit):
        colors = {'s': '#1a1a2e', 'h': '#ef4444', 'd': '#3b82f6', 'c': '#22c55e'}
        return colors.get(suit, '#1a1a2e')

    c1_color = get_color(s1)
    c2_color = get_color(s2)

    # Size configurations (increased suit_font for better visibility)
    sizes = {
        "large": {"width": 70, "height": 100, "font": 28, "suit_font": 24},
        "medium": {"width": 55, "height": 80, "font": 22, "suit_font": 20},
        "small": {"width": 40, "height": 58, "font": 16, "suit_font": 14},
    }
    cfg = sizes.get(size, sizes["large"])

    # Animation classes
    animate_class = "deal-animation" if animate else ""
    feedback_class = f"feedback-{feedback}" if feedback else ""

    html = f'''
    <!DOCTYPE html>
    <html>
    <head>
    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; }}
        body {{
            background: transparent;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100%;
            padding-top: 8px;
            font-family: 'Georgia', serif;
        }}
        .cards-container {{
            display: flex;
            gap: 8px;
            perspective: 1000px;
            padding: 5px;
        }}
        .card {{
            width: {cfg["width"]}px;
            height: {cfg["height"]}px;
            background: linear-gradient(145deg, #ffffff 0%, #f0f0f0 100%);
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.8);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            position: relative;
            border: 1px solid #ddd;
            transform-style: preserve-3d;
        }}
        .card-rank {{
            font-size: {cfg["font"]}px;
            font-weight: bold;
            line-height: 1;
        }}
        .card-suit {{
            font-size: {cfg["suit_font"]}px;
            line-height: 1;
            margin-top: 2px;
        }}
        .card-corner {{
            position: absolute;
            top: 4px;
            left: 6px;
            font-size: 10px;
            line-height: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
        }}
        .card-corner-rank {{
            font-weight: bold;
        }}
        .card-corner-suit {{
            font-size: 8px;
        }}
        .card-1 {{ color: {c1_color}; }}
        .card-2 {{ color: {c2_color}; margin-left: -15px; }}

        /* Dealing animation */
        .deal-animation .card-1 {{
            animation: dealCard1 0.4s ease-out forwards;
        }}
        .deal-animation .card-2 {{
            animation: dealCard2 0.4s ease-out 0.15s forwards;
            opacity: 0;
        }}

        @keyframes dealCard1 {{
            0% {{
                transform: translateX(-100px) translateY(-50px) rotate(-20deg) scale(0.5);
                opacity: 0;
            }}
            100% {{
                transform: rotate(-5deg) scale(1);
                opacity: 1;
            }}
        }}

        @keyframes dealCard2 {{
            0% {{
                transform: translateX(-100px) translateY(-50px) rotate(-20deg) scale(0.5);
                opacity: 0;
            }}
            100% {{
                transform: rotate(5deg) scale(1);
                opacity: 1;
            }}
        }}

        /* Static card positions (no animation) */
        .cards-container:not(.deal-animation) .card-1 {{
            transform: rotate(-5deg);
        }}
        .cards-container:not(.deal-animation) .card-2 {{
            transform: rotate(5deg);
        }}

        /* Feedback animations */
        .feedback-correct .card {{
            animation: correctPulse 0.5s ease-out;
            box-shadow: 0 0 20px rgba(34, 197, 94, 0.8), 0 4px 15px rgba(0,0,0,0.3);
        }}

        .feedback-incorrect .card {{
            animation: incorrectShake 0.5s ease-out;
            box-shadow: 0 0 20px rgba(239, 68, 68, 0.8), 0 4px 15px rgba(0,0,0,0.3);
        }}

        @keyframes correctPulse {{
            0% {{ transform: scale(1); }}
            50% {{ transform: scale(1.1); }}
            100% {{ transform: scale(1); }}
        }}

        @keyframes incorrectShake {{
            0%, 100% {{ transform: translateX(0); }}
            10%, 30%, 50%, 70%, 90% {{ transform: translateX(-5px); }}
            20%, 40%, 60%, 80% {{ transform: translateX(5px); }}
        }}

        .hand-label {{
            text-align: center;
            margin-top: 8px;
            font-size: 12px;
            color: #94a3b8;
            font-family: -apple-system, sans-serif;
        }}
    </style>
    </head>
    <body>
        <div class="{feedback_class}">
            <div class="cards-container {animate_class}">
                <div class="card card-1">
                    <div class="card-corner">
                        <span class="card-corner-rank">{r1}</span>
                        <span class="card-corner-suit">{SUIT_SYMBOLS[s1]}</span>
                    </div>
                    <span class="card-rank">{r1}</span>
                    <span class="card-suit">{SUIT_SYMBOLS[s1]}</span>
                </div>
                <div class="card card-2">
                    <div class="card-corner">
                        <span class="card-corner-rank">{r2}</span>
                        <span class="card-corner-suit">{SUIT_SYMBOLS[s2]}</span>
                    </div>
                    <span class="card-rank">{r2}</span>
                    <span class="card-suit">{SUIT_SYMBOLS[s2]}</span>
                </div>
            </div>
            <div class="hand-label">{str(hand)}</div>
        </div>
    </body>
    </html>
    '''

    height = cfg["height"] + 50  # Extra padding for shadows and animations
    components.html(html, height=height)


def display_hand_simple(hand: Hand):
    """Display hand as simple text with colored suits."""
    r1, r2 = _display_rank(hand.rank1), _display_rank(hand.rank2)

    if hand.is_pair:
        suits = random.sample(SUITS, 2)
        s1, s2 = suits[0], suits[1]
    elif hand.is_suited:
        s1 = s2 = random.choice(SUITS)
    else:
        suits = random.sample(SUITS, 2)
        s1, s2 = suits[0], suits[1]

    # 4-color deck: spades=black, hearts=red, diamonds=blue, clubs=green
    def get_color(suit):
        colors = {'s': '#1e293b', 'h': '#ef4444', 'd': '#3b82f6', 'c': '#22c55e'}
        return colors.get(suit, '#1e293b')

    c1 = get_color(s1)
    c2 = get_color(s2)

    st.markdown(f"""
    <div style="text-align: center; font-size: 2.5rem; font-weight: bold;">
        <span style="color: {c1};">{r1}{SUIT_SYMBOLS[s1]}</span>
        <span style="color: {c2}; margin-left: 5px;">{r2}{SUIT_SYMBOLS[s2]}</span>
    </div>
    <div style="text-align: center; color: #94a3b8; font-size: 0.9rem;">({str(hand)})</div>
    """, unsafe_allow_html=True)
