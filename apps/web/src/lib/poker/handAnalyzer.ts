// ============================================
// Hand History Analyzer - GTO Deviation Analysis
// ============================================

import type {
  HandHistory,
  HandHistoryAction,
  Card,
  Position,
  ActionType,
  Street,
  HoleCards,
} from "./types";
import {
  querySolverStrategy,
  type SolverQueryResult,
} from "./solverClient";

// ============================================
// Types
// ============================================

export interface DecisionPoint {
  street: Street;
  actionIndex: number;
  heroAction: HandHistoryAction;
  board: Card[];
  pot: number;
  facingBet: number;
  isIP: boolean; // Is hero in position
}

export interface GTOComparison {
  decisionPoint: DecisionPoint;
  heroAction: ActionType;
  heroAmount?: number;
  gtoStrategy: SolverQueryResult | null;

  // Analysis results
  deviationScore: number; // 0-100, higher = bigger mistake
  deviationType: "correct" | "minor" | "significant" | "major";

  // GTO recommendation
  recommendedAction: ActionType;
  recommendedFrequency: number;
  heroActionFrequency: number; // GTO frequency for hero's action

  // Explanation
  analysis: string;
  analysisZh: string;
}

export interface HandAnalysis {
  handId: string;
  timestamp: number;
  heroPosition: Position;
  heroCards: HoleCards | null;
  heroProfit: number;

  // Decision analysis
  decisions: GTOComparison[];

  // Summary
  totalDeviationScore: number;
  averageDeviationScore: number;
  biggestMistake: GTOComparison | null;

  // Overall grade
  grade: "A" | "B" | "C" | "D" | "F";
  gradeDescription: string;
  gradeDescriptionZh: string;
}

// ============================================
// Helper Functions
// ============================================

function getBoardAtStreet(history: HandHistory, street: Street): Card[] {
  const board: Card[] = [];

  if (street === "preflop") return board;

  if (history.board.flop) {
    board.push(...history.board.flop);
  }

  if (street === "flop") return board;

  if (history.board.turn) {
    board.push(history.board.turn);
  }

  if (street === "turn") return board;

  if (history.board.river) {
    board.push(history.board.river);
  }

  return board;
}

function calculatePotAtAction(
  history: HandHistory,
  street: Street,
  actionIndex: number
): { pot: number; facingBet: number } {
  let pot = history.blinds.sb + history.blinds.bb;
  let currentBet = history.blinds.bb;

  const streets: Street[] = ["preflop", "flop", "turn", "river"];
  const streetIndex = streets.indexOf(street);

  // Sum up all previous streets
  for (let s = 0; s < streetIndex; s++) {
    const streetName = streets[s] as keyof typeof history.actions;
    for (const action of history.actions[streetName]) {
      if (action.amount) {
        pot += action.amount;
      }
    }
    currentBet = 0; // Reset at new street
  }

  // Sum up actions in current street up to this point
  const currentStreetActions = history.actions[street as keyof typeof history.actions];
  for (let i = 0; i < actionIndex; i++) {
    const action = currentStreetActions[i];
    if (action.amount) {
      pot += action.amount;
      if (action.action === "bet" || action.action === "raise" || action.action === "allin") {
        currentBet = action.amount;
      }
    }
  }

  return { pot, facingBet: currentBet };
}

function isHeroInPosition(heroPosition: Position, villainPosition: Position): boolean {
  const positionOrder: Position[] = ["SB", "BB", "UTG", "HJ", "CO", "BTN"];
  return positionOrder.indexOf(heroPosition) > positionOrder.indexOf(villainPosition);
}

function findVillainPosition(history: HandHistory, heroPosition: Position): Position {
  // Find the main villain (usually the one who put in the most action)
  const activePlayers = history.players.filter(p => p.position !== heroPosition);

  // For simplicity, return BB if hero is IP, or BTN if hero is OOP
  if (heroPosition === "SB" || heroPosition === "BB") {
    return "BTN";
  }
  return "BB";
}

// ============================================
// Decision Point Extraction
// ============================================

function extractHeroDecisions(history: HandHistory): DecisionPoint[] {
  const decisions: DecisionPoint[] = [];
  const heroPosition = history.heroPosition;

  const streets: Street[] = ["preflop", "flop", "turn", "river"];

  for (const street of streets) {
    const actions = history.actions[street as keyof typeof history.actions];

    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];

      if (action.position === heroPosition) {
        const { pot, facingBet } = calculatePotAtAction(history, street, i);
        const board = getBoardAtStreet(history, street);
        const villainPos = findVillainPosition(history, heroPosition);

        decisions.push({
          street,
          actionIndex: i,
          heroAction: action,
          board,
          pot,
          facingBet,
          isIP: isHeroInPosition(heroPosition, villainPos),
        });
      }
    }
  }

  return decisions;
}

// ============================================
// GTO Comparison
// ============================================

function calculateDeviationScore(
  heroAction: ActionType,
  heroFrequency: number,
  recommendedAction: ActionType,
  recommendedFrequency: number
): { score: number; type: GTOComparison["deviationType"] } {
  // If hero's action has high GTO frequency, it's correct
  if (heroFrequency >= 40) {
    return { score: 0, type: "correct" };
  }

  if (heroFrequency >= 20) {
    return { score: 25, type: "minor" };
  }

  if (heroFrequency >= 5) {
    return { score: 50, type: "significant" };
  }

  // Hero's action has <5% GTO frequency - major mistake
  const score = Math.min(100, 100 - heroFrequency);
  return { score, type: "major" };
}

function mapActionToSolverKey(action: ActionType): string {
  switch (action) {
    case "fold": return "fold";
    case "check": return "check";
    case "call": return "call";
    case "bet": return "bet";
    case "raise": return "raise";
    case "allin": return "raise"; // All-in is a form of raise
    default: return action;
  }
}

function getActionFrequencyFromStrategy(
  strategy: SolverQueryResult["strategy"],
  action: ActionType
): number {
  if (!strategy) return 0;

  // Map action to possible keys in strategy
  const actionKey = mapActionToSolverKey(action);

  // Check for exact match first
  if (actionKey in strategy) {
    return strategy[actionKey as keyof typeof strategy] as number;
  }

  // Check for bet/raise variants
  if (action === "bet" || action === "raise" || action === "allin") {
    let total = 0;
    for (const [key, value] of Object.entries(strategy)) {
      if (key.startsWith("bet_") || key.startsWith("raise_") || key === "bet" || key === "raise") {
        total += value as number;
      }
    }
    return total;
  }

  return 0;
}

function getRecommendedAction(strategy: SolverQueryResult["strategy"]): { action: ActionType; frequency: number } {
  if (!strategy) {
    return { action: "check", frequency: 0 };
  }

  let maxFreq = 0;
  let maxAction: ActionType = "check";

  for (const [key, value] of Object.entries(strategy)) {
    const freq = value as number;
    if (freq > maxFreq) {
      maxFreq = freq;

      // Map key back to ActionType
      if (key === "fold") maxAction = "fold";
      else if (key === "check") maxAction = "check";
      else if (key === "call") maxAction = "call";
      else if (key.startsWith("bet")) maxAction = "bet";
      else if (key.startsWith("raise")) maxAction = "raise";
    }
  }

  return { action: maxAction, frequency: maxFreq };
}

function generateAnalysis(
  heroAction: ActionType,
  heroFrequency: number,
  recommendedAction: ActionType,
  recommendedFrequency: number,
  deviationType: GTOComparison["deviationType"]
): { en: string; zh: string } {
  if (deviationType === "correct") {
    return {
      en: `Good decision. ${heroAction} is a standard GTO play here (${heroFrequency.toFixed(0)}% frequency).`,
      zh: `正確決策。${heroAction} 是標準 GTO 打法 (${heroFrequency.toFixed(0)}% 頻率)。`,
    };
  }

  if (deviationType === "minor") {
    return {
      en: `Acceptable play. While ${recommendedAction} is preferred (${recommendedFrequency.toFixed(0)}%), your ${heroAction} (${heroFrequency.toFixed(0)}%) is still part of the GTO strategy.`,
      zh: `可接受的打法。雖然 ${recommendedAction} 更好 (${recommendedFrequency.toFixed(0)}%)，但你的 ${heroAction} (${heroFrequency.toFixed(0)}%) 仍在 GTO 策略範圍內。`,
    };
  }

  if (deviationType === "significant") {
    return {
      en: `Questionable play. GTO suggests ${recommendedAction} (${recommendedFrequency.toFixed(0)}%) over ${heroAction} (${heroFrequency.toFixed(0)}%). Consider adjusting.`,
      zh: `存疑打法。GTO 建議 ${recommendedAction} (${recommendedFrequency.toFixed(0)}%) 而非 ${heroAction} (${heroFrequency.toFixed(0)}%)。建議調整。`,
    };
  }

  return {
    en: `Major mistake. ${heroAction} has only ${heroFrequency.toFixed(0)}% GTO frequency. Should ${recommendedAction} here (${recommendedFrequency.toFixed(0)}%).`,
    zh: `重大錯誤。${heroAction} 只有 ${heroFrequency.toFixed(0)}% GTO 頻率。應該 ${recommendedAction} (${recommendedFrequency.toFixed(0)}%)。`,
  };
}

async function analyzeDecision(
  history: HandHistory,
  decision: DecisionPoint
): Promise<GTOComparison> {
  const hero = history.players.find(p => p.isHero);
  const heroCards = hero?.holeCards;

  // Build query parameters
  let gtoStrategy: SolverQueryResult | null = null;

  if (heroCards && decision.street !== "preflop" && decision.board.length >= 3) {
    try {
      gtoStrategy = await querySolverStrategy(
        decision.board,
        heroCards,
        history.heroPosition,
        undefined, // Let it determine villain
        "srp" // Default to SRP for now
      );
    } catch {
      // Solver query failed, continue without GTO data
    }
  }

  // Calculate frequencies and deviation
  const heroAction = decision.heroAction.action;
  let heroFrequency = 0;
  let recommendedAction: ActionType = "check";
  let recommendedFrequency = 0;

  if (gtoStrategy?.found && gtoStrategy.strategy) {
    heroFrequency = getActionFrequencyFromStrategy(gtoStrategy.strategy, heroAction);
    const recommended = getRecommendedAction(gtoStrategy.strategy);
    recommendedAction = recommended.action;
    recommendedFrequency = recommended.frequency;
  } else {
    // No GTO data - assume hero's action is reasonable
    heroFrequency = 50;
    recommendedAction = heroAction;
    recommendedFrequency = 50;
  }

  const { score, type } = calculateDeviationScore(
    heroAction,
    heroFrequency,
    recommendedAction,
    recommendedFrequency
  );

  const analysis = generateAnalysis(
    heroAction,
    heroFrequency,
    recommendedAction,
    recommendedFrequency,
    type
  );

  return {
    decisionPoint: decision,
    heroAction,
    heroAmount: decision.heroAction.amount,
    gtoStrategy,
    deviationScore: score,
    deviationType: type,
    recommendedAction,
    recommendedFrequency,
    heroActionFrequency: heroFrequency,
    analysis: analysis.en,
    analysisZh: analysis.zh,
  };
}

// ============================================
// Main Analysis Function
// ============================================

function calculateGrade(avgScore: number): {
  grade: HandAnalysis["grade"];
  description: string;
  descriptionZh: string;
} {
  if (avgScore <= 10) {
    return {
      grade: "A",
      description: "Excellent! Your play closely follows GTO strategy.",
      descriptionZh: "優秀！你的打法非常接近 GTO 策略。",
    };
  }
  if (avgScore <= 25) {
    return {
      grade: "B",
      description: "Good play with minor deviations from GTO.",
      descriptionZh: "良好打法，有小幅度偏離 GTO。",
    };
  }
  if (avgScore <= 50) {
    return {
      grade: "C",
      description: "Average play. Some significant deviations to work on.",
      descriptionZh: "普通打法。有些顯著偏離需要改進。",
    };
  }
  if (avgScore <= 75) {
    return {
      grade: "D",
      description: "Below average. Multiple significant mistakes detected.",
      descriptionZh: "低於平均。檢測到多個顯著錯誤。",
    };
  }
  return {
    grade: "F",
    description: "Major improvements needed. Review GTO fundamentals.",
    descriptionZh: "需要大幅改進。請複習 GTO 基礎。",
  };
}

export async function analyzeHandHistory(history: HandHistory): Promise<HandAnalysis> {
  const hero = history.players.find(p => p.isHero);

  // Extract hero's decision points
  const decisionPoints = extractHeroDecisions(history);

  // Analyze each decision
  const decisions: GTOComparison[] = [];
  for (const dp of decisionPoints) {
    const comparison = await analyzeDecision(history, dp);
    decisions.push(comparison);
  }

  // Calculate summary statistics
  const totalScore = decisions.reduce((sum, d) => sum + d.deviationScore, 0);
  const avgScore = decisions.length > 0 ? totalScore / decisions.length : 0;

  // Find biggest mistake
  let biggestMistake: GTOComparison | null = null;
  let maxDeviation = 0;
  for (const d of decisions) {
    if (d.deviationScore > maxDeviation) {
      maxDeviation = d.deviationScore;
      biggestMistake = d;
    }
  }

  // Calculate grade
  const { grade, description, descriptionZh } = calculateGrade(avgScore);

  return {
    handId: history.id,
    timestamp: history.timestamp,
    heroPosition: history.heroPosition,
    heroCards: hero?.holeCards || null,
    heroProfit: history.heroProfit,
    decisions,
    totalDeviationScore: totalScore,
    averageDeviationScore: avgScore,
    biggestMistake,
    grade,
    gradeDescription: description,
    gradeDescriptionZh: descriptionZh,
  };
}

// ============================================
// Batch Analysis
// ============================================

export async function analyzeMultipleHands(
  histories: HandHistory[]
): Promise<{
  analyses: HandAnalysis[];
  summary: {
    totalHands: number;
    averageGrade: string;
    averageDeviationScore: number;
    mostCommonMistake: string;
    improvementAreas: string[];
  };
}> {
  const analyses: HandAnalysis[] = [];

  for (const history of histories) {
    const analysis = await analyzeHandHistory(history);
    analyses.push(analysis);
  }

  // Calculate summary
  const totalDeviation = analyses.reduce((sum, a) => sum + a.averageDeviationScore, 0);
  const avgDeviation = analyses.length > 0 ? totalDeviation / analyses.length : 0;

  // Count mistakes by type
  const mistakeTypes: Record<string, number> = {};
  for (const a of analyses) {
    for (const d of a.decisions) {
      if (d.deviationType !== "correct") {
        const key = `${d.heroAction} when should ${d.recommendedAction}`;
        mistakeTypes[key] = (mistakeTypes[key] || 0) + 1;
      }
    }
  }

  // Find most common mistake
  let mostCommonMistake = "None";
  let maxCount = 0;
  for (const [mistake, count] of Object.entries(mistakeTypes)) {
    if (count > maxCount) {
      maxCount = count;
      mostCommonMistake = mistake;
    }
  }

  // Calculate average grade
  const gradeValues: Record<string, number> = { A: 4, B: 3, C: 2, D: 1, F: 0 };
  const avgGradeValue = analyses.reduce((sum, a) => sum + gradeValues[a.grade], 0) / analyses.length;
  const avgGrade = avgGradeValue >= 3.5 ? "A" :
                   avgGradeValue >= 2.5 ? "B" :
                   avgGradeValue >= 1.5 ? "C" :
                   avgGradeValue >= 0.5 ? "D" : "F";

  // Identify improvement areas
  const improvementAreas: string[] = [];
  if (mistakeTypes["fold when should call"] > 2) {
    improvementAreas.push("Too tight - folding too often");
  }
  if (mistakeTypes["call when should fold"] > 2) {
    improvementAreas.push("Too loose - calling too often");
  }
  if (mistakeTypes["check when should bet"] > 2) {
    improvementAreas.push("Too passive - missing value bets");
  }
  if (mistakeTypes["bet when should check"] > 2) {
    improvementAreas.push("Too aggressive - over-betting");
  }

  return {
    analyses,
    summary: {
      totalHands: analyses.length,
      averageGrade: avgGrade,
      averageDeviationScore: avgDeviation,
      mostCommonMistake,
      improvementAreas,
    },
  };
}
