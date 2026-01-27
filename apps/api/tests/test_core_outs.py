"""
Unit tests for outs calculation and hand evaluation.
"""
import pytest
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.outs import (
    Card,
    parse_cards,
    calculate_outs,
    evaluate_hand_strength,
    count_suits,
    count_ranks,
    has_flush,
    has_straight,
    HandStrength,
    DrawType,
)


class TestCardParsing:
    """Tests for card parsing utilities."""

    def test_parse_single_card(self):
        """Test parsing a single card string."""
        card = Card.from_string("As")
        assert card.rank == "A"
        assert card.suit == "s"

    def test_parse_multiple_cards(self):
        """Test parsing multiple cards."""
        cards = parse_cards("AsKh")
        assert len(cards) == 2
        assert cards[0].rank == "A"
        assert cards[0].suit == "s"
        assert cards[1].rank == "K"
        assert cards[1].suit == "h"

    def test_parse_cards_with_spaces(self):
        """Test parsing cards with spaces."""
        cards = parse_cards("As Kh Qd")
        assert len(cards) == 3

    def test_card_equality(self):
        """Test card equality comparison."""
        card1 = Card("A", "s")
        card2 = Card("A", "s")
        card3 = Card("A", "h")

        assert card1 == card2
        assert card1 != card3

    def test_card_value(self):
        """Test card value property."""
        ace = Card("A", "s")
        two = Card("2", "s")
        ten = Card("T", "s")

        assert ace.value == 12  # Highest
        assert two.value == 0   # Lowest
        assert ten.value == 8


class TestCountFunctions:
    """Tests for counting utilities."""

    def test_count_suits(self):
        """Test counting cards by suit."""
        cards = parse_cards("AsKsQsJh")
        counts = count_suits(cards)

        assert counts["s"] == 3
        assert counts["h"] == 1

    def test_count_ranks(self):
        """Test counting cards by rank."""
        cards = parse_cards("AsAhKsKh")
        counts = count_ranks(cards)

        assert counts["A"] == 2
        assert counts["K"] == 2


class TestFlushAndStraightDetection:
    """Tests for flush and straight detection."""

    def test_has_flush_true(self):
        """Test detecting a flush."""
        cards = parse_cards("AsKsQsJs2s")
        result = has_flush(cards)

        assert result == "s"

    def test_has_flush_false(self):
        """Test when no flush exists."""
        cards = parse_cards("AsKsQsJh2d")
        result = has_flush(cards)

        assert result is None

    def test_has_straight_true(self):
        """Test detecting a straight."""
        cards = parse_cards("5s6h7d8c9s")
        result = has_straight(cards)

        assert result is True

    def test_has_straight_wheel(self):
        """Test detecting A-2-3-4-5 wheel."""
        cards = parse_cards("As2h3d4c5s")
        result = has_straight(cards)

        assert result is True

    def test_has_straight_false(self):
        """Test when no straight exists."""
        cards = parse_cards("2s5h8dJcAs")
        result = has_straight(cards)

        assert result is False


class TestHandStrength:
    """Tests for hand strength evaluation."""

    def test_high_card(self):
        """Test high card hand."""
        hole = parse_cards("AhKc")
        board = parse_cards("2s5d8h")
        strength, _, _ = evaluate_hand_strength(hole, board)

        assert strength == HandStrength.HIGH_CARD

    def test_one_pair(self):
        """Test one pair hand."""
        hole = parse_cards("AhKc")
        board = parse_cards("AsQd8h")
        strength, _, _ = evaluate_hand_strength(hole, board)

        assert strength == HandStrength.ONE_PAIR

    def test_two_pair(self):
        """Test two pair hand."""
        hole = parse_cards("AhKc")
        board = parse_cards("AsKd8h")
        strength, _, _ = evaluate_hand_strength(hole, board)

        assert strength == HandStrength.TWO_PAIR

    def test_three_of_a_kind(self):
        """Test trips/set."""
        hole = parse_cards("AhAs")
        board = parse_cards("AdKd8h")
        strength, _, _ = evaluate_hand_strength(hole, board)

        assert strength == HandStrength.THREE_OF_A_KIND

    def test_straight(self):
        """Test straight hand."""
        hole = parse_cards("JhTc")
        board = parse_cards("9s8d7h")
        strength, _, _ = evaluate_hand_strength(hole, board)

        assert strength == HandStrength.STRAIGHT

    def test_flush(self):
        """Test flush hand."""
        hole = parse_cards("AhKh")
        board = parse_cards("QhJh2h")
        strength, _, _ = evaluate_hand_strength(hole, board)

        assert strength == HandStrength.FLUSH


class TestOutsCalculation:
    """Tests for outs calculation."""

    def test_flush_draw_nine_outs(self):
        """Test flush draw has 9 outs."""
        hole = parse_cards("AsKs")
        board = parse_cards("Qs7s2h")
        result = calculate_outs(hole, board)

        flush_draws = [d for d in result.draws if d[0] == DrawType.FLUSH_DRAW]
        assert len(flush_draws) == 1
        assert flush_draws[0][1] == 9  # 9 outs

    def test_oesd_eight_outs(self):
        """Test open-ended straight draw has 8 outs."""
        hole = parse_cards("JhTc")
        board = parse_cards("9s8d2h")
        result = calculate_outs(hole, board)

        oesd_draws = [d for d in result.draws if d[0] == DrawType.OESD]
        assert len(oesd_draws) == 1
        assert oesd_draws[0][1] == 8  # 8 outs

    def test_gutshot_four_outs(self):
        """Test gutshot straight draw has 4 outs."""
        hole = parse_cards("QhJc")
        board = parse_cards("Ts8d3h")
        result = calculate_outs(hole, board)

        gutshot_draws = [d for d in result.draws if d[0] == DrawType.GUTSHOT]
        assert len(gutshot_draws) == 1
        assert gutshot_draws[0][1] == 4  # 4 outs

    def test_overcards_six_outs(self):
        """Test two overcards has 6 outs."""
        hole = parse_cards("AhKc")
        board = parse_cards("Qs7d3h")
        result = calculate_outs(hole, board)

        overcard_draws = [d for d in result.draws if d[0] == DrawType.OVERCARDS]
        assert len(overcard_draws) == 1
        assert overcard_draws[0][1] == 6  # 6 outs

    def test_set_draw_two_outs(self):
        """Test pocket pair to set has 2 outs."""
        hole = parse_cards("JhJc")
        board = parse_cards("Ks8d4h")
        result = calculate_outs(hole, board)

        set_draws = [d for d in result.draws if d[0] == DrawType.SET_DRAW]
        assert len(set_draws) == 1
        assert set_draws[0][1] == 2  # 2 outs

    def test_combo_draw_multiple_outs(self):
        """Test combo draw (flush + straight) has combined outs."""
        hole = parse_cards("8h7h")
        board = parse_cards("9h6h2c")
        result = calculate_outs(hole, board)

        # Should have both flush draw and OESD
        draw_types = [d[0] for d in result.draws]
        assert DrawType.FLUSH_DRAW in draw_types
        assert DrawType.OESD in draw_types

        # Total outs should be less than sum (overlapping cards)
        assert result.total_outs < 17  # 9 + 8 = 17 max if no overlap

    def test_made_hand_no_draw_outs(self):
        """Test that made hands are correctly identified."""
        hole = parse_cards("AhKh")
        board = parse_cards("QhJhTh")  # Made royal flush
        result = calculate_outs(hole, board)

        # AhKhQhJhTh is a royal flush
        assert result.hand_strength == HandStrength.ROYAL_FLUSH

    def test_probability_calculation(self):
        """Test probability calculations are reasonable."""
        hole = parse_cards("5s4s")
        board = parse_cards("6dAs3h")  # Gutshot to straight (only need 2 or 7)
        result = calculate_outs(hole, board)

        # Should have gutshot draw (4 outs) or similar
        # Total outs should give reasonable probability
        assert result.total_outs > 0
        assert result.turn_probability > 0
        assert result.river_probability >= result.turn_probability


class TestOutsQuiz:
    """Tests for outs quiz functionality."""

    def test_quiz_generates_question(self):
        """Test that quiz can generate valid questions."""
        from core.outs import OutsQuiz

        quiz = OutsQuiz()
        question = quiz.generate_question()

        assert len(question.hole_cards) == 2
        assert len(question.board) == 3
        assert question.result is not None

    def test_quiz_generates_choices(self):
        """Test that quiz generates valid choices."""
        from core.outs import OutsQuiz

        quiz = OutsQuiz()
        question = quiz.generate_question()
        choices = quiz.generate_choices(question)

        assert len(choices) == 4
        assert question.result.total_outs in choices
        assert choices == sorted(choices)  # Should be sorted
