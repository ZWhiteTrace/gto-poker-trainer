"""
Facing 3bet chart and drill UI components.
Display 4bet/call/fold ranges when facing a 3bet.
"""
import streamlit as st
import json
from pathlib import Path

from trainer.vs_3bet_drill import (
    get_vs_3bet_drill, Vs3betSpot,
    VS_3BET_SCENARIOS, VS_3BET_SCENARIO_LABELS
)
from ui.components.card_display import display_hand_cards

RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']

# Colors
COLOR_4BET = "#ef4444"    # Red for 4bet
COLOR_CALL = "#3b82f6"    # Blue for call
COLOR_FOLD = "#374151"    # Gray for fold


def load_vs_3bet_data():
    """Load facing 3bet ranges from JSON file."""
    data_path = Path(__file__).parent.parent.parent / "data" / "ranges" / "cash" / "vs_3bet.json"
    try:
        with open(data_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        st.error(f"Failed to load vs 3bet data: {e}")
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


def display_vs_3bet_chart(lang: str = "zh"):
    """Display facing 3bet chart with scenario selection."""

    data = load_vs_3bet_data()
    if not data:
        return

    # Title
    title = "面對 3bet 範圍" if lang == "zh" else "Facing 3bet Ranges"
    st.subheader(title)

    # Description
    desc = "開池後面對 3bet 的 4bet/Call/Fold 決策 (100bb)" if lang == "zh" else "4bet/Call/Fold decisions when facing a 3bet (100bb)"
    st.caption(desc)

    # Scenario selection
    scenario_label = "場景" if lang == "zh" else "Scenario"
    scenario_display = {}
    for s in VS_3BET_SCENARIOS:
        labels = VS_3BET_SCENARIO_LABELS.get(s, {})
        scenario_display[s] = labels.get(lang, s)

    selected_scenario = st.selectbox(
        scenario_label,
        VS_3BET_SCENARIOS,
        format_func=lambda x: scenario_display[x],
        index=0,
        key="vs_3bet_scenario_chart"
    )

    # Get ranges for selected scenario
    scenario_data = data.get("6max", {}).get(selected_scenario, {})
    fourbet_range = set(scenario_data.get("4bet", []))
    call_range = set(scenario_data.get("call", []))

    fourbet_count = len(fourbet_range)
    call_count = len(call_range)
    total_hands = 169
    fourbet_pct = (fourbet_count / total_hands) * 100
    call_pct = (call_count / total_hands) * 100
    fold_pct = 100 - fourbet_pct - call_pct

    # Stats
    stats_html = f"""
    <div style="display:flex; justify-content:center; gap:20px; margin:10px 0;">
        <span style="color:#ef4444; font-weight:600;">4bet: {fourbet_count} ({fourbet_pct:.1f}%)</span>
        <span style="color:#3b82f6; font-weight:600;">Call: {call_count} ({call_pct:.1f}%)</span>
        <span style="color:#6b7280; font-weight:600;">Fold: {fold_pct:.1f}%</span>
    </div>
    """
    st.markdown(stats_html, unsafe_allow_html=True)

    # Legend
    legend_html = '''
    <div style="display: flex; gap: 20px; justify-content: center; margin: 10px 0;">
        <span style="display: flex; align-items: center; gap: 6px;">
            <span style="background: #ef4444; width: 24px; height: 18px; border-radius: 3px; display: inline-block;"></span>
            <span style="color: white;">4bet</span>
        </span>
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

            if hand in fourbet_range:
                bg_color = COLOR_4BET
                text_color = "white"
            elif hand in call_range:
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
            "紅色手牌 = 4bet (價值 + bluff)",
            "藍色手牌 = Call (有位置/底池賠率)",
            "灰色手牌 = Fold",
            "4bet 範圍通常包含 AA-QQ, AK 作為價值，A5s-A4s 作為 bluff",
            "面對更緊的 3bet 位置，我們的繼續範圍也要收緊",
            "SB vs BB 是最寬的場景（HU pot）",
        ]
    else:
        tips = [
            "Red hands = 4bet (value + bluff)",
            "Blue hands = Call (position/pot odds)",
            "Gray hands = Fold",
            "4bet range typically includes AA-QQ, AK for value, A5s-A4s as bluffs",
            "Against tighter 3bet positions, tighten your continue range",
            "SB vs BB is the widest scenario (HU pot)",
        ]

    for tip in tips:
        st.markdown(f"- {tip}")


def display_vs_3bet_drill(lang: str = "zh"):
    """Display facing 3bet drill mode for practice."""

    # Initialize session state
    if "v3b_drill" not in st.session_state:
        st.session_state.v3b_drill = get_vs_3bet_drill()
    if "v3b_spot" not in st.session_state:
        st.session_state.v3b_spot = None
    if "v3b_result" not in st.session_state:
        st.session_state.v3b_result = None
    if "v3b_stats" not in st.session_state:
        st.session_state.v3b_stats = {"total": 0, "correct": 0, "streak": 0, "best_streak": 0}

    drill = st.session_state.v3b_drill

    # Title
    title = "面對 3bet 練習" if lang == "zh" else "Facing 3bet Practice"
    st.subheader(title)

    # Settings in expander
    with st.expander("⚙️ " + ("設定" if lang == "zh" else "Settings"), expanded=False):
        scenario_label = "練習場景" if lang == "zh" else "Practice Scenarios"
        scenario_display = {}
        for s in VS_3BET_SCENARIOS:
            labels = VS_3BET_SCENARIO_LABELS.get(s, {})
            scenario_display[s] = labels.get(lang, s)

        selected_scenarios = st.multiselect(
            scenario_label,
            VS_3BET_SCENARIOS,
            default=VS_3BET_SCENARIOS[:5],  # Default to first 5 scenarios
            format_func=lambda x: scenario_display[x],
            key="v3b_scenario_select"
        )
        if selected_scenarios:
            drill.set_enabled_scenarios(selected_scenarios)

    # Stats display
    stats = st.session_state.v3b_stats
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
    if st.session_state.v3b_spot is None:
        st.session_state.v3b_spot = drill.generate_spot()
        st.session_state.v3b_result = None

    spot = st.session_state.v3b_spot

    if spot is None:
        st.warning("無法生成題目，請檢查設定" if lang == "zh" else "Cannot generate spot, please check settings")
        return

    # Display scenario
    scenario_label = VS_3BET_SCENARIO_LABELS.get(spot.scenario, {}).get(lang, spot.scenario)
    scenario_text = f"**{scenario_label}**"
    st.markdown(f"<div style='text-align:center; font-size:1.3em; margin-bottom:15px;'>{scenario_text}</div>", unsafe_allow_html=True)

    # Display hand cards
    display_hand_cards(spot.hand)

    # Action buttons
    if st.session_state.v3b_result is None:
        col1, col2, col3 = st.columns(3)
        with col1:
            if st.button("🔥 4bet", key="btn_v3b_4bet", use_container_width=True, type="primary"):
                _handle_vs_3bet_answer("4bet", lang)
        with col2:
            if st.button("📞 Call", key="btn_v3b_call", use_container_width=True):
                _handle_vs_3bet_answer("call", lang)
        with col3:
            if st.button("🃏 Fold", key="btn_v3b_fold", use_container_width=True):
                _handle_vs_3bet_answer("fold", lang)
    else:
        # Show result
        result = st.session_state.v3b_result
        if result.is_correct:
            st.success("✅ " + ("正確！" if lang == "zh" else "Correct!"))
        else:
            action_labels = {"4bet": "4bet", "call": "Call", "fold": "Fold"}
            correct_text = action_labels.get(result.correct_action, result.correct_action)
            st.error("❌ " + (f"錯誤！正確答案: {correct_text}" if lang == "zh" else f"Wrong! Correct: {correct_text}"))

        st.info(result.explanation)

        # Show range info
        range_info = f"4bet: {result.fourbet_range_count} 手 ({result.fourbet_pct:.1f}%) | Call: {result.call_range_count} 手 ({result.call_pct:.1f}%)"
        if lang == "en":
            range_info = f"4bet: {result.fourbet_range_count} hands ({result.fourbet_pct:.1f}%) | Call: {result.call_range_count} hands ({result.call_pct:.1f}%)"
        st.caption(range_info)

        # Next button
        if st.button("➡️ " + ("下一題" if lang == "zh" else "Next"), key="btn_v3b_next", use_container_width=True):
            st.session_state.v3b_spot = drill.generate_spot()
            st.session_state.v3b_result = None
            st.rerun()


def _handle_vs_3bet_answer(action: str, lang: str):
    """Handle player's facing 3bet answer."""
    drill = st.session_state.v3b_drill
    spot = st.session_state.v3b_spot
    stats = st.session_state.v3b_stats

    result = drill.check_answer(spot, action)
    st.session_state.v3b_result = result

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
