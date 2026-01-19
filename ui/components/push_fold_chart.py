"""
MTT Push/Fold Chart for short stack situations.
Based on Nash equilibrium push/fold ranges.
"""
import streamlit as st
import json
from pathlib import Path

RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']
POSITIONS = ["UTG", "HJ", "CO", "BTN", "SB"]

# Colors
COLOR_PUSH = "#22c55e"  # Green for push
COLOR_FOLD = "#374151"  # Gray for fold


def load_push_fold_data():
    """Load push/fold ranges from JSON file."""
    data_path = Path(__file__).parent.parent.parent / "data" / "ranges" / "mtt" / "push_fold.json"
    try:
        with open(data_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        st.error(f"Failed to load push/fold data: {e}")
        return {}


def get_hand_name(row: int, col: int) -> str:
    """Get hand name from grid position."""
    r1, r2 = RANKS[row], RANKS[col]
    if row == col:
        return f"{r1}{r2}"
    elif row < col:
        return f"{r1}{r2}s"
    else:
        return f"{r2}{r1}o"


def display_push_fold_chart(lang: str = "zh"):
    """Display Push/Fold chart with position and stack depth selection."""

    data = load_push_fold_data()
    if not data:
        return

    # Title
    title = "MTT Push/Fold 圖表" if lang == "zh" else "MTT Push/Fold Chart"
    st.subheader(title)

    # Description
    desc = "短碼全下/棄牌策略 (Nash 均衡)" if lang == "zh" else "Short stack push/fold strategy (Nash equilibrium)"
    st.caption(desc)

    # Controls
    col1, col2 = st.columns(2)

    with col1:
        stack_options = ["5bb", "8bb", "10bb", "12bb", "15bb", "20bb"]
        stack_labels = {
            "5bb": "5 BB (極短碼)" if lang == "zh" else "5 BB (Desperate)",
            "8bb": "8 BB (短碼)" if lang == "zh" else "8 BB (Short)",
            "10bb": "10 BB (標準短)" if lang == "zh" else "10 BB (Standard Short)",
            "12bb": "12 BB" if lang == "zh" else "12 BB",
            "15bb": "15 BB" if lang == "zh" else "15 BB",
            "20bb": "20 BB (邊緣)" if lang == "zh" else "20 BB (Borderline)",
        }
        stack_label = "籌碼深度" if lang == "zh" else "Stack Depth"
        selected_stack = st.selectbox(
            stack_label,
            stack_options,
            format_func=lambda x: stack_labels[x],
            index=2  # Default to 10bb
        )

    with col2:
        pos_label = "位置" if lang == "zh" else "Position"
        selected_position = st.selectbox(
            pos_label,
            POSITIONS,
            index=4  # Default to SB
        )

    # Get push range for selected position and stack
    push_range = set(data.get("6max", {}).get(selected_stack, {}).get(selected_position, []))
    push_count = len(push_range)
    total_hands = 169
    push_pct = (push_count / total_hands) * 100

    # Stats
    stats_text = f"Push 範圍: {push_count} 手牌 ({push_pct:.1f}%)" if lang == "zh" else f"Push range: {push_count} hands ({push_pct:.1f}%)"
    st.markdown(f"<p style='text-align:center; color:#9ca3af; margin-bottom:10px;'>{stats_text}</p>", unsafe_allow_html=True)

    # Legend
    legend_html = '''
    <div style="display: flex; gap: 20px; justify-content: center; margin: 10px 0;">
        <span style="display: flex; align-items: center; gap: 6px;">
            <span style="background: #22c55e; width: 24px; height: 18px; border-radius: 3px; display: inline-block;"></span>
            <span style="color: white;">Push</span>
        </span>
        <span style="display: flex; align-items: center; gap: 6px;">
            <span style="background: #374151; width: 24px; height: 18px; border-radius: 3px; display: inline-block;"></span>
            <span style="color: white;">Fold</span>
        </span>
    </div>
    '''
    st.markdown(legend_html, unsafe_allow_html=True)

    # Build grid HTML
    html = '''
    <div style="width:100%; display:flex; flex-direction:column; align-items:center;">
    <div style="display:grid; grid-template-columns:repeat(13,minmax(0,1fr)); gap:2px; width:100%; max-width:555px; background:#1a1a2e; padding:8px; border-radius:8px; box-sizing:border-box;">
    '''

    for i, r1 in enumerate(RANKS):
        for j, r2 in enumerate(RANKS):
            hand = get_hand_name(i, j)
            is_push = hand in push_range

            if is_push:
                bg_color = COLOR_PUSH
                text_color = "white"
            else:
                bg_color = COLOR_FOLD
                text_color = "#6b7280"

            cell_style = f"aspect-ratio:1; display:flex; align-items:center; justify-content:center; border-radius:3px; background:{bg_color}; color:{text_color}; font-size:clamp(10px,2.8vw,15px); font-weight:600;"
            html += f'<div style="{cell_style}">{hand}</div>'

    html += '</div></div>'
    st.markdown(html, unsafe_allow_html=True)

    # Tips section
    st.markdown("---")
    tips_title = "使用提示" if lang == "zh" else "Tips"
    st.markdown(f"**{tips_title}:**")

    if lang == "zh":
        tips = [
            "綠色手牌 = 全下 (All-in)",
            "灰色手牌 = 棄牌",
            "這些範圍基於 Nash 均衡，假設對手也使用最佳策略",
            "實戰中可根據對手類型適度調整：對手緊時可更寬，對手鬆時要更緊",
            "ICM 壓力大時（如泡沫期）應收緊範圍",
        ]
    else:
        tips = [
            "Green hands = Push (All-in)",
            "Gray hands = Fold",
            "These ranges are based on Nash equilibrium, assuming optimal opponent play",
            "Adjust based on opponent types: wider vs tight, tighter vs loose",
            "Tighten up during ICM pressure situations (e.g., bubble)",
        ]

    for tip in tips:
        st.markdown(f"- {tip}")


def display_push_fold_comparison(lang: str = "zh"):
    """Display Push/Fold comparison across positions for a given stack depth."""

    data = load_push_fold_data()
    if not data:
        return

    # Title
    title = "位置對比" if lang == "zh" else "Position Comparison"
    st.subheader(title)

    # Stack selection
    stack_options = ["5bb", "8bb", "10bb", "12bb", "15bb", "20bb"]
    selected_stack = st.select_slider(
        "籌碼深度" if lang == "zh" else "Stack Depth",
        options=stack_options,
        value="10bb"
    )

    # Calculate push counts for each position
    stack_data = data.get("6max", {}).get(selected_stack, {})

    comparison_html = '<div style="display:flex; justify-content:center; gap:15px; flex-wrap:wrap; margin:20px 0;">'

    for pos in POSITIONS:
        push_count = len(stack_data.get(pos, []))
        pct = (push_count / 169) * 100

        # Color gradient based on percentage
        if pct > 60:
            color = "#22c55e"  # Green
        elif pct > 40:
            color = "#84cc16"  # Lime
        elif pct > 25:
            color = "#eab308"  # Yellow
        else:
            color = "#f97316"  # Orange

        comparison_html += f'''
        <div style="text-align:center; padding:12px 16px; background:#1a1a2e; border-radius:8px; min-width:80px;">
            <div style="font-weight:bold; color:white; font-size:16px;">{pos}</div>
            <div style="font-size:24px; font-weight:bold; color:{color}; margin:5px 0;">{pct:.0f}%</div>
            <div style="color:#9ca3af; font-size:12px;">{push_count} 手</div>
        </div>
        '''

    comparison_html += '</div>'
    st.markdown(comparison_html, unsafe_allow_html=True)

    # Explanation
    if lang == "zh":
        st.info("位置越靠後，Push 範圍越寬。SB 面對一個對手時範圍最寬。")
    else:
        st.info("Later positions have wider push ranges. SB is widest when facing only one opponent.")
