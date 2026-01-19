"""
Hand History Analyzer
Combines parsing and AI analysis for comprehensive hand review.
"""
from dataclasses import dataclass, field
from typing import List, Optional, Dict
from enum import Enum

from .hand_parser import GGPokerParser, HandHistory, format_hand_summary, ActionType
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
    position: str
    hole_cards: str
    went_to_showdown: bool
    pot_size: float


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
class BatchAnalysisResult:
    """Result of batch analysis."""
    total_hands: int
    total_profit: float
    hands_won: int  # Total hands with profit > 0
    hands_lost: int  # Total hands with profit < 0
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

        # Calculate money invested by hero - track per street
        total_invested = 0

        for street_actions in [hand.preflop_actions, hand.flop_actions, hand.turn_actions, hand.river_actions]:
            street_invested = 0
            for action in street_actions:
                if action.player == hero_name:
                    if action.to_amount is not None:
                        # Raises: to_amount is the TOTAL bet for this street
                        # This replaces any previous amount in this street
                        street_invested = action.to_amount
                    elif action.amount is not None:
                        # Calls, bets, blinds: add to street investment
                        street_invested += action.amount
            total_invested += street_invested

        # Calculate winnings
        won = hand.winners.get(hero_name, 0)

        # Profit = won - invested (if won, profit is winnings minus investment)
        # If lost, profit is negative (lost the investment)
        if won > 0:
            profit = won - total_invested
        else:
            profit = -total_invested

        # Check if went to showdown (has river and hero was still in the hand)
        went_to_showdown = hand.river is not None and len(hand.river_actions) > 0

        return HandResult(
            hand=hand,
            profit=profit,
            position=hero_position,
            hole_cards=hero_cards,
            went_to_showdown=went_to_showdown,
            pot_size=hand.pot,
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

        # Total profit and win/loss counts
        total_profit = sum(r.profit for r in results)
        hands_won = sum(1 for r in results if r.profit > 0)
        hands_lost = sum(1 for r in results if r.profit < 0)

        # Generate AI leak report
        ai_report = None
        if generate_ai_report and self.ai_client:
            ai_report = self._generate_leak_report(results, position_stats, biggest_losers)

        return BatchAnalysisResult(
            total_hands=len(results),
            total_profit=total_profit,
            hands_won=hands_won,
            hands_lost=hands_lost,
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

            # VPIP = voluntarily put money in pot (not just posting blinds)
            if r.pot_size > 0:
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

    def _generate_leak_report(
        self,
        results: List[HandResult],
        position_stats: Dict[str, PositionStats],
        biggest_losers: List[HandResult],
    ) -> Optional[str]:
        """Generate AI leak report."""
        if not self.ai_client:
            return None

        # Build summary for AI
        total_hands = len(results)
        total_profit = sum(r.profit for r in results)

        # Position summary
        pos_summary = []
        for pos in ["UTG", "HJ", "CO", "BTN", "SB", "BB"]:
            if pos in position_stats:
                s = position_stats[pos]
                win_rate = (s.hands_won / s.hands_played * 100) if s.hands_played > 0 else 0
                pos_summary.append(
                    f"  {pos}: {s.hands_played} 手, 盈虧 ${s.total_profit:.2f}, 勝率 {win_rate:.1f}%"
                )

        # Biggest losers summary
        loser_summary = []
        for i, r in enumerate(biggest_losers[:5], 1):
            loser_summary.append(
                f"  {i}. {r.position} {r.hole_cards}: 虧損 ${abs(r.profit):.2f} (底池 ${r.pot_size:.2f})"
            )

        prompt = f"""請分析這位玩家的撲克數據，找出主要的 leak（漏洞）並給出改進建議。

## 總體統計
- 總手數: {total_hands}
- 總盈虧: ${total_profit:.2f}
- 平均每手: ${total_profit/total_hands:.4f}

## 位置統計
{chr(10).join(pos_summary)}

## 虧損最大的 5 手牌
{chr(10).join(loser_summary)}

請：
1. 指出最大的 3 個 leak
2. 分析位置數據異常（例如某位置虧損過多）
3. 給出具體的改進建議
4. 建議優先練習的場景

用繁體中文回答，簡潔有力。"""

        try:
            messages = [
                {"role": "system", "content": "你是專業撲克教練，擅長分析玩家數據找出漏洞。"},
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
