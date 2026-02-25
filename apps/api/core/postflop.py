"""
Postflop scenario and evaluation classes.
"""

import json
import random
from dataclasses import dataclass
from enum import Enum
from pathlib import Path

from core.hand import Hand


class PostflopAction(Enum):
    BET = "bet"
    CHECK = "check"
    CALL = "call"
    RAISE = "raise"
    FOLD = "fold"


class FlopTexture(Enum):
    DRY_ACE_HIGH = "dry_ace_high"
    DRY_KING_HIGH = "dry_king_high"
    DRY_MID = "dry_mid"
    DRY_LOW = "dry_low"
    WET_CONNECTED = "wet_connected"
    PAIRED_LOW = "paired_low"
    MONOTONE = "monotone"
    TWO_TONE = "two_tone"


TEXTURE_NAMES = {
    FlopTexture.DRY_ACE_HIGH: ("乾燥A高", "Dry Ace High"),
    FlopTexture.DRY_KING_HIGH: ("乾燥K高", "Dry King High"),
    FlopTexture.DRY_MID: ("乾燥中牌", "Dry Mid"),
    FlopTexture.DRY_LOW: ("乾燥低牌", "Dry Low"),
    FlopTexture.WET_CONNECTED: ("濕潤連接", "Wet Connected"),
    FlopTexture.PAIRED_LOW: ("低對子面", "Paired Low"),
    FlopTexture.MONOTONE: ("單花面", "Monotone"),
    FlopTexture.TWO_TONE: ("雙花面", "Two Tone"),
}


@dataclass
class FlopCard:
    rank: str
    suit: str

    def __str__(self):
        suit_symbols = {"s": "♠", "h": "♥", "d": "♦", "c": "♣"}
        return f"{self.rank}{suit_symbols.get(self.suit, self.suit)}"


@dataclass
class HeroCard:
    """A specific hero card with rank and suit."""

    rank: str
    suit: str

    def __str__(self):
        suit_symbols = {"s": "♠", "h": "♥", "d": "♦", "c": "♣"}
        return f"{self.rank}{suit_symbols.get(self.suit, self.suit)}"


@dataclass
class PostflopScenario:
    """A postflop scenario for c-bet practice."""

    id: str
    preflop: str  # e.g. "BTN open, BB call"
    hero_position: str
    villain_position: str
    pot_type: str  # "srp" or "3bp"
    flop: list[FlopCard]
    texture: FlopTexture
    texture_zh: str
    hero_hand: Hand
    correct_action: PostflopAction
    correct_sizing: str | None  # "33", "50", "66", "75", None
    frequency: int  # GTO frequency %
    explanation_zh: str
    explanation_en: str
    hero_cards: list[HeroCard] | None = None  # Specific cards when suits matter

    @classmethod
    def from_dict(cls, data: dict) -> "PostflopScenario":
        """Create a PostflopScenario from a dictionary."""
        flop = [FlopCard(rank=r, suit=s) for r, s in zip(data["flop"], data["flop_suits"])]

        # Parse specific hero cards if provided (e.g., ["As", "Qd"])
        hero_cards = None
        if "hero_cards" in data and data["hero_cards"]:
            hero_cards = []
            for card_str in data["hero_cards"]:
                # Parse "As" -> rank="A", suit="s"
                rank = card_str[:-1]  # Everything except last char
                suit = card_str[-1].lower()  # Last char is suit
                hero_cards.append(HeroCard(rank=rank, suit=suit))

        return cls(
            id=data["id"],
            preflop=data["preflop"],
            hero_position=data["hero_position"],
            villain_position=data["villain_position"],
            pot_type=data["pot_type"],
            flop=flop,
            texture=FlopTexture(data["texture"]),
            texture_zh=data["texture_zh"],
            hero_hand=Hand(data["hero_hand"]),
            correct_action=PostflopAction(data["correct_action"]),
            correct_sizing=data.get("correct_sizing"),
            frequency=data["frequency"],
            explanation_zh=data["explanation_zh"],
            explanation_en=data["explanation_en"],
            hero_cards=hero_cards,
        )


@dataclass
class PostflopSpot:
    """A practice spot for postflop training."""

    scenario: PostflopScenario
    available_actions: list[PostflopAction]
    available_sizings: list[str]  # For bet/raise: ["25", "33", "50", "66", "75", "100"]


@dataclass
class PostflopResult:
    """Result of checking a postflop answer."""

    is_correct: bool
    action_correct: bool
    sizing_correct: bool | None  # None if check/fold
    correct_action: PostflopAction
    correct_sizing: str | None
    frequency: int
    explanation: str


class PostflopDrill:
    """Drill engine for postflop scenarios."""

    def __init__(self, data_dir: str = None):
        if data_dir is None:
            data_dir = Path(__file__).parent.parent / "data" / "postflop"
        self.data_dir = Path(data_dir)
        self.scenarios: list[PostflopScenario] = []
        self._load_scenarios()

        # Filter options
        self.enabled_pot_types: list[str] = ["srp", "3bp"]
        self.enabled_textures: list[FlopTexture] | None = None

    def _load_scenarios(self):
        """Load all postflop scenarios from JSON files."""
        cbet_file = self.data_dir / "flop_cbet.json"
        if cbet_file.exists():
            with open(cbet_file, encoding="utf-8") as f:
                data = json.load(f)
                for scenario_data in data.get("scenarios", []):
                    self.scenarios.append(PostflopScenario.from_dict(scenario_data))

    def generate_spot(self) -> PostflopSpot | None:
        """Generate a random postflop practice spot."""
        # Filter scenarios
        filtered = self.scenarios

        if self.enabled_pot_types:
            filtered = [s for s in filtered if s.pot_type in self.enabled_pot_types]

        if self.enabled_textures:
            filtered = [s for s in filtered if s.texture in self.enabled_textures]

        if not filtered:
            return None

        scenario = random.choice(filtered)

        # Available actions for c-bet spot
        available_actions = [PostflopAction.CHECK, PostflopAction.BET]
        available_sizings = ["25", "33", "50", "66", "75", "100"]

        return PostflopSpot(
            scenario=scenario,
            available_actions=available_actions,
            available_sizings=available_sizings,
        )

    def check_answer(
        self,
        spot: PostflopSpot,
        user_action: PostflopAction,
        user_sizing: str | None = None,
        lang: str = "zh",
    ) -> PostflopResult:
        """Check if the user's answer is correct."""
        scenario = spot.scenario

        action_correct = user_action == scenario.correct_action

        # Sizing check only applies if correct action is bet/raise
        sizing_correct = None
        if scenario.correct_action in [PostflopAction.BET, PostflopAction.RAISE]:
            if action_correct and scenario.correct_sizing:
                sizing_correct = user_sizing == scenario.correct_sizing

        # Overall correctness
        is_correct = action_correct
        if sizing_correct is not None:
            is_correct = action_correct and sizing_correct

        explanation = scenario.explanation_zh if lang == "zh" else scenario.explanation_en

        return PostflopResult(
            is_correct=is_correct,
            action_correct=action_correct,
            sizing_correct=sizing_correct,
            correct_action=scenario.correct_action,
            correct_sizing=scenario.correct_sizing,
            frequency=scenario.frequency,
            explanation=explanation,
        )
