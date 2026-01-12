"""
Action flow visualization component.
Shows the betting sequence before hero's decision.
"""
import streamlit as st
import streamlit.components.v1 as components
from core.position import Position
from core.scenario import ActionType


def _render_chips(bb_amount: float, color: str = "#ef4444") -> str:
    """
    Render CSS chip icons for a given bb amount.

    Args:
        bb_amount: Amount in big blinds (e.g., 2.5, 8, 20)
        color: Chip color

    Returns:
        HTML string with chip icons
    """
    # Smaller chip CSS styles for inline display (single line to avoid rendering issues)
    chip_style = f"display: inline-block; width: 12px; height: 12px; border-radius: 50%; background: linear-gradient(145deg, {color} 0%, {color}cc 100%); border: 1.5px solid {color}dd; box-shadow: 0 1px 2px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.3); margin-right: 1px; vertical-align: middle;"

    # Small chip for half bb
    small_chip_style = f"display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: linear-gradient(145deg, {color} 0%, {color}cc 100%); border: 1px solid {color}dd; box-shadow: 0 1px 2px rgba(0,0,0,0.3); margin-right: 1px; vertical-align: middle; opacity: 0.7;"

    # Calculate number of chips to show
    # For readability: show max 3 full chips + 1 half chip
    full_chips = int(bb_amount)
    has_half = (bb_amount % 1) >= 0.5

    # Limit display for large amounts
    if full_chips > 3:
        # For large amounts, show simplified representation
        display_chips = 3
        show_plus = True
    else:
        display_chips = full_chips
        show_plus = False

    html = '<span style="margin-left: 3px; white-space: nowrap;">'
    for _ in range(display_chips):
        html += f'<span style="{chip_style}"></span>'

    if has_half and not show_plus:
        html += f'<span style="{small_chip_style}"></span>'

    if show_plus:
        html += f'<span style="font-size: 9px; color: {color}; margin-left: 1px;">+</span>'

    html += '</span>'
    return html


def display_action_flow(
    hero_position: Position,
    villain_position: Position = None,
    action_type: ActionType = ActionType.RFI,
    language: str = "zh",
):
    """
    Display the action flow/timeline for a preflop scenario.

    Args:
        hero_position: Hero's position
        villain_position: Villain's position (if applicable)
        action_type: Type of action (RFI, VS_RFI, VS_3BET, VS_4BET)
        language: "zh" or "en"
    """
    if action_type == ActionType.RFI:
        # RFI - just show folded players
        return _display_rfi_flow(hero_position, language)
    elif action_type == ActionType.VS_RFI:
        return _display_vs_rfi_flow(hero_position, villain_position, language)
    elif action_type == ActionType.VS_3BET:
        return _display_vs_3bet_flow(hero_position, villain_position, language)
    elif action_type == ActionType.VS_4BET:
        return _display_vs_4bet_flow(hero_position, villain_position, language)


def _display_rfi_flow(hero_position: Position, language: str):
    """Display RFI action flow - no longer displays since header shows position."""
    # RFI doesn't need action flow - header already shows "RFI | UTG"
    pass


def _display_vs_rfi_flow(hero_position: Position, villain_position: Position, language: str):
    """Display vs RFI (facing open raise) action flow."""
    # Simplified: "UTG 2.5bb → CO ?"
    steps = [
        {"pos": villain_position.value, "bb": 2.5, "color": "#ef4444"},
        {"pos": hero_position.value, "action": "?", "color": "#fbbf24"},
    ]
    _render_flow_steps(steps)


def _display_vs_3bet_flow(hero_position: Position, villain_position: Position, language: str):
    """Display vs 3-bet action flow."""
    # Simplified: "UTG 2.5bb → CO 3bet 8bb → UTG ?"
    steps = [
        {"pos": hero_position.value, "bb": 2.5, "color": "#3b82f6"},
        {"pos": villain_position.value, "action": "3bet", "bb": 8, "color": "#ef4444"},
        {"pos": hero_position.value, "action": "?", "color": "#fbbf24"},
    ]
    _render_flow_steps(steps)


def _display_vs_4bet_flow(hero_position: Position, villain_position: Position, language: str):
    """Display vs 4-bet action flow."""
    # Simplified: "CO 2.5bb → SB 3bet 8bb → CO 4bet 20bb → SB ?"
    steps = [
        {"pos": villain_position.value, "bb": 2.5, "color": "#6b7280"},
        {"pos": hero_position.value, "action": "3bet", "bb": 8, "color": "#3b82f6"},
        {"pos": villain_position.value, "action": "4bet", "bb": 20, "color": "#ef4444"},
        {"pos": hero_position.value, "action": "?", "color": "#fbbf24"},
    ]
    _render_flow_steps(steps)


def _render_flow_steps(steps: list):
    """Render action flow steps - simplified format without colons."""
    steps_html = ""
    for i, step in enumerate(steps):
        arrow = "→" if i < len(steps) - 1 else ""

        # Build action text: "UTG 2.5bb" or "CO 3bet 8bb" or "SB ?"
        if 'action' in step:
            action_text = step['action']
            if 'bb' in step:
                bb_amount = step['bb']
                bb_str = f"{bb_amount:.1f}".rstrip('0').rstrip('.') if bb_amount % 1 else f"{int(bb_amount)}"
                action_text = f"{action_text} {bb_str}bb"
        elif 'bb' in step:
            # Just bb amount (for opens)
            bb_amount = step['bb']
            bb_str = f"{bb_amount:.1f}".rstrip('0').rstrip('.') if bb_amount % 1 else f"{int(bb_amount)}"
            action_text = f"{bb_str}bb"
        else:
            action_text = ""

        # Simplified style without colon
        step_style = f"background: {step['color']}25; color: {step['color']}; padding: 4px 10px; border-radius: 6px; font-size: 0.95rem; font-weight: 600;"
        arrow_style = "color: #94a3b8; font-size: 1.1rem; font-weight: bold; margin: 0 6px;"
        steps_html += f'<span style="{step_style}">{step["pos"]} {action_text}</span>'
        if arrow:
            steps_html += f'<span style="{arrow_style}">{arrow}</span>'

    html = f'<div style="background: #0f172a; padding: 10px 14px; border-radius: 8px; border-left: 4px solid #fbbf24; display: flex; flex-wrap: wrap; align-items: center; gap: 4px;">{steps_html}</div>'
    st.markdown(html, unsafe_allow_html=True)
