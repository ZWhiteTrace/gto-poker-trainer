"""
Hand representation for poker.
Supports notation like: AA, AKs, AKo, T9s, 72o
"""

import random
from dataclasses import dataclass

RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"]
SUITS = ["s", "h", "d", "c"]  # spades, hearts, diamonds, clubs
SUIT_SYMBOLS = {"s": "\u2660", "h": "\u2665", "d": "\u2666", "c": "\u2663"}


# All 169 unique starting hands
def generate_all_hands() -> list[str]:
    """Generate all 169 unique starting hands."""
    hands = []
    for i, r1 in enumerate(RANKS):
        for j, r2 in enumerate(RANKS):
            if i == j:
                # Pocket pair
                hands.append(f"{r1}{r2}")
            elif i < j:
                # Suited (higher rank first)
                hands.append(f"{r1}{r2}s")
            else:
                # Offsuit (higher rank first)
                hands.append(f"{r2}{r1}o")
    return hands


ALL_HANDS = generate_all_hands()


@dataclass
class Hand:
    """Represents a poker starting hand."""

    notation: str  # e.g., "AKs", "QQ", "T9o"

    def __post_init__(self):
        self.notation = self._normalize(self.notation)

    @staticmethod
    def _normalize(notation: str) -> str:
        """Normalize hand notation (higher rank first)."""
        notation = notation.upper().replace("10", "T")
        if len(notation) == 2:
            # Pocket pair
            return notation
        elif len(notation) == 3:
            r1, r2, suit = notation[0], notation[1], notation[2].lower()
            # Ensure higher rank first
            if RANKS.index(r1) > RANKS.index(r2):
                r1, r2 = r2, r1
            return f"{r1}{r2}{suit}"
        else:
            raise ValueError(f"Invalid hand notation: {notation}")

    @property
    def rank1(self) -> str:
        return self.notation[0]

    @property
    def rank2(self) -> str:
        return self.notation[1]

    @property
    def is_pair(self) -> bool:
        return len(self.notation) == 2 or self.rank1 == self.rank2

    @property
    def is_suited(self) -> bool:
        return len(self.notation) == 3 and self.notation[2].lower() == "s"

    @property
    def is_offsuit(self) -> bool:
        return len(self.notation) == 3 and self.notation[2].lower() == "o"

    @property
    def grid_position(self) -> tuple[int, int]:
        """Return (row, col) position in 13x13 grid."""
        row = RANKS.index(self.rank1)
        col = RANKS.index(self.rank2)
        return (row, col)

    def to_display(self, with_suits: bool = False) -> str:
        """Return display string, optionally with suit symbols."""
        if not with_suits:
            return self.notation
        # Generate random specific cards for display
        r1, r2 = self.rank1, self.rank2
        if self.is_pair:
            s1, s2 = random.sample(SUITS, 2)
        elif self.is_suited:
            s1 = s2 = random.choice(SUITS)
        else:
            s1, s2 = random.sample(SUITS, 2)
        return f"{r1}{SUIT_SYMBOLS[s1]}{r2}{SUIT_SYMBOLS[s2]}"

    def __str__(self) -> str:
        return self.notation

    def __eq__(self, other) -> bool:
        if isinstance(other, Hand):
            return self.notation == other.notation
        elif isinstance(other, str):
            return self.notation == Hand._normalize(other)
        return False

    def __hash__(self) -> int:
        return hash(self.notation)


def random_hand() -> Hand:
    """Generate a random starting hand."""
    return Hand(random.choice(ALL_HANDS))


def parse_range(range_str: str) -> list[Hand]:
    """
    Parse a range string into list of hands.
    Examples:
        "AA, KK, QQ" -> [Hand("AA"), Hand("KK"), Hand("QQ")]
        "AKs, AQs+" -> [Hand("AKs"), Hand("AQs"), Hand("AKs")]
        "TT+" -> [Hand("TT"), Hand("JJ"), Hand("QQ"), Hand("KK"), Hand("AA")]
        "A5s-A2s" -> [Hand("A5s"), Hand("A4s"), Hand("A3s"), Hand("A2s")]
    """
    hands = []
    parts = [p.strip() for p in range_str.split(",")]

    for part in parts:
        part = part.upper().replace("10", "T")

        if not part:
            continue

        if "-" in part:
            # Range like "A5s-A2s" or "JJ-88"
            start, end = part.split("-")
            hands.extend(_expand_dash_range(start.strip(), end.strip()))
        elif part.endswith("+"):
            # Range like "TT+" or "AQs+"
            base = part[:-1]
            hands.extend(_expand_plus_range(base))
        else:
            # Single hand
            hands.append(Hand(part))

    return hands


def _expand_plus_range(base: str) -> list[Hand]:
    """Expand TT+ to TT, JJ, QQ, KK, AA or AQs+ to AQs, AKs."""
    hands = []

    if len(base) == 2 and base[0] == base[1]:
        # Pocket pair like TT+
        start_idx = RANKS.index(base[0])
        for i in range(start_idx + 1):
            hands.append(Hand(f"{RANKS[i]}{RANKS[i]}"))
    elif len(base) == 3:
        # Suited/offsuit like AQs+ or KJo+
        high, low, suit = base[0], base[1], base[2]
        high_idx = RANKS.index(high)
        low_idx = RANKS.index(low)
        for i in range(high_idx + 1, low_idx + 1):
            hands.append(Hand(f"{high}{RANKS[i]}{suit}"))

    return hands


def _expand_dash_range(start: str, end: str) -> list[Hand]:
    """Expand A5s-A2s or JJ-88 style ranges."""
    hands = []

    if len(start) == 2 and start[0] == start[1]:
        # Pair range like JJ-88
        start_idx = RANKS.index(start[0])
        end_idx = RANKS.index(end[0])
        for i in range(start_idx, end_idx + 1):
            hands.append(Hand(f"{RANKS[i]}{RANKS[i]}"))
    elif len(start) == 3:
        # Suited/offsuit range like A5s-A2s
        high = start[0]
        suit = start[2]
        start_low_idx = RANKS.index(start[1])
        end_low_idx = RANKS.index(end[1])
        for i in range(start_low_idx, end_low_idx + 1):
            hands.append(Hand(f"{high}{RANKS[i]}{suit}"))

    return hands
