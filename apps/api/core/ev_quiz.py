"""
EV (Expected Value) Quiz module for poker decision training.
Teaches players pot odds and EV calculation through practical scenarios.
"""
import random
from dataclasses import dataclass
from typing import List, Tuple, Optional


@dataclass
class EVQuestion:
    """Represents an EV calculation question."""
    pot_size: int  # in bb or dollars
    bet_size: int  # opponent's bet
    equity: int  # player's estimated win rate (%)
    street: str  # "river", "turn", "flop"
    scenario_type: str  # "call_decision", "pot_odds", "required_equity"

    @property
    def pot_odds(self) -> float:
        """Calculate pot odds as a percentage."""
        total_pot = self.pot_size + self.bet_size + self.bet_size
        return (self.bet_size / total_pot) * 100

    @property
    def ev(self) -> float:
        """Calculate EV of calling."""
        win_amount = self.pot_size + self.bet_size
        lose_amount = self.bet_size
        return (self.equity / 100 * win_amount) - ((100 - self.equity) / 100 * lose_amount)

    @property
    def is_profitable_call(self) -> bool:
        """Determine if calling is +EV."""
        return self.equity > self.pot_odds

    @property
    def description_zh(self) -> str:
        """Chinese description of the scenario."""
        return f"底池 ${self.pot_size}，對手下注 ${self.bet_size}，你估計勝率 {self.equity}%"

    @property
    def description_en(self) -> str:
        """English description of the scenario."""
        return f"Pot ${self.pot_size}, opponent bets ${self.bet_size}, your estimated equity {self.equity}%"


@dataclass
class EVChoice:
    """Represents a choice in an EV quiz."""
    action: str  # "call" or "fold"
    is_correct: bool
    ev_value: Optional[float] = None


class EVQuiz:
    """Quiz engine for EV calculation questions."""

    # Common bet sizes relative to pot
    BET_RATIOS = [
        (1/3, "1/3 pot"),
        (1/2, "1/2 pot"),
        (2/3, "2/3 pot"),
        (3/4, "3/4 pot"),
        (1.0, "pot"),
    ]

    # Required equity for common bet sizes
    REQUIRED_EQUITY = {
        "1/3": 20,
        "1/2": 25,
        "2/3": 28.5,
        "3/4": 30,
        "pot": 33,
        "1.5x": 37.5,
        "2x": 40,
    }

    def __init__(self):
        self.scenarios = self._generate_scenarios()

    def _generate_scenarios(self) -> List[dict]:
        """Generate a pool of EV scenarios."""
        scenarios = []

        # Call decision scenarios: clear +EV or -EV
        # Pot sizes and bet sizes designed to create interesting decisions

        # Clear +EV scenarios (equity > pot odds by good margin)
        plus_ev = [
            {"pot": 100, "bet": 50, "equity": 30},  # Pot odds 25%, +EV
            {"pot": 100, "bet": 33, "equity": 22},  # Pot odds 20%, +EV
            {"pot": 80, "bet": 40, "equity": 28},   # Pot odds 25%, +EV
            {"pot": 120, "bet": 60, "equity": 27},  # Pot odds 25%, +EV
            {"pot": 100, "bet": 100, "equity": 38}, # Pot odds 33%, +EV
            {"pot": 150, "bet": 50, "equity": 22},  # Pot odds 20%, +EV
            {"pot": 200, "bet": 100, "equity": 28}, # Pot odds 25%, +EV
            {"pot": 100, "bet": 67, "equity": 32},  # Pot odds 28.5%, +EV
        ]

        # Clear -EV scenarios (equity < pot odds)
        minus_ev = [
            {"pot": 100, "bet": 50, "equity": 20},  # Pot odds 25%, -EV
            {"pot": 100, "bet": 33, "equity": 15},  # Pot odds 20%, -EV
            {"pot": 80, "bet": 40, "equity": 20},   # Pot odds 25%, -EV
            {"pot": 100, "bet": 100, "equity": 28}, # Pot odds 33%, -EV
            {"pot": 120, "bet": 80, "equity": 25},  # Pot odds 28.5%, -EV
            {"pot": 150, "bet": 100, "equity": 25}, # Pot odds 28.5%, -EV
            {"pot": 100, "bet": 75, "equity": 26},  # Pot odds 30%, -EV
            {"pot": 200, "bet": 200, "equity": 30}, # Pot odds 33%, -EV
        ]

        # Edge cases (close to breakeven)
        edge_cases = [
            {"pot": 100, "bet": 50, "equity": 25},  # Exactly breakeven
            {"pot": 100, "bet": 50, "equity": 26},  # Barely +EV
            {"pot": 100, "bet": 50, "equity": 24},  # Barely -EV
            {"pot": 100, "bet": 100, "equity": 33}, # Exactly breakeven
            {"pot": 100, "bet": 33, "equity": 20},  # Exactly breakeven
        ]

        for s in plus_ev:
            scenarios.append({**s, "expected": "call"})
        for s in minus_ev:
            scenarios.append({**s, "expected": "fold"})
        for s in edge_cases:
            # Calculate expected action for edge cases
            pot_odds = s["bet"] / (s["pot"] + 2 * s["bet"]) * 100
            expected = "call" if s["equity"] >= pot_odds else "fold"
            scenarios.append({**s, "expected": expected})

        return scenarios

    def generate_question(self, difficulty: str = "medium") -> EVQuestion:
        """Generate a random EV question."""
        scenario = random.choice(self.scenarios)

        return EVQuestion(
            pot_size=scenario["pot"],
            bet_size=scenario["bet"],
            equity=scenario["equity"],
            street="river",
            scenario_type="call_decision",
        )

    def generate_choices(self, question: EVQuestion) -> List[EVChoice]:
        """Generate call/fold choices for a question."""
        is_call_correct = question.is_profitable_call

        return [
            EVChoice(
                action="call",
                is_correct=is_call_correct,
                ev_value=question.ev if is_call_correct else None,
            ),
            EVChoice(
                action="fold",
                is_correct=not is_call_correct,
                ev_value=0 if not is_call_correct else None,
            ),
        ]

    def check_answer(self, question: EVQuestion, player_action: str) -> Tuple[bool, str]:
        """
        Check if player's answer is correct.

        Returns:
            Tuple of (is_correct, explanation)
        """
        correct_action = "call" if question.is_profitable_call else "fold"
        is_correct = player_action.lower() == correct_action

        pot_odds = question.pot_odds
        ev = question.ev

        if is_correct:
            if correct_action == "call":
                explanation = f"勝率 {question.equity}% > 賠率 {pot_odds:.1f}%，EV = +${ev:.1f}"
            else:
                explanation = f"勝率 {question.equity}% < 賠率 {pot_odds:.1f}%，EV = ${ev:.1f}"
        else:
            if correct_action == "call":
                explanation = f"應該跟注！勝率 {question.equity}% > 賠率 {pot_odds:.1f}%"
            else:
                explanation = f"應該棄牌！勝率 {question.equity}% < 賠率 {pot_odds:.1f}%"

        return is_correct, explanation

    def get_pot_odds_explanation(self, bet_ratio: str) -> str:
        """Get required equity for a bet size."""
        return f"{self.REQUIRED_EQUITY.get(bet_ratio, '?')}%"

    @staticmethod
    def calculate_pot_odds(pot: int, bet: int) -> float:
        """Calculate pot odds as percentage."""
        return bet / (pot + 2 * bet) * 100

    @staticmethod
    def calculate_ev(pot: int, bet: int, equity: int) -> float:
        """Calculate EV of calling."""
        win_amount = pot + bet
        lose_amount = bet
        return (equity / 100 * win_amount) - ((100 - equity) / 100 * lose_amount)
