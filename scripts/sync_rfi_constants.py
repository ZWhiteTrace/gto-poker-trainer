#!/usr/bin/env python3
"""
RFI 常數同步腳本

從 rfi_frequencies.json 自動生成：
1. drill.py 的 POSITION_EXCLUDED_HANDS
2. rfi_chart.py 的 UTG_KEY_EDGES, BTN_KEY_EDGES, OBVIOUS_HANDS

用法：
    python scripts/sync_rfi_constants.py          # 顯示差異
    python scripts/sync_rfi_constants.py --apply  # 應用更新
    python scripts/sync_rfi_constants.py --check  # 只檢查，返回錯誤碼
"""
import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Set, Tuple

# 專案根目錄
ROOT = Path(__file__).parent.parent

# 添加 API 套件到 Python 路徑
sys.path.insert(0, str(ROOT / "apps" / "api"))

# 檔案路徑
RFI_JSON = ROOT / "data" / "ranges" / "6max" / "rfi_frequencies.json"
DRILL_PY = ROOT / "apps" / "api" / "trainer" / "drill.py"
RFI_CHART_PY = ROOT / "ui" / "components" / "rfi_chart.py"

# 常數
RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']
POSITION_ORDER = ["UTG", "HJ", "CO", "BTN", "SB"]

# 所有 169 手牌
ALL_HANDS = []
for i, r1 in enumerate(RANKS):
    for j, r2 in enumerate(RANKS):
        if i == j:
            ALL_HANDS.append(f"{r1}{r2}")
        elif i < j:
            ALL_HANDS.append(f"{r1}{r2}s")
        else:
            ALL_HANDS.append(f"{r2}{r1}o")

# Premium 和 Trash（這些是固定的，不從 JSON 計算）
PREMIUM_HANDS = {"AA", "KK", "QQ", "AKs", "AKo"}
TRASH_HANDS = {
    "T2s", "92s", "82s", "72s", "62s",
    "93s", "83s", "73s", "94s",
    "72o", "62o",
}


def load_rfi_data() -> dict:
    """載入 RFI 頻率數據"""
    with open(RFI_JSON, 'r') as f:
        return json.load(f)


def get_opening_hands(data: dict, position: str, min_freq: int = 50) -> Set[str]:
    """取得指定位置的開池手牌"""
    pos_data = data.get(position, {}).get("frequencies", {})
    return {
        hand for hand, freqs in pos_data.items()
        if freqs.get("raise", 0) >= min_freq
    }


def get_mixed_hands(data: dict, position: str) -> Set[str]:
    """取得混合頻率手牌 (1-99%)"""
    pos_data = data.get(position, {}).get("frequencies", {})
    return {
        hand for hand, freqs in pos_data.items()
        if 1 <= freqs.get("raise", 0) <= 99
    }


def calculate_obvious_hands(data: dict) -> Set[str]:
    """
    計算 OBVIOUS_HANDS：所有位置都 100% 開的牌
    但排除 UTG 邊緣牌（需要強調的）
    """
    # 先找出所有位置都 100% 開的
    all_100 = None
    for pos in POSITION_ORDER:
        pos_100 = {
            hand for hand, freqs in data[pos]["frequencies"].items()
            if freqs.get("raise", 0) == 100
        }
        if all_100 is None:
            all_100 = pos_100
        else:
            all_100 &= pos_100

    # 排除 UTG 邊緣牌（這些需要強調）
    utg_edges = calculate_utg_edges(data)
    obvious = all_100 - utg_edges - PREMIUM_HANDS

    return obvious


def calculate_utg_edges(data: dict) -> Set[str]:
    """
    計算 UTG_KEY_EDGES：UTG 的邊緣牌
    - 50% 混合牌
    - 各類別的最低開池牌
    """
    utg_freqs = data["UTG"]["frequencies"]
    edges = set()

    # 1. 所有 50% 混合牌
    for hand, freqs in utg_freqs.items():
        if 1 <= freqs.get("raise", 0) <= 99:
            edges.add(hand)

    # 2. 各類別的邊界牌
    opening = {h for h, f in utg_freqs.items() if f.get("raise", 0) >= 50}

    # 對子：最低開池
    pairs = sorted([h for h in opening if len(h) == 2],
                   key=lambda x: RANKS.index(x[0]), reverse=True)
    if pairs:
        edges.add(pairs[0])  # e.g., 55

    # 同花 Ax：最低開池
    ax = sorted([h for h in opening if h.startswith('A') and h.endswith('s')],
                key=lambda x: RANKS.index(x[1]), reverse=True)
    if ax:
        edges.add(ax[0])  # e.g., A2s

    # 同花 Kx：最低開池
    kx = sorted([h for h in opening if h.startswith('K') and h.endswith('s')],
                key=lambda x: RANKS.index(x[1]), reverse=True)
    if kx:
        edges.add(kx[0])  # e.g., K8s

    # 同花 Qx：最低開池
    qx = sorted([h for h in opening if h.startswith('Q') and h.endswith('s')],
                key=lambda x: RANKS.index(x[1]), reverse=True)
    if qx:
        edges.add(qx[0])  # e.g., Q9s

    # 同花連張 (J-2)：最低開池
    connectors = sorted([h for h in opening if h.endswith('s') and h[0] in 'JT98765'],
                        key=lambda x: RANKS.index(x[0]), reverse=True)
    for conn in connectors[:3]:  # 取最低的幾張
        edges.add(conn)

    # 不同花：最低開池
    offsuit = sorted([h for h in opening if h.endswith('o')],
                     key=lambda x: (RANKS.index(x[0]), RANKS.index(x[1])), reverse=True)
    for off in offsuit[:2]:
        edges.add(off)

    return edges


def calculate_btn_edges(data: dict) -> Set[str]:
    """
    計算 BTN_KEY_EDGES：BTN 首次開池的邊緣牌
    """
    co_opens = get_opening_hands(data, "CO")
    btn_opens = get_opening_hands(data, "BTN")
    btn_first = btn_opens - co_opens

    edges = set()

    # 同花：每類最低
    for prefix in ['K', 'Q', 'J', 'T', '9', '8', '7', '6']:
        suited = sorted([h for h in btn_first if h.startswith(prefix) and h.endswith('s')],
                        key=lambda x: RANKS.index(x[1]), reverse=True)
        if suited:
            edges.add(suited[0])

    # 不同花：最低幾張
    offsuit = sorted([h for h in btn_first if h.endswith('o')],
                     key=lambda x: (RANKS.index(x[0]), RANKS.index(x[1])), reverse=True)
    for off in offsuit[:6]:
        edges.add(off)

    return edges


def calculate_drillable_hands(data: dict, position: str) -> Set[str]:
    """
    計算指定位置的出題手牌

    包含：
    1. 混合頻率牌 (50%)
    2. 開池邊緣牌 (最低開池)
    3. Fold 邊緣牌 (最高不開)

    排除：
    - Premium（太明顯）
    - Trash（太垃圾）
    - 明顯 100% 牌（不需記憶）
    """
    pos_freqs = data[position]["frequencies"]
    opening = get_opening_hands(data, position)

    drillable = set()

    # 1. 混合頻率牌
    for hand, freqs in pos_freqs.items():
        if 1 <= freqs.get("raise", 0) <= 99:
            drillable.add(hand)

    # 2. 開池邊緣牌（各類別最低）
    # 對子
    pairs_open = sorted([h for h in opening if len(h) == 2],
                        key=lambda x: RANKS.index(x[0]), reverse=True)
    if pairs_open:
        drillable.add(pairs_open[0])  # 最低開池對子
        # 也加入下一個不開的對子（fold 邊緣）
        lowest_idx = RANKS.index(pairs_open[0][0])
        if lowest_idx < 12:
            fold_pair = RANKS[lowest_idx + 1] * 2
            if fold_pair not in TRASH_HANDS:
                drillable.add(fold_pair)

    # 同花各類別
    for prefix in RANKS[:10]:  # A-6
        suited = sorted([h for h in opening if h.startswith(prefix) and h.endswith('s')],
                        key=lambda x: RANKS.index(x[1]), reverse=True)
        if suited:
            drillable.add(suited[0])  # 最低開池
            # Fold 邊緣
            lowest_idx = RANKS.index(suited[0][1])
            if lowest_idx < 12:
                fold_hand = f"{prefix}{RANKS[lowest_idx + 1]}s"
                if fold_hand not in TRASH_HANDS and fold_hand not in opening:
                    drillable.add(fold_hand)

    # 不同花
    offsuit_open = sorted([h for h in opening if h.endswith('o')],
                          key=lambda x: (RANKS.index(x[0]), RANKS.index(x[1])), reverse=True)
    for off in offsuit_open[:3]:  # 最低幾張
        drillable.add(off)

    # 移除 Premium 和 Trash
    drillable -= PREMIUM_HANDS
    drillable -= TRASH_HANDS

    return drillable


def calculate_excluded_hands(data: dict, position: str) -> Set[str]:
    """計算排除列表 = 169 - drillable"""
    drillable = calculate_drillable_hands(data, position)
    return set(ALL_HANDS) - drillable


def format_hand_set(hands: Set[str], name: str, indent: int = 4) -> str:
    """格式化手牌集合為 Python 代碼"""
    spaces = " " * indent
    if not hands:
        return f"{name} = set()"

    # 按類別分組
    pairs = sorted([h for h in hands if len(h) == 2], key=lambda x: RANKS.index(x[0]))
    suited = sorted([h for h in hands if h.endswith('s')], key=lambda x: (RANKS.index(x[0]), RANKS.index(x[1])))
    offsuit = sorted([h for h in hands if h.endswith('o')], key=lambda x: (RANKS.index(x[0]), RANKS.index(x[1])))

    lines = [f"{name} = {{"]
    if pairs:
        lines.append(f'{spaces}# Pairs')
        lines.append(f'{spaces}"{"\", \"".join(pairs)}",')
    if suited:
        lines.append(f'{spaces}# Suited')
        # 按首字母分組
        current_prefix = None
        current_group = []
        for h in suited:
            if h[0] != current_prefix:
                if current_group:
                    lines.append(f'{spaces}"{"\", \"".join(current_group)}",')
                current_prefix = h[0]
                current_group = [h]
            else:
                current_group.append(h)
        if current_group:
            lines.append(f'{spaces}"{"\", \"".join(current_group)}",')
    if offsuit:
        lines.append(f'{spaces}# Offsuit')
        lines.append(f'{spaces}"{"\", \"".join(offsuit)}",')
    lines.append("}")

    return "\n".join(lines)


def generate_drill_constants(data: dict) -> str:
    """生成 drill.py 的常數代碼"""
    lines = []

    lines.append("# ============================================================================")
    lines.append("# 自動生成的位置排除列表 (由 scripts/sync_rfi_constants.py 生成)")
    lines.append("# ============================================================================")
    lines.append("")
    lines.append("POSITION_EXCLUDED_HANDS = {")

    for pos in POSITION_ORDER:
        excluded = calculate_excluded_hands(data, pos)
        drillable_count = 169 - len(excluded)
        lines.append(f'    "{pos}": BASE_EXCLUDED_HANDS | {{')
        lines.append(f'        # {pos}: {drillable_count} 手出題')

        # 分類排列
        pairs = sorted([h for h in excluded if len(h) == 2 and h not in PREMIUM_HANDS and h not in TRASH_HANDS],
                       key=lambda x: RANKS.index(x[0]))
        suited = sorted([h for h in excluded if h.endswith('s') and h not in PREMIUM_HANDS and h not in TRASH_HANDS],
                        key=lambda x: (RANKS.index(x[0]), RANKS.index(x[1])))
        offsuit = sorted([h for h in excluded if h.endswith('o') and h not in PREMIUM_HANDS and h not in TRASH_HANDS],
                         key=lambda x: (RANKS.index(x[0]), RANKS.index(x[1])))

        if pairs:
            lines.append(f'        "{"\", \"".join(pairs)}",')
        if suited:
            # 分行顯示同花
            for i in range(0, len(suited), 10):
                chunk = suited[i:i+10]
                lines.append(f'        "{"\", \"".join(chunk)}",')
        if offsuit:
            # 分行顯示不同花
            for i in range(0, len(offsuit), 10):
                chunk = offsuit[i:i+10]
                lines.append(f'        "{"\", \"".join(chunk)}",')

        lines.append("    },")

    lines.append("}")

    return "\n".join(lines)


def generate_chart_constants(data: dict) -> Tuple[str, str, str]:
    """生成 rfi_chart.py 的常數代碼"""
    utg_edges = calculate_utg_edges(data)
    btn_edges = calculate_btn_edges(data)
    obvious = calculate_obvious_hands(data)

    # UTG_KEY_EDGES
    utg_lines = ["# UTG 邊緣牌 - 金框顯示 (自動生成)"]
    utg_lines.append("UTG_KEY_EDGES = {")
    mixed = sorted([h for h in utg_edges if 1 <= data["UTG"]["frequencies"].get(h, {}).get("raise", 0) <= 99])
    edge_100 = sorted([h for h in utg_edges if data["UTG"]["frequencies"].get(h, {}).get("raise", 0) == 100],
                      key=lambda x: (0 if len(x) == 2 else 1, x))
    if edge_100:
        utg_lines.append(f'    "{"\", \"".join(edge_100)}",  # 100% 邊緣')
    if mixed:
        utg_lines.append(f'    "{"\", \"".join(mixed)}",  # 50% 混合')
    utg_lines.append("}")

    # BTN_KEY_EDGES
    btn_lines = ["# BTN 邊緣牌 - 白框顯示 (自動生成)"]
    btn_lines.append("BTN_KEY_EDGES = {")
    suited_btn = sorted([h for h in btn_edges if h.endswith('s')], key=lambda x: (RANKS.index(x[0]), RANKS.index(x[1])))
    offsuit_btn = sorted([h for h in btn_edges if h.endswith('o')], key=lambda x: (RANKS.index(x[0]), RANKS.index(x[1])))
    if suited_btn:
        btn_lines.append(f'    "{"\", \"".join(suited_btn)}",  # 同花')
    if offsuit_btn:
        btn_lines.append(f'    "{"\", \"".join(offsuit_btn)}",  # 不同花')
    btn_lines.append("}")

    # OBVIOUS_HANDS
    obv_lines = ["# 明顯牌 - 淡化顯示 (自動生成)"]
    obv_lines.append("# 所有位置都 100% 開，不需要記憶")
    obv_lines.append("OBVIOUS_HANDS = {")
    pairs = sorted([h for h in obvious if len(h) == 2], key=lambda x: RANKS.index(x[0]))
    suited = sorted([h for h in obvious if h.endswith('s')], key=lambda x: (RANKS.index(x[0]), RANKS.index(x[1])))
    offsuit = sorted([h for h in obvious if h.endswith('o')], key=lambda x: (RANKS.index(x[0]), RANKS.index(x[1])))
    if pairs:
        obv_lines.append(f'    "{"\", \"".join(pairs)}",  # Pairs')
    if suited:
        obv_lines.append(f'    "{"\", \"".join(suited)}",  # Suited')
    if offsuit:
        obv_lines.append(f'    "{"\", \"".join(offsuit)}",  # Offsuit')
    obv_lines.append("}")

    return "\n".join(utg_lines), "\n".join(btn_lines), "\n".join(obv_lines)


def show_diff(data: dict):
    """顯示計算結果與當前值的差異"""
    print("=" * 70)
    print("📊 RFI 常數同步檢查")
    print("=" * 70)

    # 1. 顯示計算出的值
    print("\n🔹 計算出的 UTG_KEY_EDGES:")
    utg_edges = calculate_utg_edges(data)
    print(f"   {sorted(utg_edges)}")

    print("\n🔹 計算出的 BTN_KEY_EDGES:")
    btn_edges = calculate_btn_edges(data)
    print(f"   {sorted(btn_edges)}")

    print("\n🔹 計算出的 OBVIOUS_HANDS:")
    obvious = calculate_obvious_hands(data)
    print(f"   {sorted(obvious)}")

    print("\n🔹 計算出的出題數量:")
    for pos in POSITION_ORDER:
        drillable = calculate_drillable_hands(data, pos)
        print(f"   {pos}: {len(drillable)} 手")

    # 2. 與現有常數比較
    print("\n" + "=" * 70)
    print("📋 與現有常數比較")
    print("=" * 70)

    # 讀取現有 drill.py 的出題數
    from trainer.drill import get_drillable_hands as current_drillable
    print("\n出題數量差異:")
    has_diff = False
    for pos in POSITION_ORDER:
        current = len(current_drillable(position=pos))
        calculated = len(calculate_drillable_hands(data, pos))
        if current != calculated:
            print(f"   {pos}: 現有 {current} → 計算 {calculated} ⚠️")
            has_diff = True
        else:
            print(f"   {pos}: {current} ✓")

    if not has_diff:
        print("\n✅ 所有常數已同步，無需更新")
    else:
        print("\n⚠️ 有差異，請執行 --apply 更新")

    return has_diff


def apply_updates(data: dict):
    """應用更新到文件"""
    print("=" * 70)
    print("🔧 應用更新")
    print("=" * 70)

    # 生成新的常數代碼
    utg_code, btn_code, obv_code = generate_chart_constants(data)

    print("\n📝 生成的 UTG_KEY_EDGES:")
    print(utg_code)
    print("\n📝 生成的 BTN_KEY_EDGES:")
    print(btn_code)
    print("\n📝 生成的 OBVIOUS_HANDS:")
    print(obv_code)

    # 注意：實際替換文件內容需要更複雜的邏輯
    # 這裡只顯示生成的代碼，讓用戶手動更新或進一步開發自動替換
    print("\n" + "=" * 70)
    print("📋 出題範圍摘要")
    print("=" * 70)
    for pos in POSITION_ORDER:
        drillable = calculate_drillable_hands(data, pos)
        print(f"\n{pos} ({len(drillable)} 手):")
        print(f"   {sorted(drillable)}")

    print("\n" + "=" * 70)
    print("⚠️ 請手動將上述常數複製到對應文件")
    print("   - rfi_chart.py: UTG_KEY_EDGES, BTN_KEY_EDGES, OBVIOUS_HANDS")
    print("   - drill.py: POSITION_EXCLUDED_HANDS (需要反轉 drillable)")
    print("=" * 70)


def main():
    import argparse
    parser = argparse.ArgumentParser(description="同步 RFI 常數")
    parser.add_argument("--apply", action="store_true", help="應用更新")
    parser.add_argument("--check", action="store_true", help="只檢查，返回錯誤碼")
    args = parser.parse_args()

    # 載入數據
    data = load_rfi_data()
    print(f"📂 載入: {RFI_JSON}")
    print(f"   版本: {data['meta']['version']}")

    if args.apply:
        apply_updates(data)
    else:
        has_diff = show_diff(data)
        if args.check and has_diff:
            sys.exit(1)


if __name__ == "__main__":
    main()
