"""
Hand Review UI Component
For reviewing and analyzing GGPoker hand histories.
Supports single hand review and batch analysis.
"""
import streamlit as st
import os
from pathlib import Path
from typing import List, Optional

from analyzer.hand_parser import GGPokerParser, HandHistory, format_hand_summary
from analyzer.ai_client import create_ai_client, AIProvider
from analyzer.hand_analyzer import (
    HandAnalyzer,
    create_analyzer,
    BatchAnalyzer,
    create_batch_analyzer,
    BatchAnalysisResult,
    HandResult,
    PositionStats,
    PlayerStats,
    PostflopStats,
)


def display_hand_review_page(lang: str = "zh"):
    """Display the hand review page with tabs for single and batch analysis."""

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
    if "hr_batch_result" not in st.session_state:
        st.session_state.hr_batch_result = None

    # Title
    title = "手牌回顧分析" if lang == "zh" else "Hand Review Analysis"
    st.subheader(f"📊 {title}")

    desc = "上傳 GGPoker 手牌歷史，AI 幫你分析決策與找出漏洞" if lang == "zh" else "Upload GGPoker hand history for AI analysis"
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
            if lang == "zh":
                st.caption("🔒 Key 僅存於當前會話，關閉頁面後自動清除。建議使用有額度限制的 API Key。")
            else:
                st.caption("🔒 Key is stored in session only, cleared when you close the page. Use a rate-limited API key.")
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
            st.session_state.hr_batch_result = None
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

    # Tabs for single vs batch analysis
    tab_single = "單手分析" if lang == "zh" else "Single Hand"
    tab_batch = "批量分析" if lang == "zh" else "Batch Analysis"

    tab1, tab2 = st.tabs([f"🔍 {tab_single}", f"📈 {tab_batch}"])

    with tab1:
        _display_single_hand_analysis(hero_hands, lang)

    with tab2:
        _display_batch_analysis(hero_hands, lang)


def _display_single_hand_analysis(hero_hands: List[HandHistory], lang: str):
    """Display single hand analysis interface."""

    # Hand selector
    col1, col2, col3 = st.columns([1, 3, 1])

    with col1:
        if st.button("◀ " + ("上一手" if lang == "zh" else "Prev"), disabled=st.session_state.hr_selected_idx == 0, key="prev_hand"):
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
        if st.button(("下一手" if lang == "zh" else "Next") + " ▶", disabled=st.session_state.hr_selected_idx >= len(hero_hands) - 1, key="next_hand"):
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


def _display_batch_analysis(hero_hands: List[HandHistory], lang: str):
    """Display batch analysis interface."""

    st.markdown("### " + ("批量分析" if lang == "zh" else "Batch Analysis"))

    # Explain what batch analysis does
    if lang == "zh":
        st.info(f"""
        📊 **分析說明**
        - 將自動計算 **全部 {len(hero_hands)} 手** 的盈虧（本地計算，無 API 費用）
        - 按盈虧排序，找出最大虧損和盈利的手牌
        - AI 報告只呼叫 **1 次 API**（分析統計摘要，非逐手分析）
        """)
    else:
        st.info(f"""
        📊 **How it works**
        - Calculates P/L for **all {len(hero_hands)} hands** locally (no API cost)
        - Sorts by profit to find biggest losers/winners
        - AI report uses **1 API call** (analyzes summary, not each hand)
        """)

    # Analysis settings
    col1, col2, col3 = st.columns(3)
    with col1:
        top_n = st.slider(
            "顯示前 N 手（虧損/盈利排行）" if lang == "zh" else "Show top N (losers/winners)",
            min_value=5,
            max_value=20,
            value=10,
            key="batch_top_n",
            help="控制排行榜顯示幾手，不影響分析範圍" if lang == "zh" else "Controls how many hands to display, doesn't affect analysis"
        )
    with col2:
        generate_ai = st.checkbox(
            "生成 AI Leak 報告" if lang == "zh" else "Generate AI Leak Report",
            value=True,
            disabled=not st.session_state.hr_api_key,
            key="batch_ai_report"
        )
    with col3:
        # Deep analysis for large datasets
        is_large_dataset = len(hero_hands) >= 1000
        deep_analysis = st.checkbox(
            "深度分析虧損手牌" if lang == "zh" else "Deep Analyze Losing Hands",
            value=is_large_dataset,  # Default on for large datasets
            disabled=not st.session_state.hr_api_key or not generate_ai,
            key="batch_deep_analysis",
            help="為最大虧損手牌發送完整歷史給 AI 分析（額外 1 次 API 呼叫）" if lang == "zh" else "Send full hand histories of biggest losers to AI (1 extra API call)"
        )

    # Run batch analysis
    if st.button("🚀 " + ("開始批量分析" if lang == "zh" else "Run Batch Analysis"), key="run_batch", type="primary"):
        with st.spinner("分析中，請稍候..." if lang == "zh" else "Analyzing, please wait..."):
            try:
                batch_analyzer = create_batch_analyzer(
                    provider=st.session_state.hr_provider,
                    api_key=st.session_state.hr_api_key if generate_ai else None,
                )
                result = batch_analyzer.analyze_batch(
                    hero_hands,
                    top_n=top_n,
                    generate_ai_report=generate_ai and st.session_state.hr_api_key,
                    deep_analysis=deep_analysis and generate_ai and st.session_state.hr_api_key,
                )
                st.session_state.hr_batch_result = result
                st.rerun()
            except Exception as e:
                st.error(f"分析失敗: {str(e)}" if lang == "zh" else f"Analysis failed: {str(e)}")
                return

    # Display results
    result = st.session_state.hr_batch_result
    if not result:
        st.info("💡 " + ("點擊上方按鈕開始分析" if lang == "zh" else "Click the button above to start analysis"))
        return

    _display_batch_results(result, lang)


def _display_batch_results(result: BatchAnalysisResult, lang: str):
    """Display batch analysis results."""

    # Sample size warning thresholds
    MIN_HANDS_RELIABLE = 500
    MIN_HANDS_SHOW = 100

    # Global sample size warning
    if result.total_hands < MIN_HANDS_SHOW:
        if lang == "zh":
            st.error(f"⚠️ **樣本過少 ({result.total_hands} 手)**：數據不具統計意義，建議至少上傳 500+ 手牌")
        else:
            st.error(f"⚠️ **Sample too small ({result.total_hands} hands)**: Data not statistically significant. Upload 500+ hands recommended.")
    elif result.total_hands < MIN_HANDS_RELIABLE:
        if lang == "zh":
            st.warning(f"⚠️ **樣本量偏少 ({result.total_hands} 手)**：建議 500+ 手以獲得可靠統計。目前數據僅供參考。")
        else:
            st.warning(f"⚠️ **Limited sample ({result.total_hands} hands)**: 500+ hands recommended for reliable stats. Current data is indicative only.")

    # Summary metrics
    st.markdown("### " + ("總體統計" if lang == "zh" else "Overall Statistics"))

    # Handle both old and new result format (for cached results)
    hands_won = getattr(result, 'hands_won', None)
    hands_lost = getattr(result, 'hands_lost', None)
    bb_per_100 = getattr(result, 'bb_per_100', None)
    player_stats = getattr(result, 'player_stats', None)

    # If old format, calculate from data
    if hands_won is None:
        hands_won = len([r for r in result.biggest_winners if r.profit > 0])
        hands_lost = result.total_hands - hands_won
    if bb_per_100 is None:
        bb_per_100 = 0

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric(
            "總手數" if lang == "zh" else "Total Hands",
            result.total_hands
        )
    with col2:
        bb_str = f"{bb_per_100:+.1f} BB/100" if bb_per_100 != 0 else "0 BB/100"
        st.metric(
            "總盈虧" if lang == "zh" else "Total P/L",
            f"${result.total_profit:.2f}",
            delta=bb_str
        )
    with col3:
        st.metric(
            "盈利手數" if lang == "zh" else "Hands Won",
            f"{hands_won}",
            delta=f"{hands_lost} 虧損" if lang == "zh" else f"{hands_lost} lost"
        )
    with col4:
        # Show VPIP instead of simple win rate (more useful)
        if player_stats and player_stats.vpip > 0:
            st.metric(
                "VPIP",
                f"{player_stats.vpip:.1f}%",
                delta="標準 22-28%" if lang == "zh" else "std 22-28%"
            )
        else:
            win_rate = (hands_won / result.total_hands * 100) if result.total_hands > 0 else 0
            st.metric(
                "盈利率" if lang == "zh" else "Win Rate",
                f"{win_rate:.1f}%"
            )

    # Player Stats (VPIP, PFR, 3-Bet, etc.)
    if player_stats:
        st.markdown("---")
        st.markdown("### " + ("翻前數據 (Preflop)" if lang == "zh" else "Preflop Stats"))
        _display_player_stats(player_stats, lang)

    # Postflop Stats (C-Bet, Fold to C-Bet, Check-Raise by street)
    postflop_stats = getattr(result, 'postflop_stats', None)
    if postflop_stats:
        st.markdown("---")
        st.markdown("### " + ("翻後數據 (Postflop)" if lang == "zh" else "Postflop Stats"))
        _display_postflop_stats(postflop_stats, lang)

    # Result Stats (WTSD, W$SD, WWSF)
    if player_stats:
        st.markdown("---")
        st.markdown("### " + ("結果數據 (Results)" if lang == "zh" else "Result Stats"))
        _display_result_stats(player_stats, lang)

    st.markdown("---")

    # Position stats
    st.markdown("### " + ("位置統計" if lang == "zh" else "Position Statistics"))
    _display_position_stats(result.position_stats, lang)

    st.markdown("---")

    # Biggest losers / winners
    col_losers, col_winners = st.columns(2)

    with col_losers:
        st.markdown("### " + ("❌ 虧損最大" if lang == "zh" else "❌ Biggest Losers"))
        _display_hand_list(result.biggest_losers, lang, is_loser=True)

    with col_winners:
        st.markdown("### " + ("✅ 盈利最大" if lang == "zh" else "✅ Biggest Winners"))
        _display_hand_list(result.biggest_winners, lang, is_loser=False)

    # AI Leak Report
    if result.ai_leak_report:
        st.markdown("---")
        st.markdown("### 🤖 AI Leak 報告" if lang == "zh" else "### 🤖 AI Leak Report")
        st.markdown(result.ai_leak_report)

    # Deep Hand Analysis
    deep_analysis = getattr(result, 'deep_hand_analysis', None)
    if deep_analysis:
        st.markdown("---")
        st.markdown("### 🔬 深度手牌分析" if lang == "zh" else "### 🔬 Deep Hand Analysis")
        st.caption("針對虧損最大的手牌進行逐手分析" if lang == "zh" else "Detailed analysis of biggest losing hands")
        st.markdown(deep_analysis)

    # AI Transparency Section
    leak_prompt = getattr(result, 'leak_report_prompt', None)
    deep_prompt = getattr(result, 'deep_analysis_prompt', None)
    if leak_prompt or deep_prompt:
        st.markdown("---")
        with st.expander("🔍 " + ("AI 透明度：查看發送給 AI 的資料" if lang == "zh" else "AI Transparency: View Data Sent to AI")):
            st.caption("以下顯示發送給 AI 的完整 Prompt，供您了解分析邏輯" if lang == "zh" else "Below shows the full prompts sent to AI for your review")

            if leak_prompt:
                st.markdown("#### " + ("Leak 報告 Prompt" if lang == "zh" else "Leak Report Prompt"))
                st.code(leak_prompt, language="markdown")

            if deep_prompt:
                st.markdown("#### " + ("深度分析 Prompt" if lang == "zh" else "Deep Analysis Prompt"))
                st.code(deep_prompt, language="markdown")


def _display_position_stats(position_stats: dict, lang: str):
    """Display position statistics."""

    # Sort by profit (lowest first to highlight problems)
    sorted_positions = sorted(
        position_stats.items(),
        key=lambda x: x[1].total_profit
    )

    # Create columns for each position
    num_positions = len(sorted_positions)
    if num_positions == 0:
        st.info("沒有位置數據" if lang == "zh" else "No position data")
        return

    cols = st.columns(min(num_positions, 6))

    for i, (pos, stats) in enumerate(sorted_positions):
        with cols[i % 6]:
            win_rate = (stats.hands_won / stats.hands_played * 100) if stats.hands_played > 0 else 0
            profit_color = "🔴" if stats.total_profit < 0 else "🟢"

            st.markdown(f"**{pos}** {profit_color}")
            st.markdown(f"手數: {stats.hands_played}")
            st.markdown(f"勝率: {win_rate:.1f}%" if lang == "zh" else f"Win: {win_rate:.1f}%")
            st.markdown(f"盈虧: ${stats.total_profit:.2f}" if lang == "zh" else f"P/L: ${stats.total_profit:.2f}")
            st.markdown(f"平均底池: ${stats.avg_pot:.2f}" if lang == "zh" else f"Avg Pot: ${stats.avg_pot:.2f}")
            st.markdown("---")


def _display_player_stats(stats: PlayerStats, lang: str):
    """Display preflop player statistics (VPIP, PFR, 3-Bet, Fold to 3-Bet, ATS) with color coding."""

    # Sample size thresholds
    MIN_SAMPLE_RELIABLE = 500
    total_hands = getattr(stats, 'total_hands', 0)
    is_reliable = total_hands >= MIN_SAMPLE_RELIABLE

    def get_status(value: float, low: float, high: float) -> str:
        """Return status indicator based on standard range."""
        if not is_reliable:
            return "⚪"  # Gray - unreliable sample
        if value < low:
            return "🔵"  # Too tight
        elif value > high:
            return "🔴"  # Too loose
        return "🟢"  # Good

    def format_value(value: float) -> str:
        """Format percentage, showing asterisk for unreliable samples."""
        if not is_reliable:
            return f"{value:.1f}%*"
        return f"{value:.1f}%"

    col1, col2, col3, col4, col5 = st.columns(5)

    with col1:
        status = get_status(stats.vpip, 22, 28)
        st.markdown(f"**VPIP** {status}")
        st.markdown(f"### {format_value(stats.vpip)}")
        st.caption("標準: 22-28%" if lang == "zh" else "Std: 22-28%")

    with col2:
        status = get_status(stats.pfr, 18, 24)
        st.markdown(f"**PFR** {status}")
        st.markdown(f"### {format_value(stats.pfr)}")
        st.caption("標準: 18-24%" if lang == "zh" else "Std: 18-24%")

    with col3:
        status = get_status(stats.three_bet, 7, 10)
        st.markdown(f"**3-Bet** {status}")
        st.markdown(f"### {format_value(stats.three_bet)}")
        st.caption("標準: 7-10%" if lang == "zh" else "Std: 7-10%")

    with col4:
        fold_to_3bet = getattr(stats, 'fold_to_3bet', 0)
        status = get_status(fold_to_3bet, 55, 65)
        st.markdown(f"**Fold to 3B** {status}")
        st.markdown(f"### {format_value(fold_to_3bet)}")
        st.caption("標準: 55-65%" if lang == "zh" else "Std: 55-65%")

    with col5:
        ats = getattr(stats, 'ats', 0)
        status = get_status(ats, 25, 35)
        st.markdown(f"**ATS** {status}")
        st.markdown(f"### {format_value(ats)}")
        st.caption("標準: 25-35%" if lang == "zh" else "Std: 25-35%")


def _display_postflop_stats(stats: PostflopStats, lang: str):
    """Display postflop statistics (C-Bet, Fold to C-Bet, Check-Raise by street)."""

    # Minimum sample sizes for reliable stats
    MIN_SAMPLE_RELIABLE = 30  # Below this, stats are unreliable
    MIN_SAMPLE_SHOW = 5       # Below this, don't show percentage at all

    def get_status(value: float, low: float, high: float, count: int) -> str:
        """Get status emoji, dimmed if sample too small."""
        if count < MIN_SAMPLE_RELIABLE:
            return "⚪"  # Gray - unreliable
        if value < low:
            return "🔵"
        elif value > high:
            return "🔴"
        return "🟢"

    def format_value(value: float, count: int) -> str:
        """Format percentage, showing warning for small samples."""
        if count < MIN_SAMPLE_SHOW:
            return "—"  # Too few samples to show
        elif count < MIN_SAMPLE_RELIABLE:
            return f"{value:.1f}%*"  # Asterisk for unreliable
        return f"{value:.1f}%"

    def sample_info(count: int, lang: str) -> str:
        """Get sample count display with reliability indicator."""
        if count < MIN_SAMPLE_SHOW:
            return "樣本不足" if lang == "zh" else "Insufficient"
        elif count < MIN_SAMPLE_RELIABLE:
            note = "不可靠" if lang == "zh" else "unreliable"
            return f"[n={count}] ⚠️ {note}"
        return f"[n={count}]"

    # Flop Stats
    st.markdown("#### Flop")
    col1, col2, col3 = st.columns(3)

    with col1:
        n = stats.flop_cbet_opportunities
        status = get_status(stats.flop_cbet, 55, 70, n)
        st.markdown(f"**C-Bet** {status}")
        st.markdown(f"### {format_value(stats.flop_cbet, n)}")
        std_text = "標準: 55-70%" if lang == "zh" else "Std: 55-70%"
        st.caption(f"{std_text} {sample_info(n, lang)}")

    with col2:
        n = stats.faced_flop_cbet_count
        status = get_status(stats.fold_to_flop_cbet, 40, 50, n)
        st.markdown(f"**Fold to CB** {status}")
        st.markdown(f"### {format_value(stats.fold_to_flop_cbet, n)}")
        std_text = "標準: 40-50%" if lang == "zh" else "Std: 40-50%"
        st.caption(f"{std_text} {sample_info(n, lang)}")

    with col3:
        n = getattr(stats, 'flop_check_raise_opportunities', 0)
        status = get_status(stats.flop_check_raise, 6, 10, n)
        st.markdown(f"**Check-Raise** {status}")
        st.markdown(f"### {format_value(stats.flop_check_raise, n)}")
        std_text = "標準: 6-10%" if lang == "zh" else "Std: 6-10%"
        st.caption(f"{std_text} {sample_info(n, lang)}" if n > 0 else std_text)

    # Turn Stats
    st.markdown("#### Turn")
    col1, col2, col3 = st.columns(3)

    with col1:
        n = stats.turn_cbet_opportunities
        status = get_status(stats.turn_cbet, 50, 65, n)
        st.markdown(f"**C-Bet** {status}")
        st.markdown(f"### {format_value(stats.turn_cbet, n)}")
        std_text = "標準: 50-65%" if lang == "zh" else "Std: 50-65%"
        st.caption(f"{std_text} {sample_info(n, lang)}")

    with col2:
        n = stats.faced_turn_cbet_count
        status = get_status(stats.fold_to_turn_cbet, 35, 45, n)
        st.markdown(f"**Fold to CB** {status}")
        st.markdown(f"### {format_value(stats.fold_to_turn_cbet, n)}")
        std_text = "標準: 35-45%" if lang == "zh" else "Std: 35-45%"
        st.caption(f"{std_text} {sample_info(n, lang)}")

    with col3:
        n = getattr(stats, 'turn_check_raise_opportunities', 0)
        status = get_status(stats.turn_check_raise, 5, 8, n)
        st.markdown(f"**Check-Raise** {status}")
        st.markdown(f"### {format_value(stats.turn_check_raise, n)}")
        std_text = "標準: 5-8%" if lang == "zh" else "Std: 5-8%"
        st.caption(f"{std_text} {sample_info(n, lang)}" if n > 0 else std_text)

    # River Stats
    st.markdown("#### River")
    col1, col2, col3 = st.columns(3)

    with col1:
        n = stats.river_cbet_opportunities
        status = get_status(stats.river_cbet, 45, 60, n)
        st.markdown(f"**C-Bet** {status}")
        st.markdown(f"### {format_value(stats.river_cbet, n)}")
        std_text = "標準: 45-60%" if lang == "zh" else "Std: 45-60%"
        st.caption(f"{std_text} {sample_info(n, lang)}")

    with col2:
        st.markdown("**—**")
        st.markdown("### —")
        st.caption("")

    with col3:
        n = getattr(stats, 'river_check_raise_opportunities', 0)
        status = get_status(stats.river_check_raise, 4, 7, n)
        st.markdown(f"**Check-Raise** {status}")
        st.markdown(f"### {format_value(stats.river_check_raise, n)}")
        std_text = "標準: 4-7%" if lang == "zh" else "Std: 4-7%"
        st.caption(f"{std_text} {sample_info(n, lang)}" if n > 0 else std_text)


def _display_result_stats(stats: PlayerStats, lang: str):
    """Display result statistics (WTSD, W$SD, WWSF)."""

    # Sample size thresholds
    MIN_SAMPLE_RELIABLE = 500
    total_hands = getattr(stats, 'total_hands', 0)
    is_reliable = total_hands >= MIN_SAMPLE_RELIABLE

    def get_status(value: float, low: float, high: float) -> str:
        if not is_reliable:
            return "⚪"  # Gray - unreliable sample
        if value < low:
            return "🔵"
        elif value > high:
            return "🔴"
        return "🟢"

    def format_value(value: float) -> str:
        if not is_reliable:
            return f"{value:.1f}%*"
        return f"{value:.1f}%"

    col1, col2, col3 = st.columns(3)

    with col1:
        status = get_status(stats.wtsd, 25, 30)
        st.markdown(f"**WTSD** {status}")
        st.markdown(f"### {format_value(stats.wtsd)}")
        st.caption("標準: 25-30%" if lang == "zh" else "Std: 25-30%")
        st.caption("Went To ShowDown" if lang == "en" else "到攤牌率")

    with col2:
        status = get_status(stats.wsd, 50, 55)
        st.markdown(f"**W$SD** {status}")
        st.markdown(f"### {format_value(stats.wsd)}")
        st.caption("標準: 50-55%" if lang == "zh" else "Std: 50-55%")
        st.caption("Won $ at ShowDown" if lang == "en" else "攤牌勝率")

    with col3:
        wwsf = getattr(stats, 'wwsf', 0)
        status = get_status(wwsf, 45, 52)
        st.markdown(f"**WWSF** {status}")
        st.markdown(f"### {format_value(wwsf)}")
        st.caption("標準: 45-52%" if lang == "zh" else "Std: 45-52%")
        st.caption("Won When Saw Flop" if lang == "en" else "看翻牌後勝率")


def _display_hand_list(hands: List[HandResult], lang: str, is_loser: bool = True):
    """Display a list of hands (losers or winners)."""

    if not hands:
        st.info("沒有數據" if lang == "zh" else "No data")
        return

    for i, hr in enumerate(hands[:10], 1):
        # Get profit in BB if available
        profit_bb = getattr(hr, 'profit_bb', None)
        if profit_bb is not None:
            bb_str = f"{abs(profit_bb):.1f}BB"
        else:
            bb_str = ""

        profit_str = f"${abs(hr.profit):.2f}"
        if is_loser:
            profit_display = f":red[-{bb_str}]" if bb_str else f":red[-{profit_str}]"
            title_suffix = f"-{bb_str} (${abs(hr.profit):.2f})" if bb_str else f"-{profit_str}"
        else:
            profit_display = f":green[+{bb_str}]" if bb_str else f":green[+{profit_str}]"
            title_suffix = f"+{bb_str} (${hr.profit:.2f})" if bb_str else f"+{profit_str}"

        with st.expander(f"{i}. {hr.position} {hr.hole_cards} | {title_suffix}"):
            col1, col2 = st.columns(2)
            with col1:
                st.markdown(f"**位置:** {hr.position}" if lang == "zh" else f"**Position:** {hr.position}")
                st.markdown(f"**手牌:** `{hr.hole_cards}`" if lang == "zh" else f"**Hand:** `{hr.hole_cards}`")
                # Show if it was a VPIP hand
                vpip = getattr(hr, 'vpip', None)
                if vpip is not None:
                    vpip_str = "是" if vpip else "否"
                    vpip_str_en = "Yes" if vpip else "No"
                    st.markdown(f"**主動入池:** {vpip_str}" if lang == "zh" else f"**VPIP:** {vpip_str_en}")
            with col2:
                st.markdown(f"**底池:** ${hr.pot_size:.2f}" if lang == "zh" else f"**Pot:** ${hr.pot_size:.2f}")
                showdown = "是" if hr.went_to_showdown else "否"
                showdown_en = "Yes" if hr.went_to_showdown else "No"
                st.markdown(f"**到攤牌:** {showdown}" if lang == "zh" else f"**Showdown:** {showdown_en}")
                if profit_bb is not None:
                    st.markdown(f"**虧損:** {abs(profit_bb):.1f} BB" if is_loser else f"**盈利:** {profit_bb:.1f} BB")

            # Show raw hand button
            if st.button(
                "查看原始記錄" if lang == "zh" else "View Raw",
                key=f"view_raw_{is_loser}_{i}"
            ):
                st.code(hr.hand.raw_text, language=None)


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
