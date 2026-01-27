"""
Preflop GTO Leak Analyzer
Analyzes user's preflop play against GTO frequencies to find leaks.
"""
import json
import os
from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from enum import Enum
from collections import defaultdict

from .hand_parser import HandHistory, Action, ActionType as ParserActionType


class PreflopScenario(Enum):
    """Preflop scenario types matching our GTO data."""
    RFI = "rfi"                  # First to open
    VS_RFI = "vs_rfi"            # Facing an open (3bet/call/fold)
    VS_3BET = "vs_3bet"          # Opened, facing 3bet (4bet/call/fold)
    VS_4BET = "vs_4bet"          # 3bet, facing 4bet (5bet/call/fold)
    SQUEEZE = "squeeze"          # Open + caller, you 3bet
    COLD_CALL = "cold_call"      # Facing open + 3bet, you call
    UNKNOWN = "unknown"


class HeroAction(Enum):
    """Simplified hero action types for GTO comparison."""
    FOLD = "fold"
    CALL = "call"
    RAISE = "raise"  # Covers open, 3bet, 4bet, 5bet
    CHECK = "check"


@dataclass
class PreflopDecision:
    """Represents a single preflop decision by hero."""
    hand_id: str
    hero_position: str
    hero_hand: str  # Normalized notation like "AKo", "QQ"
    scenario: PreflopScenario
    villain_position: Optional[str]  # For VS scenarios
    hero_action: HeroAction

    # For analysis
    gto_frequencies: Dict[str, float] = field(default_factory=dict)
    is_mistake: bool = False
    ev_loss: float = 0.0


@dataclass
class LeakReport:
    """Summary of preflop leaks."""
    total_hands: int = 0
    analyzed_hands: int = 0

    # Overall stats
    mistakes: int = 0
    total_ev_loss: float = 0.0

    # By scenario
    scenario_stats: Dict[str, Dict] = field(default_factory=dict)

    # By position
    position_stats: Dict[str, Dict] = field(default_factory=dict)

    # Specific hand leaks
    hand_leaks: Dict[str, Dict] = field(default_factory=dict)

    # Top leaks (sorted by frequency/EV loss)
    top_leaks: List[Dict] = field(default_factory=list)


class PreflopAnalyzer:
    """Analyzes preflop play against GTO."""

    def __init__(self, data_dir: str = None):
        if data_dir is None:
            # Default to project data directory
            base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            data_dir = os.path.join(base_dir, "data", "ranges", "6max")

        self.data_dir = data_dir
        self.gto_data = {}
        self._load_gto_data()

        # Track all decisions
        self.decisions: List[PreflopDecision] = []

    def _load_gto_data(self):
        """Load all GTO frequency data."""
        files = {
            "rfi": "rfi_frequencies.json",
            "vs_rfi": "vs_rfi_frequencies.json",
            "vs_3bet": "vs_3bet_frequencies.json",
            "vs_4bet": "vs_4bet_frequencies.json",
        }

        for scenario_type, filename in files.items():
            filepath = os.path.join(self.data_dir, filename)
            if os.path.exists(filepath):
                with open(filepath, 'r', encoding='utf-8') as f:
                    self.gto_data[scenario_type] = json.load(f)

    def analyze_hands(self, hands: List[HandHistory]) -> LeakReport:
        """Analyze a list of hands and generate leak report."""
        self.decisions = []

        for hand in hands:
            decision = self._analyze_single_hand(hand)
            if decision:
                self.decisions.append(decision)

        return self._generate_report()

    def _analyze_single_hand(self, hand: HandHistory) -> Optional[PreflopDecision]:
        """Analyze a single hand's preflop action."""
        if not hand.hero or not hand.hero.hole_cards:
            return None

        hero_position = hand.hero.position
        hero_hand = self._normalize_hole_cards(hand.hero.hole_cards)

        if not hero_hand:
            return None

        # Classify scenario and find hero's action
        scenario, villain_pos, hero_action = self._classify_scenario(hand)

        if scenario == PreflopScenario.UNKNOWN or hero_action is None:
            return None

        decision = PreflopDecision(
            hand_id=hand.hand_id,
            hero_position=hero_position,
            hero_hand=hero_hand,
            scenario=scenario,
            villain_position=villain_pos,
            hero_action=hero_action,
        )

        # Look up GTO frequencies
        gto_freqs = self._get_gto_frequencies(scenario, hero_position, villain_pos, hero_hand)
        decision.gto_frequencies = gto_freqs

        # Determine if this is a mistake
        if gto_freqs:
            decision.is_mistake, decision.ev_loss = self._evaluate_decision(
                hero_action, gto_freqs
            )

        return decision

    def _normalize_hole_cards(self, cards_str: str) -> Optional[str]:
        """Convert hole cards to normalized notation.

        Examples:
            "As Kh" -> "AKo"
            "Qd Qc" -> "QQ"
            "Th 9h" -> "T9s"
        """
        # Parse cards like "As Kh" or "As,Kh" or "[As Kh]"
        cards_str = cards_str.replace('[', '').replace(']', '').replace(',', ' ')
        parts = cards_str.split()

        if len(parts) != 2:
            return None

        try:
            r1, s1 = parts[0][0].upper(), parts[0][1].lower()
            r2, s2 = parts[1][0].upper(), parts[1][1].lower()

            # Handle T for 10
            if r1 == '1' and len(parts[0]) > 2:
                r1 = 'T'
                s1 = parts[0][2].lower()
            if r2 == '1' and len(parts[1]) > 2:
                r2 = 'T'
                s2 = parts[1][2].lower()

            # Normalize rank order (higher first)
            ranks = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']

            if r1 not in ranks or r2 not in ranks:
                return None

            if ranks.index(r1) > ranks.index(r2):
                r1, r2 = r2, r1
                s1, s2 = s2, s1

            # Format notation
            if r1 == r2:
                return f"{r1}{r2}"  # Pair
            elif s1 == s2:
                return f"{r1}{r2}s"  # Suited
            else:
                return f"{r1}{r2}o"  # Offsuit

        except (IndexError, ValueError):
            return None

    def _classify_scenario(self, hand: HandHistory) -> Tuple[PreflopScenario, Optional[str], Optional[HeroAction]]:
        """Classify the preflop scenario and find hero's LAST meaningful action.

        Returns: (scenario, villain_position, hero_action)

        The key insight is that we need to find hero's FINAL decision, not first.
        For example:
        - Hero opens UTG -> villain 3bets -> Hero calls = VS_3BET scenario
        - Hero opens BTN -> villain 4bets -> Hero folds = VS_4BET scenario
        """
        hero_name = hand.hero.name
        actions = hand.preflop_actions

        # Skip blinds posting
        action_sequence = []
        for action in actions:
            if action.action_type in (ParserActionType.POST_SB, ParserActionType.POST_BB):
                continue
            action_sequence.append(action)

        # Find players' positions
        player_positions = {p.name: p.position for p in hand.players}

        # First pass: find all raises and who made them
        raise_sequence = []  # [(player, position), ...]
        for action in action_sequence:
            if action.action_type == ParserActionType.RAISE:
                player = action.player
                pos = player_positions.get(player)
                raise_sequence.append((player, pos))

        # Second pass: find hero's LAST action
        hero_actions = []
        for action in action_sequence:
            if action.player == hero_name:
                if action.action_type == ParserActionType.FOLD:
                    hero_actions.append(HeroAction.FOLD)
                elif action.action_type == ParserActionType.CALL:
                    hero_actions.append(HeroAction.CALL)
                elif action.action_type == ParserActionType.RAISE:
                    hero_actions.append(HeroAction.RAISE)
                elif action.action_type == ParserActionType.CHECK:
                    hero_actions.append(HeroAction.CHECK)

        if not hero_actions:
            return PreflopScenario.UNKNOWN, None, None

        hero_final_action = hero_actions[-1]

        # Determine scenario based on raise sequence and hero's position in it
        if not raise_sequence:
            # No raises - hero folded or checked in unopened pot
            return PreflopScenario.UNKNOWN, None, hero_final_action

        first_raiser, first_raiser_pos = raise_sequence[0]
        three_bettor, three_bettor_pos = raise_sequence[1] if len(raise_sequence) > 1 else (None, None)
        four_bettor, four_bettor_pos = raise_sequence[2] if len(raise_sequence) > 2 else (None, None)

        # Classify based on hero's role
        if len(hero_actions) == 1:
            # Hero only acted once
            if first_raiser == hero_name:
                # Hero opened
                if three_bettor:
                    # Hero opened, then faced 3bet
                    # But hero_actions only has 1 action, so hero's decision was the open
                    # This means we need to check if hero acted AGAIN after the 3bet
                    pass
                else:
                    # Hero opened, no 3bet = RFI
                    return PreflopScenario.RFI, None, hero_final_action
            elif first_raiser:
                # Someone else opened, hero faced RFI
                return PreflopScenario.VS_RFI, first_raiser_pos, hero_final_action

        elif len(hero_actions) >= 2:
            # Hero acted multiple times
            if first_raiser == hero_name:
                # Hero opened first
                if three_bettor and three_bettor != hero_name:
                    # Hero opened, villain 3bet, hero responded
                    if four_bettor and four_bettor != hero_name:
                        # Hero opened, villain 3bet, hero 4bet, villain 5bet... complex
                        return PreflopScenario.UNKNOWN, None, hero_final_action
                    else:
                        # Hero opened, villain 3bet = VS_3BET
                        return PreflopScenario.VS_3BET, three_bettor_pos, hero_final_action
                elif three_bettor == hero_name:
                    # Hero opened and 3bet? That's not possible in normal flow
                    return PreflopScenario.UNKNOWN, None, hero_final_action

            elif three_bettor == hero_name:
                # Hero 3bet
                if four_bettor and four_bettor != hero_name:
                    # Hero 3bet, villain 4bet = VS_4BET
                    return PreflopScenario.VS_4BET, four_bettor_pos, hero_final_action
                else:
                    # Hero 3bet, no 4bet = this was hero's VS_RFI decision to 3bet
                    return PreflopScenario.VS_RFI, first_raiser_pos, HeroAction.RAISE

        return PreflopScenario.UNKNOWN, None, hero_final_action

    def _get_gto_frequencies(
        self,
        scenario: PreflopScenario,
        hero_pos: str,
        villain_pos: Optional[str],
        hand: str
    ) -> Dict[str, float]:
        """Look up GTO frequencies for this situation."""

        if scenario == PreflopScenario.RFI:
            data = self.gto_data.get("rfi", {})
            pos_data = data.get(hero_pos, {})
            return pos_data.get("frequencies", {}).get(hand, {})

        elif scenario == PreflopScenario.VS_RFI:
            data = self.gto_data.get("vs_rfi", {})
            key = f"{hero_pos}_vs_{villain_pos}"
            pos_data = data.get(key, {})
            return pos_data.get("frequencies", {}).get(hand, {})

        elif scenario == PreflopScenario.VS_3BET:
            data = self.gto_data.get("vs_3bet", {})
            key = f"{hero_pos}_vs_{villain_pos}"
            pos_data = data.get(key, {})
            return pos_data.get("frequencies", {}).get(hand, {})

        elif scenario == PreflopScenario.VS_4BET:
            data = self.gto_data.get("vs_4bet", {})
            key = f"{hero_pos}_vs_{villain_pos}"
            pos_data = data.get(key, {})
            return pos_data.get("frequencies", {}).get(hand, {})

        return {}

    def _evaluate_decision(
        self,
        hero_action: HeroAction,
        gto_freqs: Dict[str, float]
    ) -> Tuple[bool, float]:
        """Evaluate if hero's decision is a mistake.

        Returns: (is_mistake, estimated_ev_loss)
        """
        if not gto_freqs:
            return False, 0.0

        # For raises, check for any raising action in GTO
        # Covers: raise (RFI), open, 3bet, 4bet, 5bet
        if hero_action == HeroAction.RAISE:
            raise_actions = ["raise", "open", "3bet", "4bet", "5bet"]
            gto_raise_freq = sum(gto_freqs.get(a, 0) for a in raise_actions)

            if gto_raise_freq == 0:
                # GTO says never raise, but hero raised
                return True, 2.0  # Estimated EV loss in bb
            elif gto_raise_freq < 30:
                # Low frequency raise
                return True, 1.0
            else:
                return False, 0.0

        elif hero_action == HeroAction.FOLD:
            gto_fold_freq = gto_freqs.get("fold", 0)

            if gto_fold_freq == 0:
                # GTO says never fold, but hero folded
                # Check what GTO recommends
                best_action = max(gto_freqs.keys(), key=lambda k: gto_freqs.get(k, 0))
                best_freq = gto_freqs.get(best_action, 0)

                if best_freq >= 70:
                    return True, 1.5  # Clear mistake
                else:
                    return True, 0.5  # Mixed spot, smaller mistake

            elif gto_fold_freq < 30:
                # Low frequency fold
                return True, 0.5

        elif hero_action == HeroAction.CALL:
            gto_call_freq = gto_freqs.get("call", 0)

            if gto_call_freq == 0:
                # GTO says never call, but hero called
                best_action = max(gto_freqs.keys(), key=lambda k: gto_freqs.get(k, 0))
                best_freq = gto_freqs.get(best_action, 0)

                if best_freq >= 70:
                    return True, 1.5  # Clear mistake
                else:
                    return True, 0.5  # Mixed spot, smaller mistake

            elif gto_call_freq < 30:
                # Low frequency call
                return True, 0.5

        return False, 0.0

    def _generate_report(self) -> LeakReport:
        """Generate comprehensive leak report from analyzed decisions."""
        report = LeakReport()
        report.total_hands = len(self.decisions)
        report.analyzed_hands = len([d for d in self.decisions if d.gto_frequencies])

        # Initialize tracking dicts
        scenario_data = defaultdict(lambda: {
            "total": 0, "mistakes": 0, "ev_loss": 0,
            "actions": defaultdict(int),
            "mistake_actions": defaultdict(int)
        })

        position_data = defaultdict(lambda: {
            "total": 0, "mistakes": 0, "ev_loss": 0
        })

        hand_data = defaultdict(lambda: {
            "total": 0, "mistakes": 0, "ev_loss": 0,
            "scenarios": defaultdict(lambda: {"total": 0, "mistakes": 0})
        })

        for decision in self.decisions:
            scenario_key = f"{decision.scenario.value}"
            if decision.villain_position:
                scenario_key += f"_{decision.hero_position}_vs_{decision.villain_position}"
            else:
                scenario_key = f"{decision.scenario.value}_{decision.hero_position}"

            # Update scenario stats
            scenario_data[scenario_key]["total"] += 1
            scenario_data[scenario_key]["actions"][decision.hero_action.value] += 1

            if decision.is_mistake:
                report.mistakes += 1
                report.total_ev_loss += decision.ev_loss
                scenario_data[scenario_key]["mistakes"] += 1
                scenario_data[scenario_key]["ev_loss"] += decision.ev_loss
                scenario_data[scenario_key]["mistake_actions"][decision.hero_action.value] += 1

            # Update position stats
            position_data[decision.hero_position]["total"] += 1
            if decision.is_mistake:
                position_data[decision.hero_position]["mistakes"] += 1
                position_data[decision.hero_position]["ev_loss"] += decision.ev_loss

            # Update hand stats
            hand_data[decision.hero_hand]["total"] += 1
            hand_data[decision.hero_hand]["scenarios"][scenario_key]["total"] += 1
            if decision.is_mistake:
                hand_data[decision.hero_hand]["mistakes"] += 1
                hand_data[decision.hero_hand]["ev_loss"] += decision.ev_loss
                hand_data[decision.hero_hand]["scenarios"][scenario_key]["mistakes"] += 1

        report.scenario_stats = dict(scenario_data)
        report.position_stats = dict(position_data)
        report.hand_leaks = dict(hand_data)

        # Calculate top leaks
        report.top_leaks = self._calculate_top_leaks(scenario_data, hand_data)

        return report

    def _calculate_top_leaks(
        self,
        scenario_data: Dict,
        hand_data: Dict
    ) -> List[Dict]:
        """Calculate top leaks sorted by EV loss."""
        leaks = []

        # Scenario-based leaks
        for scenario, data in scenario_data.items():
            if data["mistakes"] > 0:
                leak = {
                    "type": "scenario",
                    "description": scenario,
                    "total_hands": data["total"],
                    "mistakes": data["mistakes"],
                    "mistake_rate": data["mistakes"] / data["total"] * 100,
                    "ev_loss": data["ev_loss"],
                    "common_mistakes": dict(data["mistake_actions"]),
                }
                leaks.append(leak)

        # Hand-based leaks (hands with >50% mistake rate)
        for hand, data in hand_data.items():
            if data["total"] >= 3 and data["mistakes"] / data["total"] > 0.5:
                leak = {
                    "type": "hand",
                    "description": f"{hand}",
                    "total_hands": data["total"],
                    "mistakes": data["mistakes"],
                    "mistake_rate": data["mistakes"] / data["total"] * 100,
                    "ev_loss": data["ev_loss"],
                    "scenarios": {k: dict(v) for k, v in data["scenarios"].items()},
                }
                leaks.append(leak)

        # Sort by EV loss
        leaks.sort(key=lambda x: x["ev_loss"], reverse=True)

        return leaks[:20]  # Top 20 leaks


def format_leak_report(report: LeakReport) -> str:
    """Format leak report for display."""
    lines = []

    lines.append("=" * 60)
    lines.append("翻前 GTO 分析報告")
    lines.append("=" * 60)
    lines.append("")

    # Summary
    lines.append(f"總手數: {report.total_hands}")
    lines.append(f"已分析: {report.analyzed_hands}")
    lines.append(f"錯誤數: {report.mistakes}")
    if report.analyzed_hands > 0:
        lines.append(f"錯誤率: {report.mistakes / report.analyzed_hands * 100:.1f}%")
    lines.append(f"估計 EV 損失: {report.total_ev_loss:.1f} bb")
    lines.append("")

    # Position breakdown
    lines.append("-" * 40)
    lines.append("位置分析")
    lines.append("-" * 40)
    for pos in ["UTG", "HJ", "CO", "BTN", "SB", "BB"]:
        if pos in report.position_stats:
            data = report.position_stats[pos]
            rate = data["mistakes"] / data["total"] * 100 if data["total"] > 0 else 0
            lines.append(f"{pos}: {data['total']} 手 | 錯誤 {data['mistakes']} ({rate:.1f}%) | EV -{data['ev_loss']:.1f}bb")
    lines.append("")

    # Top leaks
    if report.top_leaks:
        lines.append("-" * 40)
        lines.append("主要漏洞 TOP 10")
        lines.append("-" * 40)

        for i, leak in enumerate(report.top_leaks[:10], 1):
            lines.append(f"\n{i}. {leak['description']}")
            lines.append(f"   樣本: {leak['total_hands']} 手 | 錯誤: {leak['mistakes']} ({leak['mistake_rate']:.0f}%)")
            lines.append(f"   EV 損失: {leak['ev_loss']:.1f} bb")

            if leak["type"] == "scenario" and leak.get("common_mistakes"):
                mistakes = leak["common_mistakes"]
                lines.append(f"   常見錯誤: {mistakes}")

    return "\n".join(lines)


# CLI interface
if __name__ == "__main__":
    import sys
    from .hand_parser import GGPokerParser

    if len(sys.argv) < 2:
        print("Usage: python -m analyzer.preflop_analyzer <hand_history_file>")
        sys.exit(1)

    # Parse hands
    parser = GGPokerParser()
    hands = parser.parse_file(sys.argv[1])
    print(f"Parsed {len(hands)} hands")

    # Analyze
    analyzer = PreflopAnalyzer()
    report = analyzer.analyze_hands(hands)

    # Print report
    print(format_leak_report(report))
