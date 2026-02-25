"""
Poker table positions.
"""

from enum import Enum


class Position(Enum):
    """Table positions for 6-max games."""

    # 6-max positions
    UTG = "UTG"  # Under the Gun (first to act preflop)
    HJ = "HJ"  # Hijack
    CO = "CO"  # Cutoff
    BTN = "BTN"  # Button (dealer)
    SB = "SB"  # Small Blind
    BB = "BB"  # Big Blind

    # Additional positions (reserved for future use)
    UTG1 = "UTG+1"  # UTG+1 (also: EP2)
    UTG2 = "UTG+2"  # UTG+2 (also: EP3)
    MP = "MP"  # Middle Position (also: LJ - Lojack)

    @property
    def display_name(self) -> str:
        """Human-readable position name."""
        names = {
            Position.UTG: "Under the Gun",
            Position.HJ: "Hijack",
            Position.CO: "Cutoff",
            Position.BTN: "Button",
            Position.SB: "Small Blind",
            Position.BB: "Big Blind",
            Position.UTG1: "UTG+1",
            Position.UTG2: "UTG+2",
            Position.MP: "MP (LJ)",  # Show both common names
        }
        return names.get(self, self.value)

    @property
    def short_name(self) -> str:
        """Short position name for display."""
        return self.value

    @property
    def aliases(self) -> list:
        """Alternative names for this position."""
        alias_map = {
            Position.MP: ["LJ", "Lojack"],
            Position.UTG1: ["EP2"],
            Position.UTG2: ["EP3", "MP1"],
            Position.HJ: ["MP2"],
        }
        return alias_map.get(self, [])


# Position order (early to late)
POSITIONS_6MAX: list[Position] = [
    Position.UTG,
    Position.HJ,
    Position.CO,
    Position.BTN,
    Position.SB,
    Position.BB,
]


def get_positions(format: str = "6max") -> list[Position]:
    """Get positions for 6-max format."""
    return POSITIONS_6MAX


def positions_after(pos: Position, format: str = "6max") -> list[Position]:
    """Get all positions that act after the given position preflop."""
    positions = get_positions(format)
    idx = positions.index(pos)
    # Preflop order: UTG -> ... -> BTN -> SB -> BB
    return positions[idx + 1 :]


def positions_before(pos: Position, format: str = "6max") -> list[Position]:
    """Get all positions that act before the given position preflop."""
    positions = get_positions(format)
    idx = positions.index(pos)
    return positions[:idx]
