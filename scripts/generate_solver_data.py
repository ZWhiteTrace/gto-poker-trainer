#!/usr/bin/env python3
"""
GTO Solver Data Generator

This script helps generate precomputed solver data for the GTO Poker Trainer.
It defines the scenarios to compute and outputs them in our JSON format.

Usage:
1. Install Desktop Postflop: https://github.com/b-inary/desktop-postflop/releases
2. Run this script to generate scenario definitions
3. Import scenarios into Desktop Postflop and solve
4. Export results and convert to our JSON format

Alternatively, with postflop-solver Python bindings:
    pip install postflop-solver
    python generate_solver_data.py --solve
"""

import json
import argparse
from pathlib import Path
from typing import List, Dict, Tuple
from datetime import datetime

# Board texture categories with representative flops
BOARD_TEXTURES = {
    "dry_ace_high": {
        "texture_zh": "乾燥 A 高牌面",
        "boards": [
            ["Ah", "Ks", "5d"],
            ["Ah", "Qs", "7d"],
            ["Ah", "Js", "3d"],
            ["Ah", "9s", "4d"],
            ["Ah", "7s", "2d"],
        ]
    },
    "dry_king_high": {
        "texture_zh": "乾燥 K 高牌面",
        "boards": [
            ["Kh", "Qs", "7d"],
            ["Kh", "Js", "5d"],
            ["Kh", "Ts", "4d"],
            ["Kh", "9s", "3d"],
            ["Kh", "8s", "2d"],
        ]
    },
    "dry_queen_high": {
        "texture_zh": "乾燥 Q 高牌面",
        "boards": [
            ["Qh", "9s", "4d"],
            ["Qh", "8s", "3d"],
            ["Qh", "7s", "2d"],
            ["Qh", "Js", "5d"],
            ["Qh", "Ts", "6d"],
        ]
    },
    "dry_low_rainbow": {
        "texture_zh": "乾燥低牌面",
        "boards": [
            ["Th", "7s", "2d"],
            ["9h", "6s", "2d"],
            ["8h", "5s", "2d"],
            ["7h", "4s", "2d"],
            ["Jh", "6s", "3d"],
        ]
    },
    "paired_high": {
        "texture_zh": "對子高牌面",
        "boards": [
            ["Ah", "As", "7d"],
            ["Kh", "Ks", "5d"],
            ["Qh", "Qs", "4d"],
            ["Jh", "Js", "3d"],
            ["Th", "Ts", "2d"],
        ]
    },
    "paired_low": {
        "texture_zh": "對子低牌面",
        "boards": [
            ["8h", "8s", "2d"],
            ["7h", "7s", "3d"],
            ["6h", "6s", "2d"],
            ["5h", "5s", "2d"],
            ["4h", "4s", "2d"],
        ]
    },
    "wet_broadway": {
        "texture_zh": "濕潤百老匯牌面",
        "boards": [
            ["Jh", "Th", "8d"],
            ["Qh", "Jh", "9d"],
            ["Kh", "Qh", "Td"],
            ["Jh", "Ts", "9d"],
            ["Qh", "Jd", "Tc"],
        ]
    },
    "wet_middle_connected": {
        "texture_zh": "中連接牌面",
        "boards": [
            ["9h", "8s", "7d"],
            ["8h", "7s", "6d"],
            ["Th", "9s", "8d"],
            ["9h", "8h", "6d"],
            ["8h", "7h", "5d"],
        ]
    },
    "wet_low_connected": {
        "texture_zh": "低連接牌面",
        "boards": [
            ["7h", "6s", "5d"],
            ["6h", "5s", "4d"],
            ["5h", "4s", "3d"],
            ["7h", "6h", "4d"],
            ["6h", "5h", "3d"],
        ]
    },
    "monotone": {
        "texture_zh": "同花牌面",
        "boards": [
            ["Ah", "9h", "4h"],
            ["Kh", "8h", "3h"],
            ["Qh", "7h", "2h"],
            ["Jh", "6h", "3h"],
            ["Th", "5h", "2h"],
        ]
    },
    "twotone_dry": {
        "texture_zh": "雙色乾燥牌面",
        "boards": [
            ["Ah", "Kh", "5d"],
            ["Kh", "Qh", "4d"],
            ["Ah", "Jh", "3d"],
            ["Qh", "Jh", "6d"],
            ["Kh", "Th", "4d"],
        ]
    },
    "twotone_wet": {
        "texture_zh": "雙色濕潤牌面",
        "boards": [
            ["Qh", "9h", "4s"],
            ["Jh", "Th", "5s"],
            ["Th", "9h", "3s"],
            ["9h", "8h", "2s"],
            ["8h", "7h", "2s"],
        ]
    },
}

# Position matchups to compute
POSITION_MATCHUPS = [
    {"position": "BTN", "villain": "BB", "pot_type": "srp"},
    {"position": "CO", "villain": "BB", "pot_type": "srp"},
    {"position": "BTN", "villain": "BB", "pot_type": "3bet"},
]

# Standard opening ranges (simplified)
OPENING_RANGES = {
    "BTN": "22+,A2s+,K2s+,Q2s+,J4s+,T6s+,96s+,86s+,75s+,65s,54s,A2o+,K5o+,Q7o+,J8o+,T8o+,98o",
    "CO": "22+,A2s+,K4s+,Q6s+,J7s+,T7s+,97s+,86s+,76s,65s,A3o+,K7o+,Q8o+,J8o+,T8o+,98o",
    "SB": "22+,A2s+,K2s+,Q2s+,J2s+,T4s+,95s+,85s+,75s+,64s+,54s,A2o+,K4o+,Q6o+,J7o+,T7o+,97o+,87o",
}

DEFENDING_RANGES = {
    "BB_vs_BTN": "22+,A2s+,K2s+,Q4s+,J6s+,T6s+,96s+,86s+,76s,65s,A2o+,K6o+,Q8o+,J8o+,T8o+,98o",
    "BB_vs_CO": "22+,A2s+,K4s+,Q6s+,J7s+,T7s+,97s+,87s,76s,A4o+,K8o+,Q9o+,J9o+,T9o",
    "BB_vs_3bet": "77+,ATs+,KTs+,QTs+,JTs,AJo+,KQo",
}

# Hands to include in strategy output
STANDARD_HANDS = [
    # Pocket pairs
    "AA", "KK", "QQ", "JJ", "TT", "99", "88", "77", "66", "55", "44", "33", "22",
    # Suited broadway
    "AKs", "AQs", "AJs", "ATs", "KQs", "KJs", "KTs", "QJs", "QTs", "JTs",
    # Offsuit broadway
    "AKo", "AQo", "AJo", "ATo", "KQo", "KJo", "KTo", "QJo", "QTo", "JTo",
    # Suited connectors
    "T9s", "98s", "87s", "76s", "65s", "54s",
    # Suited aces
    "A9s", "A8s", "A7s", "A6s", "A5s", "A4s", "A3s", "A2s",
    # Some offsuit aces
    "A9o", "A8o", "A7o", "A6o", "A5o",
]


def generate_scenario_id(position: str, villain: str, pot_type: str, board: List[str]) -> str:
    """Generate a unique scenario ID."""
    board_str = "".join([c[0] for c in board])  # Just ranks
    # Add suit indicator
    suits = [c[1] for c in board]
    if len(set(suits)) == 1:
        board_str += "m"  # monotone
    elif len(set(suits)) == 2:
        board_str += "ss"  # two-tone
    else:
        board_str += "r"  # rainbow
    return f"{position.lower()}_vs_{villain.lower()}_{pot_type}_{board_str}"


def generate_scenarios_json(output_dir: Path) -> List[Dict]:
    """Generate scenario definition JSON files for each position matchup."""
    all_scenarios = []

    for matchup in POSITION_MATCHUPS:
        position = matchup["position"]
        villain = matchup["villain"]
        pot_type = matchup["pot_type"]

        matchup_scenarios = []

        for texture_name, texture_data in BOARD_TEXTURES.items():
            for board in texture_data["boards"]:
                scenario = {
                    "scenario_id": generate_scenario_id(position, villain, pot_type, board),
                    "position": position,
                    "villain": villain,
                    "pot_type": pot_type,
                    "board": board,
                    "texture": texture_name,
                    "texture_zh": texture_data["texture_zh"],
                    "strategies": {}  # To be filled by solver
                }
                matchup_scenarios.append(scenario)

        # Save to file
        filename = f"{position.lower()}_vs_{villain.lower()}_{pot_type}.json"
        output_file = output_dir / filename

        output_data = {
            "meta": {
                "description": f"{position} vs {villain} {pot_type.upper()} - Flop strategies",
                "source": "Desktop Postflop / postflop-solver",
                "version": "1.0.0",
                "generated_at": datetime.now().isoformat(),
                "hero_range": OPENING_RANGES.get(position, ""),
                "villain_range": DEFENDING_RANGES.get(f"{villain}_vs_{position}", ""),
            },
            "scenarios": matchup_scenarios
        }

        with open(output_file, "w") as f:
            json.dump(output_data, f, indent=2, ensure_ascii=False)

        print(f"Generated {len(matchup_scenarios)} scenarios for {position} vs {villain} ({pot_type})")
        print(f"  -> {output_file}")

        all_scenarios.extend(matchup_scenarios)

    return all_scenarios


def generate_desktop_postflop_config(scenarios: List[Dict], output_file: Path):
    """Generate a configuration file for Desktop Postflop batch processing."""
    config = {
        "bet_sizes": {
            "flop": {
                "ip_bet": ["33%", "50%", "75%"],
                "oop_bet": ["33%", "50%", "75%"],
                "ip_raise": ["2.5x"],
                "oop_raise": ["2.5x"],
            },
            "turn": {
                "ip_bet": ["33%", "66%", "100%"],
                "oop_bet": ["33%", "66%", "100%"],
            },
            "river": {
                "ip_bet": ["50%", "75%", "100%", "150%"],
                "oop_bet": ["50%", "75%", "100%", "150%"],
            }
        },
        "accuracy": 0.5,  # % of pot
        "max_iterations": 500,
        "scenarios_count": len(scenarios),
        "boards": [s["board"] for s in scenarios]
    }

    with open(output_file, "w") as f:
        json.dump(config, f, indent=2)

    print(f"\nDesktop Postflop config saved to: {output_file}")


def print_summary(scenarios: List[Dict]):
    """Print a summary of generated scenarios."""
    print("\n" + "=" * 60)
    print("SCENARIO GENERATION SUMMARY")
    print("=" * 60)

    # Count by position matchup
    matchup_counts = {}
    for s in scenarios:
        key = f"{s['position']} vs {s['villain']} ({s['pot_type']})"
        matchup_counts[key] = matchup_counts.get(key, 0) + 1

    print("\nBy Position Matchup:")
    for matchup, count in matchup_counts.items():
        print(f"  {matchup}: {count} boards")

    # Count by texture
    texture_counts = {}
    for s in scenarios:
        texture_counts[s['texture']] = texture_counts.get(s['texture'], 0) + 1

    print("\nBy Board Texture:")
    for texture, count in sorted(texture_counts.items()):
        print(f"  {texture}: {count} boards")

    print(f"\nTotal Scenarios: {len(scenarios)}")
    print(f"Hands per Scenario: ~{len(STANDARD_HANDS)}")
    print(f"Total Strategy Entries: ~{len(scenarios) * len(STANDARD_HANDS)}")


def main():
    parser = argparse.ArgumentParser(description="Generate GTO Solver scenario data")
    parser.add_argument(
        "--output",
        type=str,
        default="../apps/api/data/solver",
        help="Output directory for JSON files"
    )
    parser.add_argument(
        "--config-only",
        action="store_true",
        help="Only generate Desktop Postflop config, not scenario files"
    )
    args = parser.parse_args()

    # Resolve output directory
    script_dir = Path(__file__).parent
    output_dir = (script_dir / args.output).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    print(f"Output directory: {output_dir}")

    if args.config_only:
        # Just generate config for Desktop Postflop
        scenarios = []
        for matchup in POSITION_MATCHUPS:
            for texture_name, texture_data in BOARD_TEXTURES.items():
                for board in texture_data["boards"]:
                    scenarios.append({
                        "position": matchup["position"],
                        "villain": matchup["villain"],
                        "pot_type": matchup["pot_type"],
                        "board": board,
                        "texture": texture_name,
                    })
        generate_desktop_postflop_config(scenarios, output_dir / "desktop_postflop_config.json")
    else:
        # Generate full scenario JSON files
        scenarios = generate_scenarios_json(output_dir)
        generate_desktop_postflop_config(scenarios, output_dir / "desktop_postflop_config.json")
        print_summary(scenarios)

    print("\n" + "=" * 60)
    print("NEXT STEPS")
    print("=" * 60)
    print("""
1. Install Desktop Postflop:
   https://github.com/b-inary/desktop-postflop/releases

2. Open Desktop Postflop and configure:
   - Set IP range (e.g., BTN opening range)
   - Set OOP range (e.g., BB defend range)
   - Load board from scenario
   - Configure bet sizes per config file

3. Solve each scenario and export results

4. Or use postflop-solver Python library for automation:
   pip install postflop-solver
   (See solver integration docs)
""")


if __name__ == "__main__":
    main()
