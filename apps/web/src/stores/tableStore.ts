import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  TableState,
  TableActions,
  GameConfig,
  Position,
  Player,
  Card,
  Street,
  ActionType,
  ActionRecord,
  AvailableAction,
  ScenarioPreset,
  Rank,
  Suit,
  GamePhase,
} from "@/lib/poker/types";
import {
  POSITIONS,
  RANKS,
  SUITS,
  DEFAULT_CONFIG,
} from "@/lib/poker/types";
import { evaluateHand, determineWinners as findWinners } from "@/lib/poker/handEvaluator";
import { getAIDecision, AI_PROFILES, AIPlayerProfile, getAIProfile } from "@/lib/poker/aiDecisionEngine";

// ============================================
// Helper Functions
// ============================================

function createDeck(): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Store AI profiles for each seat
const aiProfileAssignments: Map<number, AIPlayerProfile> = new Map();

function createPlayers(
  config: GameConfig,
  heroPosition: Position,
  dealerSeatIndex: number,
  aiProfiles?: AIPlayerProfile[]
): Player[] {
  // Assign AI profiles (cycle through available profiles or use provided ones)
  const profiles = aiProfiles || AI_PROFILES;

  return POSITIONS.map((position, index) => {
    const isHero = position === heroPosition;
    let aiProfile: AIPlayerProfile | undefined;

    if (!isHero) {
      // Assign different AI profiles to different seats
      const profileIndex = index % profiles.length;
      aiProfile = profiles[profileIndex];
      aiProfileAssignments.set(index, aiProfile);
    }

    return {
      id: `player_${index}`,
      name: isHero ? "Hero" : (aiProfile?.nameZh || `AI_${position}`),
      position,
      stack: config.startingStack,
      holeCards: null,
      currentBet: 0,
      totalInvested: 0,
      isActive: true,
      isFolded: false,
      isAllIn: false,
      isHero,
      isDealer: index === dealerSeatIndex,
      seatIndex: index,
    };
  });
}

function getPlayerAIProfile(seatIndex: number): AIPlayerProfile {
  return aiProfileAssignments.get(seatIndex) || AI_PROFILES[0];
}

function getNextActivePlayerIndex(
  players: Player[],
  currentIndex: number
): number {
  let nextIndex = (currentIndex + 1) % players.length;
  let attempts = 0;

  while (attempts < players.length) {
    const player = players[nextIndex];
    if (player.isActive && !player.isFolded && !player.isAllIn) {
      return nextIndex;
    }
    nextIndex = (nextIndex + 1) % players.length;
    attempts++;
  }

  return -1; // No active players found
}

function countActivePlayers(players: Player[]): number {
  return players.filter(p => p.isActive && !p.isFolded).length;
}

function getPositionIndex(position: Position): number {
  return POSITIONS.indexOf(position);
}

// ============================================
// Initial State
// ============================================

const initialState: Omit<TableState, keyof TableActions> = {
  config: DEFAULT_CONFIG,
  handNumber: 0,
  dealerSeatIndex: 3, // BTN
  players: [],
  communityCards: [],
  pot: 0,
  sidePots: [],
  deck: [],
  currentStreet: "preflop",
  activePlayerIndex: 0,
  lastAggressorIndex: null,
  currentBet: 0,
  minRaise: 1,
  actionHistory: [],
  streetActions: new Map(),
  phase: "setup",
  winners: null,
  handEvaluations: new Map(),
  trainingMode: {
    enabled: false,
    scenario: null,
    showGTOHints: false,
    showEV: false,
  },
  sessionStats: {
    handsPlayed: 0,
    handsWon: 0,
    totalProfit: 0,
    biggestPot: 0,
  },
  aiThinking: false,
  showBetSlider: false,
  selectedBetSize: 0,
};

// ============================================
// Store
// ============================================

export const useTableStore = create<TableState & TableActions>()(
  persist(
    (set, get) => ({
      ...initialState,

      // ========================================
      // Setup Actions
      // ========================================

      initializeTable: (configOverride?: Partial<GameConfig>) => {
        const config = { ...DEFAULT_CONFIG, ...configOverride };
        const dealerSeatIndex = 3; // BTN position
        const players = createPlayers(config, "BTN", dealerSeatIndex);

        set({
          config,
          dealerSeatIndex,
          players,
          phase: "setup",
          handNumber: 0,
          sessionStats: {
            handsPlayed: 0,
            handsWon: 0,
            totalProfit: 0,
            biggestPot: 0,
          },
        });
      },

      setHeroPosition: (position: Position) => {
        const { config, dealerSeatIndex } = get();
        const players = createPlayers(config, position, dealerSeatIndex);
        set({ players });
      },

      loadScenario: (scenario: ScenarioPreset) => {
        const { config } = get();
        const players = createPlayers(
          { ...config, startingStack: scenario.effectiveStack },
          scenario.heroPosition,
          getPositionIndex("BTN")
        );

        set({
          players,
          trainingMode: {
            enabled: true,
            scenario,
            showGTOHints: true,
            showEV: false,
          },
        });
      },

      // ========================================
      // Game Flow Actions
      // ========================================

      startNewHand: () => {
        const { config, dealerSeatIndex, players, sessionStats } = get();

        // Rotate dealer
        const newDealerIndex = (dealerSeatIndex + 1) % 6;

        // Reset players for new hand
        const resetPlayers = players.map((p, i) => ({
          ...p,
          holeCards: null,
          currentBet: 0,
          totalInvested: 0,
          isActive: true,
          isFolded: false,
          isAllIn: false,
          isDealer: i === newDealerIndex,
        }));

        // Create and shuffle deck
        const deck = shuffleDeck(createDeck());

        // Post blinds
        const sbIndex = (newDealerIndex + 1) % 6;
        const bbIndex = (newDealerIndex + 2) % 6;

        resetPlayers[sbIndex].currentBet = config.blinds.sb;
        resetPlayers[sbIndex].totalInvested = config.blinds.sb;
        resetPlayers[sbIndex].stack -= config.blinds.sb;

        resetPlayers[bbIndex].currentBet = config.blinds.bb;
        resetPlayers[bbIndex].totalInvested = config.blinds.bb;
        resetPlayers[bbIndex].stack -= config.blinds.bb;

        const pot = config.blinds.sb + config.blinds.bb;

        // UTG acts first preflop (dealer + 3)
        const firstToAct = (newDealerIndex + 3) % 6;

        set({
          handNumber: sessionStats.handsPlayed + 1,
          dealerSeatIndex: newDealerIndex,
          players: resetPlayers,
          deck,
          communityCards: [],
          pot,
          sidePots: [],
          currentStreet: "preflop",
          activePlayerIndex: firstToAct,
          lastAggressorIndex: bbIndex, // BB is initial aggressor
          currentBet: config.blinds.bb,
          minRaise: config.blinds.bb,
          actionHistory: [],
          streetActions: new Map([["preflop", []]]),
          phase: "playing",
          winners: null,
          handEvaluations: new Map(),
          aiThinking: false,
        });

        // Deal hole cards
        get().dealHoleCards();
      },

      dealHoleCards: () => {
        const { deck, players } = get();
        const newDeck = [...deck];
        const newPlayers = players.map(p => {
          if (p.isActive) {
            const card1 = newDeck.pop()!;
            const card2 = newDeck.pop()!;
            return { ...p, holeCards: [card1, card2] as [Card, Card] };
          }
          return p;
        });

        set({ deck: newDeck, players: newPlayers });
      },

      dealFlop: () => {
        const { deck, players } = get();
        const newDeck = [...deck];

        // Burn one card
        newDeck.pop();

        // Deal three cards
        const flop: Card[] = [newDeck.pop()!, newDeck.pop()!, newDeck.pop()!];

        // Reset current bets for new street
        const resetPlayers = players.map(p => ({
          ...p,
          currentBet: 0,
        }));

        // SB acts first postflop (or first active player after dealer)
        const { dealerSeatIndex } = get();
        let firstToAct = (dealerSeatIndex + 1) % 6;
        while (resetPlayers[firstToAct].isFolded || resetPlayers[firstToAct].isAllIn) {
          firstToAct = (firstToAct + 1) % 6;
        }

        set({
          deck: newDeck,
          communityCards: flop,
          currentStreet: "flop",
          players: resetPlayers,
          activePlayerIndex: firstToAct,
          currentBet: 0,
          lastAggressorIndex: null,
          streetActions: new Map([...get().streetActions, ["flop", []]]),
        });
      },

      dealTurn: () => {
        const { deck, communityCards, players, dealerSeatIndex } = get();
        const newDeck = [...deck];

        newDeck.pop(); // Burn
        const turn = newDeck.pop()!;

        const resetPlayers = players.map(p => ({ ...p, currentBet: 0 }));

        let firstToAct = (dealerSeatIndex + 1) % 6;
        while (resetPlayers[firstToAct].isFolded || resetPlayers[firstToAct].isAllIn) {
          firstToAct = (firstToAct + 1) % 6;
        }

        set({
          deck: newDeck,
          communityCards: [...communityCards, turn],
          currentStreet: "turn",
          players: resetPlayers,
          activePlayerIndex: firstToAct,
          currentBet: 0,
          lastAggressorIndex: null,
          streetActions: new Map([...get().streetActions, ["turn", []]]),
        });
      },

      dealRiver: () => {
        const { deck, communityCards, players, dealerSeatIndex } = get();
        const newDeck = [...deck];

        newDeck.pop(); // Burn
        const river = newDeck.pop()!;

        const resetPlayers = players.map(p => ({ ...p, currentBet: 0 }));

        let firstToAct = (dealerSeatIndex + 1) % 6;
        while (resetPlayers[firstToAct].isFolded || resetPlayers[firstToAct].isAllIn) {
          firstToAct = (firstToAct + 1) % 6;
        }

        set({
          deck: newDeck,
          communityCards: [...communityCards, river],
          currentStreet: "river",
          players: resetPlayers,
          activePlayerIndex: firstToAct,
          currentBet: 0,
          lastAggressorIndex: null,
          streetActions: new Map([...get().streetActions, ["river", []]]),
        });
      },

      // ========================================
      // Player Actions
      // ========================================

      handleAction: (action: ActionType, amount?: number) => {
        const state = get();
        const { players, activePlayerIndex, pot, currentBet, currentStreet, config } = state;
        const player = players[activePlayerIndex];

        if (!player || player.isFolded || !player.isActive) return;

        const newPlayers = [...players];
        let newPot = pot;
        let newCurrentBet = currentBet;
        let newLastAggressor = state.lastAggressorIndex;

        const actionRecord: ActionRecord = {
          playerId: player.id,
          playerName: player.name,
          position: player.position,
          action,
          amount,
          street: currentStreet,
          timestamp: Date.now(),
          isHero: player.isHero,
        };

        switch (action) {
          case "fold":
            newPlayers[activePlayerIndex] = {
              ...player,
              isFolded: true,
              isActive: false,
            };
            break;

          case "check":
            // No changes needed
            break;

          case "call": {
            const callAmount = currentBet - player.currentBet;
            const actualCall = Math.min(callAmount, player.stack);
            newPlayers[activePlayerIndex] = {
              ...player,
              stack: player.stack - actualCall,
              currentBet: player.currentBet + actualCall,
              totalInvested: player.totalInvested + actualCall,
              isAllIn: player.stack - actualCall === 0,
            };
            newPot += actualCall;
            actionRecord.amount = actualCall;
            break;
          }

          case "bet":
          case "raise": {
            const betAmount = amount || config.blinds.bb * 2;
            const totalBet = action === "raise" ? betAmount : betAmount;
            const toAdd = totalBet - player.currentBet;
            const actualAdd = Math.min(toAdd, player.stack);

            newPlayers[activePlayerIndex] = {
              ...player,
              stack: player.stack - actualAdd,
              currentBet: player.currentBet + actualAdd,
              totalInvested: player.totalInvested + actualAdd,
              isAllIn: player.stack - actualAdd === 0,
            };
            newPot += actualAdd;
            newCurrentBet = player.currentBet + actualAdd;
            newLastAggressor = activePlayerIndex;
            actionRecord.amount = totalBet;
            break;
          }

          case "allin": {
            const allInAmount = player.stack;
            newPlayers[activePlayerIndex] = {
              ...player,
              stack: 0,
              currentBet: player.currentBet + allInAmount,
              totalInvested: player.totalInvested + allInAmount,
              isAllIn: true,
            };
            newPot += allInAmount;
            if (player.currentBet + allInAmount > currentBet) {
              newCurrentBet = player.currentBet + allInAmount;
              newLastAggressor = activePlayerIndex;
            }
            actionRecord.amount = allInAmount;
            break;
          }
        }

        // Add to action history
        const newActionHistory = [...state.actionHistory, actionRecord];

        // Check if hand should end (only 1 player left)
        const activePlayers = countActivePlayers(newPlayers);
        if (activePlayers === 1) {
          // Hand is over, award pot to remaining player
          set({
            players: newPlayers,
            pot: newPot,
            actionHistory: newActionHistory,
            phase: "result",
          });
          get().determineWinners();
          return;
        }

        // Find next player to act
        const nextPlayerIndex = getNextActivePlayerIndex(newPlayers, activePlayerIndex);

        // Check if betting round is complete
        const isRoundComplete = state.checkBettingRoundComplete(newPlayers, nextPlayerIndex, newLastAggressor);

        if (isRoundComplete) {
          // Move to next street
          set({
            players: newPlayers,
            pot: newPot,
            currentBet: newCurrentBet,
            lastAggressorIndex: newLastAggressor,
            actionHistory: newActionHistory,
          });

          const { currentStreet } = get();
          if (currentStreet === "preflop") {
            get().dealFlop();
          } else if (currentStreet === "flop") {
            get().dealTurn();
          } else if (currentStreet === "turn") {
            get().dealRiver();
          } else {
            // Showdown
            set({ phase: "showdown" });
            get().determineWinners();
          }
        } else {
          // Continue betting round
          set({
            players: newPlayers,
            pot: newPot,
            currentBet: newCurrentBet,
            lastAggressorIndex: newLastAggressor,
            activePlayerIndex: nextPlayerIndex,
            actionHistory: newActionHistory,
          });

          // If next player is AI, trigger AI turn
          if (!newPlayers[nextPlayerIndex].isHero) {
            get().processAITurn();
          }
        }
      },

      checkBettingRoundComplete: (players: Player[], nextIndex: number, lastAggressor: number | null) => {
        // All players have acted and bets are equal
        const activePlayers = players.filter(p => p.isActive && !p.isFolded && !p.isAllIn);

        if (activePlayers.length <= 1) return true;

        const firstBet = activePlayers[0].currentBet;
        const allBetsEqual = activePlayers.every(p => p.currentBet === firstBet);

        // Round is complete when we're back to the last aggressor (or all checked)
        if (lastAggressor === null) {
          // No aggressor, check if we've gone around
          return nextIndex === players.findIndex(p => p.isActive && !p.isFolded && !p.isAllIn);
        }

        return nextIndex === lastAggressor && allBetsEqual;
      },

      getAvailableActions: (): AvailableAction[] => {
        const { players, activePlayerIndex, currentBet, config } = get();
        const player = players[activePlayerIndex];

        if (!player || player.isFolded || !player.isActive) return [];

        const actions: AvailableAction[] = [];
        const toCall = currentBet - player.currentBet;

        // Fold is always available if there's a bet to call
        if (toCall > 0) {
          actions.push({
            type: "fold",
            label: "Fold",
            labelZh: "棄牌",
          });
        }

        // Check if no bet to call
        if (toCall === 0) {
          actions.push({
            type: "check",
            label: "Check",
            labelZh: "過牌",
          });
        }

        // Call if there's a bet
        if (toCall > 0 && toCall < player.stack) {
          actions.push({
            type: "call",
            label: `Call ${toCall}`,
            labelZh: `跟注 ${toCall}`,
            minAmount: toCall,
            maxAmount: toCall,
          });
        }

        // Bet if no current bet
        if (currentBet === 0 && player.stack > 0) {
          actions.push({
            type: "bet",
            label: "Bet",
            labelZh: "下注",
            minAmount: config.blinds.bb,
            maxAmount: player.stack,
          });
        }

        // Raise if there's a bet
        if (currentBet > 0 && player.stack > toCall) {
          const minRaise = currentBet + config.blinds.bb;
          actions.push({
            type: "raise",
            label: "Raise",
            labelZh: "加注",
            minAmount: minRaise,
            maxAmount: player.stack + player.currentBet,
          });
        }

        // All-in always available
        if (player.stack > 0) {
          actions.push({
            type: "allin",
            label: `All-in ${player.stack}`,
            labelZh: `全下 ${player.stack}`,
            minAmount: player.stack,
            maxAmount: player.stack,
          });
        }

        return actions;
      },

      // ========================================
      // AI Actions
      // ========================================

      processAITurn: async () => {
        set({ aiThinking: true });

        // Simulate AI thinking time
        await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 600));

        const { players, activePlayerIndex, currentBet, pot, currentStreet, communityCards, lastAggressorIndex } = get();
        const aiPlayer = players[activePlayerIndex];

        if (!aiPlayer || aiPlayer.isHero || !aiPlayer.holeCards) {
          set({ aiThinking: false });
          return;
        }

        // Get the AI profile for this player
        const aiProfile = getPlayerAIProfile(aiPlayer.seatIndex);

        // Get last aggressor position
        const lastAggressor = lastAggressorIndex !== null ? players[lastAggressorIndex]?.position : null;

        // Check if there's a raise in front
        const hasRaiseInFront = currentBet > 1 && lastAggressorIndex !== activePlayerIndex;

        // Get AI decision using the decision engine with the player's profile
        const decision = getAIDecision(
          {
            position: aiPlayer.position,
            holeCards: aiPlayer.holeCards,
            street: currentStreet,
            pot,
            currentBet,
            playerBet: aiPlayer.currentBet,
            stack: aiPlayer.stack,
            numActivePlayers: players.filter(p => p.isActive && !p.isFolded).length,
            lastAggressor,
            hasRaiseInFront,
            communityCards,
          },
          aiProfile
        );

        set({ aiThinking: false });
        get().handleAction(decision.action, decision.amount);
      },

      // ========================================
      // Hand Resolution
      // ========================================

      determineWinners: () => {
        const { players, pot } = get();
        const activePlayers = players.filter(p => p.isActive && !p.isFolded);

        if (activePlayers.length === 1) {
          // Only one player left, they win
          const winner = activePlayers[0];
          const winnerIndex = players.findIndex(p => p.id === winner.id);
          const newPlayers = [...players];
          newPlayers[winnerIndex] = {
            ...winner,
            stack: winner.stack + pot,
          };

          set({
            players: newPlayers,
            winners: [winner],
            pot: 0,
            phase: "result",
          });

          // Update session stats
          if (winner.isHero) {
            const { sessionStats } = get();
            set({
              sessionStats: {
                ...sessionStats,
                handsPlayed: sessionStats.handsPlayed + 1,
                handsWon: sessionStats.handsWon + 1,
                totalProfit: sessionStats.totalProfit + pot,
                biggestPot: Math.max(sessionStats.biggestPot, pot),
              },
            });
          }
        } else {
          // Multiple players - evaluate hands
          const { communityCards } = get();

          // Only evaluate if we have 5 community cards
          if (communityCards.length < 5) {
            // Not at showdown yet, pick first active player
            const winner = activePlayers[0];
            const winnerIndex = players.findIndex(p => p.id === winner.id);
            const newPlayers = [...players];
            newPlayers[winnerIndex] = {
              ...winner,
              stack: winner.stack + pot,
            };
            set({
              players: newPlayers,
              winners: [winner],
              pot: 0,
              phase: "result",
            });
            return;
          }

          // Evaluate all active players' hands
          const playersWithCards = activePlayers
            .filter(p => p.holeCards !== null)
            .map(p => ({
              id: p.id,
              holeCards: p.holeCards as [Card, Card],
            }));

          const winnerResults = findWinners(playersWithCards, communityCards);

          // Store hand evaluations
          const evaluations = new Map<string, typeof winnerResults[0]['evaluation']>();
          for (const player of playersWithCards) {
            const eval_ = evaluateHand(player.holeCards, communityCards);
            evaluations.set(player.id, eval_);
          }

          // Calculate pot share (handles ties)
          const potShare = pot / winnerResults.length;

          // Update player stacks
          const newPlayers = [...players];
          const winnerIds = new Set(winnerResults.map(w => w.playerId));

          for (let i = 0; i < newPlayers.length; i++) {
            if (winnerIds.has(newPlayers[i].id)) {
              newPlayers[i] = {
                ...newPlayers[i],
                stack: newPlayers[i].stack + potShare,
              };
            }
          }

          // Get winner Player objects
          const winnerPlayers = activePlayers.filter(p => winnerIds.has(p.id));

          set({
            players: newPlayers,
            winners: winnerPlayers,
            handEvaluations: evaluations,
            pot: 0,
            phase: "showdown",
          });

          // Update session stats
          const heroWon = winnerPlayers.some(w => w.isHero);
          const heroPlayer = activePlayers.find(p => p.isHero);
          const heroInvested = heroPlayer?.totalInvested ?? 0;
          const { sessionStats } = get();
          set({
            sessionStats: {
              ...sessionStats,
              handsPlayed: sessionStats.handsPlayed + 1,
              handsWon: heroWon ? sessionStats.handsWon + 1 : sessionStats.handsWon,
              totalProfit: heroWon
                ? sessionStats.totalProfit + (potShare - heroInvested)
                : sessionStats.totalProfit - heroInvested,
              biggestPot: Math.max(sessionStats.biggestPot, pot),
            },
          });
        }
      },

      awardPot: () => {
        // Implemented in determineWinners
      },

      // ========================================
      // Training
      // ========================================

      getGTORecommendation: () => {
        // Placeholder - will implement with GTO range data
        return null;
      },

      // ========================================
      // Session
      // ========================================

      resetSession: () => {
        set({
          ...initialState,
          phase: "setup",
        });
      },

      // ========================================
      // UI
      // ========================================

      setShowBetSlider: (show: boolean) => set({ showBetSlider: show }),
      setSelectedBetSize: (size: number) => set({ selectedBetSize: size }),
    }),
    {
      name: "table-store",
      partialize: (state) => ({
        sessionStats: state.sessionStats,
        trainingMode: state.trainingMode,
      }),
    }
  )
);
