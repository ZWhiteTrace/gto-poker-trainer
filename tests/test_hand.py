"""Tests for Hand class."""
import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from core.hand import Hand, parse_range, ALL_HANDS, RANKS


def test_hand_creation():
    """Test basic hand creation."""
    h = Hand("AKs")
    assert str(h) == "AKs"
    assert h.rank1 == "A"
    assert h.rank2 == "K"
    assert h.is_suited
    assert not h.is_offsuit
    assert not h.is_pair


def test_pocket_pair():
    """Test pocket pair hands."""
    h = Hand("AA")
    assert h.is_pair
    assert not h.is_suited
    assert h.rank1 == "A"
    assert h.rank2 == "A"


def test_hand_normalization():
    """Test that hands are normalized correctly."""
    # Lower rank should be second
    h1 = Hand("KAs")
    assert str(h1) == "AKs"

    h2 = Hand("2Ao")
    assert str(h2) == "A2o"

    # Case insensitive
    h3 = Hand("aks")
    assert str(h3) == "AKs"


def test_hand_equality():
    """Test hand equality."""
    h1 = Hand("AKs")
    h2 = Hand("AKs")
    h3 = Hand("AKo")

    assert h1 == h2
    assert h1 != h3
    assert h1 == "AKs"


def test_all_hands_count():
    """Test that ALL_HANDS has 169 unique hands."""
    assert len(ALL_HANDS) == 169


def test_parse_range_single():
    """Test parsing single hands."""
    hands = parse_range("AKs")
    assert len(hands) == 1
    assert hands[0] == "AKs"


def test_parse_range_multiple():
    """Test parsing multiple hands."""
    hands = parse_range("AA, KK, QQ")
    assert len(hands) == 3
    assert Hand("AA") in hands
    assert Hand("KK") in hands
    assert Hand("QQ") in hands


def test_parse_range_plus():
    """Test parsing plus notation."""
    # Pair plus
    hands = parse_range("TT+")
    assert len(hands) == 5  # TT, JJ, QQ, KK, AA
    assert Hand("TT") in hands
    assert Hand("AA") in hands
    assert Hand("99") not in hands


def test_parse_range_dash():
    """Test parsing dash notation."""
    hands = parse_range("JJ-88")
    assert len(hands) == 4  # JJ, TT, 99, 88
    assert Hand("JJ") in hands
    assert Hand("88") in hands
    assert Hand("QQ") not in hands


def test_grid_position():
    """Test grid position calculation."""
    # AA should be at (0, 0)
    h1 = Hand("AA")
    assert h1.grid_position == (0, 0)

    # 22 should be at (12, 12)
    h2 = Hand("22")
    assert h2.grid_position == (12, 12)

    # AKs should be at (0, 1) - suited above diagonal
    h3 = Hand("AKs")
    assert h3.grid_position == (0, 1)
