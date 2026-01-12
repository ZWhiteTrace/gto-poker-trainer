"""
Preflop equity quiz module.
Generates multiple choice questions about hand vs hand equity.
"""
import json
import random
from dataclasses import dataclass
from pathlib import Path
from typing import List, Tuple, Optional


@dataclass
class EquityQuestion:
    """A single equity quiz question."""
    hand1: str
    hand2: str
    correct_equity1: int
    correct_equity2: int
    category: str
    difficulty: str
    note: Optional[str] = None

    @property
    def display_hand1(self) -> str:
        """Get display string with suit symbols for hand1."""
        return _add_suit_symbols(self.hand1)

    @property
    def display_hand2(self) -> str:
        """Get display string with suit symbols for hand2."""
        return _add_suit_symbols(self.hand2)


@dataclass
class EquityChoice:
    """A multiple choice option."""
    equity1: int
    equity2: int
    is_correct: bool


def _add_suit_symbols(hand: str) -> str:
    """Add suit symbols to hand string for display."""
    if hand.endswith('s'):
        # Suited - use same suit
        return f"{hand[0]}♠ {hand[1]}♠"
    elif hand.endswith('o'):
        # Offsuit - use different suits
        return f"{hand[0]}♠ {hand[1]}♥"
    else:
        # Pocket pair
        return f"{hand[0]}♠ {hand[0]}♥"


class EquityQuiz:
    """Quiz engine for preflop equity matchups."""

    def __init__(self):
        self.data = self._load_data()
        self.settings = self.data.get("quiz_settings", {})
        self.tolerance = self.settings.get("tolerance", 5)

    def _load_data(self) -> dict:
        """Load equity data from JSON file."""
        data_path = Path(__file__).parent.parent / "data" / "equity.json"
        with open(data_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def generate_question(
        self,
        difficulty: Optional[str] = None,
        category: Optional[str] = None
    ) -> EquityQuestion:
        """Generate a random equity question."""
        matchups = self.data.get("matchups", {})

        # Filter by category if specified
        if category:
            categories = [category] if category in matchups else list(matchups.keys())
        else:
            categories = list(matchups.keys())

        # Filter by difficulty if specified
        valid_categories = []
        for cat in categories:
            cat_data = matchups.get(cat, {})
            if difficulty is None or cat_data.get("difficulty") == difficulty:
                valid_categories.append(cat)

        if not valid_categories:
            valid_categories = categories

        # Pick random category and example
        chosen_category = random.choice(valid_categories)
        cat_data = matchups[chosen_category]
        examples = cat_data.get("examples", [])

        if not examples:
            # Fallback to any category with examples
            for cat, data in matchups.items():
                if data.get("examples"):
                    chosen_category = cat
                    cat_data = data
                    examples = data["examples"]
                    break

        example = random.choice(examples)

        return EquityQuestion(
            hand1=example["hand1"],
            hand2=example["hand2"],
            correct_equity1=example["equity1"],
            correct_equity2=example["equity2"],
            category=chosen_category,
            difficulty=cat_data.get("difficulty", "medium"),
            note=example.get("note"),
        )

    def generate_choices(
        self,
        question: EquityQuestion,
        num_choices: int = 4
    ) -> List[EquityChoice]:
        """
        Generate multiple choice options for a question.
        Uses tight variance: -10%, -5%, correct, +5%, +10%
        Returns choices sorted by equity (low to high).
        """
        correct = question.correct_equity1

        # Fixed variance pattern: -10, -5, +5, +10
        variances = [-10, -5, 5, 10]

        # Generate wrong options
        wrong_options = []
        for v in variances:
            wrong_equity = correct + v
            # Ensure valid range (5-95%)
            if 5 <= wrong_equity <= 95:
                wrong_options.append(wrong_equity)

        # Pick 3 wrong answers from available options
        if len(wrong_options) >= 3:
            selected_wrong = random.sample(wrong_options, 3)
        else:
            # Fallback if not enough valid options
            selected_wrong = wrong_options[:]
            while len(selected_wrong) < 3:
                fallback = correct + random.choice([-15, -8, 8, 15])
                fallback = max(5, min(95, fallback))
                if fallback not in selected_wrong and fallback != correct:
                    selected_wrong.append(fallback)

        # Create choice objects
        choices = [EquityChoice(correct, 100 - correct, True)]
        for wrong in selected_wrong:
            choices.append(EquityChoice(wrong, 100 - wrong, False))

        # Sort by equity (low to high)
        choices.sort(key=lambda c: c.equity1)
        return choices

    def check_answer(
        self,
        question: EquityQuestion,
        player_equity1: int,
        use_tolerance: bool = True
    ) -> Tuple[bool, int]:
        """
        Check if player's answer is correct.

        Returns:
            Tuple of (is_correct, difference from correct answer)
        """
        diff = abs(player_equity1 - question.correct_equity1)

        if use_tolerance:
            is_correct = diff <= self.tolerance
        else:
            is_correct = diff == 0

        return is_correct, diff

    def get_categories(self) -> List[Tuple[str, str]]:
        """Get list of (category_key, description) tuples."""
        matchups = self.data.get("matchups", {})
        return [
            (key, data.get("description", key))
            for key, data in matchups.items()
        ]

    def get_difficulties(self) -> List[str]:
        """Get list of available difficulty levels."""
        return ["easy", "medium", "hard"]

    def get_category_description(self, category: str) -> str:
        """Get Chinese description for a category."""
        matchups = self.data.get("matchups", {})
        return matchups.get(category, {}).get("description", category)
