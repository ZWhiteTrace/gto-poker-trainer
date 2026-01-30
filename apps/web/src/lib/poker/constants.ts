/**
 * Game timing constants (in milliseconds)
 */
export const TIMING = {
  /** Minimum delay for AI thinking simulation */
  AI_THINKING_MIN: 600,
  /** Random additional delay for AI thinking */
  AI_THINKING_RANDOM: 600,
  /** Delay between street transitions for better UX */
  STREET_TRANSITION: 600,
  /** Delay between cards when running out the board (all-in) */
  ALL_IN_CARD_DELAY: 1200,
} as const;

/**
 * Betting constants (in BB)
 */
export const BETTING = {
  /** Increment for bet slider */
  BET_INCREMENT: 0.5,
  /** Default raise multiplier for preflop */
  DEFAULT_RAISE_MULTIPLIER: 2.5,
  /** Minimum effective stack for short stack play */
  SHORT_STACK_THRESHOLD: 20,
  /** Standard effective stack */
  STANDARD_STACK: 100,
} as const;

/**
 * Table layout constants
 */
export const TABLE = {
  /** Number of players at a 6-max table */
  MAX_PLAYERS: 6,
} as const;
