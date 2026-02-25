"""
Unit tests for ICM (Independent Chip Model) calculations.
"""

import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.icm import (
    calculate_finish_probability,
    calculate_icm_equity,
    calculate_icm_pressure,
    chip_ev,
    get_standard_payouts,
    icm_ev,
    icm_vs_chip_ev_diff,
)


class TestFinishProbability:
    """Tests for finish probability calculation."""

    def test_heads_up_first_place(self):
        """In heads up, chip leader should have higher P(1st)."""
        stacks = [7000, 3000]
        prob_p1_first = calculate_finish_probability(stacks, 0, 0)
        prob_p2_first = calculate_finish_probability(stacks, 1, 0)

        assert prob_p1_first == pytest.approx(0.7, rel=0.01)
        assert prob_p2_first == pytest.approx(0.3, rel=0.01)
        assert prob_p1_first + prob_p2_first == pytest.approx(1.0, rel=0.01)

    def test_equal_stacks_equal_probability(self):
        """Equal stacks should have equal finish probabilities."""
        stacks = [5000, 5000]
        prob_p1_first = calculate_finish_probability(stacks, 0, 0)
        prob_p2_first = calculate_finish_probability(stacks, 1, 0)

        assert prob_p1_first == pytest.approx(0.5, rel=0.01)
        assert prob_p2_first == pytest.approx(0.5, rel=0.01)

    def test_three_player_probabilities_sum_to_one(self):
        """Finish probabilities for all players should sum to 1."""
        stacks = [5000, 3000, 2000]
        total_first = sum(calculate_finish_probability(stacks, i, 0) for i in range(3))
        total_second = sum(calculate_finish_probability(stacks, i, 1) for i in range(3))

        assert total_first == pytest.approx(1.0, rel=0.01)
        assert total_second == pytest.approx(1.0, rel=0.01)

    def test_zero_stack_has_zero_probability(self):
        """Player with 0 chips should have 0 probability."""
        stacks = [5000, 0, 5000]
        prob = calculate_finish_probability(stacks, 1, 0)

        assert prob == 0.0


class TestICMEquity:
    """Tests for ICM equity calculations."""

    def test_heads_up_winner_take_all(self):
        """In winner-take-all, ICM equals chip EV."""
        stacks = [7000, 3000]
        payouts = [1000, 0]  # Winner takes all

        result = calculate_icm_equity(stacks, payouts)

        assert result.equities[0] == pytest.approx(700, rel=0.01)
        assert result.equities[1] == pytest.approx(300, rel=0.01)

    def test_equal_stacks_equal_equity(self):
        """Players with equal stacks should have equal ICM equity."""
        stacks = [5000, 5000]
        payouts = [700, 300]

        result = calculate_icm_equity(stacks, payouts)

        assert result.equities[0] == pytest.approx(result.equities[1], rel=0.01)

    def test_chip_leader_advantage(self):
        """Chip leader should have higher ICM equity."""
        stacks = [7000, 3000]
        payouts = [700, 300]

        result = calculate_icm_equity(stacks, payouts)

        assert result.equities[0] > result.equities[1]

    def test_icm_vs_chip_ev_small_stack_gets_more(self):
        """ICM gives small stack relatively more value than chip EV."""
        stacks = [8000, 2000]
        payouts = [650, 350]

        result = calculate_icm_equity(stacks, payouts)
        chip_equities = chip_ev(stacks, sum(payouts))

        # Small stack gets more ICM than chip EV
        assert result.equities[1] > chip_equities[1]

    def test_icm_sums_to_prize_pool(self):
        """Total ICM equity should equal total prize pool."""
        stacks = [5000, 3000, 2000]
        payouts = [500, 300, 200]

        result = calculate_icm_equity(stacks, payouts)
        total_equity = sum(result.equities)

        assert total_equity == pytest.approx(1000, rel=0.01)

    def test_empty_stacks_returns_empty(self):
        """Empty stack list should return empty equities."""
        result = calculate_icm_equity([], [100, 50])

        assert result.equities == []

    def test_single_player_gets_first_prize(self):
        """Single remaining player gets full first place prize."""
        stacks = [10000]
        payouts = [1000, 500]

        result = calculate_icm_equity(stacks, payouts)

        assert result.equities[0] == 1000


class TestICMPressure:
    """Tests for ICM pressure calculations."""

    def test_bubble_increases_pressure(self):
        """ICM pressure should be high when on bubble."""
        stacks = [5000, 4000, 3000, 2000]  # 4 players
        payouts = [450, 300, 150, 0]  # 3 pay

        # Short stack faces high pressure
        pressure = calculate_icm_pressure(stacks, payouts, 3, 2000)

        assert pressure["pressure_ratio"] > 1.0
        assert pressure["pressure_level"] in ["medium", "high", "extreme"]

    def test_chip_leader_low_pressure(self):
        """Chip leader should have lower ICM pressure."""
        stacks = [8000, 4000, 2000, 1000]
        payouts = [500, 300, 150, 50]

        pressure = calculate_icm_pressure(stacks, payouts, 0, 1000)

        assert pressure["potential_gain"] > 0
        assert pressure["pressure_level"] in ["low", "medium"]


class TestStandardPayouts:
    """Tests for standard payout generation."""

    def test_heads_up_winner_takes_all(self):
        """Heads up should be winner-take-all."""
        payouts = get_standard_payouts(2, 100)

        assert payouts[0] == 200
        assert payouts[1] == 0

    def test_six_handed_split(self):
        """6-handed should have 65/35 split."""
        payouts = get_standard_payouts(6, 100)
        prize_pool = 600

        assert payouts[0] == pytest.approx(prize_pool * 0.65, rel=0.01)
        assert payouts[1] == pytest.approx(prize_pool * 0.35, rel=0.01)


class TestConvenienceFunctions:
    """Tests for convenience utility functions."""

    def test_chip_ev_proportional(self):
        """Chip EV should be proportional to chip count."""
        stacks = [6000, 4000]
        prize_pool = 1000

        equities = chip_ev(stacks, prize_pool)

        assert equities[0] == 600
        assert equities[1] == 400

    def test_icm_ev_shorthand(self):
        """icm_ev should return same as calculate_icm_equity.equities."""
        stacks = [5000, 3000, 2000]
        payouts = [500, 300, 200]

        direct = icm_ev(stacks, payouts)
        result = calculate_icm_equity(stacks, payouts)

        assert direct == result.equities

    def test_icm_vs_chip_ev_diff_sums_to_zero(self):
        """ICM - Chip EV differences should sum to approximately zero."""
        stacks = [5000, 3000, 2000]
        payouts = [500, 300, 200]

        diffs = icm_vs_chip_ev_diff(stacks, payouts)

        assert sum(diffs) == pytest.approx(0, abs=1)
