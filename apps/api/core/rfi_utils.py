"""
RFI utilities - Single source of truth for RFI range calculations.

All RFI-related logic should derive from rfi_frequencies.json through this module.
This eliminates the need to maintain multiple hardcoded constants across files.
"""
import json
from pathlib import Path
from typing import Dict, List, Set, Optional
from functools import lru_cache

# All 169 hands
RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2']
ALL_HANDS = []
for i, r1 in enumerate(RANKS):
    for j, r2 in enumerate(RANKS):
        if i == j:
            ALL_HANDS.append(f"{r1}{r2}")
        elif i < j:
            ALL_HANDS.append(f"{r1}{r2}s")
        else:
            ALL_HANDS.append(f"{r2}{r1}o")

# Position order (tightest to loosest)
POSITION_ORDER = ["UTG", "HJ", "CO", "BTN", "SB"]

# Premium hands - always excluded from drilling (too obvious)
PREMIUM_HANDS = {"AA", "KK", "QQ", "AKs", "AKo"}

# Absolute trash - always excluded (too far from any boundary)
TRASH_HANDS = {
    "T2s", "92s", "82s", "72s", "62s",
    "93s", "83s", "73s", "94s",
    "72o", "62o",
}


@lru_cache(maxsize=1)
def _load_rfi_data() -> dict:
    """Load RFI frequency data from JSON (cached)."""
    data_path = Path(__file__).parent.parent / "data" / "ranges" / "6max" / "rfi_frequencies.json"
    with open(data_path, 'r') as f:
        return json.load(f)


def get_rfi_data() -> dict:
    """Get the RFI frequency data."""
    return _load_rfi_data()


def get_opening_hands(position: str, min_freq: int = 50) -> Set[str]:
    """
    Get all hands that open (raise) at a position.

    Args:
        position: Position name (UTG, HJ, CO, BTN, SB)
        min_freq: Minimum raise frequency to count as "opening" (default 50%)

    Returns:
        Set of hand strings that open at this position
    """
    data = get_rfi_data()
    pos_data = data.get(position.upper(), {}).get("frequencies", {})
    return {
        hand for hand, freqs in pos_data.items()
        if freqs.get("raise", 0) >= min_freq
    }


def get_mixed_hands(position: str) -> Set[str]:
    """
    Get hands with mixed frequencies (1-99%) at a position.
    These are the most important to practice.
    """
    data = get_rfi_data()
    pos_data = data.get(position.upper(), {}).get("frequencies", {})
    return {
        hand for hand, freqs in pos_data.items()
        if 1 <= freqs.get("raise", 0) <= 99
    }


def get_obvious_hands() -> Set[str]:
    """
    Get hands that are "obvious" opens - all positions open them at 100%.
    These should be faded in visual displays.

    Returns:
        Set of hands that ALL positions open at 100%
    """
    data = get_rfi_data()

    # Start with UTG opens (tightest)
    utg_100 = {
        hand for hand, freqs in data["UTG"]["frequencies"].items()
        if freqs.get("raise", 0) == 100
    }

    # Filter to hands that all positions also open at 100%
    obvious = set()
    for hand in utg_100:
        all_open_100 = True
        for pos in POSITION_ORDER:
            pos_freqs = data[pos]["frequencies"].get(hand, {})
            if pos_freqs.get("raise", 0) != 100:
                all_open_100 = False
                break
        if all_open_100:
            obvious.add(hand)

    return obvious


def get_utg_edge_hands() -> Set[str]:
    """
    Get UTG edge hands - hands at the boundary of UTG's opening range.
    Includes:
    - 100% opens that are at category boundaries (lowest pair, lowest suited, etc.)
    - 50% mixed frequency hands
    - Key offsuit edge hands

    These get gold border in visual display.
    """
    data = get_rfi_data()
    utg_freqs = data["UTG"]["frequencies"]

    edges = set()

    # 1. All mixed frequency hands (50%)
    for hand, freqs in utg_freqs.items():
        if 1 <= freqs.get("raise", 0) <= 99:
            edges.add(hand)

    # 2. Find boundary hands in each category
    # Pairs: lowest opening pair
    opening_pairs = sorted(
        [h for h in utg_freqs if len(h) == 2 and utg_freqs[h].get("raise", 0) >= 50],
        key=lambda x: RANKS.index(x[0]),
        reverse=True  # Lowest first
    )
    if opening_pairs:
        edges.add(opening_pairs[0])  # Lowest opening pair (e.g., 55)

    # Suited Ax: lowest opening
    ax_suited = sorted(
        [h for h in utg_freqs if h.startswith('A') and h.endswith('s') and utg_freqs[h].get("raise", 0) >= 50],
        key=lambda x: RANKS.index(x[1]),
        reverse=True
    )
    if ax_suited:
        edges.add(ax_suited[0])  # Lowest Ax suited (e.g., A2s)

    # Suited Kx: lowest opening
    kx_suited = sorted(
        [h for h in utg_freqs if h.startswith('K') and h.endswith('s') and utg_freqs[h].get("raise", 0) >= 50],
        key=lambda x: RANKS.index(x[1]),
        reverse=True
    )
    if kx_suited:
        edges.add(kx_suited[0])  # Lowest Kx suited (e.g., K8s)

    # Suited Qx: lowest opening
    qx_suited = sorted(
        [h for h in utg_freqs if h.startswith('Q') and h.endswith('s') and utg_freqs[h].get("raise", 0) >= 50],
        key=lambda x: RANKS.index(x[1]),
        reverse=True
    )
    if qx_suited:
        edges.add(qx_suited[0])  # Lowest Qx suited (e.g., Q9s)

    # Suited connectors: lowest opening (non-Ax/Kx/Qx)
    connectors = sorted(
        [h for h in utg_freqs if h.endswith('s') and h[0] in 'JT98765' and utg_freqs[h].get("raise", 0) >= 50],
        key=lambda x: RANKS.index(x[0]),
        reverse=True
    )
    for conn in connectors[:2]:  # Top 2 lowest connectors
        edges.add(conn)

    # Offsuit: lowest opening hands
    offsuit = sorted(
        [h for h in utg_freqs if h.endswith('o') and utg_freqs[h].get("raise", 0) >= 50],
        key=lambda x: (RANKS.index(x[0]), RANKS.index(x[1])),
        reverse=True
    )
    for off in offsuit[:2]:  # Top 2 lowest offsuit
        edges.add(off)

    return edges


def get_btn_edge_hands() -> Set[str]:
    """
    Get BTN edge hands - hands that BTN opens but earlier positions don't.
    These get white border in visual display (BTN-first hands).

    Focus on the lowest card in each category that BTN opens.
    """
    data = get_rfi_data()

    # Get what each position opens
    opens_by_pos = {}
    for pos in POSITION_ORDER:
        opens_by_pos[pos] = get_opening_hands(pos)

    # BTN-first hands (BTN opens but CO doesn't)
    btn_first = opens_by_pos["BTN"] - opens_by_pos["CO"]

    edges = set()

    # Find the lowest in each suited category
    for prefix in ['K', 'Q', 'J', 'T', '9', '8', '7', '6']:
        category = sorted(
            [h for h in btn_first if h.startswith(prefix) and h.endswith('s')],
            key=lambda x: RANKS.index(x[1]),
            reverse=True
        )
        if category:
            edges.add(category[0])  # Lowest in category

    # Offsuit edges
    offsuit = sorted(
        [h for h in btn_first if h.endswith('o')],
        key=lambda x: (RANKS.index(x[0]), RANKS.index(x[1])),
        reverse=True
    )
    for off in offsuit[:6]:  # Top 6 lowest offsuit
        edges.add(off)

    return edges


def get_position_first_opens(position: str) -> Set[str]:
    """
    Get hands that this position opens but earlier positions don't.
    Useful for highlighting "new" hands at each position.
    """
    pos_idx = POSITION_ORDER.index(position.upper())

    current_opens = get_opening_hands(position)

    if pos_idx == 0:
        return current_opens  # UTG - all its opens are "first"

    # Union of all earlier position opens
    earlier_opens = set()
    for earlier_pos in POSITION_ORDER[:pos_idx]:
        earlier_opens |= get_opening_hands(earlier_pos)

    return current_opens - earlier_opens


def get_drillable_hands(position: str) -> List[str]:
    """
    Get hands that should be drilled for a position.

    Logic (v8.0):
    1. Mixed frequency hands (1-99%)
    2. Edge opening hands = lowest opening hand in each category
    3. Edge fold hands = one step below the opening boundary
    4. Offsuit connector fold edges (e.g., QJo for UTG)
    5. Hands adjacent to mixed frequency hands

    Excludes:
    - Premium hands (AA, KK, QQ, AKs, AKo)
    - Trash hands (too far from boundary)
    - Obvious hands (all positions open at 100%, e.g., A2s)
    - Bottom hands with 100% open (no fold edge below)

    Returns:
        List of drillable hand strings
    """
    data = get_rfi_data()
    pos_data = data.get(position.upper(), {}).get("frequencies", {})
    opening = get_opening_hands(position)

    drillable = set()

    # 1. All mixed frequency hands (most important to practice)
    for hand, freqs in pos_data.items():
        if 1 <= freqs.get("raise", 0) <= 99:
            drillable.add(hand)

    # 2. Find edge opening hands (lowest in each category)
    # Pairs: find lowest opening pair
    opening_pairs = [h for h in opening if len(h) == 2]
    if opening_pairs:
        lowest_pair_rank = max(RANKS.index(h[0]) for h in opening_pairs)
        lowest_pair = RANKS[lowest_pair_rank] * 2
        drillable.add(lowest_pair)
        # Also add the fold edge (one below)
        if lowest_pair_rank < len(RANKS) - 1:
            fold_pair = RANKS[lowest_pair_rank + 1] * 2
            if fold_pair not in TRASH_HANDS:
                drillable.add(fold_pair)

    # Suited: find lowest opening in each prefix (A, K, Q, J, T, etc.)
    for prefix in RANKS:
        prefix_suited = [h for h in opening if h.startswith(prefix) and h.endswith('s')]
        if prefix_suited:
            # Find lowest kicker that opens
            lowest_kicker_idx = max(RANKS.index(h[1]) for h in prefix_suited)
            lowest_hand = f"{prefix}{RANKS[lowest_kicker_idx]}s"
            drillable.add(lowest_hand)
            # Add fold edge (one below)
            if lowest_kicker_idx < len(RANKS) - 1:
                fold_hand = f"{prefix}{RANKS[lowest_kicker_idx + 1]}s"
                if fold_hand not in TRASH_HANDS and fold_hand not in opening:
                    drillable.add(fold_hand)

    # Offsuit: find lowest opening in each prefix
    for prefix in RANKS:
        prefix_offsuit = [h for h in opening if h.startswith(prefix) and h.endswith('o')]
        if prefix_offsuit:
            lowest_kicker_idx = max(RANKS.index(h[1]) for h in prefix_offsuit)
            lowest_hand = f"{prefix}{RANKS[lowest_kicker_idx]}o"
            drillable.add(lowest_hand)
            # Add fold edge (one below)
            if lowest_kicker_idx < len(RANKS) - 1:
                fold_hand = f"{prefix}{RANKS[lowest_kicker_idx + 1]}o"
                if fold_hand not in TRASH_HANDS and fold_hand not in opening:
                    drillable.add(fold_hand)

    # 3. Connector edges (for suited connectors like 54s, 65s, etc.)
    connectors_opening = [h for h in opening if h.endswith('s') and
                         RANKS.index(h[1]) - RANKS.index(h[0]) <= 2]  # gap ≤ 2
    if connectors_opening:
        # Find lowest connector that opens
        lowest_conn = max(connectors_opening, key=lambda h: RANKS.index(h[0]))
        drillable.add(lowest_conn)
        # Add fold edge connector
        prefix_idx = RANKS.index(lowest_conn[0])
        kicker_idx = RANKS.index(lowest_conn[1])
        if prefix_idx < len(RANKS) - 1 and kicker_idx < len(RANKS) - 1:
            fold_conn = f"{RANKS[prefix_idx + 1]}{RANKS[kicker_idx + 1]}s"
            if fold_conn not in TRASH_HANDS and fold_conn not in opening:
                drillable.add(fold_conn)

    # 4. Offsuit connector edges - only add FOLD edge (not opening edge)
    # e.g., UTG opens KQo but not QJo → add QJo as fold edge
    all_offsuit_connectors = [f"{RANKS[i]}{RANKS[i+1]}o" for i in range(len(RANKS) - 1)]
    for conn in all_offsuit_connectors:
        if conn not in opening and conn not in TRASH_HANDS:
            # This is the fold edge connector
            drillable.add(conn)
            break  # Only add the first (highest) fold edge

    # 5. Hands adjacent to mixed frequency hands
    # If a hand is mixed (1-99%), also drill the hand one step above it
    for hand, freqs in pos_data.items():
        if 1 <= freqs.get("raise", 0) <= 99:
            # Find the hand one step above (higher kicker, same prefix)
            if hand.endswith('s') or hand.endswith('o'):
                prefix = hand[0]
                kicker = hand[1]
                suffix = hand[2]
                kicker_idx = RANKS.index(kicker)
                if kicker_idx > 0:
                    higher_hand = f"{prefix}{RANKS[kicker_idx - 1]}{suffix}"
                    if higher_hand in opening and higher_hand not in PREMIUM_HANDS:
                        drillable.add(higher_hand)

    # Remove premium and trash
    drillable -= PREMIUM_HANDS
    drillable -= TRASH_HANDS

    # For later positions (BTN, SB), also remove "obvious" hands
    # that all positions open at 100% - these are too easy at loose positions
    # But keep them for earlier positions (UTG, HJ, CO) where they define the range floor
    # Note: Keep X2s hands (Q2s, K2s) as they define BTN/SB range floors
    if position.upper() in ("BTN", "SB"):
        drillable -= get_obvious_hands()

    return sorted(list(drillable))


def get_excluded_hands(position: str) -> Set[str]:
    """
    Get hands that should be EXCLUDED from drilling.
    This is the inverse of get_drillable_hands.
    """
    drillable = set(get_drillable_hands(position))
    return set(ALL_HANDS) - drillable


# Convenience function to clear cache (useful for testing)
def clear_cache():
    """Clear the cached RFI data."""
    _load_rfi_data.cache_clear()
