"""
Postflop Statistics Standards Reference

翻牌圈 vs 轉牌圈核心差異：
- 翻牌圈 = 範圍 + 權益（可以用空氣偷鍋）
- 轉牌圈 = 真實牌力 + 路線承諾（錢開始燒）

FCB + CCB + RCB = 100%（對 C-Bet 的回應）

來源：GTO 研究、PT4、PokerTracker 標準
"""

from dataclasses import dataclass
from typing import Tuple


@dataclass
class StatRange:
    """健康數值範圍"""
    low: float
    high: float
    name_en: str
    name_zh: str
    description_zh: str

    def is_healthy(self, value: float) -> bool:
        return self.low <= value <= self.high

    def status(self, value: float) -> str:
        """返回狀態：🔵=太緊, 🟢=健康, 🔴=太鬆"""
        if value < self.low:
            return "🔵"  # Too tight / passive
        elif value > self.high:
            return "🔴"  # Too loose / aggressive
        return "🟢"  # Healthy


# ============================================
# FLOP 翻牌圈標準
# ============================================
FLOP_CB = StatRange(
    low=55, high=70,
    name_en="C-Bet", name_zh="持續下注",
    description_zh="用範圍壓力、小尺寸偷鍋"
)

FLOP_FCB = StatRange(
    low=45, high=60,
    name_en="Fold to C-Bet", name_zh="棄牌率",
    description_zh="棄掉空氣、邊緣擊中、弱 backdoor"
)

FLOP_CCB = StatRange(
    low=25, high=40,
    name_en="Call vs C-Bet", name_zh="跟注率",
    description_zh="跟頂對、中對、聽牌、強 backdoor"
)

FLOP_RCB = StatRange(
    low=7, high=12,
    name_en="Raise vs C-Bet", name_zh="加注率",
    description_zh="強牌保護、強聽牌半詐唬"
)


# ============================================
# TURN 轉牌圈標準（比翻牌更嚴格）
# ============================================
TURN_CB = StatRange(
    low=40, high=55,
    name_en="C-Bet", name_zh="持續下注",
    description_zh="延續價值、延續強聽牌、承諾底池"
)

TURN_FCB = StatRange(
    low=55, high=70,
    name_en="Fold to C-Bet", name_zh="棄牌率",
    description_zh="轉牌不棄牌比翻牌更容易燒錢"
)

TURN_CCB = StatRange(
    low=20, high=30,
    name_en="Call vs C-Bet", name_zh="跟注率",
    description_zh="頂對以上、強聽牌、有計畫的 bluff catcher"
)

TURN_RCB = StatRange(
    low=3, high=8,
    name_en="Raise vs C-Bet", name_zh="加注率",
    description_zh="極強價值、少數 combo draw"
)


# ============================================
# RIVER 河牌圈標準
# ============================================
RIVER_CB = StatRange(
    low=45, high=60,
    name_en="C-Bet", name_zh="持續下注",
    description_zh="價值下注和平衡詐唬"
)

RIVER_RCB = StatRange(
    low=4, high=7,
    name_en="Raise vs C-Bet", name_zh="加注率",
    description_zh="極強價值或大型詐唬"
)


# ============================================
# 對照表
# ============================================
POSTFLOP_STANDARDS = {
    "flop": {
        "cb": FLOP_CB,
        "fcb": FLOP_FCB,
        "ccb": FLOP_CCB,
        "rcb": FLOP_RCB,
    },
    "turn": {
        "cb": TURN_CB,
        "fcb": TURN_FCB,
        "ccb": TURN_CCB,
        "rcb": TURN_RCB,
    },
    "river": {
        "cb": RIVER_CB,
        "rcb": RIVER_RCB,
    },
}


def get_standard(street: str, stat: str) -> StatRange:
    """
    獲取指定街道的統計標準

    Args:
        street: "flop", "turn", or "river"
        stat: "cb", "fcb", "ccb", or "rcb"

    Returns:
        StatRange object with healthy range
    """
    return POSTFLOP_STANDARDS.get(street, {}).get(stat)


def analyze_postflop_stats(stats: dict) -> dict:
    """
    分析翻牌後統計，返回每個指標的健康狀態

    Args:
        stats: dict with keys like "flop_cb", "turn_fcb", etc.

    Returns:
        dict with status for each stat
    """
    results = {}

    mapping = {
        "flop_cbet": ("flop", "cb"),
        "flop_fcb": ("flop", "fcb"),
        "flop_ccb": ("flop", "ccb"),
        "flop_rcb": ("flop", "rcb"),
        "turn_cbet": ("turn", "cb"),
        "turn_fcb": ("turn", "fcb"),
        "turn_ccb": ("turn", "ccb"),
        "turn_rcb": ("turn", "rcb"),
        "river_cbet": ("river", "cb"),
        "river_rcb": ("river", "rcb"),
    }

    for stat_key, (street, stat_type) in mapping.items():
        if stat_key in stats:
            standard = get_standard(street, stat_type)
            if standard:
                value = stats[stat_key]
                results[stat_key] = {
                    "value": value,
                    "status": standard.status(value),
                    "healthy": standard.is_healthy(value),
                    "range": f"{standard.low}-{standard.high}%",
                    "description": standard.description_zh,
                }

    return results


def get_leak_diagnosis(stats: dict) -> list:
    """
    根據統計數據診斷潛在漏洞

    Returns:
        List of leak descriptions
    """
    leaks = []

    # 翻牌圈漏洞
    if stats.get("flop_ccb", 0) > 40:
        leaks.append("翻牌 CCB 過高（>40%）：可能用垃圾牌硬撐")
    if stats.get("flop_ccb", 100) < 20:
        leaks.append("翻牌 CCB 過低（<20%）：太容易被 CB 掃掉")
    if stats.get("flop_rcb", 0) < 5:
        leaks.append("翻牌 RCB 過低（<5%）：太老實，沒保護強牌")
    if stats.get("flop_rcb", 0) > 15:
        leaks.append("翻牌 RCB 過高（>15%）：可能亂推聽牌")

    # 轉牌圈漏洞
    if stats.get("turn_ccb", 0) > 30:
        leaks.append("轉牌 CCB 過高（>30%）：轉牌大量跟注長期必輸")
    if stats.get("turn_cbet", 0) > 55:
        leaks.append("轉牌 CB 過高（>55%）：過度開火")
    if stats.get("turn_fcb", 100) < 55:
        leaks.append("轉牌 FCB 過低（<55%）：轉牌不夠敢棄")

    # 跨街比較
    flop_ccb = stats.get("flop_ccb", 0)
    turn_ccb = stats.get("turn_ccb", 0)
    if turn_ccb > 0 and abs(flop_ccb - turn_ccb) < 5:
        leaks.append(f"轉牌 CCB ({turn_ccb:.1f}%) ≈ 翻牌 CCB ({flop_ccb:.1f}%)：沒有在轉牌做真正決策")

    flop_cb = stats.get("flop_cbet", 0)
    turn_cb = stats.get("turn_cbet", 0)
    if flop_cb > 65 and turn_cb > 65:
        leaks.append(f"Flop CB {flop_cb:.1f}% + Turn CB {turn_cb:.1f}%：過度開火路線")

    return leaks


# ============================================
# 總結表格（用於 UI 顯示）
# ============================================
SUMMARY_TABLE = """
| 指標 | 翻牌健康值 | 轉牌健康值 | 重點解讀 |
|------|-----------|-----------|----------|
| CB   | 55-70%    | 40-55%    | 轉牌必須降 |
| FCB  | 45-60%    | 55-70%    | 轉牌要更敢棄 |
| CCB  | 25-40%    | 20-30%    | 轉牌跟注更嚴格 |
| RCB  | 7-12%     | 3-8%      | 轉牌很少加 |
"""
