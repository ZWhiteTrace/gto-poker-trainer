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
