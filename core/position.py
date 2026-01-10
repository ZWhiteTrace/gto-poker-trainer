"""
Poker table positions.
"""
from enum import Enum
from typing import List


class Position(Enum):
    """Table positions for 6-max and 9-max."""
    # 6-max positions
    UTG = "UTG"      # Under the Gun (first to act preflop)
    HJ = "HJ"        # Hijack
    CO = "CO"        # Cutoff
    BTN = "BTN"      # Button (dealer)
    SB = "SB"        # Small Blind
    BB = "BB"        # Big Blind

    # Additional 9-max positions
    UTG1 = "UTG+1"   # UTG+1
    UTG2 = "UTG+2"   # UTG+2 (sometimes called MP)
    MP = "MP"        # Middle Position

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
            Position.MP: "Middle Position",
        }
        return names.get(self, self.value)

    @property
    def short_name(self) -> str:
        """Short position name for display."""
        return self.value


# Position order (early to late)
POSITIONS_6MAX: List[Position] = [
    Position.UTG,
    Position.HJ,
    Position.CO,
    Position.BTN,
    Position.SB,
    Position.BB,
]

POSITIONS_9MAX: List[Position] = [
    Position.UTG,
    Position.UTG1,
    Position.UTG2,
    Position.MP,
    Position.HJ,
    Position.CO,
    Position.BTN,
    Position.SB,
    Position.BB,
]


def get_positions(format: str = "6max") -> List[Position]:
    """Get positions for given format."""
    if format == "6max":
        return POSITIONS_6MAX
    elif format == "9max":
        return POSITIONS_9MAX
    else:
        raise ValueError(f"Unknown format: {format}")


def positions_after(pos: Position, format: str = "6max") -> List[Position]:
    """Get all positions that act after the given position preflop."""
    positions = get_positions(format)
    idx = positions.index(pos)
    # Preflop order: UTG -> ... -> BTN -> SB -> BB
    return positions[idx + 1:]


def positions_before(pos: Position, format: str = "6max") -> List[Position]:
    """Get all positions that act before the given position preflop."""
    positions = get_positions(format)
    idx = positions.index(pos)
    return positions[:idx]
