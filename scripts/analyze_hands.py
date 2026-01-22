#!/usr/bin/env python3
"""
CLI tool to analyze hand history files for preflop GTO leaks.

Usage:
    python scripts/analyze_hands.py <hand_history_file>
    python scripts/analyze_hands.py <hand_history_file> --detailed
    python scripts/analyze_hands.py <hand_history_file> --export report.json
"""
import sys
import os
import json
import argparse

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from analyzer.hand_parser import GGPokerParser
from analyzer.preflop_analyzer import PreflopAnalyzer, LeakReport, format_leak_report


def main():
    parser = argparse.ArgumentParser(
        description="Analyze hand history for preflop GTO leaks"
    )
    parser.add_argument(
        "file",
        help="Hand history file to analyze"
    )
    parser.add_argument(
        "--detailed", "-d",
        action="store_true",
        help="Show detailed hand-by-hand analysis"
    )
    parser.add_argument(
        "--export", "-e",
        metavar="FILE",
        help="Export report to JSON file"
    )
    parser.add_argument(
        "--min-hands", "-m",
        type=int,
        default=3,
        help="Minimum hands for a leak to be reported (default: 3)"
    )

    args = parser.parse_args()

    if not os.path.exists(args.file):
        print(f"Error: File not found: {args.file}")
        sys.exit(1)

    # Parse hands
    print(f"Parsing hand history: {args.file}")
    hand_parser = GGPokerParser()

    try:
        hands = hand_parser.parse_file(args.file)
    except Exception as e:
        print(f"Error parsing file: {e}")
        sys.exit(1)

    print(f"Found {len(hands)} hands")

    if len(hands) == 0:
        print("No hands found in file")
        sys.exit(0)

    # Analyze
    print("Analyzing preflop decisions...")
    analyzer = PreflopAnalyzer()
    report = analyzer.analyze_hands(hands)

    # Print report
    print("\n" + format_leak_report(report))

    # Detailed analysis
    if args.detailed:
        print("\n" + "=" * 60)
        print("詳細錯誤列表")
        print("=" * 60)

        mistakes = [d for d in analyzer.decisions if d.is_mistake]
        for i, decision in enumerate(mistakes[:50], 1):  # Show up to 50
            print(f"\n{i}. Hand #{decision.hand_id}")
            print(f"   位置: {decision.hero_position} | 手牌: {decision.hero_hand}")
            print(f"   場景: {decision.scenario.value}", end="")
            if decision.villain_position:
                print(f" vs {decision.villain_position}")
            else:
                print()
            print(f"   你的動作: {decision.hero_action.value}")
            print(f"   GTO 建議: {decision.gto_frequencies}")
            print(f"   EV 損失: {decision.ev_loss:.1f} bb")

    # Export to JSON
    if args.export:
        export_data = {
            "summary": {
                "total_hands": report.total_hands,
                "analyzed_hands": report.analyzed_hands,
                "mistakes": report.mistakes,
                "mistake_rate": report.mistakes / report.analyzed_hands * 100 if report.analyzed_hands > 0 else 0,
                "total_ev_loss": report.total_ev_loss,
            },
            "position_stats": report.position_stats,
            "scenario_stats": report.scenario_stats,
            "top_leaks": report.top_leaks,
            "decisions": [
                {
                    "hand_id": d.hand_id,
                    "hero_position": d.hero_position,
                    "hero_hand": d.hero_hand,
                    "scenario": d.scenario.value,
                    "villain_position": d.villain_position,
                    "hero_action": d.hero_action.value,
                    "gto_frequencies": d.gto_frequencies,
                    "is_mistake": d.is_mistake,
                    "ev_loss": d.ev_loss,
                }
                for d in analyzer.decisions
            ]
        }

        with open(args.export, 'w', encoding='utf-8') as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)

        print(f"\n報告已匯出至: {args.export}")


if __name__ == "__main__":
    main()
