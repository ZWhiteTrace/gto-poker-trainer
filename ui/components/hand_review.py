"""
Hand Review UI Component
For reviewing and analyzing GGPoker hand histories.
"""
import streamlit as st
import os
from pathlib import Path
from typing import List, Optional

from analyzer.hand_parser import GGPokerParser, HandHistory, format_hand_summary
from analyzer.ai_client import create_ai_client, AIProvider
from analyzer.hand_analyzer import HandAnalyzer, create_analyzer


def display_hand_review_page(lang: str = "zh"):
    """Display the hand review page."""

    # Initialize session state
    if "hr_hands" not in st.session_state:
        st.session_state.hr_hands = []
    if "hr_selected_idx" not in st.session_state:
        st.session_state.hr_selected_idx = 0
    if "hr_analyses" not in st.session_state:
        st.session_state.hr_analyses = {}
    if "hr_api_key" not in st.session_state:
        st.session_state.hr_api_key = ""
    if "hr_provider" not in st.session_state:
        st.session_state.hr_provider = "deepseek"

    # Title
    title = "手牌回顧分析" if lang == "zh" else "Hand Review Analysis"
    st.subheader(f"📊 {title}")

    desc = "上傳 GGPoker 手牌歷史，AI 幫你分析每一手的決策" if lang == "zh" else "Upload GGPoker hand history for AI analysis"
    st.caption(desc)

    # Settings expander
    with st.expander("⚙️ " + ("AI 設定" if lang == "zh" else "AI Settings"), expanded=not st.session_state.hr_api_key):
        col1, col2 = st.columns([1, 2])

        with col1:
            provider_options = ["deepseek", "openai", "anthropic"]
            provider_labels = {
                "deepseek": "DeepSeek (推薦，便宜)" if lang == "zh" else "DeepSeek (Recommended)",
                "openai": "OpenAI (GPT-4)",
                "anthropic": "Anthropic (Claude)",
            }
            st.session_state.hr_provider = st.selectbox(
                "AI 服務商" if lang == "zh" else "AI Provider",
                provider_options,
                format_func=lambda x: provider_labels[x],
                key="hr_provider_select",
            )

        with col2:
            api_key_label = "API Key"
            api_key_help = {
                "deepseek": "從 https://platform.deepseek.com 取得",
                "openai": "從 https://platform.openai.com 取得",
                "anthropic": "從 https://console.anthropic.com 取得",
            }
            st.session_state.hr_api_key = st.text_input(
                api_key_label,
                value=st.session_state.hr_api_key,
                type="password",
                help=api_key_help.get(st.session_state.hr_provider, ""),
                key="hr_api_key_input",
            )

        if st.session_state.hr_api_key:
            st.success("✅ API Key 已設定" if lang == "zh" else "✅ API Key configured")
        else:
            st.warning("⚠️ 請輸入 API Key 以啟用 AI 分析" if lang == "zh" else "⚠️ Enter API Key to enable AI analysis")

    st.markdown("---")

    # File upload
    upload_label = "上傳手牌歷史 (.txt)" if lang == "zh" else "Upload Hand History (.txt)"
    uploaded_files = st.file_uploader(
        upload_label,
        type=["txt"],
        accept_multiple_files=True,
        key="hr_upload",
    )

    if uploaded_files:
        if st.button("📥 " + ("解析手牌" if lang == "zh" else "Parse Hands"), key="hr_parse_btn"):
            parser = GGPokerParser()
            all_hands = []

            progress = st.progress(0)
            for i, file in enumerate(uploaded_files):
                try:
                    content = file.read().decode('utf-8')
                    hands = parser.parse_content(content)
                    all_hands.extend(hands)
                except Exception as e:
                    st.error(f"Error parsing {file.name}: {e}")
                progress.progress((i + 1) / len(uploaded_files))

            st.session_state.hr_hands = all_hands
            st.session_state.hr_selected_idx = 0
            st.session_state.hr_analyses = {}
            progress.empty()
            st.rerun()

    # Display hands
    hands = st.session_state.hr_hands
    if not hands:
        st.info("📁 " + ("請上傳 GGPoker 手牌歷史檔案" if lang == "zh" else "Please upload GGPoker hand history files"))
        _show_instructions(lang)
        return

    # Filter to hero hands only
    hero_hands = [h for h in hands if h.hero]

    st.markdown(f"**{len(hero_hands)}** " + ("手牌已載入" if lang == "zh" else "hands loaded"))

    # Hand selector
    col1, col2, col3 = st.columns([1, 3, 1])

    with col1:
        if st.button("◀ " + ("上一手" if lang == "zh" else "Prev"), disabled=st.session_state.hr_selected_idx == 0):
            st.session_state.hr_selected_idx -= 1
            st.rerun()

    with col2:
        st.session_state.hr_selected_idx = st.slider(
            "Hand",
            0,
            len(hero_hands) - 1,
            st.session_state.hr_selected_idx,
            key="hr_slider",
            label_visibility="collapsed",
        )

    with col3:
        if st.button(("下一手" if lang == "zh" else "Next") + " ▶", disabled=st.session_state.hr_selected_idx >= len(hero_hands) - 1):
            st.session_state.hr_selected_idx += 1
            st.rerun()

    # Current hand
    idx = st.session_state.hr_selected_idx
    if idx >= len(hero_hands):
        idx = 0
        st.session_state.hr_selected_idx = 0

    hand = hero_hands[idx]

    # Display hand info
    _display_hand_info(hand, lang)

    st.markdown("---")

    # AI Analysis
    if st.session_state.hr_api_key:
        hand_key = hand.hand_id

        if hand_key in st.session_state.hr_analyses:
            st.markdown("### 🤖 AI 分析" if lang == "zh" else "### 🤖 AI Analysis")
            st.markdown(st.session_state.hr_analyses[hand_key])
        else:
            if st.button("🤖 " + ("AI 分析這手牌" if lang == "zh" else "Analyze with AI"), key="hr_analyze_btn", type="primary"):
                with st.spinner("分析中..." if lang == "zh" else "Analyzing..."):
                    try:
                        analyzer = create_analyzer(
                            provider=st.session_state.hr_provider,
                            api_key=st.session_state.hr_api_key,
                        )
                        analysis = analyzer.analyze_hand(hand)
                        st.session_state.hr_analyses[hand_key] = analysis.ai_analysis
                        st.rerun()
                    except Exception as e:
                        st.error(f"分析失敗: {str(e)}" if lang == "zh" else f"Analysis failed: {str(e)}")
    else:
        st.info("💡 " + ("設定 API Key 即可使用 AI 分析" if lang == "zh" else "Configure API Key to enable AI analysis"))

    # Raw hand history (collapsible)
    with st.expander("📜 " + ("原始手牌記錄" if lang == "zh" else "Raw Hand History")):
        st.code(hand.raw_text, language=None)


def _display_hand_info(hand: HandHistory, lang: str):
    """Display hand information in a formatted way."""

    # Header
    st.markdown(f"### Hand #{hand.hand_id}")

    col1, col2, col3 = st.columns(3)
    with col1:
        st.metric("Table", hand.table_name)
    with col2:
        st.metric("Stakes", f"${hand.stakes[0]}/{hand.stakes[1]}")
    with col3:
        st.metric("Time", hand.timestamp.strftime("%H:%M:%S"))

    # Hero info
    if hand.hero:
        st.markdown("---")
        hero_cols = st.columns(4)
        with hero_cols[0]:
            st.markdown(f"**Position:** {hand.hero.position}")
        with hero_cols[1]:
            st.markdown(f"**Cards:** `{hand.hero.hole_cards}`")
        with hero_cols[2]:
            st.markdown(f"**Stack:** ${hand.hero.stack:.2f}")
        with hero_cols[3]:
            # Result
            if hand.hero.name in hand.winners:
                won = hand.winners[hand.hero.name]
                st.markdown(f"**Result:** :green[+${won:.2f}]")
            else:
                st.markdown(f"**Result:** :red[Lost]")

    # Board
    if hand.flop:
        st.markdown("---")
        board_text = f"**Board:** `{hand.flop}`"
        if hand.turn:
            board_text += f" `{hand.turn}`"
        if hand.river:
            board_text += f" `{hand.river}`"
        st.markdown(board_text)

    # Action summary
    st.markdown("---")
    st.markdown("**Action Flow:**")

    # Preflop
    if hand.preflop_actions:
        preflop_html = _format_actions_html(hand, hand.preflop_actions, "Preflop")
        st.markdown(preflop_html, unsafe_allow_html=True)

    # Flop
    if hand.flop and hand.flop_actions:
        flop_html = _format_actions_html(hand, hand.flop_actions, f"Flop [{hand.flop}]")
        st.markdown(flop_html, unsafe_allow_html=True)

    # Turn
    if hand.turn and hand.turn_actions:
        turn_html = _format_actions_html(hand, hand.turn_actions, f"Turn [{hand.turn}]")
        st.markdown(turn_html, unsafe_allow_html=True)

    # River
    if hand.river and hand.river_actions:
        river_html = _format_actions_html(hand, hand.river_actions, f"River [{hand.river}]")
        st.markdown(river_html, unsafe_allow_html=True)

    # Pot info
    st.markdown(f"**Pot:** ${hand.pot:.2f} | **Rake:** ${hand.rake:.2f}")


def _format_actions_html(hand: HandHistory, actions, street_name: str) -> str:
    """Format actions as HTML."""
    parts = [f"<span style='color:#888;'>{street_name}:</span> "]

    for action in actions:
        if action.action_type.value in ["post_sb", "post_bb"]:
            continue

        # Get position for player
        player_pos = action.player
        for p in hand.players:
            if p.name == action.player:
                player_pos = p.position or action.player
                break

        is_hero = action.player == "Hero"
        color = "#22c55e" if is_hero else "#9ca3af"

        action_str = action.action_type.value
        if action.amount:
            action_str += f" ${action.amount:.2f}"
        if action.to_amount:
            action_str = f"raise to ${action.to_amount:.2f}"

        parts.append(f"<span style='color:{color};'>{player_pos}: {action_str}</span>")

    return " → ".join(parts)


def _show_instructions(lang: str):
    """Show instructions for downloading hand history."""
    st.markdown("---")
    title = "如何下載 GGPoker 手牌歷史" if lang == "zh" else "How to Download GGPoker Hand History"
    st.markdown(f"### {title}")

    if lang == "zh":
        steps = [
            "1. 登入 GGPoker 客戶端",
            "2. 點擊底部的 **PokerCraft** 連結",
            "3. 選擇遊戲類型 (Hold'em / PLO / Tournaments)",
            "4. 勾選要下載的場次",
            "5. 點擊 **Download** 下載手牌歷史",
            "6. 將下載的 .txt 檔案上傳到這裡",
        ]
    else:
        steps = [
            "1. Log in to GGPoker client",
            "2. Click **PokerCraft** link at the bottom",
            "3. Select game type (Hold'em / PLO / Tournaments)",
            "4. Check the sessions you want to download",
            "5. Click **Download** to get hand history",
            "6. Upload the .txt files here",
        ]

    for step in steps:
        st.markdown(step)

    st.info("💡 " + ("手牌歷史保留 90 天" if lang == "zh" else "Hand history is kept for 90 days"))


def display_session_stats(hands: List[HandHistory], lang: str = "zh"):
    """Display session statistics."""
    if not hands:
        return

    hero_hands = [h for h in hands if h.hero]
    if not hero_hands:
        return

    title = "場次統計" if lang == "zh" else "Session Statistics"
    st.markdown(f"### 📈 {title}")

    # Calculate stats
    total_hands = len(hero_hands)
    hands_won = sum(1 for h in hero_hands if h.hero and h.hero.name in h.winners)
    win_rate = (hands_won / total_hands * 100) if total_hands > 0 else 0

    # Position breakdown
    position_stats = {}
    for h in hero_hands:
        if h.hero and h.hero.position:
            pos = h.hero.position
            if pos not in position_stats:
                position_stats[pos] = {"total": 0, "won": 0, "profit": 0}
            position_stats[pos]["total"] += 1
            if h.hero.name in h.winners:
                position_stats[pos]["won"] += 1
                position_stats[pos]["profit"] += h.winners[h.hero.name]

    # Display
    cols = st.columns(4)
    with cols[0]:
        st.metric("Total Hands" if lang == "en" else "總手數", total_hands)
    with cols[1]:
        st.metric("Hands Won" if lang == "en" else "贏的手數", hands_won)
    with cols[2]:
        st.metric("Win Rate" if lang == "en" else "勝率", f"{win_rate:.1f}%")
    with cols[3]:
        biggest_pot = max((h.pot for h in hero_hands), default=0)
        st.metric("Biggest Pot" if lang == "en" else "最大底池", f"${biggest_pot:.2f}")

    # Position breakdown
    if position_stats:
        st.markdown("---")
        st.markdown("**" + ("位置統計" if lang == "zh" else "Position Stats") + "**")

        pos_cols = st.columns(len(position_stats))
        for i, (pos, stats) in enumerate(sorted(position_stats.items())):
            with pos_cols[i]:
                wr = (stats["won"] / stats["total"] * 100) if stats["total"] > 0 else 0
                st.metric(pos, f"{wr:.0f}%", f"{stats['total']} hands")
