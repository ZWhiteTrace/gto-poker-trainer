"""
ICM (Independent Chip Model) Calculator for MTT Poker.

ICM calculates the real-money equity of chip stacks based on:
- Current chip distribution among players
- Prize pool structure (payouts for each finishing position)

Uses the Malmuth-Harville formula to calculate finish probabilities.
"""

from dataclasses import dataclass


@dataclass
class ICMResult:
    """Result of ICM calculation."""

    stacks: list[int]
    payouts: list[float]
    equities: list[float]  # $ equity for each player
    equity_pcts: list[float]  # Percentage of prize pool


def calculate_finish_probability(
    stacks: list[int], player_idx: int, position: int, excluded: tuple[int, ...] = ()
) -> float:
    """
    Calculate probability of a player finishing in a specific position.

    Uses Malmuth-Harville model: P(player finishes) proportional to chip stack.

    Args:
        stacks: List of chip stacks
        player_idx: Index of player to calculate for
        position: Finishing position (0 = 1st, 1 = 2nd, etc.)
        excluded: Tuple of player indices already finished

    Returns:
        Probability of finishing in that position
    """
    if player_idx in excluded:
        return 0.0

    # Base case: first place probability
    if position == 0:
        remaining_chips = sum(s for i, s in enumerate(stacks) if i not in excluded)
        if remaining_chips == 0:
            return 0.0
        return stacks[player_idx] / remaining_chips

    # Recursive case: calculate via Malmuth-Harville
    prob = 0.0
    remaining_chips = sum(s for i, s in enumerate(stacks) if i not in excluded)

    if remaining_chips == 0:
        return 0.0

    for other_idx in range(len(stacks)):
        if other_idx in excluded or other_idx == player_idx:
            continue

        # Probability that other_idx wins first among remaining
        other_first_prob = stacks[other_idx] / remaining_chips

        # Then calculate player's probability of position-1 among rest
        new_excluded = excluded + (other_idx,)
        prob += other_first_prob * calculate_finish_probability(
            stacks, player_idx, position - 1, new_excluded
        )

    return prob


def calculate_icm_equity(stacks: list[int], payouts: list[float]) -> ICMResult:
    """
    Calculate ICM equity for each player.

    Args:
        stacks: List of chip stacks for each player
        payouts: List of payouts (1st place, 2nd place, etc.)

    Returns:
        ICMResult with equity calculations
    """
    n_players = len(stacks)
    n_payouts = len(payouts)

    # Handle edge cases
    if n_players == 0:
        return ICMResult(stacks=[], payouts=payouts, equities=[], equity_pcts=[])

    # Remove players with 0 chips (busted)
    active_stacks = [(i, s) for i, s in enumerate(stacks) if s > 0]

    if len(active_stacks) == 0:
        return ICMResult(
            stacks=stacks,
            payouts=payouts,
            equities=[0.0] * n_players,
            equity_pcts=[0.0] * n_players,
        )

    # If only one player left, they get 1st place
    if len(active_stacks) == 1:
        equities = [0.0] * n_players
        equities[active_stacks[0][0]] = payouts[0] if payouts else 0.0
        total_payout = sum(payouts)
        equity_pcts = [e / total_payout * 100 if total_payout > 0 else 0 for e in equities]
        return ICMResult(stacks=stacks, payouts=payouts, equities=equities, equity_pcts=equity_pcts)

    # Calculate equity for each player
    equities = [0.0] * n_players

    for player_idx in range(n_players):
        if stacks[player_idx] == 0:
            continue

        # Sum expected value across all finishing positions
        for position in range(min(n_payouts, n_players)):
            prob = calculate_finish_probability(stacks, player_idx, position)
            equities[player_idx] += prob * payouts[position]

    total_payout = sum(payouts[: min(n_payouts, n_players)])
    equity_pcts = [e / total_payout * 100 if total_payout > 0 else 0 for e in equities]

    return ICMResult(stacks=stacks, payouts=payouts, equities=equities, equity_pcts=equity_pcts)


def calculate_icm_pressure(
    stacks: list[int], payouts: list[float], player_idx: int, pot_size: int
) -> dict:
    """
    Calculate ICM pressure for a specific player in a pot.

    Compares the ICM equity change from winning vs losing the pot.
    Higher pressure = more risk-averse play needed.

    Args:
        stacks: Current chip stacks
        payouts: Prize pool structure
        player_idx: Player we're calculating for
        pot_size: Size of the pot being contested

    Returns:
        Dictionary with ICM pressure metrics
    """
    current_icm = calculate_icm_equity(stacks, payouts)
    current_equity = current_icm.equities[player_idx]

    # Calculate equity if we win the pot
    win_stacks = stacks.copy()
    win_stacks[player_idx] += pot_size
    win_icm = calculate_icm_equity(win_stacks, payouts)
    win_equity = win_icm.equities[player_idx]

    # Calculate equity if we lose (assume bust out if pot >= our stack)
    lose_stacks = stacks.copy()
    lose_stacks[player_idx] = max(0, lose_stacks[player_idx] - pot_size)
    lose_icm = calculate_icm_equity(lose_stacks, payouts)
    lose_equity = lose_icm.equities[player_idx]

    gain = win_equity - current_equity
    loss = current_equity - lose_equity

    # ICM pressure ratio: how much more you lose vs gain
    pressure_ratio = loss / gain if gain > 0 else float("inf")

    return {
        "current_equity": current_equity,
        "win_equity": win_equity,
        "lose_equity": lose_equity,
        "potential_gain": gain,
        "potential_loss": loss,
        "pressure_ratio": pressure_ratio,
        "pressure_level": _get_pressure_level(pressure_ratio),
    }


def _get_pressure_level(ratio: float) -> str:
    """Categorize ICM pressure level."""
    if ratio <= 1.1:
        return "low"
    elif ratio <= 1.5:
        return "medium"
    elif ratio <= 2.0:
        return "high"
    else:
        return "extreme"


def get_standard_payouts(n_players: int, buyin: float = 100) -> list[float]:
    """
    Generate standard MTT payout structure.

    Args:
        n_players: Number of players
        buyin: Buy-in amount

    Returns:
        List of payouts
    """
    prize_pool = n_players * buyin

    # Standard payout structures
    if n_players <= 3:
        pct = [1.0, 0.0, 0.0][:n_players]
    elif n_players <= 6:
        pct = [0.65, 0.35, 0.0, 0.0, 0.0, 0.0][:n_players]
    elif n_players <= 9:
        pct = [0.50, 0.30, 0.20, 0, 0, 0, 0, 0, 0][:n_players]
    elif n_players <= 18:
        pct = [0.40, 0.25, 0.18, 0.12, 0.05, 0, 0, 0, 0][: min(5, n_players)]
    else:
        # Larger field - top 15% pay
        pct = [0.30, 0.20, 0.15, 0.10, 0.08, 0.06, 0.05, 0.04, 0.02]
        paying_spots = max(9, int(n_players * 0.15))
        pct = pct[:paying_spots]

    return [prize_pool * p for p in pct]


# Quick utility functions
def icm_ev(stacks: list[int], payouts: list[float]) -> list[float]:
    """Convenience function to get just the equity values."""
    return calculate_icm_equity(stacks, payouts).equities


def chip_ev(stacks: list[int], prize_pool: float) -> list[float]:
    """Calculate simple chip EV (proportional to chips)."""
    total_chips = sum(stacks)
    if total_chips == 0:
        return [0.0] * len(stacks)
    return [s / total_chips * prize_pool for s in stacks]


def icm_vs_chip_ev_diff(stacks: list[int], payouts: list[float]) -> list[float]:
    """Calculate the difference between ICM and chip EV for each player."""
    icm_equities = icm_ev(stacks, payouts)
    prize_pool = sum(payouts)
    chip_equities = chip_ev(stacks, prize_pool)
    return [icm - chip for icm, chip in zip(icm_equities, chip_equities)]
