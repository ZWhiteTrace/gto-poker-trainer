"""
Postflop outs calculator and quiz module.
Calculates outs, draw types, and equity based on hole cards + board.
"""

import random
from dataclasses import dataclass
from enum import Enum

# Card ranks and suits
RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"]
SUITS = ["s", "h", "d", "c"]  # spades, hearts, diamonds, clubs
SUIT_SYMBOLS = {"s": "♠", "h": "♥", "d": "♦", "c": "♣"}

RANK_VALUES = {r: i for i, r in enumerate(RANKS)}


@dataclass
class Card:
    """A single playing card."""

    rank: str  # '2'-'9', 'T', 'J', 'Q', 'K', 'A'
    suit: str  # 's', 'h', 'd', 'c'

    def __str__(self):
        return f"{self.rank}{SUIT_SYMBOLS[self.suit]}"

    def __hash__(self):
        return hash((self.rank, self.suit))

    def __eq__(self, other):
        return self.rank == other.rank and self.suit == other.suit

    @property
    def value(self) -> int:
        return RANK_VALUES[self.rank]

    @classmethod
    def from_string(cls, s: str) -> "Card":
        """Parse card from string like 'As', 'Kh', 'Td'."""
        return cls(rank=s[0].upper(), suit=s[1].lower())


class DrawType(Enum):
    """Types of draws."""

    FLUSH_DRAW = "flush_draw"  # 4 to a flush (9 outs)
    OESD = "oesd"  # Open-ended straight draw (8 outs)
    GUTSHOT = "gutshot"  # Gutshot straight draw (4 outs)
    DOUBLE_GUTSHOT = "double_gutshot"  # Double gutshot (8 outs)
    OVERCARDS = "overcards"  # Two overcards (6 outs)
    ONE_OVERCARD = "one_overcard"  # One overcard (3 outs)
    SET_DRAW = "set_draw"  # Pocket pair to set (2 outs)
    TWO_PAIR_DRAW = "two_pair_draw"  # One pair to two pair (5 outs)
    COMBO_DRAW = "combo_draw"  # Flush draw + straight draw


class HandStrength(Enum):
    """Current hand strength categories."""

    HIGH_CARD = 0
    ONE_PAIR = 1
    TWO_PAIR = 2
    THREE_OF_A_KIND = 3
    STRAIGHT = 4
    FLUSH = 5
    FULL_HOUSE = 6
    FOUR_OF_A_KIND = 7
    STRAIGHT_FLUSH = 8
    ROYAL_FLUSH = 9


@dataclass
class OutsResult:
    """Result of outs calculation."""

    hand_strength: HandStrength
    hand_description: str
    hand_description_zh: str
    draws: list[tuple[DrawType, int, list["Card"]]]  # (draw type, outs count, specific out cards)
    total_outs: int
    turn_probability: float  # Probability of hitting on turn
    river_probability: float  # Probability of hitting on turn OR river
    out_cards: list[Card]  # Specific cards that are outs
    notes: list[str]


def create_deck() -> list[Card]:
    """Create a standard 52-card deck."""
    return [Card(r, s) for r in RANKS for s in SUITS]


def parse_cards(cards_str: str) -> list[Card]:
    """Parse cards from string like 'AsKh' or 'As Kh Qd'."""
    cards_str = cards_str.replace(" ", "")
    cards = []
    i = 0
    while i < len(cards_str):
        cards.append(Card.from_string(cards_str[i : i + 2]))
        i += 2
    return cards


def count_suits(cards: list[Card]) -> dict:
    """Count cards by suit."""
    counts = {"s": 0, "h": 0, "d": 0, "c": 0}
    for card in cards:
        counts[card.suit] += 1
    return counts


def count_ranks(cards: list[Card]) -> dict:
    """Count cards by rank."""
    counts = {r: 0 for r in RANKS}
    for card in cards:
        counts[card.rank] += 1
    return counts


def get_rank_values(cards: list[Card]) -> list[int]:
    """Get sorted rank values."""
    return sorted([c.value for c in cards])


def has_flush(cards: list[Card]) -> str | None:
    """Check if 5+ cards of same suit. Returns suit or None."""
    suit_counts = count_suits(cards)
    for suit, count in suit_counts.items():
        if count >= 5:
            return suit
    return None


def has_straight(cards: list[Card]) -> bool:
    """Check if there's a 5-card straight."""
    values = set(c.value for c in cards)
    # Check for A-2-3-4-5 (wheel)
    if {12, 0, 1, 2, 3}.issubset(values):
        return True
    # Check for regular straights
    for i in range(9):  # 0-4 through 8-12
        if all(v in values for v in range(i, i + 5)):
            return True
    return False


def evaluate_hand_strength(
    hole_cards: list[Card], board: list[Card]
) -> tuple[HandStrength, str, str]:
    """
    Evaluate the current hand strength.
    Returns (strength, description_en, description_zh)
    """
    all_cards = hole_cards + board
    rank_counts = count_ranks(all_cards)
    count_suits(all_cards)

    # Count pairs, trips, quads
    pairs = [r for r, c in rank_counts.items() if c == 2]
    trips = [r for r, c in rank_counts.items() if c == 3]
    quads = [r for r, c in rank_counts.items() if c == 4]

    # Check for flush
    flush_suit = has_flush(all_cards)

    # Check for straight
    is_straight = has_straight(all_cards)

    # Evaluate from strongest to weakest
    if flush_suit and is_straight:
        flush_cards = [c for c in all_cards if c.suit == flush_suit]
        if has_straight(flush_cards):
            values = set(c.value for c in flush_cards)
            if {8, 9, 10, 11, 12}.issubset(values):
                return HandStrength.ROYAL_FLUSH, "Royal Flush", "皇家同花順"
            return HandStrength.STRAIGHT_FLUSH, "Straight Flush", "同花順"

    if quads:
        return HandStrength.FOUR_OF_A_KIND, f"Four of a Kind ({quads[0]}s)", f"四條 {quads[0]}"

    if trips and pairs:
        return (
            HandStrength.FULL_HOUSE,
            f"Full House ({trips[0]}s full of {pairs[0]}s)",
            f"葫蘆 {trips[0]} 帶 {pairs[0]}",
        )

    if flush_suit:
        return HandStrength.FLUSH, f"Flush ({flush_suit})", "同花"

    if is_straight:
        return HandStrength.STRAIGHT, "Straight", "順子"

    if trips:
        return HandStrength.THREE_OF_A_KIND, f"Three of a Kind ({trips[0]}s)", f"三條 {trips[0]}"

    if len(pairs) >= 2:
        sorted_pairs = sorted(pairs, key=lambda r: RANK_VALUES[r], reverse=True)
        return (
            HandStrength.TWO_PAIR,
            f"Two Pair ({sorted_pairs[0]}s and {sorted_pairs[1]}s)",
            f"兩對 {sorted_pairs[0]} 和 {sorted_pairs[1]}",
        )

    if pairs:
        # Check if pair uses hole cards
        hole_ranks = [c.rank for c in hole_cards]
        if pairs[0] in hole_ranks:
            return HandStrength.ONE_PAIR, f"Pair of {pairs[0]}s", f"一對 {pairs[0]}"
        else:
            return HandStrength.ONE_PAIR, f"Pair of {pairs[0]}s (board)", f"一對 {pairs[0]} (公牌)"

    # High card - get highest hole card
    high_card = max(hole_cards, key=lambda c: c.value)
    return HandStrength.HIGH_CARD, f"High Card ({high_card.rank})", f"高牌 {high_card.rank}"


def calculate_outs(hole_cards: list[Card], board: list[Card]) -> OutsResult:
    """
    Calculate outs for improving the hand.

    Args:
        hole_cards: List of 2 hole cards
        board: List of 3-5 board cards (flop, turn, river)

    Returns:
        OutsResult with all outs information
    """
    all_cards = hole_cards + board
    remaining_deck = [c for c in create_deck() if c not in all_cards]

    # Current hand strength
    strength, desc_en, desc_zh = evaluate_hand_strength(hole_cards, board)

    draws = []
    out_cards = set()
    notes = []

    # Helper to format rank (T -> 10)
    def fmt_rank(r):
        return "10" if r == "T" else r

    # Check for flush draw
    suit_counts = count_suits(all_cards)
    for suit, count in suit_counts.items():
        if count == 4:
            # Flush draw - 9 outs
            flush_outs = [c for c in remaining_deck if c.suit == suit]
            draws.append((DrawType.FLUSH_DRAW, len(flush_outs), flush_outs))
            out_cards.update(flush_outs)
            notes.append(f"同花聽牌 ({SUIT_SYMBOLS[suit]}): 9張{SUIT_SYMBOLS[suit]}")

    # Check for straight draws
    values = sorted(set(c.value for c in all_cards))

    # OESD check (open-ended straight draw)
    for i in range(len(values) - 3):
        seq = values[i : i + 4]
        if seq[-1] - seq[0] == 3:  # 4 consecutive
            # Check both ends
            low_out = seq[0] - 1
            high_out = seq[-1] + 1
            oesd_outs = []
            if low_out >= 0:
                oesd_outs.extend([c for c in remaining_deck if c.value == low_out])
            if high_out <= 12:
                oesd_outs.extend([c for c in remaining_deck if c.value == high_out])
            if len(oesd_outs) == 8:
                draws.append((DrawType.OESD, 8, oesd_outs))
                out_cards.update(oesd_outs)
                low_rank = RANKS[low_out] if low_out >= 0 else None
                high_rank = RANKS[high_out] if high_out <= 12 else None
                notes.append(
                    f"兩頭順子聽牌 (OESD): {fmt_rank(low_rank) if low_rank else ''} 或 {fmt_rank(high_rank) if high_rank else ''}"
                )

    # Gutshot check
    for target_low in range(9):  # Check all possible straights
        straight_ranks = set(range(target_low, target_low + 5))
        held = straight_ranks.intersection(set(values))
        missing = straight_ranks - set(values)
        if len(held) == 4 and len(missing) == 1:
            missing_val = list(missing)[0]
            gutshot_outs = [c for c in remaining_deck if c.value == missing_val]
            if gutshot_outs and DrawType.OESD not in [d[0] for d in draws]:
                missing_rank = RANKS[missing_val]
                draws.append((DrawType.GUTSHOT, len(gutshot_outs), gutshot_outs))
                out_cards.update(gutshot_outs)
                notes.append(f"卡順聽牌 (Gutshot): 需要 {fmt_rank(missing_rank)}")
                break

    # Check for overcards (if we have high card)
    if strength == HandStrength.HIGH_CARD:
        board_high = max(c.value for c in board)
        hole_high_cards = [c for c in hole_cards if c.value > board_high]
        if len(hole_high_cards) == 2:
            # Two overcards = 6 outs (3 per card)
            overcard_outs = [
                c for c in remaining_deck if c.rank in [hc.rank for hc in hole_high_cards]
            ]
            draws.append((DrawType.OVERCARDS, len(overcard_outs), overcard_outs))
            out_cards.update(overcard_outs)
            ranks_str = " ".join([fmt_rank(hc.rank) for hc in hole_high_cards])
            notes.append(f"兩張高牌 (Overcards): {ranks_str}")
        elif len(hole_high_cards) == 1:
            # One overcard = 3 outs
            overcard_outs = [c for c in remaining_deck if c.rank == hole_high_cards[0].rank]
            draws.append((DrawType.ONE_OVERCARD, len(overcard_outs), overcard_outs))
            out_cards.update(overcard_outs)
            notes.append(f"一張高牌: {fmt_rank(hole_high_cards[0].rank)}")

    # Check for set draw (pocket pair)
    hole_ranks = [c.rank for c in hole_cards]
    if hole_ranks[0] == hole_ranks[1] and strength.value < HandStrength.THREE_OF_A_KIND.value:
        set_outs = [c for c in remaining_deck if c.rank == hole_ranks[0]]
        draws.append((DrawType.SET_DRAW, len(set_outs), set_outs))
        out_cards.update(set_outs)
        notes.append(f"聽暗三: {fmt_rank(hole_ranks[0])}")

    # Calculate total outs (remove duplicates for combo draws)
    total_outs = len(out_cards)

    # Calculate probabilities
    remaining_cards = 52 - len(all_cards)
    if len(board) == 3:  # Flop
        turn_prob = total_outs / remaining_cards * 100
        # River probability uses rule of 4 approximation (or exact calculation)
        river_prob = (
            1
            - ((remaining_cards - total_outs) / remaining_cards)
            * ((remaining_cards - 1 - total_outs) / (remaining_cards - 1))
        ) * 100
    else:  # Turn
        turn_prob = total_outs / remaining_cards * 100
        river_prob = turn_prob

    return OutsResult(
        hand_strength=strength,
        hand_description=desc_en,
        hand_description_zh=desc_zh,
        draws=draws,
        total_outs=total_outs,
        turn_probability=round(turn_prob, 1),
        river_probability=round(river_prob, 1),
        out_cards=list(out_cards),
        notes=notes,
    )


@dataclass
class OutsQuestion:
    """A single outs quiz question."""

    hole_cards: list[Card]
    board: list[Card]
    result: OutsResult
    question_type: str  # "outs_count" or "probability"


class OutsQuiz:
    """Quiz engine for outs calculation practice."""

    def __init__(self):
        self.scenarios = self._generate_scenarios()

    def _generate_scenarios(self) -> list[dict]:
        """Generate interesting scenarios for practice."""
        # Pre-defined interesting scenarios
        return [
            # Flush draws
            {"hole": "AsKs", "board": "Qs7s2h", "desc": "Nut flush draw"},
            {"hole": "JsTs", "board": "9s8h2c", "desc": "Flush draw + OESD"},
            {"hole": "AhKh", "board": "Qh5h3c", "desc": "Flush draw + overcards"},
            # Straight draws
            {"hole": "JhTc", "board": "9s8d2h", "desc": "Open-ended straight draw"},
            {"hole": "QhJc", "board": "Ts8d3h", "desc": "Gutshot straight draw"},
            {"hole": "9h8h", "board": "7s6d2c", "desc": "OESD with suited"},
            # Overcards
            {"hole": "AhKc", "board": "Qs7d3h", "desc": "Two overcards"},
            {"hole": "AhQc", "board": "Js8d4h", "desc": "Ace high with overcard"},
            # Set draws
            {"hole": "JhJc", "board": "Ks8d4h", "desc": "Pocket pair under"},
            {"hole": "7h7c", "board": "As9d3h", "desc": "Small pocket pair"},
            # Combo draws
            {"hole": "AsQs", "board": "Ks Js 4h", "desc": "Royal flush draw"},
            {"hole": "8h7h", "board": "9h6h2c", "desc": "Flush draw + OESD (monster)"},
        ]

    def generate_question(self, question_type: str = "outs_count") -> OutsQuestion:
        """Generate a random outs question."""
        scenario = random.choice(self.scenarios)

        hole_cards = parse_cards(scenario["hole"])
        board = parse_cards(scenario["board"])
        result = calculate_outs(hole_cards, board)

        return OutsQuestion(
            hole_cards=hole_cards,
            board=board,
            result=result,
            question_type=question_type,
        )

    def generate_choices(self, question: OutsQuestion, num_choices: int = 4) -> list[int]:
        """Generate multiple choice options for outs count."""
        correct = question.result.total_outs

        # Generate plausible wrong answers
        choices = {correct}
        deltas = [-4, -2, -1, 1, 2, 4, 6]

        while len(choices) < num_choices:
            delta = random.choice(deltas)
            wrong = correct + delta
            if wrong > 0 and wrong not in choices:
                choices.add(wrong)

        return sorted(list(choices))

    def check_answer(self, question: OutsQuestion, answer: int) -> bool:
        """Check if the answer is correct."""
        if question.question_type == "outs_count":
            return answer == question.result.total_outs
        return False
