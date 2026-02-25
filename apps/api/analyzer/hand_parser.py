"""
GGPoker Hand History Parser
Parses GGPoker hand history files into structured data.
"""

import re
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum


class Street(Enum):
    PREFLOP = "preflop"
    FLOP = "flop"
    TURN = "turn"
    RIVER = "river"
    SHOWDOWN = "showdown"


class ActionType(Enum):
    FOLD = "fold"
    CHECK = "check"
    CALL = "call"
    BET = "bet"
    RAISE = "raise"
    POST_SB = "post_sb"
    POST_BB = "post_bb"
    SHOW = "show"
    MUCK = "muck"


@dataclass
class Action:
    player: str
    action_type: ActionType
    amount: float | None = None
    to_amount: float | None = None  # For raises "raises $X to $Y"


@dataclass
class Player:
    name: str
    seat: int
    stack: float
    is_hero: bool = False
    hole_cards: str | None = None
    position: str | None = None  # BTN, SB, BB, UTG, etc.


@dataclass
class HandHistory:
    hand_id: str
    timestamp: datetime
    table_name: str
    game_type: str
    stakes: tuple[float, float]  # (small_blind, big_blind)
    max_players: int
    button_seat: int

    players: list[Player] = field(default_factory=list)
    hero: Player | None = None

    # Actions by street
    preflop_actions: list[Action] = field(default_factory=list)
    flop_actions: list[Action] = field(default_factory=list)
    turn_actions: list[Action] = field(default_factory=list)
    river_actions: list[Action] = field(default_factory=list)

    # Board cards
    flop: str | None = None
    turn: str | None = None
    river: str | None = None

    # Results
    pot: float = 0
    rake: float = 0
    winners: dict[str, float] = field(default_factory=dict)

    # Raw text for reference
    raw_text: str = ""


class GGPokerParser:
    """Parser for GGPoker hand history format."""

    # Position mapping based on seat relative to button
    POSITION_MAP_6MAX = {
        0: "BTN",
        1: "SB",
        2: "BB",
        3: "UTG",
        4: "HJ",
        5: "CO",
    }

    def __init__(self):
        self.hands: list[HandHistory] = []

    def parse_file(self, filepath: str) -> list[HandHistory]:
        """Parse a GGPoker hand history file."""
        with open(filepath, encoding="utf-8") as f:
            content = f.read()
        return self.parse_content(content)

    def parse_content(self, content: str) -> list[HandHistory]:
        """Parse hand history content string."""
        # Split by hand separator (double newline before "Poker Hand #")
        hand_texts = re.split(r"\n\n+(?=Poker Hand #)", content.strip())

        hands = []
        for hand_text in hand_texts:
            if hand_text.strip():
                try:
                    hand = self._parse_single_hand(hand_text.strip())
                    if hand:
                        hands.append(hand)
                except Exception as e:
                    print(f"Error parsing hand: {e}")
                    continue

        self.hands = hands
        return hands

    def _parse_single_hand(self, text: str) -> HandHistory | None:
        """Parse a single hand history."""
        lines = text.strip().split("\n")
        if not lines:
            return None

        # Parse header line
        # Poker Hand #HD2689368869: Hold'em No Limit ($0.01/$0.02) - 2026/01/19 13:34:25
        header_match = re.match(
            r"Poker Hand #(\w+): (.+?) \(\$?([\d.]+)/\$?([\d.]+)\) - (\d{4}/\d{2}/\d{2} \d{2}:\d{2}:\d{2})",
            lines[0],
        )
        if not header_match:
            return None

        hand_id = header_match.group(1)
        game_type = header_match.group(2)
        sb = float(header_match.group(3))
        bb = float(header_match.group(4))
        timestamp = datetime.strptime(header_match.group(5), "%Y/%m/%d %H:%M:%S")

        # Parse table info
        # Table 'NLHWhite15' 6-max Seat #1 is the button
        table_match = re.match(r"Table '(.+?)' (\d+)-max Seat #(\d+) is the button", lines[1])
        if not table_match:
            return None

        table_name = table_match.group(1)
        max_players = int(table_match.group(2))
        button_seat = int(table_match.group(3))

        hand = HandHistory(
            hand_id=hand_id,
            timestamp=timestamp,
            table_name=table_name,
            game_type=game_type,
            stakes=(sb, bb),
            max_players=max_players,
            button_seat=button_seat,
            raw_text=text,
        )

        # Parse players
        current_line = 2
        while current_line < len(lines) and lines[current_line].startswith("Seat "):
            player = self._parse_player_line(lines[current_line])
            if player:
                hand.players.append(player)
                if player.is_hero:
                    hand.hero = player
            current_line += 1

        # Calculate positions
        self._assign_positions(hand)

        # Parse actions
        current_street = Street.PREFLOP

        for line in lines[current_line:]:
            line = line.strip()
            if not line:
                continue

            # Street markers
            if line.startswith("*** HOLE CARDS ***"):
                current_street = Street.PREFLOP
                continue
            elif line.startswith("*** FLOP ***"):
                current_street = Street.FLOP
                flop_match = re.search(r"\[(.+?)\]", line)
                if flop_match:
                    hand.flop = flop_match.group(1)
                continue
            elif line.startswith("*** TURN ***"):
                current_street = Street.TURN
                turn_match = re.search(r"\] \[(.+?)\]$", line)
                if turn_match:
                    hand.turn = turn_match.group(1)
                continue
            elif line.startswith("*** RIVER ***"):
                current_street = Street.RIVER
                river_match = re.search(r"\] \[(.+?)\]$", line)
                if river_match:
                    hand.river = river_match.group(1)
                continue
            elif line.startswith("*** SHOWDOWN ***") or line.startswith("*** SUMMARY ***"):
                current_street = Street.SHOWDOWN
                continue

            # Parse dealt cards
            if line.startswith("Dealt to Hero"):
                cards_match = re.search(r"\[(.+?)\]", line)
                if cards_match and hand.hero:
                    hand.hero.hole_cards = cards_match.group(1)
                continue

            # Parse actions
            action = self._parse_action_line(line)
            if action:
                if current_street == Street.PREFLOP:
                    hand.preflop_actions.append(action)
                elif current_street == Street.FLOP:
                    hand.flop_actions.append(action)
                elif current_street == Street.TURN:
                    hand.turn_actions.append(action)
                elif current_street == Street.RIVER:
                    hand.river_actions.append(action)

            # Parse pot/rake from summary
            if "Total pot" in line:
                pot_match = re.search(r"Total pot \$?([\d.]+)", line)
                rake_match = re.search(r"Rake \$?([\d.]+)", line)
                if pot_match:
                    hand.pot = float(pot_match.group(1))
                if rake_match:
                    hand.rake = float(rake_match.group(1))

            # Parse winners
            if "collected" in line and "from pot" in line:
                win_match = re.match(r"(\w+) collected \$?([\d.]+)", line)
                if win_match:
                    hand.winners[win_match.group(1)] = float(win_match.group(2))
            elif " won " in line:
                win_match = re.search(r"(\w+) .*won \(\$?([\d.]+)\)", line)
                if win_match:
                    hand.winners[win_match.group(1)] = float(win_match.group(2))

        return hand

    def _parse_player_line(self, line: str) -> Player | None:
        """Parse a player seat line."""
        # Seat 5: Hero ($3.49 in chips)
        match = re.match(r"Seat (\d+): (\w+) \(\$?([\d.]+) in chips\)", line)
        if match:
            seat = int(match.group(1))
            name = match.group(2)
            stack = float(match.group(3))
            is_hero = name == "Hero"
            return Player(name=name, seat=seat, stack=stack, is_hero=is_hero)
        return None

    def _parse_action_line(self, line: str) -> Action | None:
        """Parse an action line."""
        # Skip non-action lines
        if ":" not in line:
            return None
        if line.startswith("Dealt to") or line.startswith("Seat "):
            return None
        if "collected" in line or "returned" in line:
            return None
        if "shows" in line or "mucks" in line:
            return None

        parts = line.split(": ", 1)
        if len(parts) != 2:
            return None

        player = parts[0]
        action_str = parts[1].lower()

        if action_str == "folds":
            return Action(player=player, action_type=ActionType.FOLD)
        elif action_str == "checks":
            return Action(player=player, action_type=ActionType.CHECK)
        elif action_str.startswith("calls"):
            amount_match = re.search(r"\$?([\d.]+)", action_str)
            amount = float(amount_match.group(1)) if amount_match else None
            return Action(player=player, action_type=ActionType.CALL, amount=amount)
        elif action_str.startswith("bets"):
            amount_match = re.search(r"\$?([\d.]+)", action_str)
            amount = float(amount_match.group(1)) if amount_match else None
            return Action(player=player, action_type=ActionType.BET, amount=amount)
        elif action_str.startswith("raises"):
            # raises $0.04 to $0.06
            raise_match = re.search(r"raises \$?([\d.]+) to \$?([\d.]+)", action_str)
            if raise_match:
                return Action(
                    player=player,
                    action_type=ActionType.RAISE,
                    amount=float(raise_match.group(1)),
                    to_amount=float(raise_match.group(2)),
                )
        elif "posts small blind" in action_str:
            amount_match = re.search(r"\$?([\d.]+)", action_str)
            amount = float(amount_match.group(1)) if amount_match else None
            return Action(player=player, action_type=ActionType.POST_SB, amount=amount)
        elif "posts big blind" in action_str:
            amount_match = re.search(r"\$?([\d.]+)", action_str)
            amount = float(amount_match.group(1)) if amount_match else None
            return Action(player=player, action_type=ActionType.POST_BB, amount=amount)

        return None

    def _assign_positions(self, hand: HandHistory):
        """Assign position names to players based on button position."""
        if not hand.players:
            return

        # Sort players by seat
        players_by_seat = {p.seat: p for p in hand.players}
        seats = sorted(players_by_seat.keys())

        # Find button index in seat list
        btn_idx = None
        for i, seat in enumerate(seats):
            if seat == hand.button_seat:
                btn_idx = i
                break

        if btn_idx is None:
            return

        # Assign positions
        num_players = len(seats)
        for i, seat in enumerate(seats):
            # Calculate position relative to button
            relative_pos = (i - btn_idx) % num_players

            if num_players == 6:
                position = self.POSITION_MAP_6MAX.get(relative_pos, f"Seat{seat}")
            else:
                # For other table sizes, use generic position names
                if relative_pos == 0:
                    position = "BTN"
                elif relative_pos == 1:
                    position = "SB"
                elif relative_pos == 2:
                    position = "BB"
                elif relative_pos == num_players - 1:
                    position = "CO"
                elif relative_pos == num_players - 2:
                    position = "HJ"
                else:
                    position = f"EP{relative_pos - 2}"

            players_by_seat[seat].position = position


def format_hand_summary(hand: HandHistory) -> str:
    """Format a hand for display."""
    lines = []
    lines.append(f"=== Hand #{hand.hand_id} ===")
    lines.append(f"Table: {hand.table_name} | Stakes: ${hand.stakes[0]}/${hand.stakes[1]}")
    lines.append(f"Time: {hand.timestamp}")
    lines.append("")

    if hand.hero:
        lines.append(
            f"Hero: {hand.hero.position} | {hand.hero.hole_cards} | Stack: ${hand.hero.stack:.2f}"
        )

    lines.append("")
    lines.append("Players:")
    for p in hand.players:
        hero_marker = " (Hero)" if p.is_hero else ""
        lines.append(f"  {p.position}: {p.name}{hero_marker} - ${p.stack:.2f}")

    # Preflop
    if hand.preflop_actions:
        lines.append("")
        lines.append("Preflop:")
        for action in hand.preflop_actions:
            lines.append(
                f"  {action.player}: {action.action_type.value}"
                + (f" ${action.amount:.2f}" if action.amount else "")
                + (f" to ${action.to_amount:.2f}" if action.to_amount else "")
            )

    # Flop
    if hand.flop:
        lines.append("")
        lines.append(f"Flop: [{hand.flop}]")
        for action in hand.flop_actions:
            lines.append(
                f"  {action.player}: {action.action_type.value}"
                + (f" ${action.amount:.2f}" if action.amount else "")
            )

    # Turn
    if hand.turn:
        lines.append("")
        lines.append(f"Turn: [{hand.flop}] [{hand.turn}]")
        for action in hand.turn_actions:
            lines.append(
                f"  {action.player}: {action.action_type.value}"
                + (f" ${action.amount:.2f}" if action.amount else "")
            )

    # River
    if hand.river:
        lines.append("")
        lines.append(f"River: [{hand.flop}] [{hand.turn}] [{hand.river}]")
        for action in hand.river_actions:
            lines.append(
                f"  {action.player}: {action.action_type.value}"
                + (f" ${action.amount:.2f}" if action.amount else "")
            )

    # Results
    lines.append("")
    lines.append(f"Pot: ${hand.pot:.2f} | Rake: ${hand.rake:.2f}")
    if hand.winners:
        for winner, amount in hand.winners.items():
            lines.append(f"Winner: {winner} - ${amount:.2f}")

    return "\n".join(lines)


# Test function
if __name__ == "__main__":
    import sys

    if len(sys.argv) > 1:
        parser = GGPokerParser()
        hands = parser.parse_file(sys.argv[1])
        print(f"Parsed {len(hands)} hands")
        for hand in hands[:3]:  # Print first 3
            print(format_hand_summary(hand))
            print("\n" + "=" * 50 + "\n")
