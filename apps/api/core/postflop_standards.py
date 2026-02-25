"""
Postflop Statistics Standards Reference

翻牌圈 vs 轉牌圈核心差異：
- 翻牌圈 = 範圍 + 權益（可以用空氣偷鍋）
- 轉牌圈 = 真實牌力 + 路線承諾（錢開始燒）

FCB + CCB + RCB = 100%（對 C-Bet 的回應）

來源：GTO 研究、PT4、PokerTracker 標準
"""

from dataclasses import dataclass


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
# FLOP 翻牌圈標準 (based on GTO Wizard research)
# ============================================
FLOP_CB = StatRange(
    low=55, high=65, name_en="C-Bet", name_zh="持續下注", description_zh="IP位置、根據牌面質地調整"
)

FLOP_FCB = StatRange(
    low=35,
    high=50,
    name_en="Fold to C-Bet",
    name_zh="棄牌率",
    description_zh="OOP防守，35%緊防、50%鬆防",
)

FLOP_CCB = StatRange(
    low=30,
    high=50,
    name_en="Call vs C-Bet",
    name_zh="跟注率",
    description_zh="OOP平衡策略，包含 check 後跟注",
)

FLOP_RCB = StatRange(
    low=7,
    high=12,
    name_en="Raise vs C-Bet",
    name_zh="加注率",
    description_zh="強牌保護、強聽牌半詐唬",
)


# ============================================
# TURN 轉牌圈標準 (真實牌力 + 路線承諾)
# ============================================
TURN_CB = StatRange(
    low=40, high=60, name_en="C-Bet", name_zh="持續下注", description_zh="有利 run out 時增加頻率"
)

TURN_FCB = StatRange(
    low=40,
    high=65,
    name_en="Fold to C-Bet",
    name_zh="棄牌率",
    description_zh="已投入籌碼，40%緊防、65%鬆防",
)

TURN_CCB = StatRange(
    low=25,
    high=35,
    name_en="Call vs C-Bet",
    name_zh="跟注率",
    description_zh="更重視攤牌價值，更嚴格的範圍",
)

TURN_RCB = StatRange(
    low=3,
    high=8,
    name_en="Raise vs C-Bet",
    name_zh="加注率",
    description_zh="極強價值、少數 combo draw",
)


# ============================================
# RIVER 河牌圈標準
# ============================================
RIVER_CB = StatRange(
    low=45, high=60, name_en="C-Bet", name_zh="持續下注", description_zh="價值下注和平衡詐唬"
)

RIVER_RCB = StatRange(
    low=4, high=7, name_en="Raise vs C-Bet", name_zh="加注率", description_zh="極強價值或大型詐唬"
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
    根據統計數據診斷潛在漏洞 (based on GTO Wizard standards)

    Returns:
        List of leak descriptions
    """
    leaks = []

    # 翻牌圈漏洞 (Flop CCB: 30-50%)
    if stats.get("flop_ccb", 0) > 50:
        leaks.append("翻牌 CCB 過高（>50%）：可能用垃圾牌硬撐")
    if stats.get("flop_ccb", 100) < 30:
        leaks.append("翻牌 CCB 過低（<30%）：太容易被 CB 掃掉")
    if stats.get("flop_rcb", 0) < 5:
        leaks.append("翻牌 RCB 過低（<5%）：太老實，沒保護強牌")
    if stats.get("flop_rcb", 0) > 15:
        leaks.append("翻牌 RCB 過高（>15%）：可能亂推聽牌")

    # Flop FCB (35-50%)
    if stats.get("flop_fcb", 0) > 50:
        leaks.append("翻牌 FCB 過高（>50%）：棄牌太多，被 exploit")
    if stats.get("flop_fcb", 100) < 35:
        leaks.append("翻牌 FCB 過低（<35%）：跟太多垃圾牌")

    # 轉牌圈漏洞 (Turn CCB: 25-35%, Turn CB: 40-60%, Turn FCB: 40-65%)
    if stats.get("turn_ccb", 0) > 35:
        leaks.append("轉牌 CCB 過高（>35%）：轉牌大量跟注長期必輸")
    if stats.get("turn_cbet", 0) > 60:
        leaks.append("轉牌 CB 過高（>60%）：過度開火")
    if stats.get("turn_fcb", 100) < 40:
        leaks.append("轉牌 FCB 過低（<40%）：轉牌跟太多垃圾")

    # 跨街比較
    flop_ccb = stats.get("flop_ccb", 0)
    turn_ccb = stats.get("turn_ccb", 0)
    if turn_ccb > 0 and flop_ccb > 0 and abs(flop_ccb - turn_ccb) < 5:
        leaks.append(
            f"轉牌 CCB ({turn_ccb:.1f}%) ≈ 翻牌 CCB ({flop_ccb:.1f}%)：沒有在轉牌做真正決策"
        )

    flop_cb = stats.get("flop_cbet", 0)
    turn_cb = stats.get("turn_cbet", 0)
    if flop_cb > 65 and turn_cb > 60:
        leaks.append(f"Flop CB {flop_cb:.1f}% + Turn CB {turn_cb:.1f}%：過度開火路線")

    return leaks


# ============================================
# 總結表格（用於 UI 顯示）
# Based on GTO Wizard research - 2024
# ============================================
SUMMARY_TABLE = """
| 指標 | 翻牌健康值 | 轉牌健康值 | 重點解讀 |
|------|-----------|-----------|----------|
| CB   | 55-65%    | 40-60%    | IP位置，根據牌面調整 |
| FCB  | 35-50%    | 40-65%    | OOP防守，已投入籌碼 |
| CCB  | 30-50%    | 25-35%    | 平衡策略，攤牌價值 |
| RCB  | 7-12%     | 3-8%      | 極強價值 + 半詐唬 |
"""
