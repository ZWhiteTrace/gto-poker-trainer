# GTO Poker Trainer

A free, open-source preflop GTO trainer for No-Limit Hold'em.

## Features

- **Range Viewer**: Visualize GTO preflop ranges with 13x13 grid
- **Drill Mode**: Practice with random hands and instant feedback
- **Spaced Repetition**: Smart review system to strengthen weak spots
- **Hand Review**: Analyze your hand history with detailed stats

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# Run the app
streamlit run ui/app.py
```

## Supported Scenarios

### 6-max Cash (100bb)
- RFI (Raise First In) from all positions
- Facing Open Raise (3-bet or fold)
- Facing 3-bet (4-bet, call, or fold)
- Facing 4-bet (5-bet, call, or fold)

## Data Sources

Preflop ranges based on simplified GTO solutions from:
- [PokerCoaching.com](https://pokercoaching.com/preflop-charts) - Implementable GTO Charts

## License

MIT
# 2026年 1月14日 週三 00時25分06秒 CST
# Last deploy: 2026年 1月26日 週一 20時04分38秒 CST
# Last deploy: 2026年 1月26日 週一 20時04分51秒 CST
