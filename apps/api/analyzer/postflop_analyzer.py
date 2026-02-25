"""
Postflop Heuristic Analyzer
Analyzes user's postflop play using heuristic rules and frequency tracking.
Note: This is NOT full GTO analysis (would require solver), but provides useful insights.
"""

from collections import defaultdict
from dataclasses import dataclass, field
from enum import Enum

from .hand_parser import Action, HandHistory, Street
from .hand_parser import ActionType as ParserActionType


class BoardTexture(Enum):
    """Simplified board texture classification."""

    DRY = "dry"  # Rainbow, disconnected (e.g., K72r)
    SEMI_WET = "semi_wet"  # Two-tone or some connectivity
    WET = "wet"  # Monotone or highly connected
    PAIRED = "paired"  # Board has a pair


class Position(Enum):
    """Hero's position relative to pot."""

    IP = "in_position"
    OOP = "out_of_position"


@dataclass
class PostflopDecision:
    """Represents a single postflop decision."""

    hand_id: str
    street: Street
    hero_position: Position
    pot_size: float
    hero_action: ParserActionType
    bet_size: float | None
    board_texture: BoardTexture

    # Context
    is_aggressor: bool  # Was hero the preflop aggressor?
    facing_bet: bool  # Is hero facing a bet?
    num_players: int  # Players in the pot


@dataclass
class PostflopStats:
    """Aggregated postflop statistics."""

    # C-bet stats
    cbet_opportunities_ip: int = 0
    cbet_made_ip: int = 0
    cbet_opportunities_oop: int = 0
    cbet_made_oop: int = 0

    # Fold to c-bet
    fold_to_cbet_opportunities: int = 0
    fold_to_cbet_count: int = 0

    # Check-raise
    check_raise_opportunities: int = 0
    check_raise_count: int = 0

    # Probe bet (betting when checked to after preflop aggressor checks)
    probe_opportunities: int = 0
    probe_count: int = 0

    # Delayed c-bet (turn c-bet after flop check)
    delayed_cbet_opportunities: int = 0
    delayed_cbet_count: int = 0

    # By street
    flop_bets: int = 0
    flop_checks: int = 0
    flop_calls: int = 0
    flop_folds: int = 0
    flop_raises: int = 0

    turn_bets: int = 0
    turn_checks: int = 0
    turn_calls: int = 0
    turn_folds: int = 0
    turn_raises: int = 0

    river_bets: int = 0
    river_checks: int = 0
    river_calls: int = 0
    river_folds: int = 0
    river_raises: int = 0


@dataclass
class PostflopReport:
    """Postflop analysis report."""

    total_hands: int = 0
    hands_with_flop: int = 0
    hands_with_turn: int = 0
    hands_with_river: int = 0

    stats: PostflopStats = field(default_factory=PostflopStats)

    # Identified leaks
    leaks: list[dict] = field(default_factory=list)

    # Texture-based stats
    texture_stats: dict[str, dict] = field(default_factory=dict)


class PostflopAnalyzer:
    """Analyzes postflop play using heuristics."""

    # GTO reference frequencies (approximate)
    GTO_BENCHMARKS = {
        "cbet_ip_flop": (65, 75),  # 65-75% IP c-bet
        "cbet_oop_flop": (50, 65),  # 50-65% OOP c-bet
        "fold_to_cbet_flop": (35, 50),  # 35-50% fold to c-bet
        "check_raise_flop": (8, 15),  # 8-15% check-raise
        "probe_turn": (30, 45),  # 30-45% probe bet
        "turn_barrel": (55, 70),  # 55-70% turn barrel
        "river_barrel": (40, 55),  # 40-55% river barrel
    }

    def __init__(self):
        self.decisions: list[PostflopDecision] = []
        self.stats = PostflopStats()

    def analyze_hands(self, hands: list[HandHistory]) -> PostflopReport:
        """Analyze postflop play across multiple hands."""
        self.decisions = []
        self.stats = PostflopStats()

        report = PostflopReport()
        report.total_hands = len(hands)

        for hand in hands:
            self._analyze_single_hand(hand, report)

        report.stats = self.stats
        report.leaks = self._identify_leaks()

        return report

    def _analyze_single_hand(self, hand: HandHistory, report: PostflopReport):
        """Analyze postflop play in a single hand."""
        if not hand.hero or not hand.flop:
            return

        report.hands_with_flop += 1
        if hand.turn:
            report.hands_with_turn += 1
        if hand.river:
            report.hands_with_river += 1

        # Determine hero's position and aggressor status
        hero_name = hand.hero.name
        is_ip = self._is_hero_in_position(hand)
        preflop_aggressor = self._get_preflop_aggressor(hand)
        is_aggressor = preflop_aggressor == hero_name

        # Analyze each street
        if hand.flop:
            texture = self._classify_board_texture(hand.flop)
            self._analyze_street(hand, Street.FLOP, hand.flop_actions, is_ip, is_aggressor, texture)

        if hand.turn:
            self._analyze_street(hand, Street.TURN, hand.turn_actions, is_ip, is_aggressor, texture)

        if hand.river:
            self._analyze_street(
                hand, Street.RIVER, hand.river_actions, is_ip, is_aggressor, texture
            )

    def _analyze_street(
        self,
        hand: HandHistory,
        street: Street,
        actions: list[Action],
        is_ip: bool,
        is_aggressor: bool,
        texture: BoardTexture,
    ):
        """Analyze actions on a specific street."""
        hero_name = hand.hero.name

        # Track action state
        checked_to_hero = False
        facing_bet = False

        for action in actions:
            if action.player == hero_name:
                # Track stats by street and action
                if street == Street.FLOP:
                    self._track_flop_action(
                        action, is_aggressor, is_ip, facing_bet, checked_to_hero
                    )
                elif street == Street.TURN:
                    self._track_turn_action(action, is_aggressor, facing_bet)
                elif street == Street.RIVER:
                    self._track_river_action(action, is_aggressor, facing_bet)

                break
            else:
                if action.action_type == ParserActionType.CHECK:
                    checked_to_hero = True
                elif action.action_type in (ParserActionType.BET, ParserActionType.RAISE):
                    facing_bet = True
                    checked_to_hero = False

    def _track_flop_action(
        self, action: Action, is_aggressor: bool, is_ip: bool, facing_bet: bool, checked_to: bool
    ):
        """Track flop action statistics."""
        if action.action_type == ParserActionType.BET:
            self.stats.flop_bets += 1

            # C-bet opportunity
            if is_aggressor:
                if is_ip:
                    self.stats.cbet_opportunities_ip += 1
                    self.stats.cbet_made_ip += 1
                else:
                    self.stats.cbet_opportunities_oop += 1
                    self.stats.cbet_made_oop += 1
            else:
                # Probe bet
                if checked_to:
                    self.stats.probe_opportunities += 1
                    self.stats.probe_count += 1

        elif action.action_type == ParserActionType.CHECK:
            self.stats.flop_checks += 1

            if is_aggressor:
                if is_ip:
                    self.stats.cbet_opportunities_ip += 1
                else:
                    self.stats.cbet_opportunities_oop += 1
            elif checked_to and not is_aggressor:
                self.stats.probe_opportunities += 1

        elif action.action_type == ParserActionType.CALL:
            self.stats.flop_calls += 1

            if facing_bet and not is_aggressor:
                self.stats.fold_to_cbet_opportunities += 1

        elif action.action_type == ParserActionType.FOLD:
            self.stats.flop_folds += 1

            if facing_bet:
                self.stats.fold_to_cbet_opportunities += 1
                self.stats.fold_to_cbet_count += 1

        elif action.action_type == ParserActionType.RAISE:
            self.stats.flop_raises += 1

            # Check if this was a check-raise
            self.stats.check_raise_opportunities += 1
            self.stats.check_raise_count += 1

    def _track_turn_action(self, action: Action, is_aggressor: bool, facing_bet: bool):
        """Track turn action statistics."""
        if action.action_type == ParserActionType.BET:
            self.stats.turn_bets += 1
        elif action.action_type == ParserActionType.CHECK:
            self.stats.turn_checks += 1
        elif action.action_type == ParserActionType.CALL:
            self.stats.turn_calls += 1
        elif action.action_type == ParserActionType.FOLD:
            self.stats.turn_folds += 1
        elif action.action_type == ParserActionType.RAISE:
            self.stats.turn_raises += 1

    def _track_river_action(self, action: Action, is_aggressor: bool, facing_bet: bool):
        """Track river action statistics."""
        if action.action_type == ParserActionType.BET:
            self.stats.river_bets += 1
        elif action.action_type == ParserActionType.CHECK:
            self.stats.river_checks += 1
        elif action.action_type == ParserActionType.CALL:
            self.stats.river_calls += 1
        elif action.action_type == ParserActionType.FOLD:
            self.stats.river_folds += 1
        elif action.action_type == ParserActionType.RAISE:
            self.stats.river_raises += 1

    def _is_hero_in_position(self, hand: HandHistory) -> bool:
        """Determine if hero is in position postflop."""
        if not hand.hero:
            return False

        hero_pos = hand.hero.position

        # Find who else is still in the pot
        active_players = set()
        for action in hand.preflop_actions:
            if action.action_type not in (
                ParserActionType.FOLD,
                ParserActionType.POST_SB,
                ParserActionType.POST_BB,
            ):
                active_players.add(action.player)

        # BTN > CO > HJ > UTG > BB > SB (postflop order)
        position_order = ["SB", "BB", "UTG", "HJ", "CO", "BTN"]

        hero_idx = position_order.index(hero_pos) if hero_pos in position_order else 0

        # Check if hero acts last
        for p in hand.players:
            if p.name in active_players and p.name != hand.hero.name:
                p_idx = position_order.index(p.position) if p.position in position_order else 0
                if p_idx > hero_idx:
                    return False

        return True

    def _get_preflop_aggressor(self, hand: HandHistory) -> str | None:
        """Get the preflop aggressor (last raiser)."""
        last_raiser = None
        for action in hand.preflop_actions:
            if action.action_type == ParserActionType.RAISE:
                last_raiser = action.player
        return last_raiser

    def _classify_board_texture(self, flop: str) -> BoardTexture:
        """Classify board texture from flop string."""
        # Parse cards from flop string like "Ah Kd 7c"
        cards = flop.replace("[", "").replace("]", "").split()

        if len(cards) < 3:
            return BoardTexture.DRY

        # Check for pair
        ranks = [c[0] for c in cards]
        if len(set(ranks)) < 3:
            return BoardTexture.PAIRED

        # Check for flush draw (two same suit)
        suits = [c[1] if len(c) > 1 else "" for c in cards]
        suit_counts = defaultdict(int)
        for s in suits:
            suit_counts[s] += 1

        if max(suit_counts.values()) >= 3:
            return BoardTexture.WET  # Monotone

        # Check for connectivity
        rank_values = {
            "A": 14,
            "K": 13,
            "Q": 12,
            "J": 11,
            "T": 10,
            "9": 9,
            "8": 8,
            "7": 7,
            "6": 6,
            "5": 5,
            "4": 4,
            "3": 3,
            "2": 2,
        }

        values = sorted([rank_values.get(r, 0) for r in ranks])
        gaps = [values[i + 1] - values[i] for i in range(len(values) - 1)]

        # Wet if connected (small gaps) or two-tone
        if max(suit_counts.values()) == 2 or max(gaps) <= 2:
            return BoardTexture.SEMI_WET

        return BoardTexture.DRY

    def _identify_leaks(self) -> list[dict]:
        """Identify leaks based on stats vs GTO benchmarks."""
        leaks = []

        # C-bet IP
        if self.stats.cbet_opportunities_ip >= 10:
            cbet_ip_pct = self.stats.cbet_made_ip / self.stats.cbet_opportunities_ip * 100
            low, high = self.GTO_BENCHMARKS["cbet_ip_flop"]

            if cbet_ip_pct < low:
                leaks.append(
                    {
                        "type": "cbet_ip_low",
                        "description": "IP C-bet 頻率過低",
                        "your_value": f"{cbet_ip_pct:.0f}%",
                        "gto_range": f"{low}-{high}%",
                        "sample": self.stats.cbet_opportunities_ip,
                        "suggestion": "在有利位置時更積極地 c-bet",
                    }
                )
            elif cbet_ip_pct > high:
                leaks.append(
                    {
                        "type": "cbet_ip_high",
                        "description": "IP C-bet 頻率過高",
                        "your_value": f"{cbet_ip_pct:.0f}%",
                        "gto_range": f"{low}-{high}%",
                        "sample": self.stats.cbet_opportunities_ip,
                        "suggestion": "考慮在更多牌面上 check back",
                    }
                )

        # C-bet OOP
        if self.stats.cbet_opportunities_oop >= 10:
            cbet_oop_pct = self.stats.cbet_made_oop / self.stats.cbet_opportunities_oop * 100
            low, high = self.GTO_BENCHMARKS["cbet_oop_flop"]

            if cbet_oop_pct < low:
                leaks.append(
                    {
                        "type": "cbet_oop_low",
                        "description": "OOP C-bet 頻率過低",
                        "your_value": f"{cbet_oop_pct:.0f}%",
                        "gto_range": f"{low}-{high}%",
                        "sample": self.stats.cbet_opportunities_oop,
                        "suggestion": "在不利位置時也需要適當 c-bet",
                    }
                )
            elif cbet_oop_pct > high:
                leaks.append(
                    {
                        "type": "cbet_oop_high",
                        "description": "OOP C-bet 頻率過高",
                        "your_value": f"{cbet_oop_pct:.0f}%",
                        "gto_range": f"{low}-{high}%",
                        "sample": self.stats.cbet_opportunities_oop,
                        "suggestion": "OOP 應該 check 更多，保護 check range",
                    }
                )

        # Fold to c-bet
        if self.stats.fold_to_cbet_opportunities >= 10:
            fold_pct = self.stats.fold_to_cbet_count / self.stats.fold_to_cbet_opportunities * 100
            low, high = self.GTO_BENCHMARKS["fold_to_cbet_flop"]

            if fold_pct < low:
                leaks.append(
                    {
                        "type": "fold_to_cbet_low",
                        "description": "Fold to C-bet 頻率過低",
                        "your_value": f"{fold_pct:.0f}%",
                        "gto_range": f"{low}-{high}%",
                        "sample": self.stats.fold_to_cbet_opportunities,
                        "suggestion": "可能在 call 太寬，考慮更多 fold 弱牌",
                    }
                )
            elif fold_pct > high:
                leaks.append(
                    {
                        "type": "fold_to_cbet_high",
                        "description": "Fold to C-bet 頻率過高",
                        "your_value": f"{fold_pct:.0f}%",
                        "gto_range": f"{low}-{high}%",
                        "sample": self.stats.fold_to_cbet_opportunities,
                        "suggestion": "被剝削了！需要更多防守，考慮浮動或加注",
                    }
                )

        # Check-raise
        if self.stats.check_raise_opportunities >= 15:
            cr_pct = self.stats.check_raise_count / self.stats.check_raise_opportunities * 100
            low, high = self.GTO_BENCHMARKS["check_raise_flop"]

            if cr_pct < low:
                leaks.append(
                    {
                        "type": "check_raise_low",
                        "description": "Check-raise 頻率過低",
                        "your_value": f"{cr_pct:.0f}%",
                        "gto_range": f"{low}-{high}%",
                        "sample": self.stats.check_raise_opportunities,
                        "suggestion": "需要更多 check-raise 來平衡你的 check range",
                    }
                )

        return leaks


def format_postflop_report(report: PostflopReport) -> str:
    """Format postflop report for display."""
    lines = []

    lines.append("=" * 60)
    lines.append("翻後分析報告 (啟發式)")
    lines.append("=" * 60)
    lines.append("")

    lines.append(f"總手數: {report.total_hands}")
    lines.append(f"進入 Flop: {report.hands_with_flop}")
    lines.append(f"進入 Turn: {report.hands_with_turn}")
    lines.append(f"進入 River: {report.hands_with_river}")
    lines.append("")

    stats = report.stats

    # C-bet stats
    lines.append("-" * 40)
    lines.append("C-bet 統計")
    lines.append("-" * 40)

    if stats.cbet_opportunities_ip > 0:
        cbet_ip = stats.cbet_made_ip / stats.cbet_opportunities_ip * 100
        lines.append(
            f"IP C-bet: {stats.cbet_made_ip}/{stats.cbet_opportunities_ip} ({cbet_ip:.0f}%)"
        )

    if stats.cbet_opportunities_oop > 0:
        cbet_oop = stats.cbet_made_oop / stats.cbet_opportunities_oop * 100
        lines.append(
            f"OOP C-bet: {stats.cbet_made_oop}/{stats.cbet_opportunities_oop} ({cbet_oop:.0f}%)"
        )

    lines.append("")

    # Defense stats
    lines.append("-" * 40)
    lines.append("防守統計")
    lines.append("-" * 40)

    if stats.fold_to_cbet_opportunities > 0:
        fold_pct = stats.fold_to_cbet_count / stats.fold_to_cbet_opportunities * 100
        lines.append(
            f"Fold to C-bet: {stats.fold_to_cbet_count}/{stats.fold_to_cbet_opportunities} ({fold_pct:.0f}%)"
        )

    if stats.check_raise_opportunities > 0:
        cr_pct = stats.check_raise_count / stats.check_raise_opportunities * 100
        lines.append(
            f"Check-raise: {stats.check_raise_count}/{stats.check_raise_opportunities} ({cr_pct:.0f}%)"
        )

    lines.append("")

    # Street breakdown
    lines.append("-" * 40)
    lines.append("街道動作分佈")
    lines.append("-" * 40)

    flop_total = (
        stats.flop_bets
        + stats.flop_checks
        + stats.flop_calls
        + stats.flop_folds
        + stats.flop_raises
    )
    if flop_total > 0:
        lines.append(
            f"Flop: Bet {stats.flop_bets} | Check {stats.flop_checks} | Call {stats.flop_calls} | Fold {stats.flop_folds} | Raise {stats.flop_raises}"
        )

    turn_total = (
        stats.turn_bets
        + stats.turn_checks
        + stats.turn_calls
        + stats.turn_folds
        + stats.turn_raises
    )
    if turn_total > 0:
        lines.append(
            f"Turn: Bet {stats.turn_bets} | Check {stats.turn_checks} | Call {stats.turn_calls} | Fold {stats.turn_folds} | Raise {stats.turn_raises}"
        )

    river_total = (
        stats.river_bets
        + stats.river_checks
        + stats.river_calls
        + stats.river_folds
        + stats.river_raises
    )
    if river_total > 0:
        lines.append(
            f"River: Bet {stats.river_bets} | Check {stats.river_checks} | Call {stats.river_calls} | Fold {stats.river_folds} | Raise {stats.river_raises}"
        )

    # Leaks
    if report.leaks:
        lines.append("")
        lines.append("-" * 40)
        lines.append("識別出的漏洞")
        lines.append("-" * 40)

        for leak in report.leaks:
            lines.append(f"\n🔴 {leak['description']}")
            lines.append(f"   你的數值: {leak['your_value']}")
            lines.append(f"   GTO 參考: {leak['gto_range']}")
            lines.append(f"   樣本數: {leak['sample']}")
            lines.append(f"   建議: {leak['suggestion']}")

    return "\n".join(lines)
