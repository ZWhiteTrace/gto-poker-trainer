import {
  type Card,
  type PLO4Hand,
  type Board,
  type HandResult,
  HandRank,
  RANK_VALUES,
  type Rank,
  type Suit,
} from "./types";
import { evaluatePLO4Hand } from "./evaluator";
import { categorizeHand, evaluateStartingHandStrength } from "./handCategories";

export interface PLO4QuizQuestion {
  id: string;
  type: "best-hand" | "hand-quality";
  difficulty: "easy" | "medium" | "hard";
  prompt: string;
  promptZh: string;
  scenario: BestHandScenario | HandQualityScenario;
  options: Array<{
    id: string;
    text: string;
    textZh: string;
  }>;
  correctOptionId: string;
  explanation: string;
  explanationZh: string;
  tags: string[];
}

export interface BestHandScenario {
  holeCards: PLO4Hand;
  board: Board;
  correctResult: HandResult;
}

export interface HandQualityScenario {
  handA: PLO4Hand;
  handB: PLO4Hand;
  handACategory: ReturnType<typeof categorizeHand>;
  handBCategory: ReturnType<typeof categorizeHand>;
  handAScore: number;
  handBScore: number;
}

const ALL_RANKS: Rank[] = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
const ALL_SUITS: Suit[] = ["s", "h", "d", "c"];

function buildDeck(): Card[] {
  const deck: Card[] = [];
  for (const rank of ALL_RANKS) {
    for (const suit of ALL_SUITS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function cardStr(c: Card): string {
  return `${c.rank}${c.suit}`;
}

function handRankName(rank: HandRank): string {
  const names: Record<HandRank, string> = {
    [HandRank.RoyalFlush]: "Royal Flush",
    [HandRank.StraightFlush]: "Straight Flush",
    [HandRank.FourOfAKind]: "Four of a Kind",
    [HandRank.FullHouse]: "Full House",
    [HandRank.Flush]: "Flush",
    [HandRank.Straight]: "Straight",
    [HandRank.ThreeOfAKind]: "Three of a Kind",
    [HandRank.TwoPair]: "Two Pair",
    [HandRank.OnePair]: "One Pair",
    [HandRank.HighCard]: "High Card",
  };
  return names[rank];
}

function handRankNameZh(rank: HandRank): string {
  const names: Record<HandRank, string> = {
    [HandRank.RoyalFlush]: "皇家同花順",
    [HandRank.StraightFlush]: "同花順",
    [HandRank.FourOfAKind]: "四條",
    [HandRank.FullHouse]: "葫蘆",
    [HandRank.Flush]: "同花",
    [HandRank.Straight]: "順子",
    [HandRank.ThreeOfAKind]: "三條",
    [HandRank.TwoPair]: "兩對",
    [HandRank.OnePair]: "一對",
    [HandRank.HighCard]: "高牌",
  };
  return names[rank];
}

/**
 * Generate a best-hand quiz question.
 *
 * Deals random 4 hole cards + 5 board cards, evaluates the correct answer,
 * and generates plausible distractors based on common PLO mistakes.
 */
export function generateBestHandQuestion(seed?: number): PLO4QuizQuestion {
  const deck = seed !== undefined ? seededShuffle(buildDeck(), seed) : shuffle(buildDeck());

  const holeCards = deck.slice(0, 4) as PLO4Hand;
  const board = deck.slice(4, 9) as Board;

  const result = evaluatePLO4Hand(holeCards, board);

  const distractors = generateDistractors(result, holeCards, board);
  const correctId = "opt-correct";
  const correctOption = {
    id: correctId,
    text: result.description,
    textZh: `${handRankNameZh(result.rank)}`,
  };

  const allOptions = shuffle([correctOption, ...distractors]);

  const holeStr = holeCards.map(cardStr).join(" ");
  const boardStr = board.map(cardStr).join(" ");

  const usedHole = result.holeCardsUsed.map(cardStr).join(", ");
  const usedBoard = result.boardCardsUsed.map(cardStr).join(", ");

  const difficulty = getDifficulty(result, holeCards, board);

  return {
    id: `bh-${holeCards.map(cardStr).join("")}-${board.map(cardStr).join("")}`,
    type: "best-hand",
    difficulty,
    prompt: `Your hand: ${holeStr}\nBoard: ${boardStr}\n\nWhat is your best hand? (Remember: must use exactly 2 hole cards + 3 board cards)`,
    promptZh: `你的手牌：${holeStr}\n公牌：${boardStr}\n\n你的最佳牌型是什麼？（記住：必須使用剛好 2 張手牌 + 3 張公牌）`,
    scenario: { holeCards, board, correctResult: result },
    options: allOptions,
    correctOptionId: correctId,
    explanation: `Best hand: ${result.description}. Used hole cards ${usedHole} with board cards ${usedBoard}.`,
    explanationZh: `最佳牌型：${handRankNameZh(result.rank)}。使用手牌 ${usedHole} 搭配公牌 ${usedBoard}。`,
    tags: [handRankName(result.rank).toLowerCase().replace(/\s+/g, "-")],
  };
}

export function generateHandQualityQuestion(seed?: number): PLO4QuizQuestion {
  const deck = seed !== undefined ? seededShuffle(buildDeck(), seed) : shuffle(buildDeck());

  for (let offset = 0; offset <= deck.length - 8; offset += 8) {
    const handA = deck.slice(offset, offset + 4) as PLO4Hand;
    const handB = deck.slice(offset + 4, offset + 8) as PLO4Hand;

    const handACategory = categorizeHand(handA);
    const handBCategory = categorizeHand(handB);
    const handAStrength = evaluateStartingHandStrength(handA);
    const handBStrength = evaluateStartingHandStrength(handB);

    const scoreDiff = handAStrength.score - handBStrength.score;
    if (Math.abs(scoreDiff) < 3) continue;
    if (handACategory.categoryKey === handBCategory.categoryKey) continue;

    const handAHigher = scoreDiff > 0;
    const correctOptionId = handAHigher ? "opt-a" : "opt-b";
    const strongerLabel = handAHigher ? "Hand A" : "Hand B";
    const strongerLabelZh = handAHigher ? "手牌 A" : "手牌 B";
    const strongerCategory = handAHigher ? handACategory : handBCategory;
    const weakerCategory = handAHigher ? handBCategory : handACategory;
    const strongerReasons = handAHigher ? handAStrength.reasons : handBStrength.reasons;
    const strongerReasonsZh = handAHigher ? handAStrength.reasonsZh : handBStrength.reasonsZh;

    const difficulty =
      Math.abs(scoreDiff) >= 6 ? "easy" : Math.abs(scoreDiff) >= 4 ? "medium" : "hard";

    return {
      id: `hq-${handA.map(cardStr).join("")}-${handB.map(cardStr).join("")}`,
      type: "hand-quality",
      difficulty,
      prompt:
        "Which PLO4 starting hand is structurally stronger in a vacuum? Ignore table dynamics and compare hand quality only.",
      promptZh:
        "哪一手 PLO4 起手牌在結構上更強？忽略牌桌動態，只比較起手牌本身品質。",
      scenario: {
        handA,
        handB,
        handACategory,
        handBCategory,
        handAScore: handAStrength.score,
        handBScore: handBStrength.score,
      },
      options: [
        { id: "opt-a", text: "Hand A", textZh: "手牌 A" },
        { id: "opt-b", text: "Hand B", textZh: "手牌 B" },
      ],
      correctOptionId,
      explanation: `${strongerLabel} is stronger here. ${strongerCategory.label} beats ${weakerCategory.label} in this comparison because of ${strongerReasons.join(", ")}.`,
      explanationZh: `${strongerLabelZh} 在這題比較強。${strongerCategory.labelZh} 勝過 ${weakerCategory.labelZh}，主要因為：${strongerReasonsZh.join("、")}。`,
      tags: ["hand-quality", strongerCategory.categoryKey],
    };
  }

  throw new Error("Failed to generate a non-ambiguous hand-quality question");
}

/** Generate 3 plausible wrong answers */
function generateDistractors(
  correct: HandResult,
  holeCards: PLO4Hand,
  board: Board
): Array<{ id: string; text: string; textZh: string }> {
  const distractors: Array<{ id: string; text: string; textZh: string }> = [];
  const usedDescriptions = new Set([correct.description]);

  // Distractor 1: one rank below the correct answer
  if (correct.rank > HandRank.HighCard) {
    const lowerRank = correct.rank - 1;
    const name = handRankName(lowerRank as HandRank);
    if (!usedDescriptions.has(name)) {
      distractors.push({
        id: "opt-lower",
        text: name,
        textZh: handRankNameZh(lowerRank as HandRank),
      });
      usedDescriptions.add(name);
    }
  }

  // Distractor 2: one rank above the correct answer (common over-estimation)
  if (correct.rank < HandRank.RoyalFlush) {
    const higherRank = correct.rank + 1;
    const name = handRankName(higherRank as HandRank);
    if (!usedDescriptions.has(name)) {
      distractors.push({
        id: "opt-higher",
        text: name,
        textZh: handRankNameZh(higherRank as HandRank),
      });
      usedDescriptions.add(name);
    }
  }

  // Distractor 3: "using wrong number of hole cards" mistake
  // Check if board alone has a better-looking hand (common PLO mistake)
  const boardOnlyMistake = getBoardOnlyMistake(board);
  if (boardOnlyMistake && !usedDescriptions.has(boardOnlyMistake.text)) {
    distractors.push(boardOnlyMistake);
    usedDescriptions.add(boardOnlyMistake.text);
  }

  // Fill remaining slots with adjacent ranks
  const allRanks = Object.values(HandRank).filter((v): v is HandRank => typeof v === "number");
  for (const rank of allRanks) {
    if (distractors.length >= 3) break;
    const name = handRankName(rank);
    if (!usedDescriptions.has(name)) {
      distractors.push({
        id: `opt-fill-${rank}`,
        text: name,
        textZh: handRankNameZh(rank),
      });
      usedDescriptions.add(name);
    }
  }

  return distractors.slice(0, 3);
}

/** Check if board alone looks like a better hand (common "use 0 hole cards" mistake) */
function getBoardOnlyMistake(board: Board): { id: string; text: string; textZh: string } | null {
  if (board.length < 5) return null;

  const suits = board.map((c) => c.suit);
  const values = board.map((c) => RANK_VALUES[c.rank]).sort((a, b) => b - a);

  const isFlush = suits.filter((s) => s === suits[0]).length >= 5;
  const uniqueVals = [...new Set(values)].sort((a, b) => b - a);
  const isStraight =
    uniqueVals.length >= 5 && uniqueVals[0] - uniqueVals[4] === 4;

  if (isFlush && isStraight) {
    return { id: "opt-board-mistake", text: "Straight Flush (board only)", textZh: "同花順（僅公牌）" };
  }
  if (isFlush) {
    return { id: "opt-board-mistake", text: "Flush (board only)", textZh: "同花（僅公牌）" };
  }
  if (isStraight) {
    return { id: "opt-board-mistake", text: "Straight (board only)", textZh: "順子（僅公牌）" };
  }
  return null;
}

/** Determine difficulty based on how tricky the hand is */
function getDifficulty(
  result: HandResult,
  holeCards: PLO4Hand,
  board: Board
): "easy" | "medium" | "hard" {
  // Easy: high-ranking hands that are obvious
  if (result.rank >= HandRank.FullHouse) return "easy";

  // Hard: when board looks like it has a flush/straight but PLO rules prevent using it
  const boardSuits = board.map((c) => c.suit);
  const suitCounts = new Map<string, number>();
  for (const s of boardSuits) suitCounts.set(s, (suitCounts.get(s) ?? 0) + 1);
  const maxBoardSuit = Math.max(...suitCounts.values());

  // Board has 4+ of one suit but hero has 0-1 of that suit → tricky
  if (maxBoardSuit >= 4) {
    const dominantSuit = [...suitCounts.entries()].find(([, c]) => c === maxBoardSuit)?.[0];
    const heroSuitCount = holeCards.filter((c) => c.suit === dominantSuit).length;
    if (heroSuitCount <= 1) return "hard";
  }

  // Medium: pair/two-pair/trips — need to think about which 2 hole cards
  if (result.rank <= HandRank.TwoPair) return "medium";

  return "medium";
}

/** Deterministic shuffle with seed (for testable generation) */
function seededShuffle<T>(arr: T[], seed: number): T[] {
  const result = [...arr];
  let s = seed;
  for (let i = result.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    const j = s % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
