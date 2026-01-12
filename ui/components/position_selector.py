"""
Interactive position selector component for Range Viewer.
Allows clicking on table positions to select hero/villain.
"""
import streamlit as st
import streamlit.components.v1 as components
from typing import Optional, List
from core.position import Position


def display_position_selector(
    positions: List[str],
    selected_position: str,
    on_select_key: str = "selected_position",
    compact: bool = True,
    table_format: str = "6max",
) -> str:
    """
    Display an interactive position selector as clickable buttons around a mini table.
    Returns the selected position.
    """
    if table_format == "9max":
        return _display_9max_selector(positions, selected_position, on_select_key, compact)
    else:
        return _display_6max_selector(positions, selected_position, on_select_key, compact)


def _display_6max_selector(
    positions: List[str],
    selected_position: str,
    on_select_key: str,
    compact: bool,
) -> str:
    """6-max position selector layout."""
    # Use Streamlit columns to create a grid layout
    # Row 1: SB, BB (top)
    # Row 2: BTN, [table], UTG
    # Row 3: CO, HJ (bottom)

    pos_order = ["UTG", "HJ", "CO", "BTN", "SB", "BB"]
    available = [p for p in pos_order if p in positions]

    # Create button grid with 3 columns
    col1, col2, col3 = st.columns([1, 1.5, 1])

    with col1:
        # Left side: BTN, CO
        for pos in ["BTN", "CO"]:
            if pos in available:
                is_selected = pos == selected_position
                btn_type = "primary" if is_selected else "secondary"
                if st.button(pos, key=f"{on_select_key}_{pos}", use_container_width=True, type=btn_type):
                    st.session_state[on_select_key] = pos
                    st.rerun()

    with col2:
        # Center: show positions in 2 rows
        top_row = st.columns(2)
        with top_row[0]:
            if "SB" in available:
                is_selected = "SB" == selected_position
                btn_type = "primary" if is_selected else "secondary"
                if st.button("SB", key=f"{on_select_key}_SB", use_container_width=True, type=btn_type):
                    st.session_state[on_select_key] = "SB"
                    st.rerun()
        with top_row[1]:
            if "BB" in available:
                is_selected = "BB" == selected_position
                btn_type = "primary" if is_selected else "secondary"
                if st.button("BB", key=f"{on_select_key}_BB", use_container_width=True, type=btn_type):
                    st.session_state[on_select_key] = "BB"
                    st.rerun()

        # Center table indicator
        st.markdown("""
        <div style="
            background: linear-gradient(145deg, #1a5f3c 0%, #0d3d25 100%);
            border-radius: 20px;
            border: 3px solid #8B4513;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: rgba(255,255,255,0.3);
            font-size: 11px;
            margin: 5px 0;
        ">6-max</div>
        """, unsafe_allow_html=True)

        bottom_row = st.columns(2)
        with bottom_row[0]:
            if "HJ" in available:
                is_selected = "HJ" == selected_position
                btn_type = "primary" if is_selected else "secondary"
                if st.button("HJ", key=f"{on_select_key}_HJ", use_container_width=True, type=btn_type):
                    st.session_state[on_select_key] = "HJ"
                    st.rerun()
        with bottom_row[1]:
            pass  # Empty for layout

    with col3:
        # Right side: UTG
        for pos in ["UTG"]:
            if pos in available:
                is_selected = pos == selected_position
                btn_type = "primary" if is_selected else "secondary"
                if st.button(pos, key=f"{on_select_key}_{pos}", use_container_width=True, type=btn_type):
                    st.session_state[on_select_key] = pos
                    st.rerun()

    return st.session_state.get(on_select_key, selected_position)


def _display_9max_selector(
    positions: List[str],
    selected_position: str,
    on_select_key: str,
    compact: bool,
) -> str:
    """9-max position selector - simpler button row layout."""
    # For 9-max, use a simpler horizontal button layout due to space constraints
    available = [p for p in positions if p in positions]

    # Split into two rows for better display
    row1 = ["UTG", "UTG+1", "UTG+2", "MP", "HJ"]
    row2 = ["CO", "BTN", "SB", "BB"]

    cols1 = st.columns(len([p for p in row1 if p in available]))
    col_idx = 0
    for pos in row1:
        if pos in available:
            with cols1[col_idx]:
                is_selected = pos == selected_position
                btn_type = "primary" if is_selected else "secondary"
                if st.button(pos, key=f"{on_select_key}_{pos}", use_container_width=True, type=btn_type):
                    st.session_state[on_select_key] = pos
                    st.rerun()
            col_idx += 1

    cols2 = st.columns(len([p for p in row2 if p in available]))
    col_idx = 0
    for pos in row2:
        if pos in available:
            with cols2[col_idx]:
                is_selected = pos == selected_position
                btn_type = "primary" if is_selected else "secondary"
                if st.button(pos, key=f"{on_select_key}_{pos}", use_container_width=True, type=btn_type):
                    st.session_state[on_select_key] = pos
                    st.rerun()
            col_idx += 1

    return st.session_state.get(on_select_key, selected_position)


def display_villain_selector(
    positions: List[str],
    selected_villain: str,
    key_prefix: str = "villain",
) -> Optional[str]:
    """Display villain position selector as compact buttons."""
    if not positions:
        return None

    cols = st.columns(len(positions))
    for i, pos in enumerate(positions):
        with cols[i]:
            is_selected = pos == selected_villain
            btn_type = "primary" if is_selected else "secondary"
            if st.button(pos, key=f"{key_prefix}_{pos}", use_container_width=True, type=btn_type):
                st.session_state[f"{key_prefix}_selected"] = pos
                st.rerun()

    return st.session_state.get(f"{key_prefix}_selected", selected_villain)
