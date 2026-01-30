/**
 * Player Statistics for AI Adaptation and Performance Tracking
 * Tracks hero's playing tendencies so AI can adjust their strategy
 */

import type { HeroStats } from "./types";
import { DEFAULT_HERO_STATS } from "./types";

// Re-export for backward compatibility
export type PlayerStats = HeroStats;
export const INITIAL_PLAYER_STATS = DEFAULT_HERO_STATS;

// ============================================
// Basic Stats Calculations
// ============================================

/**
 * Calculate VPIP (Voluntarily Put $ In Pot)
 * Standard poker stat showing how often a player enters the pot
 */
export function getPlayerVPIP(stats: HeroStats): number {
  if (stats.handsPlayed === 0) return 0.25; // Default assumption
  return stats.handsVPIP / stats.handsPlayed;
}

/**
 * Calculate PFR (Preflop Raise)
 * Shows how often a player raises preflop
 */
export function getPlayerPFR(stats: HeroStats): number {
  if (stats.handsPlayed === 0) return 0.20; // Default assumption
  return stats.handsPFR / stats.handsPlayed;
}

/**
 * Calculate 3-Bet percentage
 */
export function getPlayer3Bet(stats: HeroStats): number {
  if (stats.threeBetOpportunity === 0) return 0.08; // Default assumption
  return stats.threeBetCount / stats.threeBetOpportunity;
}

/**
 * Calculate Fold to 3-bet
 */
export function getFoldTo3Bet(stats: HeroStats): number {
  if (stats.faced3BetCount === 0) return 0.55; // Default assumption
  return stats.foldTo3BetCount / stats.faced3BetCount;
}

// ============================================
// Steal Stats
// ============================================

/**
 * Calculate ATS (Attempt to Steal)
 * Raise from CO/BTN/SB when action is folded to you
 */
export function getPlayerATS(stats: HeroStats): number {
  if (stats.stealOpportunities === 0) return 0.35; // Default assumption
  return stats.stealAttempts / stats.stealOpportunities;
}

// ============================================
// Continuation Bet Stats
// ============================================

/**
 * Calculate Flop C-Bet percentage
 */
export function getFlopCBet(stats: HeroStats): number {
  if (stats.flopCBetOpportunity === 0) return 0.55; // Default assumption
  return stats.flopCBet / stats.flopCBetOpportunity;
}

/**
 * Calculate Turn C-Bet percentage
 */
export function getTurnCBet(stats: HeroStats): number {
  if (stats.turnCBetOpportunity === 0) return 0.50; // Default assumption
  return stats.turnCBet / stats.turnCBetOpportunity;
}

/**
 * Calculate River C-Bet percentage
 */
export function getRiverCBet(stats: HeroStats): number {
  if (stats.riverCBetOpportunity === 0) return 0.45; // Default assumption
  return stats.riverCBet / stats.riverCBetOpportunity;
}

// ============================================
// Facing C-Bet Stats
// ============================================

/**
 * Calculate Fold to C-Bet percentage
 */
export function getFoldToCBet(stats: HeroStats): number {
  if (stats.facedCBet === 0) return 0.42; // Default assumption
  return stats.foldToCBet / stats.facedCBet;
}

/**
 * Calculate Call C-Bet percentage
 */
export function getCallCBet(stats: HeroStats): number {
  if (stats.facedCBet === 0) return 0.45; // Default assumption
  return stats.callCBet / stats.facedCBet;
}

/**
 * Calculate Raise C-Bet percentage
 */
export function getRaiseCBet(stats: HeroStats): number {
  if (stats.facedCBet === 0) return 0.12; // Default assumption
  return stats.raiseCBet / stats.facedCBet;
}

// ============================================
// Showdown Stats
// ============================================

/**
 * Calculate WTSD (Went to Showdown)
 * How often player goes to showdown when seeing flop
 */
export function getWTSD(stats: HeroStats): number {
  if (stats.handsPlayed === 0) return 0.28; // Default assumption
  return stats.wentToShowdown / stats.handsPlayed;
}

/**
 * Calculate W$SD (Won $ at Showdown)
 * How often player wins when going to showdown
 */
export function getWSD(stats: HeroStats): number {
  if (stats.wentToShowdown === 0) return 0.52; // Default assumption
  return stats.wonAtShowdown / stats.wentToShowdown;
}

// ============================================
// Aggression Stats
// ============================================

/**
 * Calculate TAF (Total Aggression Factor)
 * (Bets + Raises) / Calls
 * Higher = more aggressive
 */
export function getTAF(stats: HeroStats): number {
  if (stats.totalCalls === 0) return 2.0; // Default assumption
  return (stats.totalBets + stats.totalRaises) / stats.totalCalls;
}

/**
 * Calculate Check-Raise percentage
 */
export function getCheckRaise(stats: HeroStats): number {
  if (stats.checkRaiseOpportunity === 0) return 0.08; // Default assumption
  return stats.checkRaiseCount / stats.checkRaiseOpportunity;
}

// ============================================
// Player Style Analysis
// ============================================

/**
 * Determine player style based on stats
 */
export function getPlayerStyle(stats: HeroStats): "tight" | "loose" | "balanced" {
  const vpip = getPlayerVPIP(stats);
  if (vpip < 0.18) return "tight";
  if (vpip > 0.32) return "loose";
  return "balanced";
}

/**
 * Get aggression level
 */
export function getAggressionLevel(stats: HeroStats): "passive" | "balanced" | "aggressive" {
  const taf = getTAF(stats);
  if (taf < 1.5) return "passive";
  if (taf > 3.0) return "aggressive";
  return "balanced";
}

/**
 * Get player type (TAG, LAG, Nit, Fish, etc.)
 */
export function getPlayerType(stats: HeroStats): string {
  const vpip = getPlayerVPIP(stats);
  const pfr = getPlayerPFR(stats);
  const taf = getTAF(stats);

  // Calculate gap between VPIP and PFR
  const gap = vpip - pfr;

  if (vpip < 0.15 && pfr < 0.12) return "Nit";
  if (vpip < 0.22 && pfr > 0.16 && taf > 2.5) return "TAG";
  if (vpip > 0.28 && pfr > 0.22 && taf > 2.5) return "LAG";
  if (vpip > 0.35 && gap > 0.15) return "Calling Station";
  if (vpip > 0.40 && taf > 3.5) return "Maniac";
  if (vpip > 0.35 && taf < 1.5) return "Fish";

  return "Regular";
}

// ============================================
// Stats Summary for Display
// ============================================

export interface StatsSummary {
  // Preflop
  vpip: number;
  pfr: number;
  threeBet: number;
  ats: number;
  foldTo3Bet: number;

  // Postflop - C-Bet
  flopCB: number;
  turnCB: number;
  riverCB: number;

  // Postflop - Facing C-Bet
  foldToCB: number;
  callCB: number;
  raiseCB: number;

  // Showdown
  wtsd: number;
  wsd: number;

  // Aggression
  taf: number;
  checkRaise: number;

  // Meta
  playerType: string;
  handsPlayed: number;
}

export function getStatsSummary(stats: HeroStats): StatsSummary {
  return {
    vpip: getPlayerVPIP(stats),
    pfr: getPlayerPFR(stats),
    threeBet: getPlayer3Bet(stats),
    ats: getPlayerATS(stats),
    foldTo3Bet: getFoldTo3Bet(stats),

    flopCB: getFlopCBet(stats),
    turnCB: getTurnCBet(stats),
    riverCB: getRiverCBet(stats),

    foldToCB: getFoldToCBet(stats),
    callCB: getCallCBet(stats),
    raiseCB: getRaiseCBet(stats),

    wtsd: getWTSD(stats),
    wsd: getWSD(stats),

    taf: getTAF(stats),
    checkRaise: getCheckRaise(stats),

    playerType: getPlayerType(stats),
    handsPlayed: stats.handsPlayed,
  };
}
