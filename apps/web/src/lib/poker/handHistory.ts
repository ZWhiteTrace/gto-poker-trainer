// ============================================
// Hand History Recording & Export
// ============================================

import type {
  HandHistory,
  HandHistoryPlayer,
  HandHistoryAction,
  HandHistoryStreetActions,
  HandHistoryResult,
  Player,
  ActionRecord,
  Card,
  HoleCards,
  Position,
  Street,
  HandEvaluation,
  AIStyle,
  SUIT_SYMBOLS,
} from "./types";

// Re-export types for convenience
export type { HandHistory } from "./types";

// AI Profile info for hand history
export interface AIProfileInfo {
  seatIndex: number;
  profileId: string;
  style: AIStyle;
}

// ============================================
// Recording Hand History
// ============================================

export function createHandHistory(
  handNumber: number,
  players: Player[],
  dealerPosition: Position,
  actionHistory: ActionRecord[],
  communityCards: Card[],
  winners: Player[],
  pot: number,
  heroPosition: Position,
  heroProfit: number,
  handEvaluations: Map<string, HandEvaluation>,
  blinds: { sb: number; bb: number },
  ante: number = 0,
  aiProfiles?: AIProfileInfo[]
): HandHistory {
  // Create AI profile lookup by seat index
  const aiProfileMap = new Map<number, AIProfileInfo>();
  if (aiProfiles) {
    for (const profile of aiProfiles) {
      aiProfileMap.set(profile.seatIndex, profile);
    }
  }

  // Create player snapshots
  const playerSnapshots: HandHistoryPlayer[] = players.map(p => {
    const aiProfile = aiProfileMap.get(p.seatIndex);
    return {
      name: p.name,
      position: p.position,
      stack: p.stack + p.totalInvested, // Restore starting stack
      holeCards: p.holeCards,
      seatIndex: p.seatIndex,
      isHero: p.isHero,
      // Add AI info for non-hero players
      ...(aiProfile && !p.isHero ? {
        aiStyle: aiProfile.style,
        aiProfileId: aiProfile.profileId,
      } : {}),
    };
  });

  // Parse board
  const board: HandHistory["board"] = {};
  if (communityCards.length >= 3) {
    board.flop = [communityCards[0], communityCards[1], communityCards[2]];
  }
  if (communityCards.length >= 4) {
    board.turn = communityCards[3];
  }
  if (communityCards.length >= 5) {
    board.river = communityCards[4];
  }

  // Parse actions by street
  const actions: HandHistoryStreetActions = {
    preflop: [],
    flop: [],
    turn: [],
    river: [],
  };

  for (const action of actionHistory) {
    if (action.street === "showdown") continue;

    const historyAction: HandHistoryAction = {
      position: action.position,
      action: action.action,
      amount: action.amount,
      isAllIn: action.action === "allin",
    };

    actions[action.street as keyof HandHistoryStreetActions].push(historyAction);
  }

  // Create result
  const result: HandHistoryResult = {
    winners: winners.map(w => ({
      position: w.position,
      amount: pot / winners.length,
      handRank: handEvaluations.get(w.id)?.rank,
      handDescription: handEvaluations.get(w.id)?.description,
    })),
  };

  // Add showdown hands if we went to showdown
  if (communityCards.length === 5 && winners.length > 0) {
    const showdownPlayers = players.filter(p => !p.isFolded && p.holeCards);
    if (showdownPlayers.length > 1) {
      result.showdownHands = showdownPlayers.map(p => ({
        position: p.position,
        cards: p.holeCards!,
        handRank: handEvaluations.get(p.id)?.rank || "high_card",
        handDescription: handEvaluations.get(p.id)?.description || "",
      }));
    }
  }

  return {
    id: `HH${Date.now()}-${handNumber}`,
    timestamp: Date.now(),
    handNumber,
    tableName: "GTO Trainer",
    tableSize: 6,
    blinds,
    ante,
    players: playerSnapshots,
    dealerPosition,
    board,
    actions,
    result,
    heroPosition,
    heroProfit,
  };
}

// ============================================
// Export to GGPoker Format
// ============================================

const SUIT_DISPLAY: Record<string, string> = {
  s: "s",
  h: "h",
  d: "d",
  c: "c",
};

function formatCard(card: Card): string {
  return `${card.rank}${SUIT_DISPLAY[card.suit]}`;
}

function formatCards(cards: Card[]): string {
  return cards.map(formatCard).join(" ");
}

function formatHoleCards(cards: HoleCards): string {
  return `[${formatCard(cards[0])} ${formatCard(cards[1])}]`;
}

function formatAmount(amount: number, bb: number): string {
  // Convert BB to dollar format for GGPoker style
  const dollars = amount * bb;
  return `$${dollars.toFixed(2)}`;
}

function formatActionForGGPoker(
  action: HandHistoryAction,
  bb: number,
  playerName: string
): string {
  switch (action.action) {
    case "fold":
      return `${playerName}: folds`;
    case "check":
      return `${playerName}: checks`;
    case "call":
      return `${playerName}: calls ${formatAmount(action.amount || 0, bb)}`;
    case "bet":
      return `${playerName}: bets ${formatAmount(action.amount || 0, bb)}`;
    case "raise":
      return `${playerName}: raises to ${formatAmount(action.amount || 0, bb)}`;
    case "allin":
      return `${playerName}: raises to ${formatAmount(action.amount || 0, bb)} and is all-in`;
    default:
      return `${playerName}: ${action.action}`;
  }
}

function getPlayerNameByPosition(players: HandHistoryPlayer[], position: Position): string {
  const player = players.find(p => p.position === position);
  return player?.isHero ? "Hero" : player?.name || position;
}

function formatTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
}

export function exportToGGPokerFormat(history: HandHistory): string {
  const lines: string[] = [];
  const bb = history.blinds.bb;

  // Header
  lines.push(
    `Poker Hand #${history.id}: Hold'em No Limit (${formatAmount(history.blinds.sb, bb)}/${formatAmount(history.blinds.bb, bb)}) - ${formatTimestamp(history.timestamp)}`
  );

  // Find dealer seat
  const dealerPlayer = history.players.find(p => p.position === history.dealerPosition);
  const dealerSeat = dealerPlayer?.seatIndex ?? 0;

  lines.push(`Table '${history.tableName}' ${history.tableSize}-max Seat #${dealerSeat + 1} is the button`);

  // Seats
  for (const player of history.players) {
    const name = player.isHero ? "Hero" : player.name;
    const aiInfo = player.aiStyle ? ` [${player.aiStyle}]` : "";
    lines.push(`Seat ${player.seatIndex + 1}: ${name}${aiInfo} (${formatAmount(player.stack, bb)} in chips)`);
  }

  // Blinds
  const sbPlayer = history.players.find(p => p.position === "SB");
  const bbPlayer = history.players.find(p => p.position === "BB");

  if (sbPlayer) {
    const sbName = sbPlayer.isHero ? "Hero" : sbPlayer.name;
    lines.push(`${sbName}: posts small blind ${formatAmount(history.blinds.sb, bb)}`);
  }
  if (bbPlayer) {
    const bbName = bbPlayer.isHero ? "Hero" : bbPlayer.name;
    lines.push(`${bbName}: posts big blind ${formatAmount(history.blinds.bb, bb)}`);
  }

  // Hole cards
  lines.push("*** HOLE CARDS ***");
  const hero = history.players.find(p => p.isHero);
  if (hero?.holeCards) {
    lines.push(`Dealt to Hero ${formatHoleCards(hero.holeCards)}`);
  }

  // Preflop actions
  for (const action of history.actions.preflop) {
    const name = getPlayerNameByPosition(history.players, action.position);
    lines.push(formatActionForGGPoker(action, bb, name));
  }

  // Flop
  if (history.board.flop) {
    lines.push(`*** FLOP *** [${formatCards(history.board.flop)}]`);
    for (const action of history.actions.flop) {
      const name = getPlayerNameByPosition(history.players, action.position);
      lines.push(formatActionForGGPoker(action, bb, name));
    }
  }

  // Turn
  if (history.board.turn) {
    const flopStr = history.board.flop ? formatCards(history.board.flop) : "";
    lines.push(`*** TURN *** [${flopStr}] [${formatCard(history.board.turn)}]`);
    for (const action of history.actions.turn) {
      const name = getPlayerNameByPosition(history.players, action.position);
      lines.push(formatActionForGGPoker(action, bb, name));
    }
  }

  // River
  if (history.board.river) {
    const flopStr = history.board.flop ? formatCards(history.board.flop) : "";
    const turnStr = history.board.turn ? formatCard(history.board.turn) : "";
    lines.push(`*** RIVER *** [${flopStr} ${turnStr}] [${formatCard(history.board.river)}]`);
    for (const action of history.actions.river) {
      const name = getPlayerNameByPosition(history.players, action.position);
      lines.push(formatActionForGGPoker(action, bb, name));
    }
  }

  // Showdown
  if (history.result.showdownHands && history.result.showdownHands.length > 0) {
    lines.push("*** SHOWDOWN ***");
    for (const hand of history.result.showdownHands) {
      const name = getPlayerNameByPosition(history.players, hand.position);
      lines.push(`${name}: shows ${formatHoleCards(hand.cards)} (${hand.handDescription})`);
    }
  }

  // Summary
  lines.push("*** SUMMARY ***");
  const totalPot = history.result.winners.reduce((sum, w) => sum + w.amount, 0);
  lines.push(`Total pot ${formatAmount(totalPot, bb)}`);

  if (history.board.flop) {
    const boardCards = [
      ...history.board.flop,
      ...(history.board.turn ? [history.board.turn] : []),
      ...(history.board.river ? [history.board.river] : []),
    ];
    lines.push(`Board [${formatCards(boardCards)}]`);
  }

  // Winners
  for (const winner of history.result.winners) {
    const name = getPlayerNameByPosition(history.players, winner.position);
    const handDesc = winner.handDescription ? ` with ${winner.handDescription}` : "";
    lines.push(`${name} collected ${formatAmount(winner.amount, bb)}${handDesc}`);
  }

  lines.push("");
  lines.push("");

  return lines.join("\n");
}

// ============================================
// Export Multiple Hands
// ============================================

export function exportHandsToGGPokerFormat(histories: HandHistory[]): string {
  return histories.map(h => exportToGGPokerFormat(h)).join("\n");
}

// ============================================
// Local Storage for Hand History
// ============================================

const HAND_HISTORY_KEY = "gto-trainer-hand-history";
const MAX_STORED_HANDS = 100;

export function saveHandHistory(history: HandHistory): void {
  try {
    const existing = getStoredHandHistories();
    const updated = [history, ...existing].slice(0, MAX_STORED_HANDS);
    localStorage.setItem(HAND_HISTORY_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error("Failed to save hand history:", e);
  }
}

export function getStoredHandHistories(): HandHistory[] {
  try {
    const stored = localStorage.getItem(HAND_HISTORY_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as HandHistory[];
  } catch (e) {
    console.error("Failed to load hand histories:", e);
    return [];
  }
}

export function clearHandHistories(): void {
  try {
    localStorage.removeItem(HAND_HISTORY_KEY);
  } catch (e) {
    console.error("Failed to clear hand histories:", e);
  }
}

export function getHandHistoryById(id: string): HandHistory | null {
  const histories = getStoredHandHistories();
  return histories.find(h => h.id === id) || null;
}
