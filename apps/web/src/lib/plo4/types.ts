export type Suit = "s" | "h" | "d" | "c";

export type Rank =
  | "A"
  | "K"
  | "Q"
  | "J"
  | "T"
  | "9"
  | "8"
  | "7"
  | "6"
  | "5"
  | "4"
  | "3"
  | "2";

export interface Card {
  rank: Rank;
  suit: Suit;
}

/** PLO4 hand: exactly 4 hole cards */
export type PLO4Hand = [Card, Card, Card, Card];

/** Community board: 3 (flop), 4 (turn), or 5 (river) cards */
export type Board = Card[];

/** Standard poker hand rankings, ordered best to worst */
export enum HandRank {
  RoyalFlush = 10,
  StraightFlush = 9,
  FourOfAKind = 8,
  FullHouse = 7,
  Flush = 6,
  Straight = 5,
  ThreeOfAKind = 4,
  TwoPair = 3,
  OnePair = 2,
  HighCard = 1,
}

export interface HandResult {
  rank: HandRank;
  /** Human-readable name, e.g. "Full House, Kings full of Sevens" */
  description: string;
  /** The 5 cards that make up the best hand (2 from hole + 3 from board) */
  bestFive: [Card, Card, Card, Card, Card];
  /** Which 2 hole cards were used */
  holeCardsUsed: [Card, Card];
  /** Which 3 board cards were used */
  boardCardsUsed: [Card, Card, Card];
}

/** Rank numeric value for comparison (A=14, K=13, ..., 2=2) */
export const RANK_VALUES: Record<Rank, number> = {
  A: 14,
  K: 13,
  Q: 12,
  J: 11,
  T: 10,
  "9": 9,
  "8": 8,
  "7": 7,
  "6": 6,
  "5": 5,
  "4": 4,
  "3": 3,
  "2": 2,
};
