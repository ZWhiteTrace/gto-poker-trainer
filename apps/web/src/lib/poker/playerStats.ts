/**
 * Player Statistics for AI Adaptation
 * Tracks hero's playing tendencies so AI can adjust their strategy
 */

export interface PlayerStats {
  handsPlayed: number;
  handsVPIP: number;      // Voluntarily put $ in pot (call/raise preflop)
  handsPFR: number;       // Preflop raise count
  foldTo3BetCount: number;
  faced3BetCount: number;
}

export const INITIAL_PLAYER_STATS: PlayerStats = {
  handsPlayed: 0,
  handsVPIP: 0,
  handsPFR: 0,
  foldTo3BetCount: 0,
  faced3BetCount: 0,
};

/**
 * Calculate VPIP (Voluntarily Put $ In Pot)
 * Standard poker stat showing how often a player enters the pot
 */
export function getPlayerVPIP(stats: PlayerStats): number {
  if (stats.handsPlayed === 0) return 0.25; // Default assumption
  return stats.handsVPIP / stats.handsPlayed;
}

/**
 * Calculate PFR (Preflop Raise)
 * Shows how often a player raises preflop
 */
export function getPlayerPFR(stats: PlayerStats): number {
  if (stats.handsPlayed === 0) return 0.20; // Default assumption
  return stats.handsPFR / stats.handsPlayed;
}

/**
 * Calculate Fold to 3-bet
 */
export function getFoldTo3Bet(stats: PlayerStats): number {
  if (stats.faced3BetCount === 0) return 0.55; // Default assumption
  return stats.foldTo3BetCount / stats.faced3BetCount;
}

/**
 * Determine player style based on stats
 */
export function getPlayerStyle(stats: PlayerStats): "tight" | "loose" | "balanced" {
  const vpip = getPlayerVPIP(stats);
  if (vpip < 0.18) return "tight";
  if (vpip > 0.32) return "loose";
  return "balanced";
}
