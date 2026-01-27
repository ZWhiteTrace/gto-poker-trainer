"""
Hand History Analyzer
Combines parsing and AI analysis for comprehensive hand review.
"""
from dataclasses import dataclass, field
from typing import List, Optional, Dict
from enum import Enum

from .hand_parser import GGPokerParser, HandHistory, format_hand_summary, ActionType, Action
from .ai_client import create_ai_client, BaseAIClient


class Grade(Enum):
    A = "A"  # Perfect
    B = "B"  # Good
    C = "C"  # Acceptable
    D = "D"  # Needs improvement
    F = "F"  # Serious mistake


@dataclass
class DecisionPoint:
    """A decision point in the hand where hero had to act."""
    street: str
    action_taken: str
    amount: Optional[float]
    pot_before: float
    stack_before: float
    position: str
    hole_cards: str
    board: Optional[str]
    villains_in_hand: int
    context: str  # Description of the situation


@dataclass
class HandAnalysis:
    """Analysis result for a single hand."""
    hand: HandHistory
    decision_points: List[DecisionPoint]
    ai_analysis: Optional[str] = None
    grade: Optional[Grade] = None
    key_mistakes: List[str] = field(default_factory=list)
    suggestions: List[str] = field(default_factory=list)


class HandAnalyzer:
    """Analyzes poker hands with AI assistance."""

    def __init__(self, ai_client: Optional[BaseAIClient] = None):
        self.parser = GGPokerParser()
        self.ai_client = ai_client

    def set_ai_client(self, client: BaseAIClient):
        """Set the AI client for analysis."""
        self.ai_client = client

    def parse_file(self, filepath: str) -> List[HandHistory]:
        """Parse a hand history file."""
        return self.parser.parse_file(filepath)

    def parse_files(self, filepaths: List[str]) -> List[HandHistory]:
        """Parse multiple hand history files."""
        all_hands = []
        for fp in filepaths:
            try:
                hands = self.parser.parse_file(fp)
                all_hands.extend(hands)
            except Exception as e:
                print(f"Error parsing {fp}: {e}")
        return all_hands

    def extract_decision_points(self, hand: HandHistory) -> List[DecisionPoint]:
        """Extract all decision points where hero acted."""
        if not hand.hero:
            return []

        decision_points = []
        hero_name = hand.hero.name
        pot = hand.stakes[0] + hand.stakes[1]  # Start with blinds
        hero_stack = hand.hero.stack

        # Track pot and find hero actions
        def process_street(actions, street_name, board=None):
            nonlocal pot, hero_stack
            villains = len([p for p in hand.players if p.name != hero_name])

            for action in actions:
                if action.action_type in [ActionType.POST_SB, ActionType.POST_BB]:
                    if action.amount:
                        pot += action.amount
                        if action.player == hero_name:
                            hero_stack -= action.amount
                    continue

                if action.player == hero_name:
                    # This is a hero decision point
                    context = self._describe_action_context(hand, actions, action)
                    dp = DecisionPoint(
                        street=street_name,
                        action_taken=action.action_type.value,
                        amount=action.amount or action.to_amount,
                        pot_before=pot,
                        stack_before=hero_stack,
                        position=hand.hero.position or "Unknown",
                        hole_cards=hand.hero.hole_cards or "??",
                        board=board,
                        villains_in_hand=villains,
                        context=context,
                    )
                    decision_points.append(dp)

                # Update pot and stack tracking
                if action.amount:
                    pot += action.amount
                    if action.player == hero_name:
                        hero_stack -= action.amount
                if action.to_amount:
                    # For raises, the to_amount is the total bet
                    pass
                if action.action_type == ActionType.FOLD:
                    villains -= 1

        # Process each street
        process_street(hand.preflop_actions, "preflop", None)
        if hand.flop:
            process_street(hand.flop_actions, "flop", hand.flop)
        if hand.turn:
            process_street(hand.turn_actions, "turn", f"{hand.flop} {hand.turn}")
        if hand.river:
            process_street(hand.river_actions, "river", f"{hand.flop} {hand.turn} {hand.river}")

        return decision_points

    def _describe_action_context(self, hand: HandHistory, actions, hero_action) -> str:
        """Describe the context leading up to hero's action."""
        context_parts = []

        # Find actions before hero's action
        for action in actions:
            if action is hero_action:
                break
            if action.action_type == ActionType.FOLD:
                continue
            if action.action_type in [ActionType.POST_SB, ActionType.POST_BB]:
                continue

            player = action.player
            # Find player's position
            player_pos = "Unknown"
            for p in hand.players:
                if p.name == player:
                    player_pos = p.position or player
                    break

            if action.action_type == ActionType.RAISE:
                context_parts.append(f"{player_pos} raises to ${action.to_amount:.2f}")
            elif action.action_type == ActionType.BET:
                context_parts.append(f"{player_pos} bets ${action.amount:.2f}")
            elif action.action_type == ActionType.CALL:
                context_parts.append(f"{player_pos} calls ${action.amount:.2f}")
            elif action.action_type == ActionType.CHECK:
                context_parts.append(f"{player_pos} checks")

        if not context_parts:
            return "First to act"

        return " → ".join(context_parts)

    def analyze_hand(self, hand: HandHistory, use_ai: bool = True) -> HandAnalysis:
        """Analyze a single hand."""
        decision_points = self.extract_decision_points(hand)

        analysis = HandAnalysis(
            hand=hand,
            decision_points=decision_points,
        )

        if use_ai and self.ai_client:
            # Generate hand description for AI
            hand_desc = format_hand_summary(hand)

            # Add decision points info
            if decision_points:
                hand_desc += "\n\n--- Hero 決策點 ---\n"
                for i, dp in enumerate(decision_points, 1):
                    hand_desc += f"\n{i}. {dp.street.upper()}: {dp.hole_cards}"
                    if dp.board:
                        hand_desc += f" | Board: [{dp.board}]"
                    hand_desc += f"\n   Context: {dp.context}"
                    hand_desc += f"\n   Action: {dp.action_taken}"
                    if dp.amount:
                        hand_desc += f" ${dp.amount:.2f}"
                    hand_desc += f"\n   Pot: ${dp.pot_before:.2f} | Stack: ${dp.stack_before:.2f}"

            try:
                ai_response = self.ai_client.analyze_hand(hand_desc)
                analysis.ai_analysis = ai_response

                # Try to extract grade from AI response
                for grade in Grade:
                    if f"評分: {grade.value}" in ai_response or f"Grade: {grade.value}" in ai_response:
                        analysis.grade = grade
                        break

            except Exception as e:
                analysis.ai_analysis = f"AI 分析失敗: {str(e)}"

        return analysis

    def analyze_session(
        self,
        hands: List[HandHistory],
        use_ai: bool = True,
        limit: int = 10,
    ) -> Dict:
        """Analyze a session of hands."""
        results = {
            "total_hands": len(hands),
            "analyzed_hands": [],
            "summary": {
                "total_profit": 0,
                "hands_won": 0,
                "hands_lost": 0,
                "biggest_pot_won": 0,
                "biggest_pot_lost": 0,
                "positions": {},
            }
        }

        # Filter to hands with hero
        hero_hands = [h for h in hands if h.hero]

        # Limit for AI analysis (to save API calls)
        hands_to_analyze = hero_hands[:limit] if use_ai else hero_hands

        for hand in hands_to_analyze:
            analysis = self.analyze_hand(hand, use_ai=use_ai)
            results["analyzed_hands"].append(analysis)

            # Update summary
            hero_won = hand.hero and hand.hero.name in hand.winners
            if hero_won:
                results["summary"]["hands_won"] += 1
                won_amount = hand.winners.get(hand.hero.name, 0)
                if won_amount > results["summary"]["biggest_pot_won"]:
                    results["summary"]["biggest_pot_won"] = won_amount
            else:
                results["summary"]["hands_lost"] += 1

            # Position tracking
            if hand.hero and hand.hero.position:
                pos = hand.hero.position
                if pos not in results["summary"]["positions"]:
                    results["summary"]["positions"][pos] = {"count": 0, "won": 0}
                results["summary"]["positions"][pos]["count"] += 1
                if hero_won:
                    results["summary"]["positions"][pos]["won"] += 1

        return results


@dataclass
class HandResult:
    """Result summary for a single hand."""
    hand: HandHistory
    profit: float  # Positive = won, negative = lost
    profit_bb: float  # Profit in big blinds
    position: str
    hole_cards: str
    went_to_showdown: bool
    pot_size: float

    # Preflop stats
    vpip: bool  # Did hero voluntarily put money in pot?
    pfr: bool   # Did hero raise preflop?
    three_bet: bool  # Did hero 3-bet?
    faced_raise: bool  # Did hero face a raise preflop? (any raise)
    faced_open: bool  # Did hero face exactly 1 raise (an open)? For 3-bet % calculation
    ats: bool  # Attempt To Steal (raised from CO/BTN/SB when folded to)
    fold_to_3bet: bool  # Folded to 3-bet after opening
    was_preflop_aggressor: bool  # Was hero the last raiser preflop?

    # Postflop tracking
    saw_flop: bool
    saw_turn: bool
    saw_river: bool

    # C-Bet stats (only valid if was_preflop_aggressor and saw that street)
    cbet_flop: Optional[bool] = None  # Did hero c-bet flop?
    cbet_turn: Optional[bool] = None  # Did hero c-bet turn?
    cbet_river: Optional[bool] = None  # Did hero c-bet river?

    # Fold to C-Bet stats (only valid if faced c-bet)
    faced_cbet_flop: bool = False
    fold_to_cbet_flop: Optional[bool] = None
    call_cbet_flop: Optional[bool] = None  # CCB: Called (not raised) the c-bet
    faced_cbet_turn: bool = False
    fold_to_cbet_turn: Optional[bool] = None
    call_cbet_turn: Optional[bool] = None  # CCB: Called (not raised) the c-bet

    # Check-raise stats
    check_raise_flop: bool = False
    check_raise_turn: bool = False
    check_raise_river: bool = False

    # Won when saw flop
    won_at_showdown: bool = False


@dataclass
class PositionStats:
    """Statistics for a position."""
    position: str
    hands_played: int
    hands_won: int
    total_profit: float
    vpip_hands: int  # Voluntarily put money in pot
    avg_pot: float


@dataclass
class PlayerStats:
    """Core poker statistics for a player - Preflop focused."""
    total_hands: int
    vpip: float  # Voluntarily Put money In Pot % (standard: 22-28%)
    pfr: float   # Pre-Flop Raise % (standard: 18-24%)
    three_bet: float  # 3-Bet % (standard: 7-10%)
    fold_to_3bet: float  # Fold to 3-Bet % (standard: 55-65%)
    ats: float  # Attempt To Steal % (standard: 25-35%)
    wtsd: float  # Went To ShowDown % (standard: 25-30%)
    wsd: float   # Won at ShowDown % (standard: 50-55%)
    wwsf: float  # Won When Saw Flop % (standard: 45-52%)
    aggression_factor: float  # (Bet+Raise) / Call


@dataclass
class PostflopStats:
    """
    Postflop statistics by street.

    核心概念（GTO 標準）：
    - 翻牌圈：範圍 + 權益（可以用空氣偷鍋）
    - 轉牌圈：真實牌力 + 路線承諾（錢開始燒）

    FCB + CCB + RCB = 100%（對 C-Bet 的回應）
    """
    # Flop stats (翻牌圈)
    flop_cbet: float  # CB: C-Bet % on flop (標準: 55-70%)
    fold_to_flop_cbet: float  # FCB: Fold to flop C-Bet % (標準: 45-60%)
    flop_call_cbet: float  # CCB: Call vs C-Bet % (標準: 25-40%)
    flop_check_raise: float  # RCB: Check-raise % on flop (標準: 7-12%)
    flop_af: float  # Aggression factor on flop

    # Turn stats (轉牌圈 - 標準更嚴格)
    turn_cbet: float  # CB: C-Bet % on turn (標準: 40-55%)
    fold_to_turn_cbet: float  # FCB: Fold to turn C-Bet % (標準: 55-70%)
    turn_call_cbet: float  # CCB: Call vs C-Bet % (標準: 20-30%)
    turn_check_raise: float  # RCB: Check-raise % on turn (標準: 3-8%)
    turn_af: float  # Aggression factor on turn

    # River stats (河牌圈)
    river_cbet: float  # CB: C-Bet % on river (標準: 45-60%)
    river_check_raise: float  # RCB: Check-raise % on river (標準: 4-7%)
    river_af: float  # Aggression factor on river

    # Sample sizes for reliability
    flop_cbet_opportunities: int
    turn_cbet_opportunities: int
    river_cbet_opportunities: int
    faced_flop_cbet_count: int
    faced_turn_cbet_count: int
    flop_check_raise_opportunities: int = 0
    turn_check_raise_opportunities: int = 0
    river_check_raise_opportunities: int = 0


@dataclass
class BatchAnalysisResult:
    """Result of batch analysis."""
    total_hands: int
    total_profit: float
    hands_won: int  # Total hands with profit > 0
    hands_lost: int  # Total hands with profit < 0
    hands_breakeven: int  # Hands with profit == 0 (folded preflop not in blinds)
    bb_per_100: float  # BB/100 win rate
    player_stats: Optional[PlayerStats]  # VPIP, PFR, 3-Bet%, etc.
    postflop_stats: Optional[PostflopStats]  # C-Bet, Fold to C-Bet, Check-Raise by street
    biggest_winners: List[HandResult]
    biggest_losers: List[HandResult]
    position_stats: Dict[str, PositionStats]
    ai_leak_report: Optional[str] = None
    deep_hand_analysis: Optional[str] = None  # Detailed AI analysis of biggest losing hands
    # AI Transparency - prompts used
    leak_report_prompt: Optional[str] = None  # Prompt used for leak report
    deep_analysis_prompt: Optional[str] = None  # Prompt used for deep analysis


class BatchAnalyzer:
    """Batch analyzer for multiple hands."""

    def __init__(self, ai_client: Optional[BaseAIClient] = None):
        self.ai_client = ai_client

    def set_ai_client(self, client: BaseAIClient):
        """Set the AI client for analysis."""
        self.ai_client = client

    def calculate_hand_result(self, hand: HandHistory) -> Optional[HandResult]:
        """Calculate the result (profit/loss) for a single hand with comprehensive stats."""
        if not hand.hero:
            return None

        hero_name = hand.hero.name
        hero_position = hand.hero.position or "Unknown"
        hero_cards = hand.hero.hole_cards or "??"
        bb_size = hand.stakes[1]  # Big blind size

        # ============================================
        # PREFLOP STATS
        # ============================================
        vpip = False  # Voluntarily put money in pot
        pfr = False   # Preflop raise
        three_bet = False
        faced_raise = False
        faced_open = False  # Faced exactly 1 raise (an open) - for 3-bet % calculation
        ats = False   # Attempt To Steal
        fold_to_3bet = False
        was_preflop_aggressor = False
        hero_opened = False  # Did hero make the first raise?
        raise_count = 0
        raises_before_hero = 0  # Track raises BEFORE hero acts
        last_raiser = None
        hero_folded_preflop = False

        # Track if it was folded to hero (for ATS calculation)
        folded_to_hero = True
        hero_acted = False

        for action in hand.preflop_actions:
            # Track raises BEFORE hero acts (for faced_open calculation)
            if action.action_type == ActionType.RAISE and not hero_acted:
                raises_before_hero += 1

            # Track total raise count (for 3-bet identification)
            if action.action_type == ActionType.RAISE:
                raise_count += 1
                last_raiser = action.player

            # Track if someone called/raised before hero (not folded to hero)
            if action.player != hero_name and not hero_acted:
                if action.action_type in [ActionType.CALL, ActionType.RAISE, ActionType.BET]:
                    folded_to_hero = False

            if action.player == hero_name:
                hero_acted = True

                # VPIP: any voluntary action (call, raise, bet) - NOT posting blinds
                if action.action_type in [ActionType.CALL, ActionType.RAISE, ActionType.BET]:
                    vpip = True

                # PFR: hero raised preflop
                if action.action_type == ActionType.RAISE:
                    pfr = True
                    # First raise = open
                    if raise_count == 1:
                        hero_opened = True
                    # 3-bet: hero raised after exactly one prior raise (the open)
                    # raise_count includes hero's raise, so if raise_count == 2, hero is 3-betting
                    if raise_count == 2:
                        three_bet = True

                # ATS: Attempt To Steal - raised from CO/BTN/SB when folded to
                if action.action_type == ActionType.RAISE and hero_position in ["CO", "BTN", "SB"]:
                    if folded_to_hero:
                        ats = True

                # Hero folded
                if action.action_type == ActionType.FOLD:
                    hero_folded_preflop = True

            # Check if hero faced a raise before their action (any raise)
            if action.action_type == ActionType.RAISE and action.player != hero_name:
                faced_raise = True

        # faced_open: hero faced exactly 1 raise (an open) - opportunity to 3-bet
        # This is for 3-bet % denominator
        faced_open = (raises_before_hero == 1)

        # Fold to 3-bet: hero opened, faced 3-bet, and folded
        if hero_opened and raise_count >= 2 and hero_folded_preflop:
            fold_to_3bet = True

        # Was preflop aggressor: hero was the last raiser
        was_preflop_aggressor = (last_raiser == hero_name)

        # ============================================
        # POSTFLOP TRACKING
        # ============================================
        saw_flop = hand.flop is not None and not hero_folded_preflop
        saw_turn = hand.turn is not None and saw_flop
        saw_river = hand.river is not None and saw_turn

        # Check if hero folded on each street
        for action in hand.flop_actions:
            if action.player == hero_name and action.action_type == ActionType.FOLD:
                saw_turn = False
                saw_river = False
                break

        for action in hand.turn_actions:
            if action.player == hero_name and action.action_type == ActionType.FOLD:
                saw_river = False
                break

        # ============================================
        # C-BET STATS (only if hero was preflop aggressor)
        # ============================================
        cbet_flop = None
        cbet_turn = None
        cbet_river = None

        if was_preflop_aggressor and saw_flop:
            cbet_flop = self._check_cbet(hand.flop_actions, hero_name)

        if was_preflop_aggressor and saw_turn and cbet_flop:
            cbet_turn = self._check_cbet(hand.turn_actions, hero_name)

        if was_preflop_aggressor and saw_river and cbet_turn:
            cbet_river = self._check_cbet(hand.river_actions, hero_name)

        # ============================================
        # FOLD TO C-BET STATS (only if hero faced c-bet)
        # ============================================
        faced_cbet_flop = False
        fold_to_cbet_flop = None
        call_cbet_flop = None
        faced_cbet_turn = False
        fold_to_cbet_turn = None
        call_cbet_turn = None

        # Find preflop aggressor (if not hero)
        pf_aggressor = last_raiser if last_raiser != hero_name else None

        if saw_flop and pf_aggressor:
            faced_cbet_flop, fold_to_cbet_flop, call_cbet_flop = self._check_faced_cbet(
                hand.flop_actions, hero_name, pf_aggressor
            )

        if saw_turn and pf_aggressor:
            faced_cbet_turn, fold_to_cbet_turn, call_cbet_turn = self._check_faced_cbet(
                hand.turn_actions, hero_name, pf_aggressor
            )

        # ============================================
        # CHECK-RAISE STATS
        # ============================================
        check_raise_flop = self._check_check_raise(hand.flop_actions, hero_name) if saw_flop else False
        check_raise_turn = self._check_check_raise(hand.turn_actions, hero_name) if saw_turn else False
        check_raise_river = self._check_check_raise(hand.river_actions, hero_name) if saw_river else False

        # ============================================
        # PROFIT CALCULATION
        # ============================================
        total_invested = 0

        for street_actions in [hand.preflop_actions, hand.flop_actions, hand.turn_actions, hand.river_actions]:
            street_invested = 0
            for action in street_actions:
                if action.player == hero_name:
                    if action.to_amount is not None:
                        # Raises: to_amount is the TOTAL bet for this street
                        street_invested = action.to_amount
                    elif action.amount is not None:
                        # Calls, bets, blinds: add to street investment
                        street_invested += action.amount
            total_invested += street_invested

        # Calculate winnings
        won = hand.winners.get(hero_name, 0)

        # Profit = won - invested
        if won > 0:
            profit = won - total_invested
        else:
            profit = -total_invested

        # Profit in BB
        profit_bb = profit / bb_size if bb_size > 0 else 0

        # Check if went to showdown and won
        went_to_showdown = hand.river is not None and saw_river and len(hand.river_actions) > 0
        won_at_showdown = went_to_showdown and won > 0

        return HandResult(
            hand=hand,
            profit=profit,
            profit_bb=profit_bb,
            position=hero_position,
            hole_cards=hero_cards,
            went_to_showdown=went_to_showdown,
            pot_size=hand.pot,
            # Preflop stats
            vpip=vpip,
            pfr=pfr,
            three_bet=three_bet,
            faced_raise=faced_raise,
            faced_open=faced_open,
            ats=ats,
            fold_to_3bet=fold_to_3bet,
            was_preflop_aggressor=was_preflop_aggressor,
            # Postflop tracking
            saw_flop=saw_flop,
            saw_turn=saw_turn,
            saw_river=saw_river,
            # C-bet stats
            cbet_flop=cbet_flop,
            cbet_turn=cbet_turn,
            cbet_river=cbet_river,
            # Fold to C-bet stats
            faced_cbet_flop=faced_cbet_flop,
            fold_to_cbet_flop=fold_to_cbet_flop,
            call_cbet_flop=call_cbet_flop,
            faced_cbet_turn=faced_cbet_turn,
            fold_to_cbet_turn=fold_to_cbet_turn,
            call_cbet_turn=call_cbet_turn,
            # Check-raise stats
            check_raise_flop=check_raise_flop,
            check_raise_turn=check_raise_turn,
            check_raise_river=check_raise_river,
            # Result
            won_at_showdown=won_at_showdown,
        )

    def _check_cbet(self, actions: List[Action], hero_name: str) -> bool:
        """Check if hero continuation bet (bet first when was aggressor)."""
        for action in actions:
            if action.player == hero_name:
                # Hero acted first - did they bet?
                return action.action_type == ActionType.BET
            elif action.action_type in [ActionType.BET, ActionType.RAISE]:
                # Someone else bet first - hero didn't c-bet
                return False
        return False

    def _check_faced_cbet(
        self, actions: List[Action], hero_name: str, aggressor: str
    ) -> tuple:
        """
        Check if hero faced a c-bet and how they responded.

        Returns:
            (faced_cbet: bool, folded_to_cbet: Optional[bool], called_cbet: Optional[bool])
        """
        aggressor_bet = False

        for action in actions:
            # Check if aggressor bet
            if action.player == aggressor and action.action_type == ActionType.BET:
                aggressor_bet = True

            # After aggressor bet, check hero's response
            if aggressor_bet and action.player == hero_name:
                if action.action_type == ActionType.FOLD:
                    return True, True, False  # faced, folded, didn't call
                elif action.action_type == ActionType.CALL:
                    return True, False, True  # faced, didn't fold, called
                elif action.action_type == ActionType.RAISE:
                    return True, False, False  # faced, didn't fold, raised (not call)

        return aggressor_bet, None, None

    def _check_check_raise(self, actions: List[Action], hero_name: str) -> bool:
        """Check if hero check-raised on this street."""
        hero_checked = False

        for action in actions:
            if action.player == hero_name:
                if action.action_type == ActionType.CHECK:
                    hero_checked = True
                elif action.action_type == ActionType.RAISE and hero_checked:
                    return True
                elif action.action_type in [ActionType.BET, ActionType.FOLD, ActionType.CALL]:
                    # Hero did something else after checking
                    hero_checked = False

        return False

    def analyze_batch(
        self,
        hands: List[HandHistory],
        top_n: int = 10,
        generate_ai_report: bool = True,
        deep_analysis: bool = False,
        deep_analysis_count: int = 3,
    ) -> BatchAnalysisResult:
        """
        Analyze a batch of hands.

        Args:
            hands: List of hand histories
            top_n: Number of top winners/losers to return
            generate_ai_report: Whether to generate AI leak report
            deep_analysis: Whether to do deep analysis on biggest losers
            deep_analysis_count: Number of hands for deep analysis (default 3)

        Returns:
            BatchAnalysisResult with statistics and AI analysis
        """
        # Filter to hero hands and calculate results
        results = []
        for hand in hands:
            result = self.calculate_hand_result(hand)
            if result:
                results.append(result)

        if not results:
            return BatchAnalysisResult(
                total_hands=0,
                total_profit=0,
                hands_won=0,
                hands_lost=0,
                hands_breakeven=0,
                bb_per_100=0,
                player_stats=None,
                postflop_stats=None,
                biggest_winners=[],
                biggest_losers=[],
                position_stats={},
            )

        # Sort by profit
        sorted_by_profit = sorted(results, key=lambda r: r.profit)

        # Biggest losers (most negative first)
        biggest_losers = sorted_by_profit[:top_n]

        # Biggest winners (most positive first)
        biggest_winners = sorted(results, key=lambda r: r.profit, reverse=True)[:top_n]

        # Calculate position stats
        position_stats = self._calculate_position_stats(results)

        # Calculate player stats (VPIP, PFR, 3-Bet%, etc.)
        player_stats = self._calculate_player_stats(results)

        # Calculate postflop stats (C-Bet, Fold to C-Bet, Check-Raise by street)
        postflop_stats = self._calculate_postflop_stats(results)

        # Total profit and win/loss counts
        total_profit = sum(r.profit for r in results)
        total_profit_bb = sum(r.profit_bb for r in results)
        hands_won = sum(1 for r in results if r.profit > 0)
        hands_lost = sum(1 for r in results if r.profit < 0)
        hands_breakeven = sum(1 for r in results if r.profit == 0)

        # BB/100 win rate
        bb_per_100 = (total_profit_bb / len(results)) * 100 if results else 0

        # Generate AI leak report with improved prompt
        ai_report = None
        leak_report_prompt = None
        if generate_ai_report and self.ai_client:
            ai_report, leak_report_prompt = self._generate_leak_report(results, position_stats, biggest_losers, player_stats, postflop_stats)

        # Generate deep hand analysis for biggest losers
        deep_analysis_report = None
        deep_analysis_prompt = None
        if deep_analysis and self.ai_client:
            deep_analysis_report, deep_analysis_prompt = self._generate_deep_hand_analysis(
                biggest_losers[:deep_analysis_count]
            )

        return BatchAnalysisResult(
            total_hands=len(results),
            total_profit=total_profit,
            hands_won=hands_won,
            hands_lost=hands_lost,
            hands_breakeven=hands_breakeven,
            bb_per_100=bb_per_100,
            player_stats=player_stats,
            postflop_stats=postflop_stats,
            biggest_winners=biggest_winners,
            biggest_losers=biggest_losers,
            position_stats=position_stats,
            ai_leak_report=ai_report,
            deep_hand_analysis=deep_analysis_report,
            leak_report_prompt=leak_report_prompt,
            deep_analysis_prompt=deep_analysis_prompt,
        )

    def _calculate_position_stats(self, results: List[HandResult]) -> Dict[str, PositionStats]:
        """Calculate statistics by position."""
        stats = {}

        for r in results:
            pos = r.position
            if pos not in stats:
                stats[pos] = {
                    "hands_played": 0,
                    "hands_won": 0,
                    "total_profit": 0,
                    "vpip_hands": 0,
                    "total_pot": 0,
                }

            stats[pos]["hands_played"] += 1
            stats[pos]["total_profit"] += r.profit
            stats[pos]["total_pot"] += r.pot_size

            if r.profit > 0:
                stats[pos]["hands_won"] += 1

            # Use the calculated VPIP from HandResult
            if r.vpip:
                stats[pos]["vpip_hands"] += 1

        # Convert to PositionStats objects
        result = {}
        for pos, s in stats.items():
            result[pos] = PositionStats(
                position=pos,
                hands_played=s["hands_played"],
                hands_won=s["hands_won"],
                total_profit=s["total_profit"],
                vpip_hands=s["vpip_hands"],
                avg_pot=s["total_pot"] / s["hands_played"] if s["hands_played"] > 0 else 0,
            )

        return result

    def _calculate_player_stats(self, results: List[HandResult]) -> PlayerStats:
        """Calculate overall player statistics (VPIP, PFR, 3-Bet%, etc.)."""
        total = len(results)
        if total == 0:
            return PlayerStats(
                total_hands=0, vpip=0, pfr=0, three_bet=0, fold_to_3bet=0,
                ats=0, wtsd=0, wsd=0, wwsf=0, aggression_factor=0
            )

        # VPIP: Voluntarily Put money In Pot
        vpip_count = sum(1 for r in results if r.vpip)
        vpip_pct = (vpip_count / total) * 100

        # PFR: Pre-Flop Raise
        pfr_count = sum(1 for r in results if r.pfr)
        pfr_pct = (pfr_count / total) * 100

        # 3-Bet %: 3-bet when facing an open (exactly 1 raise before hero acts)
        # Correct formula: 3-bet count / times hero faced an open (not 3-bet or higher)
        faced_open_count = sum(1 for r in results if getattr(r, 'faced_open', r.faced_raise))
        three_bet_count = sum(1 for r in results if r.three_bet)
        three_bet_pct = (three_bet_count / faced_open_count * 100) if faced_open_count > 0 else 0

        # Fold to 3-Bet %: folded when facing a 3-bet after opening
        opened_hands = [r for r in results if r.pfr and r.faced_raise]  # Opened and faced raise
        fold_to_3bet_count = sum(1 for r in results if getattr(r, 'fold_to_3bet', False))
        fold_to_3bet_pct = (fold_to_3bet_count / len(opened_hands) * 100) if opened_hands else 0

        # ATS: Attempt To Steal (raised from CO/BTN/SB when folded to)
        steal_positions = [r for r in results if r.position in ["CO", "BTN", "SB"]]
        ats_count = sum(1 for r in results if getattr(r, 'ats', False))
        ats_pct = (ats_count / len(steal_positions) * 100) if steal_positions else 0

        # WTSD: Went To ShowDown (of VPIP hands)
        vpip_hands = [r for r in results if r.vpip]
        wtsd_count = sum(1 for r in vpip_hands if r.went_to_showdown)
        wtsd_pct = (wtsd_count / len(vpip_hands) * 100) if vpip_hands else 0

        # WSD: Won at ShowDown
        showdown_hands = [r for r in results if r.went_to_showdown]
        wsd_count = sum(1 for r in showdown_hands if getattr(r, 'won_at_showdown', r.profit > 0))
        wsd_pct = (wsd_count / len(showdown_hands) * 100) if showdown_hands else 0

        # WWSF: Won When Saw Flop (profit > 0 when saw flop)
        saw_flop_hands = [r for r in results if getattr(r, 'saw_flop', False)]
        wwsf_count = sum(1 for r in saw_flop_hands if r.profit > 0)
        wwsf_pct = (wwsf_count / len(saw_flop_hands) * 100) if saw_flop_hands else 0

        # Aggression Factor: Would need action-level data, estimate from PFR for now
        aggression = pfr_pct / (vpip_pct - pfr_pct) if (vpip_pct - pfr_pct) > 0 else 0

        return PlayerStats(
            total_hands=total,
            vpip=vpip_pct,
            pfr=pfr_pct,
            three_bet=three_bet_pct,
            fold_to_3bet=fold_to_3bet_pct,
            ats=ats_pct,
            wtsd=wtsd_pct,
            wsd=wsd_pct,
            wwsf=wwsf_pct,
            aggression_factor=aggression,
        )

    def _calculate_postflop_stats(self, results: List[HandResult]) -> PostflopStats:
        """Calculate postflop statistics by street."""
        # ============================================
        # FLOP STATS
        # ============================================
        # C-Bet on Flop: hero was aggressor and bet flop
        flop_cbet_opportunities = [r for r in results if getattr(r, 'was_preflop_aggressor', False) and getattr(r, 'saw_flop', False)]
        flop_cbet_count = sum(1 for r in flop_cbet_opportunities if getattr(r, 'cbet_flop', False))
        flop_cbet_pct = (flop_cbet_count / len(flop_cbet_opportunities) * 100) if flop_cbet_opportunities else 0

        # Fold to Flop C-Bet (FCB)
        faced_flop_cbet = [r for r in results if getattr(r, 'faced_cbet_flop', False)]
        fold_to_flop_cbet_count = sum(1 for r in faced_flop_cbet if getattr(r, 'fold_to_cbet_flop', False))
        fold_to_flop_cbet_pct = (fold_to_flop_cbet_count / len(faced_flop_cbet) * 100) if faced_flop_cbet else 0

        # Call vs Flop C-Bet (CCB) - NEW
        call_flop_cbet_count = sum(1 for r in faced_flop_cbet if getattr(r, 'call_cbet_flop', False))
        call_flop_cbet_pct = (call_flop_cbet_count / len(faced_flop_cbet) * 100) if faced_flop_cbet else 0

        # Check-Raise on Flop (RCB)
        saw_flop = [r for r in results if getattr(r, 'saw_flop', False)]
        flop_check_raise_count = sum(1 for r in saw_flop if getattr(r, 'check_raise_flop', False))
        flop_check_raise_pct = (flop_check_raise_count / len(saw_flop) * 100) if saw_flop else 0

        # ============================================
        # TURN STATS
        # ============================================
        # C-Bet on Turn (only if c-bet flop)
        turn_cbet_opportunities = [r for r in results if getattr(r, 'was_preflop_aggressor', False) and getattr(r, 'saw_turn', False) and getattr(r, 'cbet_flop', False)]
        turn_cbet_count = sum(1 for r in turn_cbet_opportunities if getattr(r, 'cbet_turn', False))
        turn_cbet_pct = (turn_cbet_count / len(turn_cbet_opportunities) * 100) if turn_cbet_opportunities else 0

        # Fold to Turn C-Bet (FCB)
        faced_turn_cbet = [r for r in results if getattr(r, 'faced_cbet_turn', False)]
        fold_to_turn_cbet_count = sum(1 for r in faced_turn_cbet if getattr(r, 'fold_to_cbet_turn', False))
        fold_to_turn_cbet_pct = (fold_to_turn_cbet_count / len(faced_turn_cbet) * 100) if faced_turn_cbet else 0

        # Call vs Turn C-Bet (CCB) - NEW
        call_turn_cbet_count = sum(1 for r in faced_turn_cbet if getattr(r, 'call_cbet_turn', False))
        call_turn_cbet_pct = (call_turn_cbet_count / len(faced_turn_cbet) * 100) if faced_turn_cbet else 0

        # Check-Raise on Turn (RCB)
        saw_turn = [r for r in results if getattr(r, 'saw_turn', False)]
        turn_check_raise_count = sum(1 for r in saw_turn if getattr(r, 'check_raise_turn', False))
        turn_check_raise_pct = (turn_check_raise_count / len(saw_turn) * 100) if saw_turn else 0

        # ============================================
        # RIVER STATS
        # ============================================
        # C-Bet on River (only if c-bet turn)
        river_cbet_opportunities = [r for r in results if getattr(r, 'was_preflop_aggressor', False) and getattr(r, 'saw_river', False) and getattr(r, 'cbet_turn', False)]
        river_cbet_count = sum(1 for r in river_cbet_opportunities if getattr(r, 'cbet_river', False))
        river_cbet_pct = (river_cbet_count / len(river_cbet_opportunities) * 100) if river_cbet_opportunities else 0

        # Check-Raise on River
        saw_river = [r for r in results if getattr(r, 'saw_river', False)]
        river_check_raise_count = sum(1 for r in saw_river if getattr(r, 'check_raise_river', False))
        river_check_raise_pct = (river_check_raise_count / len(saw_river) * 100) if saw_river else 0

        # Aggression Factor by street (placeholder - would need action counts)
        flop_af = 0  # Would need (bet+raise)/call count on flop
        turn_af = 0  # Would need (bet+raise)/call count on turn
        river_af = 0  # Would need (bet+raise)/call count on river

        return PostflopStats(
            flop_cbet=flop_cbet_pct,
            fold_to_flop_cbet=fold_to_flop_cbet_pct,
            flop_call_cbet=call_flop_cbet_pct,  # CCB
            flop_check_raise=flop_check_raise_pct,  # RCB
            flop_af=flop_af,
            turn_cbet=turn_cbet_pct,
            fold_to_turn_cbet=fold_to_turn_cbet_pct,
            turn_call_cbet=call_turn_cbet_pct,  # CCB
            turn_check_raise=turn_check_raise_pct,  # RCB
            turn_af=turn_af,
            river_cbet=river_cbet_pct,
            river_check_raise=river_check_raise_pct,
            river_af=river_af,
            flop_cbet_opportunities=len(flop_cbet_opportunities),
            turn_cbet_opportunities=len(turn_cbet_opportunities),
            river_cbet_opportunities=len(river_cbet_opportunities),
            faced_flop_cbet_count=len(faced_flop_cbet),
            faced_turn_cbet_count=len(faced_turn_cbet),
            flop_check_raise_opportunities=len(saw_flop),
            turn_check_raise_opportunities=len(saw_turn),
            river_check_raise_opportunities=len(saw_river),
        )

    def _generate_leak_report(
        self,
        results: List[HandResult],
        position_stats: Dict[str, PositionStats],
        biggest_losers: List[HandResult],
        player_stats: Optional[PlayerStats] = None,
        postflop_stats: Optional[PostflopStats] = None,
    ) -> tuple:
        """Generate AI leak report with professional poker coach prompt.

        Returns:
            Tuple of (ai_response, full_prompt) for transparency
        """
        if not self.ai_client:
            return None, None

        # Build summary for AI
        total_hands = len(results)
        total_profit = sum(r.profit for r in results)
        total_profit_bb = sum(r.profit_bb for r in results)
        bb_per_100 = (total_profit_bb / total_hands) * 100 if total_hands > 0 else 0

        # Player stats summary (Preflop)
        preflop_summary = ""
        if player_stats:
            preflop_summary = f"""## 翻前數據 (Preflop)
- VPIP: {player_stats.vpip:.1f}% (標準: 22-28%)
- PFR: {player_stats.pfr:.1f}% (標準: 18-24%)
- 3-Bet: {player_stats.three_bet:.1f}% (標準: 7-10%)
- Fold to 3-Bet: {player_stats.fold_to_3bet:.1f}% (標準: 55-65%)
- ATS (Attempt To Steal): {player_stats.ats:.1f}% (標準: 25-35%)
"""

        # Postflop stats summary
        postflop_summary = ""
        if postflop_stats:
            postflop_summary = f"""## 翻後數據 (Postflop)
### Flop
- C-Bet: {postflop_stats.flop_cbet:.1f}% (標準: 55-70%) [樣本: {postflop_stats.flop_cbet_opportunities}]
- Fold to C-Bet: {postflop_stats.fold_to_flop_cbet:.1f}% (標準: 40-50%) [樣本: {postflop_stats.faced_flop_cbet_count}]
- Check-Raise: {postflop_stats.flop_check_raise:.1f}% (標準: 6-10%)

### Turn
- C-Bet: {postflop_stats.turn_cbet:.1f}% (標準: 50-65%) [樣本: {postflop_stats.turn_cbet_opportunities}]
- Fold to C-Bet: {postflop_stats.fold_to_turn_cbet:.1f}% [樣本: {postflop_stats.faced_turn_cbet_count}]
- Check-Raise: {postflop_stats.turn_check_raise:.1f}%

### River
- C-Bet: {postflop_stats.river_cbet:.1f}% (標準: 45-60%) [樣本: {postflop_stats.river_cbet_opportunities}]
- Check-Raise: {postflop_stats.river_check_raise:.1f}%
"""

        # Result stats summary
        result_summary = ""
        if player_stats:
            result_summary = f"""## 結果數據 (Results)
- WTSD: {player_stats.wtsd:.1f}% (標準: 25-30%)
- W$SD: {player_stats.wsd:.1f}% (標準: 50-55%)
- WWSF: {player_stats.wwsf:.1f}% (標準: 45-52%)
"""

        # Position summary
        pos_summary = []
        for pos in ["UTG", "HJ", "CO", "BTN", "SB", "BB"]:
            if pos in position_stats:
                s = position_stats[pos]
                vpip_rate = (s.vpip_hands / s.hands_played * 100) if s.hands_played > 0 else 0
                pos_summary.append(
                    f"  {pos}: {s.hands_played} 手, VPIP {vpip_rate:.0f}%, 盈虧 ${s.total_profit:.2f}"
                )

        # Biggest losers summary with BB
        loser_summary = []
        for i, r in enumerate(biggest_losers[:5], 1):
            loser_summary.append(
                f"  {i}. {r.position} {r.hole_cards}: -{r.profit_bb:.1f}BB (${abs(r.profit):.2f})"
            )

        # Professional System Prompt based on user's suggestions
        system_prompt = """你是一位撲克現金桌（6-max）策略分析助理，專注於「低級別玩家行為修正」。

你的任務不是模擬 Solver，而是根據有限樣本，找出「最可能造成資金流失的行為模式」。

請遵守以下原則：
1. 不使用「勝率高低」作為策略好壞的判斷依據（小樣本波動大）
2. 所有結論需標註可信度（高 / 中 / 低）
3. 不做確定性診斷，只提出可能原因與建議驗證方向
4. 區分翻前（Preflop）與翻後（Postflop）問題
5. 優先指出「修正後可最快減少虧損」的行為
6. 允許 exploitative 建議（如：對低級別玩家過度棄牌）
7. 樣本量不足（<10）的統計指標標註 [樣本不足]"""

        prompt = f"""請分析這位玩家的撲克數據。

## 樣本概覽
- 總手數: {total_hands} (注意：小樣本，結論需謹慎)
- 總盈虧: ${total_profit:.2f} ({bb_per_100:+.1f} BB/100)

{preflop_summary}
{postflop_summary}
{result_summary}
## 位置統計
{chr(10).join(pos_summary)}

## 虧損最大的 5 手牌
{chr(10).join(loser_summary)}

請以以下結構輸出分析：

1. **樣本限制提醒**（這個樣本量能得出什麼結論？哪些指標樣本量不足？）

2. **翻前 Leak 分析** [高/中/低可信度]
   - VPIP/PFR 是否過寬或過緊？
   - ATS 偷盲頻率是否合理？
   - 3-Bet 頻率及 Fold to 3-Bet 是否平衡？

3. **翻後 Leak 分析** [高/中/低可信度]
   - C-Bet 頻率是否過高/過低？
   - Fold to C-Bet 是否過於被動？
   - Check-Raise 使用是否足夠？
   - WTSD/W$SD/WWSF 是否反映價值流失？

4. **位置分析**
   - 哪些位置虧損最嚴重？
   - 盲注位置的防守是否過多/過少？

5. **三條「立刻可執行」的修正建議**
   - 具體到可以練習的場景
   - 優先處理「高可信度」的問題

6. **建議優先訓練的場景**（對應本工具的練習模組）

用繁體中文回答。"""

        # Build full prompt for transparency
        full_prompt = f"""=== SYSTEM PROMPT ===
{system_prompt}

=== USER PROMPT ===
{prompt}"""

        try:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ]
            result = self.ai_client.chat(messages)
            return result, full_prompt
        except Exception as e:
            return f"AI 分析失敗: {str(e)}", full_prompt

    def _generate_deep_hand_analysis(
        self,
        losing_hands: List[HandResult],
    ) -> tuple:
        """Generate detailed AI analysis for the biggest losing hands.

        Returns:
            Tuple of (ai_response, full_prompt) for transparency
        """
        if not self.ai_client or not losing_hands:
            return None, None

        # Build detailed hand histories
        hand_details = []
        for i, hr in enumerate(losing_hands, 1):
            hand = hr.hand
            hand_info = f"""
---
### 手牌 {i}: {hr.position} {hr.hole_cards} (虧損 {hr.profit_bb:.1f}BB / ${abs(hr.profit):.2f})

**基本資訊:**
- Hand ID: {hand.hand_id}
- 級別: ${hand.stakes[0]}/{hand.stakes[1]}
- 底池: ${hand.pot:.2f}
- Hero 位置: {hr.position}
- Hero 手牌: {hr.hole_cards}
- 是否到攤牌: {"是" if hr.went_to_showdown else "否"}
"""
            # Board
            board = []
            if hand.flop:
                board.append(f"Flop: [{hand.flop}]")
            if hand.turn:
                board.append(f"Turn: [{hand.turn}]")
            if hand.river:
                board.append(f"River: [{hand.river}]")
            if board:
                hand_info += f"\n**牌面:** {' | '.join(board)}\n"

            # Action summary
            hand_info += "\n**行動流程:**\n"

            def format_actions(actions, street_name):
                if not actions:
                    return ""
                action_strs = []
                for action in actions:
                    if action.action_type.value in ["post_sb", "post_bb"]:
                        continue
                    player_pos = action.player
                    for p in hand.players:
                        if p.name == action.player:
                            player_pos = p.position or action.player
                            break
                    action_str = action.action_type.value
                    if action.to_amount:
                        action_str = f"raise to ${action.to_amount:.2f}"
                    elif action.amount:
                        action_str += f" ${action.amount:.2f}"
                    is_hero = action.player == "Hero"
                    marker = "**" if is_hero else ""
                    action_strs.append(f"{marker}{player_pos}: {action_str}{marker}")
                return f"- {street_name}: {' → '.join(action_strs)}\n"

            hand_info += format_actions(hand.preflop_actions, "Preflop")
            if hand.flop:
                hand_info += format_actions(hand.flop_actions, "Flop")
            if hand.turn:
                hand_info += format_actions(hand.turn_actions, "Turn")
            if hand.river:
                hand_info += format_actions(hand.river_actions, "River")

            hand_details.append(hand_info)

        system_prompt = """你是一位專業的撲克教練，專門分析具體手牌的決策錯誤。

對於每一手牌，請分析：
1. 翻前決策是否正確
2. 翻後每條街的決策是否有問題
3. 指出具體的錯誤點和正確的打法
4. 簡短的改進建議

請保持分析具體、可執行，避免泛泛而談。
每手牌的分析控制在 150-200 字內。"""

        prompt = f"""請分析以下 {len(losing_hands)} 手虧損最大的手牌，找出具體的決策錯誤：

{chr(10).join(hand_details)}

---

對每手牌請用以下格式分析：

**手牌 N 分析:**
- 🎯 關鍵錯誤點: [具體指出哪一步決策有問題]
- ✅ 正確打法: [應該怎麼做]
- 💡 改進建議: [1-2 句話的實戰建議]

最後總結這些手牌的共同問題模式（如果有的話）。

用繁體中文回答。"""

        # Build full prompt for transparency
        full_prompt = f"""=== SYSTEM PROMPT ===
{system_prompt}

=== USER PROMPT ===
{prompt}"""

        try:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ]
            result = self.ai_client.chat(messages)
            return result, full_prompt
        except Exception as e:
            return f"深度分析失敗: {str(e)}", full_prompt


def create_analyzer(
    provider: str = "deepseek",
    api_key: Optional[str] = None,
    **kwargs
) -> HandAnalyzer:
    """
    Create a hand analyzer with AI support.

    Args:
        provider: AI provider ("deepseek", "openai", "anthropic")
        api_key: API key for the provider
        **kwargs: Additional arguments for AI client

    Returns:
        HandAnalyzer instance
    """
    analyzer = HandAnalyzer()

    if api_key:
        client = create_ai_client(provider, api_key=api_key, **kwargs)
        analyzer.set_ai_client(client)

    return analyzer


def create_batch_analyzer(
    provider: str = "deepseek",
    api_key: Optional[str] = None,
    **kwargs
) -> BatchAnalyzer:
    """
    Create a batch analyzer with AI support.

    Args:
        provider: AI provider ("deepseek", "openai", "anthropic")
        api_key: API key for the provider
        **kwargs: Additional arguments for AI client

    Returns:
        BatchAnalyzer instance
    """
    analyzer = BatchAnalyzer()

    if api_key:
        client = create_ai_client(provider, api_key=api_key, **kwargs)
        analyzer.set_ai_client(client)

    return analyzer
