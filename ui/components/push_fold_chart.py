"""
MTT Push/Fold Chart for short stack situations.
Based on Nash equilibrium push/fold ranges.
"""
import streamlit as st
import json
from pathlib import Path

from trainer.push_fold_drill import (
    get_push_fold_drill, PushFoldSpot, STACK_DEPTHS,
    DEFENSE_SCENARIOS, DEFENSE_SCENARIO_LABELS,
    RESTEAL_SCENARIOS, RESTEAL_SCENARIO_LABELS,
    HU_SCENARIOS, HU_SCENARIO_LABELS, HU_STACK_DEPTHS
)
from ui.components.card_display import display_hand_cards

RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']
POSITIONS = ["UTG", "HJ", "CO", "BTN", "SB"]

# Colors
COLOR_PUSH = "#22c55e"  # Green for push
COLOR_CALL = "#3b82f6"  # Blue for call
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


def load_defense_data():
    """Load defense vs shove ranges from JSON file."""
    data_path = Path(__file__).parent.parent.parent / "data" / "ranges" / "mtt" / "defense_vs_shove.json"
    try:
        with open(data_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        st.error(f"Failed to load defense data: {e}")
        return {}


def load_resteal_data():
    """Load resteal (3bet shove) ranges from JSON file."""
    data_path = Path(__file__).parent.parent.parent / "data" / "ranges" / "mtt" / "resteal.json"
    try:
        with open(data_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        st.error(f"Failed to load resteal data: {e}")
        return {}


def load_hu_data():
    """Load HU (Heads Up) push/defense ranges from JSON file."""
    data_path = Path(__file__).parent.parent.parent / "data" / "ranges" / "mtt" / "hu_push_defense.json"
    try:
        with open(data_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        st.error(f"Failed to load HU data: {e}")
        return {}


# Color for resteal (3bet shove)
COLOR_RESTEAL = "#f97316"  # Orange for 3bet shove

# Color for HU
COLOR_HU_PUSH = "#a855f7"  # Purple for HU push
COLOR_HU_CALL = "#06b6d4"  # Cyan for HU call


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
        stack_options = ["3bb", "4bb", "5bb", "8bb", "10bb", "12bb", "15bb", "20bb", "25bb"]
        stack_labels = {
            "3bb": "3 BB (絕境)" if lang == "zh" else "3 BB (Desperate)",
            "4bb": "4 BB (極短)" if lang == "zh" else "4 BB (Extreme Short)",
            "5bb": "5 BB (短碼)" if lang == "zh" else "5 BB (Short)",
            "8bb": "8 BB" if lang == "zh" else "8 BB",
            "10bb": "10 BB (標準短)" if lang == "zh" else "10 BB (Standard Short)",
            "12bb": "12 BB" if lang == "zh" else "12 BB",
            "15bb": "15 BB" if lang == "zh" else "15 BB",
            "20bb": "20 BB (邊緣)" if lang == "zh" else "20 BB (Borderline)",
            "25bb": "25 BB (過渡)" if lang == "zh" else "25 BB (Transitional)",
        }
        stack_label = "籌碼深度" if lang == "zh" else "Stack Depth"
        selected_stack = st.selectbox(
            stack_label,
            stack_options,
            format_func=lambda x: stack_labels[x],
            index=4  # Default to 10bb
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
    stack_options = ["3bb", "4bb", "5bb", "8bb", "10bb", "12bb", "15bb", "20bb", "25bb"]
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


def display_push_fold_drill(lang: str = "zh"):
    """Display Push/Fold drill mode for practice."""

    # Initialize session state
    if "pf_drill" not in st.session_state:
        st.session_state.pf_drill = get_push_fold_drill()
    if "pf_spot" not in st.session_state:
        st.session_state.pf_spot = None
    if "pf_result" not in st.session_state:
        st.session_state.pf_result = None
    if "pf_stats" not in st.session_state:
        st.session_state.pf_stats = {"total": 0, "correct": 0, "streak": 0, "best_streak": 0}

    drill = st.session_state.pf_drill

    # Title
    title = "Push/Fold 練習" if lang == "zh" else "Push/Fold Practice"
    st.subheader(title)

    # Settings in expander
    with st.expander("⚙️ " + ("設定" if lang == "zh" else "Settings"), expanded=False):
        col1, col2 = st.columns(2)

        with col1:
            stack_label = "籌碼深度" if lang == "zh" else "Stack Depth"
            stack_options = ["3bb", "4bb", "5bb", "8bb", "10bb", "12bb", "15bb", "20bb", "25bb"]
            default_stacks = ["5bb", "8bb", "10bb", "15bb", "20bb"]
            selected_stacks = st.multiselect(
                stack_label,
                stack_options,
                default=default_stacks,
                key="pf_stack_select"
            )
            if selected_stacks:
                drill.set_enabled_stack_depths(selected_stacks)

        with col2:
            pos_label = "位置" if lang == "zh" else "Positions"
            selected_positions = st.multiselect(
                pos_label,
                POSITIONS,
                default=POSITIONS,
                key="pf_pos_select"
            )
            if selected_positions:
                drill.set_enabled_positions(selected_positions)

    # Stats display
    stats = st.session_state.pf_stats
    stats_cols = st.columns(4)
    with stats_cols[0]:
        label = "總數" if lang == "zh" else "Total"
        st.metric(label, stats["total"])
    with stats_cols[1]:
        label = "正確" if lang == "zh" else "Correct"
        pct = (stats["correct"] / stats["total"] * 100) if stats["total"] > 0 else 0
        st.metric(label, f"{stats['correct']} ({pct:.0f}%)")
    with stats_cols[2]:
        label = "連勝" if lang == "zh" else "Streak"
        st.metric(label, stats["streak"])
    with stats_cols[3]:
        label = "最佳" if lang == "zh" else "Best"
        st.metric(label, stats["best_streak"])

    st.markdown("---")

    # Generate new spot if needed
    if st.session_state.pf_spot is None:
        st.session_state.pf_spot = drill.generate_spot()
        st.session_state.pf_result = None

    spot = st.session_state.pf_spot

    # Display scenario
    scenario_text = f"**{spot.position}** | **{spot.stack_depth.upper()}**"
    st.markdown(f"<div style='text-align:center; font-size:1.3em; margin-bottom:15px;'>{scenario_text}</div>", unsafe_allow_html=True)

    # Display hand cards
    display_hand_cards(spot.hand)

    # Action buttons
    if st.session_state.pf_result is None:
        col1, col2 = st.columns(2)
        with col1:
            if st.button("🚀 Push", key="btn_push", use_container_width=True, type="primary"):
                _handle_answer("push", lang)
        with col2:
            if st.button("🃏 Fold", key="btn_fold", use_container_width=True):
                _handle_answer("fold", lang)
    else:
        # Show result
        result = st.session_state.pf_result
        if result.is_correct:
            st.success("✅ " + ("正確！" if lang == "zh" else "Correct!"))
        else:
            correct_text = "Push" if result.correct_action == "push" else "Fold"
            st.error("❌ " + (f"錯誤！正確答案: {correct_text}" if lang == "zh" else f"Wrong! Correct: {correct_text}"))

        st.info(result.explanation)

        # Show range info
        range_info = f"該位置/深度 Push 範圍: {result.push_range_count} 手 ({result.push_range_pct:.1f}%)"
        if lang == "en":
            range_info = f"Push range at this spot: {result.push_range_count} hands ({result.push_range_pct:.1f}%)"
        st.caption(range_info)

        # Next button
        if st.button("➡️ " + ("下一題" if lang == "zh" else "Next"), key="btn_next", use_container_width=True):
            st.session_state.pf_spot = drill.generate_spot()
            st.session_state.pf_result = None
            st.rerun()


def _handle_answer(action: str, lang: str):
    """Handle player's answer."""
    drill = st.session_state.pf_drill
    spot = st.session_state.pf_spot
    stats = st.session_state.pf_stats

    result = drill.check_answer(spot, action)
    st.session_state.pf_result = result

    # Update stats
    stats["total"] += 1
    if result.is_correct:
        stats["correct"] += 1
        stats["streak"] += 1
        if stats["streak"] > stats["best_streak"]:
            stats["best_streak"] = stats["streak"]
    else:
        stats["streak"] = 0

    st.rerun()


def display_defense_chart(lang: str = "zh"):
    """Display defense vs shove chart with scenario and stack depth selection."""

    data = load_defense_data()
    if not data:
        return

    # Title
    title = "防守範圍 (vs Shove)" if lang == "zh" else "Defense Ranges (vs Shove)"
    st.subheader(title)

    # Description
    desc = "面對 All-in 時的 Call 範圍" if lang == "zh" else "Call ranges when facing an all-in"
    st.caption(desc)

    # Controls
    col1, col2 = st.columns(2)

    with col1:
        scenario_label = "場景" if lang == "zh" else "Scenario"
        scenario_display = {}
        for s in DEFENSE_SCENARIOS:
            labels = DEFENSE_SCENARIO_LABELS.get(s, {})
            scenario_display[s] = labels.get(lang, s)

        selected_scenario = st.selectbox(
            scenario_label,
            DEFENSE_SCENARIOS,
            format_func=lambda x: scenario_display[x],
            index=0
        )

    # Get available stack depths for this scenario
    scenario_data = data.get("6max", {}).get(selected_scenario, {})
    available_stacks = list(scenario_data.keys())

    with col2:
        stack_label = "籌碼深度" if lang == "zh" else "Stack Depth"
        if available_stacks:
            selected_stack = st.selectbox(
                stack_label,
                available_stacks,
                index=min(2, len(available_stacks) - 1)  # Default to ~10bb or middle option
            )
        else:
            st.warning("無可用籌碼深度" if lang == "zh" else "No stack depths available")
            return

    # Get call range for selected scenario and stack
    call_range = set(scenario_data.get(selected_stack, []))
    call_count = len(call_range)
    total_hands = 169
    call_pct = (call_count / total_hands) * 100

    # Stats
    stats_text = f"Call 範圍: {call_count} 手牌 ({call_pct:.1f}%)" if lang == "zh" else f"Call range: {call_count} hands ({call_pct:.1f}%)"
    st.markdown(f"<p style='text-align:center; color:#9ca3af; margin-bottom:10px;'>{stats_text}</p>", unsafe_allow_html=True)

    # Legend
    legend_html = '''
    <div style="display: flex; gap: 20px; justify-content: center; margin: 10px 0;">
        <span style="display: flex; align-items: center; gap: 6px;">
            <span style="background: #3b82f6; width: 24px; height: 18px; border-radius: 3px; display: inline-block;"></span>
            <span style="color: white;">Call</span>
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
            is_call = hand in call_range

            if is_call:
                bg_color = COLOR_CALL
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
            "藍色手牌 = Call (跟注全下)",
            "灰色手牌 = Fold",
            "BB 對上 SB 全下的 Call 範圍最寬（只需對抗一個對手）",
            "面對更早位置的全下，Call 範圍要收緊",
            "籌碼越深，Call 範圍越緊（對手推入的籌碼越多）",
        ]
    else:
        tips = [
            "Blue hands = Call (call the all-in)",
            "Gray hands = Fold",
            "BB vs SB shove has the widest call range (only one opponent)",
            "Tighten your call range against earlier position shoves",
            "Deeper stacks require tighter call ranges",
        ]

    for tip in tips:
        st.markdown(f"- {tip}")


def display_defense_drill(lang: str = "zh"):
    """Display defense vs shove drill mode for practice."""

    # Initialize session state
    if "df_drill" not in st.session_state:
        st.session_state.df_drill = get_push_fold_drill()
    if "df_spot" not in st.session_state:
        st.session_state.df_spot = None
    if "df_result" not in st.session_state:
        st.session_state.df_result = None
    if "df_stats" not in st.session_state:
        st.session_state.df_stats = {"total": 0, "correct": 0, "streak": 0, "best_streak": 0}

    drill = st.session_state.df_drill

    # Title
    title = "防守練習 (vs Shove)" if lang == "zh" else "Defense Practice (vs Shove)"
    st.subheader(title)

    # Settings in expander
    with st.expander("⚙️ " + ("設定" if lang == "zh" else "Settings"), expanded=False):
        scenario_label = "練習場景" if lang == "zh" else "Practice Scenarios"
        scenario_display = {}
        for s in DEFENSE_SCENARIOS:
            labels = DEFENSE_SCENARIO_LABELS.get(s, {})
            scenario_display[s] = labels.get(lang, s)

        selected_scenarios = st.multiselect(
            scenario_label,
            DEFENSE_SCENARIOS,
            default=DEFENSE_SCENARIOS[:3],  # Default to first 3 scenarios
            format_func=lambda x: scenario_display[x],
            key="df_scenario_select"
        )
        if selected_scenarios:
            drill.set_enabled_defense_scenarios(selected_scenarios)

    # Stats display
    stats = st.session_state.df_stats
    stats_cols = st.columns(4)
    with stats_cols[0]:
        label = "總數" if lang == "zh" else "Total"
        st.metric(label, stats["total"])
    with stats_cols[1]:
        label = "正確" if lang == "zh" else "Correct"
        pct = (stats["correct"] / stats["total"] * 100) if stats["total"] > 0 else 0
        st.metric(label, f"{stats['correct']} ({pct:.0f}%)")
    with stats_cols[2]:
        label = "連勝" if lang == "zh" else "Streak"
        st.metric(label, stats["streak"])
    with stats_cols[3]:
        label = "最佳" if lang == "zh" else "Best"
        st.metric(label, stats["best_streak"])

    st.markdown("---")

    # Generate new spot if needed
    if st.session_state.df_spot is None:
        st.session_state.df_spot = drill.generate_defense_spot()
        st.session_state.df_result = None

    spot = st.session_state.df_spot

    if spot is None:
        st.warning("無法生成防守題目，請檢查設定" if lang == "zh" else "Cannot generate defense spot, please check settings")
        return

    # Display scenario
    scenario_label = DEFENSE_SCENARIO_LABELS.get(spot.defense_scenario, {}).get(lang, spot.defense_scenario)
    scenario_text = f"**{scenario_label}** | **{spot.stack_depth.upper()}**"
    st.markdown(f"<div style='text-align:center; font-size:1.3em; margin-bottom:15px;'>{scenario_text}</div>", unsafe_allow_html=True)

    # Display hand cards
    display_hand_cards(spot.hand)

    # Action buttons
    if st.session_state.df_result is None:
        col1, col2 = st.columns(2)
        with col1:
            if st.button("📞 Call", key="btn_call", use_container_width=True, type="primary"):
                _handle_defense_answer("call", lang)
        with col2:
            if st.button("🃏 Fold", key="btn_df_fold", use_container_width=True):
                _handle_defense_answer("fold", lang)
    else:
        # Show result
        result = st.session_state.df_result
        if result.is_correct:
            st.success("✅ " + ("正確！" if lang == "zh" else "Correct!"))
        else:
            correct_text = "Call" if result.correct_action == "call" else "Fold"
            st.error("❌ " + (f"錯誤！正確答案: {correct_text}" if lang == "zh" else f"Wrong! Correct: {correct_text}"))

        st.info(result.explanation)

        # Show range info
        range_info = f"該場景 Call 範圍: {result.push_range_count} 手 ({result.push_range_pct:.1f}%)"
        if lang == "en":
            range_info = f"Call range at this spot: {result.push_range_count} hands ({result.push_range_pct:.1f}%)"
        st.caption(range_info)

        # Next button
        if st.button("➡️ " + ("下一題" if lang == "zh" else "Next"), key="btn_df_next", use_container_width=True):
            st.session_state.df_spot = drill.generate_defense_spot()
            st.session_state.df_result = None
            st.rerun()


def _handle_defense_answer(action: str, lang: str):
    """Handle player's defense answer."""
    drill = st.session_state.df_drill
    spot = st.session_state.df_spot
    stats = st.session_state.df_stats

    result = drill.check_defense_answer(spot, action)
    st.session_state.df_result = result

    # Update stats
    stats["total"] += 1
    if result.is_correct:
        stats["correct"] += 1
        stats["streak"] += 1
        if stats["streak"] > stats["best_streak"]:
            stats["best_streak"] = stats["streak"]
    else:
        stats["streak"] = 0

    st.rerun()


def display_resteal_chart(lang: str = "zh"):
    """Display resteal (3bet shove) chart with scenario and stack depth selection."""

    data = load_resteal_data()
    if not data:
        return

    # Title
    title = "Resteal 範圍 (3bet 全下)" if lang == "zh" else "Resteal Ranges (3bet Shove)"
    st.subheader(title)

    # Description
    desc = "對手開池後的 3bet 全下範圍" if lang == "zh" else "3bet shove ranges vs opener"
    st.caption(desc)

    # Controls
    col1, col2 = st.columns(2)

    with col1:
        scenario_label = "場景" if lang == "zh" else "Scenario"
        scenario_display = {}
        for s in RESTEAL_SCENARIOS:
            labels = RESTEAL_SCENARIO_LABELS.get(s, {})
            scenario_display[s] = labels.get(lang, s)

        selected_scenario = st.selectbox(
            scenario_label,
            RESTEAL_SCENARIOS,
            format_func=lambda x: scenario_display[x],
            index=0,
            key="resteal_scenario_chart"
        )

    # Get available stack depths for this scenario
    scenario_data = data.get("6max", {}).get(selected_scenario, {})
    available_stacks = list(scenario_data.keys())

    with col2:
        stack_label = "籌碼深度" if lang == "zh" else "Stack Depth"
        if available_stacks:
            selected_stack = st.selectbox(
                stack_label,
                available_stacks,
                index=min(2, len(available_stacks) - 1),  # Default to ~10bb or middle option
                key="resteal_stack_chart"
            )
        else:
            st.warning("無可用籌碼深度" if lang == "zh" else "No stack depths available")
            return

    # Get resteal range for selected scenario and stack
    resteal_range = set(scenario_data.get(selected_stack, []))
    resteal_count = len(resteal_range)
    total_hands = 169
    resteal_pct = (resteal_count / total_hands) * 100

    # Stats
    stats_text = f"3bet 全下範圍: {resteal_count} 手牌 ({resteal_pct:.1f}%)" if lang == "zh" else f"3bet shove range: {resteal_count} hands ({resteal_pct:.1f}%)"
    st.markdown(f"<p style='text-align:center; color:#9ca3af; margin-bottom:10px;'>{stats_text}</p>", unsafe_allow_html=True)

    # Legend
    legend_html = '''
    <div style="display: flex; gap: 20px; justify-content: center; margin: 10px 0;">
        <span style="display: flex; align-items: center; gap: 6px;">
            <span style="background: #f97316; width: 24px; height: 18px; border-radius: 3px; display: inline-block;"></span>
            <span style="color: white;">3bet Shove</span>
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
            is_resteal = hand in resteal_range

            if is_resteal:
                bg_color = COLOR_RESTEAL
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
            "橘色手牌 = 3bet 全下 (Resteal)",
            "灰色手牌 = Fold",
            "Resteal 是指在對手開池後，從盲注位 3bet 全下",
            "SB vs BTN 的 resteal 範圍最寬（BTN 開池範圍寬）",
            "對抗更早位置開池，resteal 範圍要收緊",
            "籌碼越深，resteal 範圍越緊",
        ]
    else:
        tips = [
            "Orange hands = 3bet Shove (Resteal)",
            "Gray hands = Fold",
            "Resteal means 3bet shoving from blinds vs an opener",
            "SB vs BTN has the widest resteal range (BTN opens wide)",
            "Tighten your resteal range against earlier position opens",
            "Deeper stacks require tighter resteal ranges",
        ]

    for tip in tips:
        st.markdown(f"- {tip}")


def display_resteal_drill(lang: str = "zh"):
    """Display resteal (3bet shove) drill mode for practice."""

    # Initialize session state
    if "rs_drill" not in st.session_state:
        st.session_state.rs_drill = get_push_fold_drill()
    if "rs_spot" not in st.session_state:
        st.session_state.rs_spot = None
    if "rs_result" not in st.session_state:
        st.session_state.rs_result = None
    if "rs_stats" not in st.session_state:
        st.session_state.rs_stats = {"total": 0, "correct": 0, "streak": 0, "best_streak": 0}

    drill = st.session_state.rs_drill

    # Title
    title = "Resteal 練習 (3bet 全下)" if lang == "zh" else "Resteal Practice (3bet Shove)"
    st.subheader(title)

    # Settings in expander
    with st.expander("⚙️ " + ("設定" if lang == "zh" else "Settings"), expanded=False):
        scenario_label = "練習場景" if lang == "zh" else "Practice Scenarios"
        scenario_display = {}
        for s in RESTEAL_SCENARIOS:
            labels = RESTEAL_SCENARIO_LABELS.get(s, {})
            scenario_display[s] = labels.get(lang, s)

        selected_scenarios = st.multiselect(
            scenario_label,
            RESTEAL_SCENARIOS,
            default=RESTEAL_SCENARIOS[:3],  # Default to first 3 scenarios
            format_func=lambda x: scenario_display[x],
            key="rs_scenario_select"
        )
        if selected_scenarios:
            drill.set_enabled_resteal_scenarios(selected_scenarios)

    # Stats display
    stats = st.session_state.rs_stats
    stats_cols = st.columns(4)
    with stats_cols[0]:
        label = "總數" if lang == "zh" else "Total"
        st.metric(label, stats["total"])
    with stats_cols[1]:
        label = "正確" if lang == "zh" else "Correct"
        pct = (stats["correct"] / stats["total"] * 100) if stats["total"] > 0 else 0
        st.metric(label, f"{stats['correct']} ({pct:.0f}%)")
    with stats_cols[2]:
        label = "連勝" if lang == "zh" else "Streak"
        st.metric(label, stats["streak"])
    with stats_cols[3]:
        label = "最佳" if lang == "zh" else "Best"
        st.metric(label, stats["best_streak"])

    st.markdown("---")

    # Generate new spot if needed
    if st.session_state.rs_spot is None:
        st.session_state.rs_spot = drill.generate_resteal_spot()
        st.session_state.rs_result = None

    spot = st.session_state.rs_spot

    if spot is None:
        st.warning("無法生成 Resteal 題目，請檢查設定" if lang == "zh" else "Cannot generate resteal spot, please check settings")
        return

    # Display scenario
    scenario_label = RESTEAL_SCENARIO_LABELS.get(spot.resteal_scenario, {}).get(lang, spot.resteal_scenario)
    scenario_text = f"**{scenario_label}** | **{spot.stack_depth.upper()}**"
    st.markdown(f"<div style='text-align:center; font-size:1.3em; margin-bottom:15px;'>{scenario_text}</div>", unsafe_allow_html=True)

    # Display hand cards
    display_hand_cards(spot.hand)

    # Action buttons
    if st.session_state.rs_result is None:
        col1, col2 = st.columns(2)
        with col1:
            if st.button("🚀 3bet Shove", key="btn_resteal", use_container_width=True, type="primary"):
                _handle_resteal_answer("shove", lang)
        with col2:
            if st.button("🃏 Fold", key="btn_rs_fold", use_container_width=True):
                _handle_resteal_answer("fold", lang)
    else:
        # Show result
        result = st.session_state.rs_result
        if result.is_correct:
            st.success("✅ " + ("正確！" if lang == "zh" else "Correct!"))
        else:
            correct_text = "3bet Shove" if result.correct_action == "shove" else "Fold"
            st.error("❌ " + (f"錯誤！正確答案: {correct_text}" if lang == "zh" else f"Wrong! Correct: {correct_text}"))

        st.info(result.explanation)

        # Show range info
        range_info = f"該場景 3bet 全下範圍: {result.push_range_count} 手 ({result.push_range_pct:.1f}%)"
        if lang == "en":
            range_info = f"3bet shove range at this spot: {result.push_range_count} hands ({result.push_range_pct:.1f}%)"
        st.caption(range_info)

        # Next button
        if st.button("➡️ " + ("下一題" if lang == "zh" else "Next"), key="btn_rs_next", use_container_width=True):
            st.session_state.rs_spot = drill.generate_resteal_spot()
            st.session_state.rs_result = None
            st.rerun()


def _handle_resteal_answer(action: str, lang: str):
    """Handle player's resteal answer."""
    drill = st.session_state.rs_drill
    spot = st.session_state.rs_spot
    stats = st.session_state.rs_stats

    result = drill.check_resteal_answer(spot, action)
    st.session_state.rs_result = result

    # Update stats
    stats["total"] += 1
    if result.is_correct:
        stats["correct"] += 1
        stats["streak"] += 1
        if stats["streak"] > stats["best_streak"]:
            stats["best_streak"] = stats["streak"]
    else:
        stats["streak"] = 0

    st.rerun()


def display_hu_chart(lang: str = "zh"):
    """Display HU (Heads Up) push/call chart with scenario and stack depth selection."""

    data = load_hu_data()
    if not data:
        return

    # Title
    title = "HU 推/防 範圍" if lang == "zh" else "HU Push/Defense Ranges"
    st.subheader(title)

    # Description
    desc = "Heads Up 單挑的 Push 和 Call 範圍" if lang == "zh" else "Push and Call ranges for Heads Up play"
    st.caption(desc)

    # Controls
    col1, col2 = st.columns(2)

    with col1:
        scenario_label = "場景" if lang == "zh" else "Scenario"
        scenario_display = {}
        for s in HU_SCENARIOS:
            labels = HU_SCENARIO_LABELS.get(s, {})
            scenario_display[s] = labels.get(lang, s)

        selected_scenario = st.selectbox(
            scenario_label,
            HU_SCENARIOS,
            format_func=lambda x: scenario_display[x],
            index=0,
            key="hu_scenario_chart"
        )

    # Get available stack depths for this scenario
    scenario_data = data.get("hu", {}).get(selected_scenario, {})
    available_stacks = list(scenario_data.keys())

    with col2:
        stack_label = "籌碼深度" if lang == "zh" else "Stack Depth"
        if available_stacks:
            selected_stack = st.selectbox(
                stack_label,
                available_stacks,
                index=min(4, len(available_stacks) - 1),  # Default to ~10bb
                key="hu_stack_chart"
            )
        else:
            st.warning("無可用籌碼深度" if lang == "zh" else "No stack depths available")
            return

    # Get range for selected scenario and stack
    hu_range = set(scenario_data.get(selected_stack, []))
    range_count = len(hu_range)
    total_hands = 169
    range_pct = (range_count / total_hands) * 100

    # Determine action type based on scenario
    is_push = selected_scenario == "SB_push"
    action_word = "Push" if is_push else "Call"
    color = COLOR_HU_PUSH if is_push else COLOR_HU_CALL

    # Stats
    stats_text = f"{action_word} 範圍: {range_count} 手牌 ({range_pct:.1f}%)" if lang == "zh" else f"{action_word} range: {range_count} hands ({range_pct:.1f}%)"
    st.markdown(f"<p style='text-align:center; color:#9ca3af; margin-bottom:10px;'>{stats_text}</p>", unsafe_allow_html=True)

    # Legend
    legend_html = f'''
    <div style="display: flex; gap: 20px; justify-content: center; margin: 10px 0;">
        <span style="display: flex; align-items: center; gap: 6px;">
            <span style="background: {color}; width: 24px; height: 18px; border-radius: 3px; display: inline-block;"></span>
            <span style="color: white;">{action_word}</span>
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
            is_in_range = hand in hu_range

            if is_in_range:
                bg_color = color
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
        if is_push:
            tips = [
                "紫色手牌 = SB Push (全下)",
                "灰色手牌 = Fold",
                "HU 情況下，SB 的 Push 範圍非常寬",
                "籌碼越短，Push 範圍越寬",
                "3bb 時接近 any-two 都可以 Push",
            ]
        else:
            tips = [
                "青色手牌 = BB Call (跟注)",
                "灰色手牌 = Fold",
                "BB 面對 SB 全下時的防守範圍",
                "籌碼越短，Call 範圍越寬",
                "需要比 Push 範圍更緊一些（因為要投入更多籌碼）",
            ]
    else:
        if is_push:
            tips = [
                "Purple hands = SB Push (All-in)",
                "Gray hands = Fold",
                "In HU, SB has very wide push range",
                "Shorter stacks = wider push range",
                "At 3bb, almost any-two can be pushed",
            ]
        else:
            tips = [
                "Cyan hands = BB Call",
                "Gray hands = Fold",
                "BB defense range when facing SB shove",
                "Shorter stacks = wider call range",
                "Call range is tighter than push range (risking more chips)",
            ]

    for tip in tips:
        st.markdown(f"- {tip}")


def display_hu_drill(lang: str = "zh"):
    """Display HU (Heads Up) drill mode for practice."""

    # Initialize session state
    if "hu_drill" not in st.session_state:
        st.session_state.hu_drill = get_push_fold_drill()
    if "hu_spot" not in st.session_state:
        st.session_state.hu_spot = None
    if "hu_result" not in st.session_state:
        st.session_state.hu_result = None
    if "hu_stats" not in st.session_state:
        st.session_state.hu_stats = {"total": 0, "correct": 0, "streak": 0, "best_streak": 0}

    drill = st.session_state.hu_drill

    # Title
    title = "HU 推/防 練習" if lang == "zh" else "HU Push/Defense Practice"
    st.subheader(title)

    # Settings in expander
    with st.expander("⚙️ " + ("設定" if lang == "zh" else "Settings"), expanded=False):
        col1, col2 = st.columns(2)

        with col1:
            scenario_label = "練習場景" if lang == "zh" else "Practice Scenarios"
            scenario_display = {}
            for s in HU_SCENARIOS:
                labels = HU_SCENARIO_LABELS.get(s, {})
                scenario_display[s] = labels.get(lang, s)

            selected_scenarios = st.multiselect(
                scenario_label,
                HU_SCENARIOS,
                default=HU_SCENARIOS,  # Default to all scenarios
                format_func=lambda x: scenario_display[x],
                key="hu_scenario_select"
            )
            if selected_scenarios:
                drill.set_enabled_hu_scenarios(selected_scenarios)

        with col2:
            stack_label = "籌碼深度" if lang == "zh" else "Stack Depths"
            selected_stacks = st.multiselect(
                stack_label,
                HU_STACK_DEPTHS,
                default=["5bb", "8bb", "10bb", "15bb"],
                key="hu_stack_select"
            )
            if selected_stacks:
                drill.set_enabled_hu_stack_depths(selected_stacks)

    # Stats display
    stats = st.session_state.hu_stats
    stats_cols = st.columns(4)
    with stats_cols[0]:
        label = "總數" if lang == "zh" else "Total"
        st.metric(label, stats["total"])
    with stats_cols[1]:
        label = "正確" if lang == "zh" else "Correct"
        pct = (stats["correct"] / stats["total"] * 100) if stats["total"] > 0 else 0
        st.metric(label, f"{stats['correct']} ({pct:.0f}%)")
    with stats_cols[2]:
        label = "連勝" if lang == "zh" else "Streak"
        st.metric(label, stats["streak"])
    with stats_cols[3]:
        label = "最佳" if lang == "zh" else "Best"
        st.metric(label, stats["best_streak"])

    st.markdown("---")

    # Generate new spot if needed
    if st.session_state.hu_spot is None:
        st.session_state.hu_spot = drill.generate_hu_spot()
        st.session_state.hu_result = None

    spot = st.session_state.hu_spot

    if spot is None:
        st.warning("無法生成 HU 題目，請檢查設定" if lang == "zh" else "Cannot generate HU spot, please check settings")
        return

    # Display scenario
    scenario_label = HU_SCENARIO_LABELS.get(spot.hu_scenario, {}).get(lang, spot.hu_scenario)
    scenario_text = f"**{scenario_label}** | **{spot.stack_depth.upper()}**"
    st.markdown(f"<div style='text-align:center; font-size:1.3em; margin-bottom:15px;'>{scenario_text}</div>", unsafe_allow_html=True)

    # Display hand cards
    display_hand_cards(spot.hand)

    # Determine button labels based on scenario
    is_push_scenario = spot.hu_scenario == "SB_push"

    # Action buttons
    if st.session_state.hu_result is None:
        col1, col2 = st.columns(2)
        with col1:
            if is_push_scenario:
                if st.button("🚀 Push", key="btn_hu_push", use_container_width=True, type="primary"):
                    _handle_hu_answer("push", lang)
            else:
                if st.button("📞 Call", key="btn_hu_call", use_container_width=True, type="primary"):
                    _handle_hu_answer("call", lang)
        with col2:
            if st.button("🃏 Fold", key="btn_hu_fold", use_container_width=True):
                _handle_hu_answer("fold", lang)
    else:
        # Show result
        result = st.session_state.hu_result
        if result.is_correct:
            st.success("✅ " + ("正確！" if lang == "zh" else "Correct!"))
        else:
            if is_push_scenario:
                correct_text = "Push" if result.correct_action == "push" else "Fold"
            else:
                correct_text = "Call" if result.correct_action == "call" else "Fold"
            st.error("❌ " + (f"錯誤！正確答案: {correct_text}" if lang == "zh" else f"Wrong! Correct: {correct_text}"))

        st.info(result.explanation)

        # Show range info
        action_word = "Push" if is_push_scenario else "Call"
        range_info = f"該場景 {action_word} 範圍: {result.push_range_count} 手 ({result.push_range_pct:.1f}%)"
        if lang == "en":
            range_info = f"{action_word} range at this spot: {result.push_range_count} hands ({result.push_range_pct:.1f}%)"
        st.caption(range_info)

        # Next button
        if st.button("➡️ " + ("下一題" if lang == "zh" else "Next"), key="btn_hu_next", use_container_width=True):
            st.session_state.hu_spot = drill.generate_hu_spot()
            st.session_state.hu_result = None
            st.rerun()


def _handle_hu_answer(action: str, lang: str):
    """Handle player's HU answer."""
    drill = st.session_state.hu_drill
    spot = st.session_state.hu_spot
    stats = st.session_state.hu_stats

    result = drill.check_hu_answer(spot, action)
    st.session_state.hu_result = result

    # Update stats
    stats["total"] += 1
    if result.is_correct:
        stats["correct"] += 1
        stats["streak"] += 1
        if stats["streak"] > stats["best_streak"]:
            stats["best_streak"] = stats["streak"]
    else:
        stats["streak"] = 0

    st.rerun()
