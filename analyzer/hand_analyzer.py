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
    vpip: bool  # Did hero voluntarily put money in pot?
    pfr: bool   # Did hero raise preflop?
    three_bet: bool  # Did hero 3-bet?
    faced_raise: bool  # Did hero face a raise preflop?


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
    """Core poker statistics for a player."""
    total_hands: int
    vpip: float  # Voluntarily Put money In Pot % (standard: 22-28%)
    pfr: float   # Pre-Flop Raise % (standard: 18-24%)
    three_bet: float  # 3-Bet % (standard: 7-10%)
    wtsd: float  # Went To ShowDown % (standard: 25-30%)
    wsd: float   # Won at ShowDown % (standard: 50-55%)
    aggression_factor: float  # (Bet+Raise) / Call


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
    biggest_winners: List[HandResult]
    biggest_losers: List[HandResult]
    position_stats: Dict[str, PositionStats]
    ai_leak_report: Optional[str] = None


class BatchAnalyzer:
    """Batch analyzer for multiple hands."""

    def __init__(self, ai_client: Optional[BaseAIClient] = None):
        self.ai_client = ai_client

    def set_ai_client(self, client: BaseAIClient):
        """Set the AI client for analysis."""
        self.ai_client = client

    def calculate_hand_result(self, hand: HandHistory) -> Optional[HandResult]:
        """Calculate the result (profit/loss) for a single hand."""
        if not hand.hero:
            return None

        hero_name = hand.hero.name
        hero_position = hand.hero.position or "Unknown"
        hero_cards = hand.hero.hole_cards or "??"
        bb_size = hand.stakes[1]  # Big blind size

        # Analyze preflop actions for VPIP, PFR, 3-bet
        vpip = False  # Voluntarily put money in pot
        pfr = False   # Preflop raise
        three_bet = False
        faced_raise = False
        raise_count = 0

        for action in hand.preflop_actions:
            # Track if there's been a raise
            if action.action_type == ActionType.RAISE:
                raise_count += 1

            if action.player == hero_name:
                # VPIP: any voluntary action (call, raise, bet) - NOT posting blinds
                if action.action_type in [ActionType.CALL, ActionType.RAISE, ActionType.BET]:
                    vpip = True

                # PFR: hero raised preflop
                if action.action_type == ActionType.RAISE:
                    pfr = True
                    # 3-bet: hero raised after someone else raised
                    if raise_count >= 2:
                        three_bet = True

            # Check if hero faced a raise before their action
            if action.action_type == ActionType.RAISE and action.player != hero_name:
                faced_raise = True

        # Calculate money invested by hero - track per street
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

        # Check if went to showdown
        went_to_showdown = hand.river is not None and len(hand.river_actions) > 0

        return HandResult(
            hand=hand,
            profit=profit,
            profit_bb=profit_bb,
            position=hero_position,
            hole_cards=hero_cards,
            went_to_showdown=went_to_showdown,
            pot_size=hand.pot,
            vpip=vpip,
            pfr=pfr,
            three_bet=three_bet,
            faced_raise=faced_raise,
        )

    def analyze_batch(
        self,
        hands: List[HandHistory],
        top_n: int = 10,
        generate_ai_report: bool = True,
    ) -> BatchAnalysisResult:
        """
        Analyze a batch of hands.

        Args:
            hands: List of hand histories
            top_n: Number of top winners/losers to return
            generate_ai_report: Whether to generate AI leak report

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
        if generate_ai_report and self.ai_client:
            ai_report = self._generate_leak_report(results, position_stats, biggest_losers, player_stats)

        return BatchAnalysisResult(
            total_hands=len(results),
            total_profit=total_profit,
            hands_won=hands_won,
            hands_lost=hands_lost,
            hands_breakeven=hands_breakeven,
            bb_per_100=bb_per_100,
            player_stats=player_stats,
            biggest_winners=biggest_winners,
            biggest_losers=biggest_losers,
            position_stats=position_stats,
            ai_leak_report=ai_report,
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
            return PlayerStats(0, 0, 0, 0, 0, 0, 0)

        # VPIP: Voluntarily Put money In Pot
        vpip_count = sum(1 for r in results if r.vpip)
        vpip_pct = (vpip_count / total) * 100

        # PFR: Pre-Flop Raise
        pfr_count = sum(1 for r in results if r.pfr)
        pfr_pct = (pfr_count / total) * 100

        # 3-Bet %: 3-bet when facing a raise
        faced_raise_count = sum(1 for r in results if r.faced_raise)
        three_bet_count = sum(1 for r in results if r.three_bet)
        three_bet_pct = (three_bet_count / faced_raise_count * 100) if faced_raise_count > 0 else 0

        # WTSD: Went To ShowDown (of VPIP hands)
        vpip_hands = [r for r in results if r.vpip]
        wtsd_count = sum(1 for r in vpip_hands if r.went_to_showdown)
        wtsd_pct = (wtsd_count / len(vpip_hands) * 100) if vpip_hands else 0

        # WSD: Won at ShowDown
        showdown_hands = [r for r in results if r.went_to_showdown]
        wsd_count = sum(1 for r in showdown_hands if r.profit > 0)
        wsd_pct = (wsd_count / len(showdown_hands) * 100) if showdown_hands else 0

        # Aggression Factor: Would need action-level data, estimate from PFR for now
        aggression = pfr_pct / (vpip_pct - pfr_pct) if (vpip_pct - pfr_pct) > 0 else 0

        return PlayerStats(
            total_hands=total,
            vpip=vpip_pct,
            pfr=pfr_pct,
            three_bet=three_bet_pct,
            wtsd=wtsd_pct,
            wsd=wsd_pct,
            aggression_factor=aggression,
        )

    def _generate_leak_report(
        self,
        results: List[HandResult],
        position_stats: Dict[str, PositionStats],
        biggest_losers: List[HandResult],
        player_stats: Optional[PlayerStats] = None,
    ) -> Optional[str]:
        """Generate AI leak report with professional poker coach prompt."""
        if not self.ai_client:
            return None

        # Build summary for AI
        total_hands = len(results)
        total_profit = sum(r.profit for r in results)
        total_profit_bb = sum(r.profit_bb for r in results)
        bb_per_100 = (total_profit_bb / total_hands) * 100 if total_hands > 0 else 0

        # Player stats summary
        stats_summary = ""
        if player_stats:
            stats_summary = f"""## 玩家風格數據
- VPIP: {player_stats.vpip:.1f}% (標準: 22-28%)
- PFR: {player_stats.pfr:.1f}% (標準: 18-24%)
- 3-Bet: {player_stats.three_bet:.1f}% (標準: 7-10%)
- WTSD: {player_stats.wtsd:.1f}% (標準: 25-30%)
- W$SD: {player_stats.wsd:.1f}% (標準: 50-55%)
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
6. 允許 exploitative 建議（如：對低級別玩家過度棄牌）"""

        prompt = f"""請分析這位玩家的撲克數據。

## 樣本概覽
- 總手數: {total_hands} (注意：小樣本，結論需謹慎)
- 總盈虧: ${total_profit:.2f} ({bb_per_100:+.1f} BB/100)

{stats_summary}
## 位置統計
{chr(10).join(pos_summary)}

## 虧損最大的 5 手牌
{chr(10).join(loser_summary)}

請以以下結構輸出分析：

1. **樣本限制提醒**（這個樣本量能得出什麼結論？）

2. **高可信度 Leak**（優先處理，標註 [高]）
   - 根據 VPIP/PFR 判斷翻前問題
   - 根據位置盈虧判斷位置意識

3. **中低可信度觀察**（需更多樣本驗證，標註 [中]/[低]）

4. **翻前 vs 翻後 問題分類**

5. **三條「立刻可執行」的修正建議**
   - 具體到可以練習的場景
   - 不要給「玩得更好」這種空泛建議

6. **建議優先訓練的場景**（對應本工具的練習模組）

用繁體中文回答。"""

        try:
            messages = [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": prompt}
            ]
            return self.ai_client.chat(messages)
        except Exception as e:
            return f"AI 分析失敗: {str(e)}"


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
