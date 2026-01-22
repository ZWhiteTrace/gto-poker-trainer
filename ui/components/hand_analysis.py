"""
Hand Analysis UI Component
Provides file upload and leak analysis display for Streamlit.
"""
import streamlit as st
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from analyzer.hand_parser import GGPokerParser
from analyzer.preflop_analyzer import PreflopAnalyzer, format_leak_report
from analyzer.postflop_analyzer import PostflopAnalyzer, format_postflop_report


def display_hand_analysis_page():
    """Display the hand analysis page."""
    st.title("🔍 手牌歷史分析")
    st.markdown("上傳你的手牌歷史檔案，分析翻前 GTO 漏洞")

    # File upload
    st.subheader("📁 上傳手牌歷史")

    uploaded_file = st.file_uploader(
        "選擇 GGPoker 手牌歷史檔案",
        type=["txt"],
        help="目前支援 GGPoker 格式，檔案通常在 Documents/GGPoker/HandHistory 資料夾"
    )

    col1, col2 = st.columns(2)
    with col1:
        show_detailed = st.checkbox("顯示詳細錯誤列表", value=False)
    with col2:
        min_hands = st.number_input("最少樣本數（用於漏洞判斷）", min_value=1, max_value=100, value=3)

    if uploaded_file is not None:
        # Parse the file
        content = uploaded_file.read().decode('utf-8')

        with st.spinner("解析手牌歷史中..."):
            parser = GGPokerParser()
            try:
                hands = parser.parse_content(content)
            except Exception as e:
                st.error(f"解析錯誤: {e}")
                return

        if not hands:
            st.warning("找不到有效的手牌記錄")
            return

        st.success(f"成功解析 {len(hands)} 手牌")

        # Analyze both preflop and postflop
        with st.spinner("分析翻前決策中..."):
            preflop_analyzer = PreflopAnalyzer()
            report = preflop_analyzer.analyze_hands(hands)

        with st.spinner("分析翻後決策中..."):
            postflop_analyzer = PostflopAnalyzer()
            postflop_report = postflop_analyzer.analyze_hands(hands)

        # Create tabs for preflop and postflop
        tab1, tab2 = st.tabs(["翻前分析", "翻後分析"])

        with tab1:
            _display_preflop_analysis(report, preflop_analyzer, show_detailed)

        with tab2:
            _display_postflop_analysis(postflop_report)

    else:
        # Show instructions
        st.info("""
        **使用說明**:
        1. 從 GGPoker 下載你的手牌歷史檔案
        2. 檔案位置通常在: `Documents/GGPoker/HandHistory/`
        3. 上傳 .txt 檔案進行分析
        4. 系統會自動比對你的翻前決策與 GTO 標準

        **分析內容**:
        - RFI (首次加注) 決策
        - VS RFI (面對加注) 決策
        - VS 3-Bet 決策
        - VS 4-Bet 決策
        """)

        # Demo mode
        st.subheader("🎮 試用模式")
        st.markdown("沒有手牌歷史？試試範例數據：")

        if st.button("載入範例分析"):
            st.session_state.demo_analysis = True
            st.rerun()

        if st.session_state.get("demo_analysis"):
            _show_demo_analysis()


def _display_preflop_analysis(report, analyzer, show_detailed):
    """Display preflop analysis results."""
    st.subheader("📊 翻前分析摘要")

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("總手數", report.total_hands)
    with col2:
        st.metric("已分析", report.analyzed_hands)
    with col3:
        mistake_rate = report.mistakes / report.analyzed_hands * 100 if report.analyzed_hands > 0 else 0
        st.metric("錯誤數", f"{report.mistakes} ({mistake_rate:.1f}%)")
    with col4:
        st.metric("估計 EV 損失", f"{report.total_ev_loss:.1f} bb")

    # Position breakdown
    st.subheader("📍 位置分析")

    position_data = []
    for pos in ["UTG", "HJ", "CO", "BTN", "SB", "BB"]:
        if pos in report.position_stats:
            data = report.position_stats[pos]
            rate = data["mistakes"] / data["total"] * 100 if data["total"] > 0 else 0
            position_data.append({
                "位置": pos,
                "手數": data["total"],
                "錯誤": data["mistakes"],
                "錯誤率": f"{rate:.1f}%",
                "EV損失": f"{data['ev_loss']:.1f}bb"
            })

    if position_data:
        st.table(position_data)

    # Top leaks
    if report.top_leaks:
        st.subheader("🔴 主要漏洞")

        for i, leak in enumerate(report.top_leaks[:10], 1):
            with st.expander(f"{i}. {leak['description']} (EV -{leak['ev_loss']:.1f}bb)"):
                st.write(f"**樣本**: {leak['total_hands']} 手")
                st.write(f"**錯誤**: {leak['mistakes']} ({leak['mistake_rate']:.0f}%)")

                if leak["type"] == "scenario" and leak.get("common_mistakes"):
                    st.write("**常見錯誤動作**:")
                    for action, count in leak["common_mistakes"].items():
                        st.write(f"  - {action}: {count} 次")

    # Detailed mistakes
    if show_detailed:
        st.subheader("📋 詳細錯誤列表")

        mistakes = [d for d in analyzer.decisions if d.is_mistake]

        if mistakes:
            for i, decision in enumerate(mistakes[:50], 1):
                villain_str = f" vs {decision.villain_position}" if decision.villain_position else ""
                with st.expander(
                    f"#{decision.hand_id} | {decision.hero_position} {decision.hero_hand} | "
                    f"{decision.scenario.value}{villain_str}"
                ):
                    col1, col2 = st.columns(2)
                    with col1:
                        st.write(f"**你的動作**: {decision.hero_action.value}")
                        st.write(f"**EV 損失**: {decision.ev_loss:.1f} bb")
                    with col2:
                        st.write("**GTO 建議**:")
                        for action, freq in decision.gto_frequencies.items():
                            if freq > 0:
                                st.write(f"  - {action}: {freq}%")
        else:
            st.info("沒有找到錯誤決策 - 太棒了！")

    # Export option
    st.subheader("💾 匯出報告")

    if st.button("生成文字報告", key="preflop_export"):
        report_text = format_leak_report(report)
        st.code(report_text, language=None)

        st.download_button(
            label="下載報告",
            data=report_text,
            file_name="preflop_analysis_report.txt",
            mime="text/plain",
            key="preflop_download"
        )


def _display_postflop_analysis(report):
    """Display postflop analysis results."""
    st.subheader("📊 翻後分析摘要")

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("進入 Flop", report.hands_with_flop)
    with col2:
        st.metric("進入 Turn", report.hands_with_turn)
    with col3:
        st.metric("進入 River", report.hands_with_river)
    with col4:
        total_actions = (report.stats.flop_bets + report.stats.flop_checks +
                        report.stats.flop_calls + report.stats.flop_folds)
        st.metric("Flop 動作", total_actions)

    # C-bet stats
    st.subheader("📍 C-bet 統計")

    cbet_data = []

    if report.stats.cbet_opportunities_ip > 0:
        cbet_ip = report.stats.cbet_made_ip / report.stats.cbet_opportunities_ip * 100
        cbet_data.append({
            "類型": "IP C-bet",
            "次數": f"{report.stats.cbet_made_ip}/{report.stats.cbet_opportunities_ip}",
            "頻率": f"{cbet_ip:.0f}%",
            "GTO參考": "65-75%"
        })

    if report.stats.cbet_opportunities_oop > 0:
        cbet_oop = report.stats.cbet_made_oop / report.stats.cbet_opportunities_oop * 100
        cbet_data.append({
            "類型": "OOP C-bet",
            "次數": f"{report.stats.cbet_made_oop}/{report.stats.cbet_opportunities_oop}",
            "頻率": f"{cbet_oop:.0f}%",
            "GTO參考": "50-65%"
        })

    if report.stats.fold_to_cbet_opportunities > 0:
        fold_pct = report.stats.fold_to_cbet_count / report.stats.fold_to_cbet_opportunities * 100
        cbet_data.append({
            "類型": "Fold to C-bet",
            "次數": f"{report.stats.fold_to_cbet_count}/{report.stats.fold_to_cbet_opportunities}",
            "頻率": f"{fold_pct:.0f}%",
            "GTO參考": "35-50%"
        })

    if report.stats.check_raise_opportunities > 0:
        cr_pct = report.stats.check_raise_count / report.stats.check_raise_opportunities * 100
        cbet_data.append({
            "類型": "Check-raise",
            "次數": f"{report.stats.check_raise_count}/{report.stats.check_raise_opportunities}",
            "頻率": f"{cr_pct:.0f}%",
            "GTO參考": "8-15%"
        })

    if cbet_data:
        st.table(cbet_data)
    else:
        st.info("沒有足夠的數據來計算 C-bet 統計")

    # Street breakdown
    st.subheader("📊 街道動作分佈")

    stats = report.stats

    col1, col2, col3 = st.columns(3)

    with col1:
        st.markdown("**Flop**")
        flop_total = stats.flop_bets + stats.flop_checks + stats.flop_calls + stats.flop_folds + stats.flop_raises
        if flop_total > 0:
            st.write(f"Bet: {stats.flop_bets}")
            st.write(f"Check: {stats.flop_checks}")
            st.write(f"Call: {stats.flop_calls}")
            st.write(f"Fold: {stats.flop_folds}")
            st.write(f"Raise: {stats.flop_raises}")

    with col2:
        st.markdown("**Turn**")
        turn_total = stats.turn_bets + stats.turn_checks + stats.turn_calls + stats.turn_folds + stats.turn_raises
        if turn_total > 0:
            st.write(f"Bet: {stats.turn_bets}")
            st.write(f"Check: {stats.turn_checks}")
            st.write(f"Call: {stats.turn_calls}")
            st.write(f"Fold: {stats.turn_folds}")
            st.write(f"Raise: {stats.turn_raises}")

    with col3:
        st.markdown("**River**")
        river_total = stats.river_bets + stats.river_checks + stats.river_calls + stats.river_folds + stats.river_raises
        if river_total > 0:
            st.write(f"Bet: {stats.river_bets}")
            st.write(f"Check: {stats.river_checks}")
            st.write(f"Call: {stats.river_calls}")
            st.write(f"Fold: {stats.river_folds}")
            st.write(f"Raise: {stats.river_raises}")

    # Leaks
    if report.leaks:
        st.subheader("🔴 識別出的漏洞")

        for leak in report.leaks:
            with st.expander(f"⚠️ {leak['description']}"):
                st.write(f"**你的數值**: {leak['your_value']}")
                st.write(f"**GTO 參考**: {leak['gto_range']}")
                st.write(f"**樣本數**: {leak['sample']}")
                st.markdown(f"**建議**: {leak['suggestion']}")
    else:
        st.success("沒有識別出明顯的漏洞！繼續保持。")

    # Export
    st.subheader("💾 匯出報告")

    if st.button("生成翻後報告", key="postflop_export"):
        report_text = format_postflop_report(report)
        st.code(report_text, language=None)

        st.download_button(
            label="下載翻後報告",
            data=report_text,
            file_name="postflop_analysis_report.txt",
            mime="text/plain",
            key="postflop_download"
        )


def _show_demo_analysis():
    """Show demo analysis with mock data."""
    st.subheader("📊 範例分析結果")

    st.info("這是模擬數據，用於展示分析功能")

    col1, col2, col3, col4 = st.columns(4)
    with col1:
        st.metric("總手數", 1000)
    with col2:
        st.metric("已分析", 876)
    with col3:
        st.metric("錯誤數", "74 (8.4%)")
    with col4:
        st.metric("估計 EV 損失", "52.3 bb")

    st.subheader("📍 位置分析")
    demo_data = [
        {"位置": "UTG", "手數": 145, "錯誤": 8, "錯誤率": "5.5%", "EV損失": "6.2bb"},
        {"位置": "HJ", "手數": 152, "錯誤": 10, "錯誤率": "6.6%", "EV損失": "7.8bb"},
        {"位置": "CO", "手數": 158, "錯誤": 9, "錯誤率": "5.7%", "EV損失": "5.4bb"},
        {"位置": "BTN", "手數": 165, "錯誤": 7, "錯誤率": "4.2%", "EV損失": "4.1bb"},
        {"位置": "SB", "手數": 128, "錯誤": 12, "錯誤率": "9.4%", "EV損失": "9.8bb"},
        {"位置": "BB", "手數": 128, "錯誤": 28, "錯誤率": "21.9%", "EV損失": "19.0bb"},
    ]
    st.table(demo_data)

    st.subheader("🔴 主要漏洞")

    with st.expander("1. vs_rfi_BB_vs_BTN (EV -8.5bb)"):
        st.write("**樣本**: 89 手")
        st.write("**錯誤**: 19 (21%)")
        st.write("**常見錯誤動作**:")
        st.write("  - fold: 15 次 (K8o-KTo, Q9o 等應該 call 的牌)")
        st.write("  - call: 4 次 (72o, 83o 等應該 fold 的牌)")

    with st.expander("2. vs_rfi_BB_vs_CO (EV -5.2bb)"):
        st.write("**樣本**: 67 手")
        st.write("**錯誤**: 12 (18%)")
        st.write("**常見錯誤動作**:")
        st.write("  - fold: 10 次")
        st.write("  - call: 2 次")

    with st.expander("3. rfi_SB (EV -4.8bb)"):
        st.write("**樣本**: 128 手")
        st.write("**錯誤**: 9 (7%)")
        st.write("**常見錯誤動作**:")
        st.write("  - fold: 6 次 (應該 raise 的牌)")
        st.write("  - raise: 3 次 (應該 fold 的牌)")

    st.markdown("---")
    st.markdown("*上傳你自己的手牌歷史來獲得真實分析！*")
