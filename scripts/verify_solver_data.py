#!/usr/bin/env python3
"""
GTO Solver Data Verification Script

This script helps verify our precomputed GTO data against Desktop Postflop.

Usage:
1. Install Desktop Postflop: https://github.com/b-inary/desktop-postflop/releases
2. Run this script to export verification scenarios
3. Load scenarios into Desktop Postflop and compare

Example:
    python verify_solver_data.py --texture dry_ace_high
    python verify_solver_data.py --board Ah7s2d
    python verify_solver_data.py --all
"""

import json
import argparse
from pathlib import Path
from typing import Dict, List

# Load our solver data
DATA_DIR = Path(__file__).parent.parent / "apps/api/data/solver"

def load_level1_data() -> Dict:
    """Load Level 1 texture data."""
    path = DATA_DIR / "level1_textures.json"
    with open(path, encoding="utf-8") as f:
        return json.load(f)

def load_level2_data() -> Dict:
    """Load Level 2 scenario data."""
    path = DATA_DIR / "btn_vs_bb_srp.json"
    if not path.exists():
        return {"scenarios": []}
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def format_strategy_comparison(our_strat: Dict, hand: str) -> str:
    """Format strategy for comparison."""
    lines = [f"  Hand: {hand}"]

    for action, freq in sorted(our_strat.items()):
        if action == "note":
            continue
        lines.append(f"    {action}: {freq}%")

    return "\n".join(lines)


def export_verification_scenario(texture_id: str, board: List[str]) -> str:
    """Export a scenario for Desktop Postflop verification."""
    level1 = load_level1_data()

    # Find texture
    texture = None
    for t in level1["textures"]:
        if t["texture_id"] == texture_id:
            texture = t
            break

    if not texture:
        return f"Texture '{texture_id}' not found"

    board_str = "".join(board)

    lines = [
        "=" * 60,
        f"VERIFICATION SCENARIO: {texture_id}",
        "=" * 60,
        "",
        "Desktop Postflop Settings:",
        "  - Position: BTN (IP) vs BB (OOP)",
        "  - Pot Type: SRP (Single Raised Pot)",
        f"  - Board: {board_str}",
        "  - Starting Pot: 6.5bb (2.5bb open + 1bb call + 0.5bb SB + 0.5bb deadmoney + 2bb BB)",
        "  - Effective Stack: ~97bb (100 - 2.5bb open)",
        "",
        "Bet Sizes to Configure:",
        "  - IP C-bet: 33%, 50%, 75%",
        "  - OOP Check-Raise: 2.5x",
        "",
        "Expected Strategies (Our Data):",
        "",
    ]

    # Add key hands
    key_hands = ["AA", "KK", "QQ", "AKs", "AKo", "JTs", "76s"]
    strategies = texture["strategies"]

    for hand in key_hands:
        if hand in strategies:
            strat = {k: v for k, v in strategies[hand].items() if k != "note"}
            lines.append(format_strategy_comparison(strat, hand))
            lines.append("")

    lines.extend([
        "=" * 60,
        "Verification Checklist:",
        "[ ] bet_33 frequencies within ±10%",
        "[ ] bet_50 frequencies within ±10%",
        "[ ] check frequencies within ±10%",
        "[ ] Overall pattern matches (high freq bet vs check)",
        "=" * 60,
    ])

    return "\n".join(lines)


def print_all_textures():
    """Print summary of all textures for verification."""
    level1 = load_level1_data()

    print("=" * 60)
    print("SOLVER DATA VERIFICATION SUMMARY")
    print("=" * 60)
    print()
    print(f"Total Textures: {len(level1['textures'])}")
    print()

    for t in level1["textures"]:
        board_str = "".join(t["representative_board"])
        print(f"{t['texture_id']:20} | {board_str:8} | {t['texture_zh']}")

    print()
    print("=" * 60)
    print("QUICK VERIFICATION GUIDE")
    print("=" * 60)
    print("""
1. Download Desktop Postflop:
   https://github.com/b-inary/desktop-postflop/releases

2. Configure a BTN vs BB SRP scenario:
   - IP Range: Standard BTN open (40%+)
   - OOP Range: BB defend vs BTN (~35-40%)
   - Pot: 6.5bb, Stacks: ~97bb

3. Set bet sizes:
   - IP: 33%, 50%, 75% pot
   - OOP: Check, 33%, 50%

4. Load board and solve

5. Compare key hands:
   - Strong value (AA, KK, AK)
   - Medium (QQ, JJ)
   - Draws (JTs, 98s)
   - Air (76s, 65s)

6. Acceptable variance: ±10% frequency
""")


def main():
    parser = argparse.ArgumentParser(description="Verify GTO solver data")
    parser.add_argument("--texture", help="Texture ID to verify")
    parser.add_argument("--board", help="Specific board to verify (e.g., Ah7s2d)")
    parser.add_argument("--all", action="store_true", help="Show all textures summary")
    parser.add_argument("--export", help="Export scenario to file")
    args = parser.parse_args()

    if args.all:
        print_all_textures()
        return

    if args.texture:
        level1 = load_level1_data()
        texture = None
        for t in level1["textures"]:
            if t["texture_id"] == args.texture:
                texture = t
                break

        if texture:
            result = export_verification_scenario(
                args.texture,
                texture["representative_board"]
            )
            print(result)

            if args.export:
                with open(args.export, "w") as f:
                    f.write(result)
                print(f"\nExported to: {args.export}")
        else:
            print(f"Texture '{args.texture}' not found")
        return

    if args.board:
        # Parse board
        board = []
        i = 0
        while i < len(args.board):
            if i + 1 < len(args.board):
                board.append(args.board[i:i+2])
                i += 2
            else:
                i += 1

        # Find matching texture
        level1 = load_level1_data()
        for t in level1["textures"]:
            if "".join(t["representative_board"]) == args.board:
                result = export_verification_scenario(t["texture_id"], board)
                print(result)
                return

        print(f"Board '{args.board}' not found in Level 1 data")
        return

    # Default: show help
    parser.print_help()


if __name__ == "__main__":
    main()
