"""
Article viewer component for displaying SEO guides.
"""
import streamlit as st
from pathlib import Path


GUIDES = {
    "push-fold": {
        "zh": "Push/Fold 完全指南",
        "en": "Push/Fold Complete Guide",
        "file": "push-fold-complete-guide.md"
    },
    "icm": {
        "zh": "ICM 原理解析",
        "en": "ICM Explained",
        "file": "icm-explained.md"
    },
    "rfi": {
        "zh": "RFI 開池範圍指南",
        "en": "RFI Ranges Guide",
        "file": "rfi-ranges-guide.md"
    },
    "facing-3bet": {
        "zh": "面對 3-Bet 策略指南",
        "en": "Facing 3-Bet Strategy Guide",
        "file": "facing-3bet-strategy.md"
    },
    "cbet": {
        "zh": "翻後 C-Bet 指南",
        "en": "Postflop C-Bet Guide",
        "file": "postflop-cbet-guide.md"
    },
    "common-mistakes": {
        "zh": "撲克常見錯誤解析",
        "en": "Common Poker Mistakes",
        "file": "common-mistakes.md"
    }
}


def load_guide(filename: str) -> str:
    """Load a guide markdown file."""
    guides_path = Path(__file__).parent.parent.parent / "content" / "guides" / filename
    try:
        with open(guides_path, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return "Guide not found."


def display_guides_page(lang: str = "zh"):
    """Display the guides selection and content."""

    title = "完整指南" if lang == "zh" else "Complete Guides"
    subtitle = "深入學習 GTO 撲克策略" if lang == "zh" else "In-depth GTO Poker Strategy"

    st.subheader(f"📖 {title}")
    st.caption(subtitle)

    # Guide selection
    guide_options = list(GUIDES.keys())
    guide_labels = [GUIDES[g][lang] for g in guide_options]

    selected_label = st.selectbox(
        "選擇指南" if lang == "zh" else "Select Guide",
        guide_labels,
        key="guide_selector"
    )

    # Find selected guide
    selected_idx = guide_labels.index(selected_label)
    selected_guide = guide_options[selected_idx]
    guide_info = GUIDES[selected_guide]

    # Display guide content
    st.markdown("---")

    content = load_guide(guide_info["file"])

    # Render markdown
    st.markdown(content, unsafe_allow_html=True)

    # Navigation hint
    st.markdown("---")
    if lang == "zh":
        st.info("💡 提示：使用上方選單切換不同指南")
    else:
        st.info("💡 Tip: Use the dropdown above to switch between guides")
