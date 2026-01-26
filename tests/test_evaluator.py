"""Tests for Evaluator class."""
import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from core.hand import Hand
from core.position import Position
from core.scenario import Scenario, ActionType
from core.evaluator import Evaluator


@pytest.fixture
def evaluator():
    return Evaluator()


def test_rfi_utg_premium(evaluator):
    """Test RFI with premium hands from UTG."""
    scenario = Scenario(hero_position=Position.UTG, action_type=ActionType.RFI)

    # AA should raise
    action = evaluator.get_correct_action(Hand("AA"), scenario)
    assert action == "raise"

    # AKs should raise
    action = evaluator.get_correct_action(Hand("AKs"), scenario)
    assert action == "raise"


def test_rfi_utg_fold(evaluator):
    """Test RFI with weak hands from UTG."""
    scenario = Scenario(hero_position=Position.UTG, action_type=ActionType.RFI)

    # 72o should fold
    action = evaluator.get_correct_action(Hand("72o"), scenario)
    assert action == "fold"

    # 54o should fold
    action = evaluator.get_correct_action(Hand("54o"), scenario)
    assert action == "fold"


def test_rfi_btn_wider(evaluator):
    """Test that BTN has a wider opening range than UTG."""
    utg_scenario = Scenario(hero_position=Position.UTG, action_type=ActionType.RFI)
    btn_scenario = Scenario(hero_position=Position.BTN, action_type=ActionType.RFI)

    # K9s: fold from UTG, raise from BTN
    utg_action = evaluator.get_correct_action(Hand("K9s"), utg_scenario)
    btn_action = evaluator.get_correct_action(Hand("K9s"), btn_scenario)

    # BTN should open K9s
    assert btn_action == "raise"


def test_vs_rfi_bb_can_call(evaluator):
    """Test that BB can call vs open raise."""
    scenario = Scenario(
        hero_position=Position.BB,
        action_type=ActionType.VS_RFI,
        villain_position=Position.UTG,
    )

    # 55 should call vs UTG open from BB (small pairs are calls, not 3bets)
    action = evaluator.get_correct_action(Hand("55"), scenario)
    assert action == "call"


def test_vs_rfi_3bet(evaluator):
    """Test 3-betting vs open raise."""
    scenario = Scenario(
        hero_position=Position.BTN,
        action_type=ActionType.VS_RFI,
        villain_position=Position.UTG,
    )

    # AA should 3bet
    action = evaluator.get_correct_action(Hand("AA"), scenario)
    assert action == "3bet"


def test_evaluate_correct(evaluator):
    """Test evaluate returns correct result for right answer."""
    scenario = Scenario(hero_position=Position.UTG, action_type=ActionType.RFI)
    result = evaluator.evaluate(Hand("AA"), scenario, "raise")

    assert result.is_correct
    assert result.correct_action == "raise"
    assert result.player_action == "raise"


def test_evaluate_incorrect(evaluator):
    """Test evaluate returns incorrect result for wrong answer."""
    scenario = Scenario(hero_position=Position.UTG, action_type=ActionType.RFI)
    result = evaluator.evaluate(Hand("AA"), scenario, "fold")

    assert not result.is_correct
    assert result.correct_action == "raise"
    assert result.player_action == "fold"


def test_explanation_included(evaluator):
    """Test that explanations are included in results."""
    scenario = Scenario(hero_position=Position.UTG, action_type=ActionType.RFI)
    result = evaluator.evaluate(Hand("AA"), scenario, "raise")

    assert result.explanation != ""
    assert result.explanation_zh != ""
