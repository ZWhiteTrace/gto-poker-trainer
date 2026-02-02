/**
 * GTO Hint Engine
 * Analyzes board texture, hand strength, and position to provide GTO recommendations
 */

import type {
  Card,
  HoleCards,
  Position,
  Street,
  ActionType,
  BoardTexture,
  HandStrengthCategory,
  GTOHint,
  Rank,
  Suit,
} from "./types";
import { analyzeBoardTexture } from "./boardTexture";
import {
  querySolverStrategy,
  holeCardsToHandString,
  mapBoardToTextureId,
  solverStrategyToRecommendations,
  classifyTurnCard,
  getTurnAdjustment,
  categorizeHandForTurn,
  applyTurnAdjustment,
  classifyRiverCard,
  getRiverAdjustment,
  categorizeHandForRiver,
  applyRiverAdjustment,
  type SolverStrategy,
} from "./solverClient";

const RANK_VALUES: Record<Rank, number> = {
  "A": 14, "K": 13, "Q": 12, "J": 11, "T": 10,
  "9": 9, "8": 8, "7": 7, "6": 6, "5": 5, "4": 4, "3": 3, "2": 2,
};

// ============================================
// Hand Strength Analysis
// ============================================

interface HandStrengthAnalysis {
  category: HandStrengthCategory;
  categoryZh: string;
  hasTopPair: boolean;
  hasOverpair: boolean;
  hasTwoPair: boolean;
  hasSet: boolean;
  hasFlushDraw: boolean;
  hasStraightDraw: boolean;
  hasNuts: boolean;
  equity: number; // Estimated equity 0-1
}

export function analyzeHandStrength(
  holeCards: HoleCards,
  communityCards: Card[]
): HandStrengthAnalysis {
  if (communityCards.length === 0) {
    // Preflop - just use hand ranking
    const highCard = Math.max(RANK_VALUES[holeCards[0].rank], RANK_VALUES[holeCards[1].rank]);
    const isPair = holeCards[0].rank === holeCards[1].rank;
    const isSuited = holeCards[0].suit === holeCards[1].suit;

    let equity = 0.5;
    let category: HandStrengthCategory = "medium";

    if (isPair && highCard >= 10) {
      category = "strong";
      equity = 0.7;
    } else if (isPair && highCard >= 7) {
      category = "medium";
      equity = 0.55;
    } else if (highCard === 14 && RANK_VALUES[holeCards[0].rank === "A" ? holeCards[1].rank : holeCards[0].rank] >= 10) {
      category = "strong";
      equity = 0.65;
    } else if (highCard >= 12 && isSuited) {
      category = "medium";
      equity = 0.55;
    } else if (highCard <= 7 && !isPair) {
      category = "weak";
      equity = 0.35;
    }

    return {
      category,
      categoryZh: getCategoryZh(category),
      hasTopPair: false,
      hasOverpair: false,
      hasTwoPair: false,
      hasSet: false,
      hasFlushDraw: false,
      hasStraightDraw: false,
      hasNuts: false,
      equity,
    };
  }

  // Postflop analysis
  const allCards = [...holeCards, ...communityCards];
  const boardRanks = communityCards.map(c => RANK_VALUES[c.rank]);
  const boardHighCard = Math.max(...boardRanks);
  const holeRanks = holeCards.map(c => RANK_VALUES[c.rank]);

  // Check for pairs, sets, etc.
  const rankCounts: Record<number, number> = {};
  for (const card of allCards) {
    const val = RANK_VALUES[card.rank];
    rankCounts[val] = (rankCounts[val] || 0) + 1;
  }

  const hasSet = Object.values(rankCounts).some(c => c >= 3);
  const hasTwoPair = Object.values(rankCounts).filter(c => c >= 2).length >= 2;
  const hasPair = Object.values(rankCounts).some(c => c >= 2);

  // Check if we have top pair
  const hasTopPair = holeRanks.includes(boardHighCard) &&
    rankCounts[boardHighCard] >= 2;

  // Check for overpair
  const hasOverpair = holeRanks[0] === holeRanks[1] &&
    holeRanks[0] > boardHighCard;

  // Check for flush draws
  const suitCounts: Record<Suit, number> = { s: 0, h: 0, d: 0, c: 0 };
  for (const card of allCards) {
    suitCounts[card.suit]++;
  }
  const maxSuitCount = Math.max(...Object.values(suitCounts));
  const hasFlushDraw = maxSuitCount === 4;
  const hasFlush = maxSuitCount >= 5;

  // Simplified straight draw detection
  const sortedRanks = [...new Set(allCards.map(c => RANK_VALUES[c.rank]))].sort((a, b) => b - a);
  let consecutiveCount = 1;
  let maxConsecutive = 1;
  for (let i = 1; i < sortedRanks.length; i++) {
    if (sortedRanks[i - 1] - sortedRanks[i] === 1) {
      consecutiveCount++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveCount);
    } else {
      consecutiveCount = 1;
    }
  }
  const hasStraightDraw = maxConsecutive >= 4;
  const hasStraight = maxConsecutive >= 5;

  // Determine category
  let category: HandStrengthCategory;
  let equity: number;

  if (hasFlush || hasStraight || hasSet) {
    category = hasFlush || hasStraight ? "nuts" : "strong";
    equity = 0.85;
  } else if (hasOverpair || (hasTopPair && Math.max(...holeRanks) >= 10)) {
    category = "strong";
    equity = 0.7;
  } else if (hasTwoPair) {
    category = "strong";
    equity = 0.75;
  } else if (hasTopPair) {
    category = "medium";
    equity = 0.6;
  } else if (hasPair) {
    category = "weak";
    equity = 0.45;
  } else if (hasFlushDraw || hasStraightDraw) {
    category = "draw";
    equity = hasFlushDraw ? 0.35 : 0.3;
  } else {
    category = "air";
    equity = 0.25;
  }

  return {
    category,
    categoryZh: getCategoryZh(category),
    hasTopPair,
    hasOverpair,
    hasTwoPair,
    hasSet,
    hasFlushDraw,
    hasStraightDraw,
    hasNuts: hasFlush || hasStraight,
    equity,
  };
}

function getCategoryZh(category: HandStrengthCategory): string {
  const map: Record<HandStrengthCategory, string> = {
    nuts: "堅果牌",
    strong: "強牌",
    medium: "中等牌力",
    weak: "弱牌",
    draw: "聽牌",
    air: "空氣牌",
  };
  return map[category];
}

// ============================================
// GTO Hint Generation
// ============================================

interface HintContext {
  holeCards: HoleCards;
  communityCards: Card[];
  position: Position;
  street: Street;
  pot: number;
  currentBet: number;
  playerBet: number;
  stack: number;
  isInPosition: boolean;
  facingBet: boolean;
  isPreflopAggressor: boolean;
}

export function generateGTOHint(context: HintContext): GTOHint {
  const boardAnalysis = analyzeBoardTexture(context.communityCards);
  const handStrength = analyzeHandStrength(context.holeCards, context.communityCards);

  const recommendations: GTOHint["recommendations"] = [];
  const keyFactors: string[] = [];
  const keyFactorsZh: string[] = [];

  // ============================================
  // Preflop Logic
  // ============================================
  if (context.street === "preflop") {
    return generatePreflopHint(context, handStrength);
  }

  // ============================================
  // Postflop Logic
  // ============================================

  // Factor 1: Position
  if (context.isInPosition) {
    keyFactors.push("In position - can bet more liberally");
    keyFactorsZh.push("位置優勢 - 可以更積極下注");
  } else {
    keyFactors.push("Out of position - need stronger hands to bet");
    keyFactorsZh.push("位置劣勢 - 需要更強的牌才能下注");
  }

  // Factor 2: Board texture
  keyFactors.push(`Board: ${boardAnalysis.texture}`);
  keyFactorsZh.push(`公牌: ${boardAnalysis.textureZh}`);

  // Factor 3: Hand strength
  keyFactors.push(`Hand: ${handStrength.category}`);
  keyFactorsZh.push(`手牌: ${handStrength.categoryZh}`);

  // ============================================
  // Facing a bet
  // ============================================
  if (context.facingBet) {
    const betSize = context.currentBet - context.playerBet;
    const potOdds = betSize / (context.pot + betSize);

    if (handStrength.category === "nuts" || handStrength.category === "strong") {
      recommendations.push({
        action: "raise",
        frequency: 60,
        sizing: 300, // 3x
        isPrimary: true,
      });
      recommendations.push({
        action: "call",
        frequency: 40,
        isPrimary: false,
      });
      keyFactorsZh.push("強牌面對下注 - 以加注為主，混合跟注");
    } else if (handStrength.category === "medium") {
      recommendations.push({
        action: "call",
        frequency: 70,
        isPrimary: true,
      });
      recommendations.push({
        action: "fold",
        frequency: 30,
        isPrimary: false,
      });
      keyFactorsZh.push("中等牌力 - 主要跟注，適當棄牌");
    } else if (handStrength.category === "draw") {
      if (handStrength.equity > potOdds) {
        recommendations.push({
          action: "call",
          frequency: 60,
          isPrimary: true,
        });
        recommendations.push({
          action: "raise",
          frequency: 20,
          sizing: 300,
          isPrimary: false,
        });
        recommendations.push({
          action: "fold",
          frequency: 20,
          isPrimary: false,
        });
        keyFactorsZh.push("聽牌有賠率 - 可以跟注，偶爾半詐唬加注");
      } else {
        recommendations.push({
          action: "fold",
          frequency: 70,
          isPrimary: true,
        });
        recommendations.push({
          action: "call",
          frequency: 30,
          isPrimary: false,
        });
        keyFactorsZh.push("聽牌賠率不足 - 傾向棄牌");
      }
    } else {
      recommendations.push({
        action: "fold",
        frequency: 85,
        isPrimary: true,
      });
      recommendations.push({
        action: "call",
        frequency: 15,
        isPrimary: false,
      });
      keyFactorsZh.push("弱牌面對下注 - 棄牌為主");
    }
  }
  // ============================================
  // Not facing a bet (can check or bet)
  // ============================================
  else {
    // C-bet logic
    if (context.isPreflopAggressor) {
      if (boardAnalysis.texture === "dry") {
        // Dry boards - can c-bet more
        if (handStrength.category === "strong" || handStrength.category === "nuts") {
          recommendations.push({
            action: "bet",
            frequency: 80,
            sizing: 33, // 1/3 pot
            isPrimary: true,
          });
          recommendations.push({
            action: "check",
            frequency: 20,
            isPrimary: false,
          });
          keyFactorsZh.push("乾燥面 + 強牌 - 小注取值");
        } else if (handStrength.category === "medium") {
          recommendations.push({
            action: "bet",
            frequency: 60,
            sizing: 33,
            isPrimary: true,
          });
          recommendations.push({
            action: "check",
            frequency: 40,
            isPrimary: false,
          });
          keyFactorsZh.push("乾燥面 + 中等牌 - 混合下注/過牌");
        } else {
          recommendations.push({
            action: "check",
            frequency: 60,
            isPrimary: true,
          });
          recommendations.push({
            action: "bet",
            frequency: 40,
            sizing: 33,
            isPrimary: false,
          });
          keyFactorsZh.push("乾燥面 + 弱牌 - 過牌為主，偶爾詐唬");
        }
      } else if (boardAnalysis.texture === "wet" || boardAnalysis.texture === "connected") {
        // Wet boards - more polarized
        if (handStrength.category === "strong" || handStrength.category === "nuts") {
          recommendations.push({
            action: "bet",
            frequency: 75,
            sizing: 66, // 2/3 pot
            isPrimary: true,
          });
          recommendations.push({
            action: "check",
            frequency: 25,
            isPrimary: false,
          });
          keyFactorsZh.push("濕潤面 + 強牌 - 較大注保護");
        } else if (handStrength.category === "draw") {
          recommendations.push({
            action: "bet",
            frequency: 50,
            sizing: 50,
            isPrimary: true,
          });
          recommendations.push({
            action: "check",
            frequency: 50,
            isPrimary: false,
          });
          keyFactorsZh.push("濕潤面 + 聽牌 - 半詐唬或過牌看牌");
        } else {
          recommendations.push({
            action: "check",
            frequency: 80,
            isPrimary: true,
          });
          recommendations.push({
            action: "bet",
            frequency: 20,
            sizing: 50,
            isPrimary: false,
          });
          keyFactorsZh.push("濕潤面 + 弱牌 - 過牌為主");
        }
      } else {
        // Other textures - balanced approach
        if (handStrength.category === "strong" || handStrength.category === "nuts") {
          recommendations.push({
            action: "bet",
            frequency: 70,
            sizing: 50,
            isPrimary: true,
          });
          recommendations.push({
            action: "check",
            frequency: 30,
            isPrimary: false,
          });
        } else {
          recommendations.push({
            action: "check",
            frequency: 55,
            isPrimary: true,
          });
          recommendations.push({
            action: "bet",
            frequency: 45,
            sizing: 50,
            isPrimary: false,
          });
        }
        keyFactorsZh.push("平衡的下注/過牌策略");
      }
    } else {
      // Not preflop aggressor - more defensive
      if (handStrength.category === "strong" || handStrength.category === "nuts") {
        if (context.isInPosition) {
          recommendations.push({
            action: "bet",
            frequency: 60,
            sizing: 50,
            isPrimary: true,
          });
          recommendations.push({
            action: "check",
            frequency: 40,
            isPrimary: false,
          });
          keyFactorsZh.push("有位置 + 強牌 - 可以主動下注");
        } else {
          recommendations.push({
            action: "check",
            frequency: 70,
            isPrimary: true,
          });
          recommendations.push({
            action: "bet",
            frequency: 30,
            sizing: 50,
            isPrimary: false,
          });
          keyFactorsZh.push("無位置 + 強牌 - 設置陷阱或下注");
        }
      } else {
        recommendations.push({
          action: "check",
          frequency: 85,
          isPrimary: true,
        });
        recommendations.push({
          action: "bet",
          frequency: 15,
          sizing: 50,
          isPrimary: false,
        });
        keyFactorsZh.push("非進攻者 - 過牌為主");
      }
    }
  }

  return {
    recommendations,
    reasoning: {
      boardTexture: boardAnalysis.texture,
      boardTextureZh: boardAnalysis.textureZh,
      handStrength: handStrength.category,
      handStrengthZh: handStrength.categoryZh,
      positionAdvantage: context.isInPosition ? "IP" : "OOP",
      keyFactors,
      keyFactorsZh,
    },
  };
}

// ============================================
// Solver-Enhanced GTO Hint (Async)
// ============================================

export async function generateGTOHintWithSolver(context: HintContext): Promise<GTOHint> {
  // For preflop, use the standard logic
  if (context.street === "preflop") {
    const handStrength = analyzeHandStrength(context.holeCards, context.communityCards);
    return generatePreflopHint(context, handStrength);
  }

  // Try to get solver data for postflop
  try {
    // For turn/river, we need the flop cards (first 3)
    const flopCards = context.communityCards.slice(0, 3);

    // Query flop strategy first
    const solverResult = await querySolverStrategy(
      flopCards,
      context.holeCards,
      context.position,
      undefined, // Use default villain
      "srp"
    );

    if (solverResult.found && solverResult.strategy) {
      // We have solver data - use it!
      const boardAnalysis = analyzeBoardTexture(context.communityCards);
      const handStrength = analyzeHandStrength(context.holeCards, context.communityCards);
      const handString = holeCardsToHandString(context.holeCards);

      let finalStrategy = solverResult.strategy;
      let turnInfo: { turnType: string; turnTypeZh: string } | null = null;

      // Apply turn adjustments if on turn or river
      if (context.street === "turn" && context.communityCards.length >= 4) {
        const turnCard = context.communityCards[3];
        const turnClassification = await classifyTurnCard(flopCards, turnCard);

        if (turnClassification && solverResult.texture) {
          const handCategory = categorizeHandForTurn(
            handStrength.category,
            handStrength.hasFlushDraw,
            handStrength.hasStraightDraw
          );

          const turnAdjustment = await getTurnAdjustment(
            solverResult.texture,
            turnClassification.turn_type,
            handCategory
          );

          if (turnAdjustment) {
            finalStrategy = applyTurnAdjustment(solverResult.strategy, turnAdjustment);
            turnInfo = {
              turnType: turnClassification.turn_type,
              turnTypeZh: turnClassification.turn_type_zh,
            };
          }
        }
      }

      // Apply river adjustments if on river
      let riverInfo: { riverType: string; riverTypeZh: string } | null = null;
      if (context.street === "river" && context.communityCards.length >= 5) {
        const boardCards = context.communityCards.slice(0, 4); // flop + turn
        const riverCard = context.communityCards[4];
        const riverClassification = await classifyRiverCard(boardCards, riverCard);

        if (riverClassification && solverResult.texture) {
          // Determine if we made our hand (simplified check)
          const madeHand = handStrength.category === "nuts" || handStrength.category === "strong" ||
                          handStrength.hasSet || handStrength.hasTwoPair || handStrength.hasTopPair;

          const handCategory = categorizeHandForRiver(
            handStrength.category,
            handStrength.hasFlushDraw,
            handStrength.hasStraightDraw,
            madeHand
          );

          const riverAdjustment = await getRiverAdjustment(
            solverResult.texture,
            riverClassification.river_type,
            handCategory
          );

          if (riverAdjustment) {
            finalStrategy = applyRiverAdjustment(finalStrategy, riverAdjustment);
            riverInfo = {
              riverType: riverClassification.river_type,
              riverTypeZh: riverClassification.river_type_zh,
            };
          }
        }
      }

      const recommendations = solverStrategyToRecommendations(finalStrategy);

      // Build key factors with solver info
      const keyFactorsZh: string[] = [];
      keyFactorsZh.push(`[Solver] ${solverResult.texture_zh || boardAnalysis.textureZh}`);

      // Add turn card type info
      if (turnInfo) {
        keyFactorsZh.push(`Turn: ${turnInfo.turnTypeZh}`);
      }

      // Add river card type info
      if (riverInfo) {
        keyFactorsZh.push(`River: ${riverInfo.riverTypeZh}`);
      }

      keyFactorsZh.push(`手牌: ${handString} (${handStrength.categoryZh})`);

      // Add primary action explanation
      const primaryAction = recommendations.find(r => r.isPrimary);
      if (primaryAction) {
        if (primaryAction.action === "bet" && primaryAction.sizing) {
          keyFactorsZh.push(`GTO 建議: Bet ${primaryAction.sizing}% pot (${primaryAction.frequency}%)`);
        } else if (primaryAction.action === "check") {
          keyFactorsZh.push(`GTO 建議: Check (${primaryAction.frequency}%)`);
        }
      }

      // Add position factor
      if (context.isInPosition) {
        keyFactorsZh.push("位置優勢 - IP");
      } else {
        keyFactorsZh.push("位置劣勢 - OOP");
      }

      return {
        recommendations,
        reasoning: {
          boardTexture: boardAnalysis.texture,
          boardTextureZh: solverResult.texture_zh || boardAnalysis.textureZh,
          handStrength: handStrength.category,
          handStrengthZh: handStrength.categoryZh,
          positionAdvantage: context.isInPosition ? "IP" : "OOP",
          keyFactors: [],
          keyFactorsZh,
          solverData: {
            scenarioId: solverResult.scenario_id,
            hand: solverResult.hand,
            strategy: finalStrategy as Record<string, number>,
            turnAdjustment: turnInfo ? {
              turnType: turnInfo.turnType,
              turnTypeZh: turnInfo.turnTypeZh,
            } : undefined,
            riverAdjustment: riverInfo ? {
              riverType: riverInfo.riverType,
              riverTypeZh: riverInfo.riverTypeZh,
            } : undefined,
          },
        },
      };
    }
  } catch (error) {
    console.warn("Solver query failed, falling back to rules:", error);
  }

  // Fallback to rule-based logic
  return generateGTOHint(context);
}

// ============================================
// Get Solver Strategy for Display
// ============================================

export async function getSolverStrategyForHand(
  communityCards: Card[],
  holeCards: HoleCards,
  position: Position
): Promise<{
  found: boolean;
  strategy?: SolverStrategy;
  textureId?: string;
  textureZh?: string;
  note?: string;
}> {
  if (communityCards.length < 3) {
    return { found: false };
  }

  try {
    const result = await querySolverStrategy(
      communityCards,
      holeCards,
      position,
      undefined,
      "srp"
    );

    if (result.found && result.strategy) {
      return {
        found: true,
        strategy: result.strategy,
        textureId: result.texture,
        textureZh: result.texture_zh,
      };
    }
  } catch (error) {
    console.warn("Failed to get solver strategy:", error);
  }

  return { found: false };
}

function generatePreflopHint(context: HintContext, handStrength: HandStrengthAnalysis): GTOHint {
  const recommendations: GTOHint["recommendations"] = [];
  const keyFactorsZh: string[] = [];

  // Position-based opening ranges (simplified)
  const isLatePosition = ["CO", "BTN"].includes(context.position);
  const isBlind = ["SB", "BB"].includes(context.position);

  if (!context.facingBet) {
    // First to act or limped
    if (handStrength.category === "strong" || handStrength.category === "nuts") {
      recommendations.push({
        action: "raise",
        frequency: 100,
        sizing: 300, // 3BB
        isPrimary: true,
      });
      keyFactorsZh.push("強起手牌 - 必須加注");
    } else if (handStrength.category === "medium") {
      if (isLatePosition) {
        recommendations.push({
          action: "raise",
          frequency: 80,
          sizing: 250,
          isPrimary: true,
        });
        recommendations.push({
          action: "fold",
          frequency: 20,
          isPrimary: false,
        });
        keyFactorsZh.push("後位 + 中等牌 - 可以開池");
      } else {
        recommendations.push({
          action: "fold",
          frequency: 60,
          isPrimary: true,
        });
        recommendations.push({
          action: "raise",
          frequency: 40,
          sizing: 300,
          isPrimary: false,
        });
        keyFactorsZh.push("前位 + 中等牌 - 謹慎開池");
      }
    } else {
      recommendations.push({
        action: "fold",
        frequency: 90,
        isPrimary: true,
      });
      recommendations.push({
        action: "raise",
        frequency: 10,
        sizing: 250,
        isPrimary: false,
      });
      keyFactorsZh.push("弱牌 - 棄牌為主");
    }
  } else {
    // Facing a raise
    if (handStrength.category === "strong" || handStrength.category === "nuts") {
      recommendations.push({
        action: "raise",
        frequency: 70,
        sizing: 300, // 3-bet
        isPrimary: true,
      });
      recommendations.push({
        action: "call",
        frequency: 30,
        isPrimary: false,
      });
      keyFactorsZh.push("強牌面對加注 - 3-bet 或跟注");
    } else if (handStrength.category === "medium") {
      if (context.isInPosition) {
        // In position with medium hand - can call, sometimes 3-bet for balance
        recommendations.push({
          action: "call",
          frequency: 55,
          isPrimary: true,
        });
        recommendations.push({
          action: "raise",
          frequency: 15,
          sizing: 300, // 3-bet
          isPrimary: false,
        });
        recommendations.push({
          action: "fold",
          frequency: 30,
          isPrimary: false,
        });
        keyFactorsZh.push("有位置 + 中等牌 - 跟注為主，偶爾 3-bet");
      } else {
        // Out of position - tighter
        recommendations.push({
          action: "fold",
          frequency: 60,
          isPrimary: true,
        });
        recommendations.push({
          action: "call",
          frequency: 30,
          isPrimary: false,
        });
        recommendations.push({
          action: "raise",
          frequency: 10,
          sizing: 300, // 3-bet
          isPrimary: false,
        });
        keyFactorsZh.push("無位置 + 中等牌 - 傾向棄牌，偶爾 3-bet");
      }
    } else {
      // Weak hand facing a raise
      if (context.isInPosition && handStrength.category === "draw") {
        // Draws in position can occasionally 3-bet as semi-bluff
        recommendations.push({
          action: "fold",
          frequency: 75,
          isPrimary: true,
        });
        recommendations.push({
          action: "call",
          frequency: 15,
          isPrimary: false,
        });
        recommendations.push({
          action: "raise",
          frequency: 10,
          sizing: 300,
          isPrimary: false,
        });
        keyFactorsZh.push("聽牌有位置 - 可跟注或偶爾 3-bet 半詐唬");
      } else {
        recommendations.push({
          action: "fold",
          frequency: 95,
          isPrimary: true,
        });
        recommendations.push({
          action: "call",
          frequency: 5,
          isPrimary: false,
        });
        keyFactorsZh.push("弱牌面對加注 - 棄牌");
      }
    }
  }

  return {
    recommendations,
    reasoning: {
      boardTexture: "dry",
      boardTextureZh: "翻前",
      handStrength: handStrength.category,
      handStrengthZh: handStrength.categoryZh,
      positionAdvantage: context.isInPosition ? "IP" : "OOP",
      keyFactors: [],
      keyFactorsZh,
    },
  };
}
