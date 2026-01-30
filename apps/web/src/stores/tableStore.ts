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
  HandHistory,
} from "@/lib/poker/types";
import {
  POSITIONS,
  RANKS,
  SUITS,
  DEFAULT_CONFIG,
  DEFAULT_HERO_STATS,
} from "@/lib/poker/types";
import { TIMING, TABLE } from "@/lib/poker/constants";
import { evaluateHand, determineWinners as findWinners } from "@/lib/poker/handEvaluator";
import { getAIDecision, AI_PROFILES, AIPlayerProfile, getAIProfile } from "@/lib/poker/aiDecisionEngine";
import { createHandHistory, saveHandHistory } from "@/lib/poker/handHistory";

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

// Side pot calculation for multi-way all-in scenarios
// Uses SidePot type from types.ts

function calculateSidePots(players: Player[]): { amount: number; eligiblePlayers: string[] }[] {
  // Get all players who contributed to the pot (including folded players)
  const contributors = players.filter(p => p.totalInvested > 0);
  if (contributors.length === 0) return [];

  // Get unique investment levels, sorted ascending
  const investmentLevels = [...new Set(contributors.map(p => p.totalInvested))].sort((a, b) => a - b);

  const pots: { amount: number; eligiblePlayers: string[] }[] = [];
  let previousLevel = 0;

  for (const level of investmentLevels) {
    if (level > previousLevel) {
      const contribution = level - previousLevel;

      // Count how many players contributed at least this level
      const playersAtThisLevel = contributors.filter(p => p.totalInvested >= level);

      // Pot amount = contribution * number of players who contributed at least this much
      const potAmount = contribution * playersAtThisLevel.length;

      // Only non-folded players are eligible to win
      const eligiblePlayersList = playersAtThisLevel.filter(p => !p.isFolded);

      if (potAmount > 0 && eligiblePlayersList.length > 0) {
        pots.push({
          amount: potAmount,
          eligiblePlayers: eligiblePlayersList.map(p => p.id),
        });
      } else if (potAmount > 0 && eligiblePlayersList.length === 0) {
        // All eligible players folded - add to previous pot or create dead money pot
        // This money goes to the last pot with eligible players
        if (pots.length > 0) {
          pots[pots.length - 1].amount += potAmount;
        }
      }

      previousLevel = level;
    }
  }

  return pots;
}

function getPositionIndex(position: Position): number {
  return POSITIONS.indexOf(position);
}

// Get position name for a seat based on dealer position
// Positions relative to dealer: BTN = dealer, SB = dealer+1, BB = dealer+2, etc.
function getPositionForSeat(seatIndex: number, dealerSeatIndex: number): Position {
  // Calculate relative position from dealer
  // seatIndex 0-5, dealerSeatIndex 0-5
  // If dealer is at seat 3:
  //   seat 3 = BTN, seat 4 = SB, seat 5 = BB, seat 0 = UTG, seat 1 = HJ, seat 2 = CO
  const relativePos = (seatIndex - dealerSeatIndex + 6) % 6;

  // Mapping: 0=BTN, 1=SB, 2=BB, 3=UTG, 4=HJ, 5=CO
  const positionMap: Position[] = ["BTN", "SB", "BB", "UTG", "HJ", "CO"];
  return positionMap[relativePos];
}

// Check if all remaining players are all-in (no one can act)
function areAllPlayersAllIn(players: Player[]): boolean {
  const activePlayers = players.filter(p => p.isActive && !p.isFolded);
  if (activePlayers.length <= 1) return false;
  // All active players must be all-in
  return activePlayers.every(p => p.isAllIn);
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
  lastWonPot: 0, // Store the won pot for display
  sidePots: [],
  deck: [],
  currentStreet: "preflop",
  activePlayerIndex: 0,
  lastAggressorIndex: null,
  actionsThisRound: 0, // Track number of actions since last raise/bet
  currentBet: 0,
  minRaise: 1,
  actionHistory: [],
  streetActions: new Map(),
  phase: "setup",
  isTransitioning: false,
  winners: null,
  handEvaluations: new Map(),
  trainingMode: {
    enabled: false,
    scenario: null,
    showGTOHints: false,
    showEV: false,
    hintMode: "off" as const,
  },
  sessionStats: {
    handsPlayed: 0,
    handsWon: 0,
    totalProfit: 0,
    biggestPot: 0,
  },
  heroStats: { ...DEFAULT_HERO_STATS },
  positionStats: {
    UTG: { handsPlayed: 0, handsWon: 0, totalProfit: 0 },
    HJ: { handsPlayed: 0, handsWon: 0, totalProfit: 0 },
    CO: { handsPlayed: 0, handsWon: 0, totalProfit: 0 },
    BTN: { handsPlayed: 0, handsWon: 0, totalProfit: 0 },
    SB: { handsPlayed: 0, handsWon: 0, totalProfit: 0 },
    BB: { handsPlayed: 0, handsWon: 0, totalProfit: 0 },
  },
  aiThinking: false,
  showBetSlider: false,
  selectedBetSize: 0,
  autoRotate: true,
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
        const dealerIndex = getPositionIndex("BTN");
        const players = createPlayers(
          { ...config, startingStack: scenario.effectiveStack },
          scenario.heroPosition,
          dealerIndex
        );

        // Apply preflop actions if provided
        let pot = config.blinds.sb + config.blinds.bb;
        let currentBet = config.blinds.bb;
        const actionHistory: ActionRecord[] = [];

        // Apply blinds to initial state
        const sbIndex = (dealerIndex + 1) % 6;
        const bbIndex = (dealerIndex + 2) % 6;
        players[sbIndex].currentBet = config.blinds.sb;
        players[sbIndex].totalInvested = config.blinds.sb;
        players[sbIndex].stack -= config.blinds.sb;
        players[bbIndex].currentBet = config.blinds.bb;
        players[bbIndex].totalInvested = config.blinds.bb;
        players[bbIndex].stack -= config.blinds.bb;

        if (scenario.preflopActions && scenario.preflopActions.length > 0) {
          for (const action of scenario.preflopActions) {
            const playerIndex = players.findIndex(p => p.position === action.position);
            if (playerIndex === -1) continue;

            const player = players[playerIndex];

            switch (action.action) {
              case "fold":
                player.isFolded = true;
                break;
              case "call":
                const callAmount = currentBet - player.currentBet;
                player.stack -= callAmount;
                pot += callAmount;
                player.currentBet = currentBet;
                player.totalInvested += callAmount;
                break;
              case "raise":
              case "bet":
                if (action.amount) {
                  const raiseAmount = action.amount - player.currentBet;
                  player.stack -= raiseAmount;
                  pot += raiseAmount;
                  player.currentBet = action.amount;
                  player.totalInvested += raiseAmount;
                  currentBet = action.amount;
                }
                break;
              case "allin":
                const allinAmount = player.stack;
                pot += allinAmount;
                player.currentBet += allinAmount;
                player.totalInvested += allinAmount;
                player.stack = 0;
                player.isAllIn = true;
                if (player.currentBet > currentBet) {
                  currentBet = player.currentBet;
                }
                break;
            }

            actionHistory.push(action);
          }
        }

        // Set hero hand if specified
        let deck = shuffleDeck(createDeck());
        if (scenario.heroHand) {
          const heroIndex = players.findIndex(p => p.isHero);
          if (heroIndex !== -1) {
            // Remove hero's cards from deck
            deck = deck.filter(c =>
              !(c.rank === scenario.heroHand![0].rank && c.suit === scenario.heroHand![0].suit) &&
              !(c.rank === scenario.heroHand![1].rank && c.suit === scenario.heroHand![1].suit)
            );
            players[heroIndex].holeCards = scenario.heroHand;
          }
        }

        // Set community cards if board is provided
        let communityCards: Card[] = [];
        let currentStreet: Street = "preflop";

        if (scenario.board) {
          if (scenario.board.flop) {
            communityCards = [...scenario.board.flop];
            currentStreet = "flop";
            // Remove flop cards from deck
            for (const card of scenario.board.flop) {
              deck = deck.filter(c => !(c.rank === card.rank && c.suit === card.suit));
            }
            // Reset current bets for postflop
            players.forEach(p => { p.currentBet = 0; });
            currentBet = 0;
          }
          if (scenario.board.turn) {
            communityCards.push(scenario.board.turn);
            currentStreet = "turn";
            deck = deck.filter(c =>
              !(c.rank === scenario.board!.turn!.rank && c.suit === scenario.board!.turn!.suit)
            );
          }
          if (scenario.board.river) {
            communityCards.push(scenario.board.river);
            currentStreet = "river";
            deck = deck.filter(c =>
              !(c.rank === scenario.board!.river!.rank && c.suit === scenario.board!.river!.suit)
            );
          }
        }

        set({
          players,
          pot,
          currentBet,
          communityCards,
          currentStreet,
          deck,
          actionHistory,
          trainingMode: {
            enabled: true,
            scenario,
            showGTOHints: true,
            showEV: false,
            hintMode: "after" as const,
          },
        });
      },

      // ========================================
      // Game Flow Actions
      // ========================================

      startNewHand: () => {
        const { config, dealerSeatIndex, players, sessionStats, autoRotate } = get();

        // Rotate dealer only if autoRotate is enabled
        const newDealerIndex = autoRotate
          ? (dealerSeatIndex + 1) % 6
          : dealerSeatIndex;

        // Reset players for new hand, update positions based on new dealer
        const resetPlayers = players.map((p, i) => ({
          ...p,
          position: getPositionForSeat(i, newDealerIndex),
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
          actionsThisRound: 0, // Start with 0 actions
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
        const { deck, players, config } = get();
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
        let attempts = 0;
        while (
          (resetPlayers[firstToAct].isFolded || resetPlayers[firstToAct].isAllIn) &&
          attempts < TABLE.MAX_PLAYERS
        ) {
          firstToAct = (firstToAct + 1) % 6;
          attempts++;
        }

        // If all players are folded/all-in, go straight to showdown
        if (attempts === TABLE.MAX_PLAYERS) {
          set({
            deck: newDeck,
            communityCards: flop,
            currentStreet: "flop",
            players: resetPlayers,
            phase: "showdown",
          });
          get().determineWinners();
          return;
        }

        set({
          deck: newDeck,
          communityCards: flop,
          currentStreet: "flop",
          players: resetPlayers,
          activePlayerIndex: firstToAct,
          currentBet: 0,
          minRaise: config.blinds.bb, // Reset min raise for new street
          actionsThisRound: 0, // Ensure action counter is reset
          lastAggressorIndex: null,
          streetActions: new Map([...get().streetActions, ["flop", []]]),
        });
      },

      dealTurn: () => {
        const { deck, communityCards, players, dealerSeatIndex, config } = get();
        const newDeck = [...deck];

        newDeck.pop(); // Burn
        const turn = newDeck.pop()!;

        const resetPlayers = players.map(p => ({ ...p, currentBet: 0 }));

        let firstToAct = (dealerSeatIndex + 1) % 6;
        let attempts = 0;
        while (
          (resetPlayers[firstToAct].isFolded || resetPlayers[firstToAct].isAllIn) &&
          attempts < TABLE.MAX_PLAYERS
        ) {
          firstToAct = (firstToAct + 1) % 6;
          attempts++;
        }

        // If all players are folded/all-in, go straight to showdown
        if (attempts === TABLE.MAX_PLAYERS) {
          set({
            deck: newDeck,
            communityCards: [...communityCards, turn],
            currentStreet: "turn",
            players: resetPlayers,
            phase: "showdown",
          });
          get().determineWinners();
          return;
        }

        set({
          deck: newDeck,
          communityCards: [...communityCards, turn],
          currentStreet: "turn",
          players: resetPlayers,
          activePlayerIndex: firstToAct,
          currentBet: 0,
          minRaise: config.blinds.bb, // Reset min raise for new street
          actionsThisRound: 0, // Ensure action counter is reset
          lastAggressorIndex: null,
          streetActions: new Map([...get().streetActions, ["turn", []]]),
        });
      },

      dealRiver: () => {
        const { deck, communityCards, players, dealerSeatIndex, config } = get();
        const newDeck = [...deck];

        newDeck.pop(); // Burn
        const river = newDeck.pop()!;

        const resetPlayers = players.map(p => ({ ...p, currentBet: 0 }));

        let firstToAct = (dealerSeatIndex + 1) % 6;
        let attempts = 0;
        while (
          (resetPlayers[firstToAct].isFolded || resetPlayers[firstToAct].isAllIn) &&
          attempts < TABLE.MAX_PLAYERS
        ) {
          firstToAct = (firstToAct + 1) % 6;
          attempts++;
        }

        // If all players are folded/all-in, go straight to showdown
        if (attempts === TABLE.MAX_PLAYERS) {
          set({
            deck: newDeck,
            communityCards: [...communityCards, river],
            currentStreet: "river",
            players: resetPlayers,
            phase: "showdown",
          });
          get().determineWinners();
          return;
        }

        set({
          deck: newDeck,
          communityCards: [...communityCards, river],
          currentStreet: "river",
          players: resetPlayers,
          activePlayerIndex: firstToAct,
          currentBet: 0,
          minRaise: config.blinds.bb, // Reset min raise for new street
          actionsThisRound: 0, // Ensure action counter is reset
          lastAggressorIndex: null,
          streetActions: new Map([...get().streetActions, ["river", []]]),
        });
      },

      // Run out board when all players are all-in
      // Deals remaining community cards with delays for dramatic effect
      runOutBoard: () => {
        const { deck, communityCards, currentStreet, players, phase } = get();

        // Abort if not in playing state
        if (phase !== "playing") {
          set({ isTransitioning: false });
          return;
        }

        const newDeck = [...deck];
        const newCommunityCards = [...communityCards];

        // Calculate how many cards we need to deal
        const cardsNeeded = 5 - communityCards.length;

        if (cardsNeeded <= 0) {
          // Already have 5 cards, go to showdown
          set({
            isTransitioning: false,
            phase: "showdown",
          });
          get().determineWinners();
          return;
        }

        // Deal cards based on current street
        const dealSequence: { street: Street; cardsCount: number }[] = [];

        if (currentStreet === "preflop") {
          dealSequence.push({ street: "flop", cardsCount: 3 });
          dealSequence.push({ street: "turn", cardsCount: 1 });
          dealSequence.push({ street: "river", cardsCount: 1 });
        } else if (currentStreet === "flop") {
          dealSequence.push({ street: "turn", cardsCount: 1 });
          dealSequence.push({ street: "river", cardsCount: 1 });
        } else if (currentStreet === "turn") {
          dealSequence.push({ street: "river", cardsCount: 1 });
        }

        // Reset player bets for new street
        const resetPlayers = players.map(p => ({ ...p, currentBet: 0 }));

        // Deal with recursive delays
        let currentIndex = 0;

        const dealNext = () => {
          if (currentIndex >= dealSequence.length) {
            // Done dealing, go to showdown
            set({
              isTransitioning: false,
              phase: "showdown",
            });
            get().determineWinners();
            return;
          }

          const { street, cardsCount } = dealSequence[currentIndex];
          const cardsDealt: Card[] = [];

          // Burn card
          newDeck.pop();

          // Deal cards
          for (let i = 0; i < cardsCount; i++) {
            const card = newDeck.pop();
            if (card) cardsDealt.push(card);
          }

          set({
            deck: newDeck,
            communityCards: [...get().communityCards, ...cardsDealt],
            currentStreet: street,
            players: resetPlayers,
            currentBet: 0,
            actionsThisRound: 0,
          });

          currentIndex++;

          // Delay before dealing next street (dramatic effect)
          if (currentIndex < dealSequence.length) {
            setTimeout(dealNext, TIMING.ALL_IN_CARD_DELAY ?? 1000);
          } else {
            // Last cards dealt, slight delay before showdown
            setTimeout(() => {
              set({
                isTransitioning: false,
                phase: "showdown",
              });
              get().determineWinners();
            }, TIMING.ALL_IN_CARD_DELAY ?? 1000);
          }
        };

        // Start dealing sequence
        setTimeout(dealNext, TIMING.ALL_IN_CARD_DELAY ?? 1000);
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
        let newMinRaise = state.minRaise;
        let newLastAggressor = state.lastAggressorIndex;
        let newActionsThisRound = state.actionsThisRound + 1; // Increment action counter

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
            // Validate bet amount
            const { minRaise } = get();
            const minBetAmount = action === "bet" ? config.blinds.bb : currentBet + minRaise;
            const maxBetAmount = player.stack + player.currentBet;

            // Clamp amount to valid range
            let betAmount = amount || minBetAmount;
            betAmount = Math.max(minBetAmount, Math.min(betAmount, maxBetAmount));

            const totalBet = betAmount;
            const toAdd = totalBet - player.currentBet;
            const actualAdd = Math.min(toAdd, player.stack);

            // Calculate the raise increment for minimum re-raise
            const newTotalBet = player.currentBet + actualAdd;
            const raiseIncrement = newTotalBet - currentBet;
            if (raiseIncrement > 0) {
              newMinRaise = raiseIncrement;
            }

            newPlayers[activePlayerIndex] = {
              ...player,
              stack: player.stack - actualAdd,
              currentBet: newTotalBet,
              totalInvested: player.totalInvested + actualAdd,
              isAllIn: player.stack - actualAdd === 0,
            };
            newPot += actualAdd;
            newCurrentBet = newTotalBet;
            newLastAggressor = activePlayerIndex;
            newActionsThisRound = 1; // Reset counter on bet/raise (this counts as first action)
            actionRecord.amount = totalBet;
            break;
          }

          case "allin": {
            const allInAmount = player.stack;
            const newTotalBet = player.currentBet + allInAmount;
            newPlayers[activePlayerIndex] = {
              ...player,
              stack: 0,
              currentBet: newTotalBet,
              totalInvested: player.totalInvested + allInAmount,
              isAllIn: true,
            };
            newPot += allInAmount;

            // Check if this all-in is a raise that re-opens betting
            // In standard poker, all-in must meet min raise to re-open
            const raiseAmount = newTotalBet - currentBet;
            const { minRaise } = get();

            if (newTotalBet > currentBet && raiseAmount >= minRaise) {
              // Full raise - re-opens betting
              newCurrentBet = newTotalBet;
              newLastAggressor = activePlayerIndex;
              newMinRaise = raiseAmount; // Update min raise for next player
              newActionsThisRound = 1; // Reset counter
            } else if (newTotalBet > currentBet) {
              // Incomplete raise (all-in for less than min raise)
              // Updates current bet but doesn't re-open betting
              newCurrentBet = newTotalBet;
              // Don't reset action counter - betting isn't re-opened
            }
            // If newTotalBet <= currentBet, it's a call-all-in, no changes needed

            actionRecord.amount = allInAmount;
            break;
          }
        }

        // Add to action history
        const newActionHistory = [...state.actionHistory, actionRecord];

        // Track hero stats for AI adaptation and performance tracking
        let newHeroStats = state.heroStats;
        if (player.isHero) {
          newHeroStats = { ...state.heroStats };
          const { actionHistory, lastAggressorIndex, dealerSeatIndex } = state;

          // ============================================
          // Basic action tracking (all streets)
          // ============================================
          if (action === "bet") {
            newHeroStats.totalBets++;
          } else if (action === "raise") {
            newHeroStats.totalRaises++;
          } else if (action === "call") {
            newHeroStats.totalCalls++;
          } else if (action === "allin") {
            // Count as raise if it increases the bet
            if (player.stack + player.currentBet > currentBet) {
              newHeroStats.totalRaises++;
            } else {
              newHeroStats.totalCalls++;
            }
          }

          // ============================================
          // Preflop stats
          // ============================================
          if (currentStreet === "preflop") {
            // Check if hero has already made voluntary actions this hand
            const heroPreflopActions = actionHistory.filter(a => a.street === "preflop" && a.isHero);
            const heroAlreadyVPIP = heroPreflopActions.some(
              a => a.action === "call" || a.action === "raise" || a.action === "bet" || a.action === "allin"
            );
            const heroAlreadyPFR = heroPreflopActions.some(
              a => a.action === "raise" || a.action === "bet"
            );

            // Track VPIP (voluntarily put money in pot) - only count once per hand
            if (!heroAlreadyVPIP && (action === "call" || action === "raise" || action === "bet" || action === "allin")) {
              newHeroStats.handsVPIP++;
            }

            // Track PFR (preflop raise) - only count once per hand
            if (!heroAlreadyPFR && (action === "raise" || action === "bet")) {
              newHeroStats.handsPFR++;
            }

            // Track ATS (Attempt to Steal) - raise from CO/BTN/SB when folded to
            const heroPosition = player.position;
            const isStealPosition = heroPosition === "CO" || heroPosition === "BTN" || heroPosition === "SB";
            const allFoldedToHero = actionHistory.filter(a => a.street === "preflop")
              .every(a => a.action === "fold" || a.position === "SB" || a.position === "BB");

            if (isStealPosition && allFoldedToHero) {
              newHeroStats.stealOpportunities++;
              if (action === "raise" || action === "bet" || action === "allin") {
                newHeroStats.stealAttempts++;
              }
            }

            // Track 3-bet
            // Check if there's already a raise before us
            const preflopActions = actionHistory.filter(a => a.street === "preflop");
            const previousRaises = preflopActions.filter(a => a.action === "raise" || a.action === "bet");
            if (previousRaises.length === 1) {
              // Someone raised, we can 3-bet
              newHeroStats.threeBetOpportunity++;
              if (action === "raise" || action === "allin") {
                newHeroStats.threeBetCount++;
              }
            }

            // Track Fold to 3-bet
            if (previousRaises.length >= 2) {
              // We raised and got 3-bet
              const heroRaised = preflopActions.some(a => a.isHero && (a.action === "raise" || a.action === "bet"));
              if (heroRaised) {
                newHeroStats.faced3BetCount++;
                if (action === "fold") {
                  newHeroStats.foldTo3BetCount++;
                }
              }
            }
          }

          // ============================================
          // Postflop stats
          // ============================================
          if (currentStreet !== "preflop") {
            // Find who was the preflop aggressor
            const preflopActions = actionHistory.filter(a => a.street === "preflop");
            const preflopRaiser = preflopActions.filter(a => a.action === "raise" || a.action === "bet").pop();
            const wasHeroPreflopAggressor = preflopRaiser?.isHero ?? false;

            // C-bet opportunity (hero was preflop aggressor, action checks to us or we act first)
            if (wasHeroPreflopAggressor && currentBet === 0) {
              if (currentStreet === "flop") {
                newHeroStats.flopCBetOpportunity++;
                if (action === "bet" || action === "allin") {
                  newHeroStats.flopCBet++;
                }
              } else if (currentStreet === "turn") {
                newHeroStats.turnCBetOpportunity++;
                if (action === "bet" || action === "allin") {
                  newHeroStats.turnCBet++;
                }
              } else if (currentStreet === "river") {
                newHeroStats.riverCBetOpportunity++;
                if (action === "bet" || action === "allin") {
                  newHeroStats.riverCBet++;
                }
              }
            }

            // Facing C-bet (villain was preflop aggressor and bet)
            if (!wasHeroPreflopAggressor && currentBet > 0) {
              // Check if this is actually a c-bet (bet from preflop aggressor)
              const currentStreetActions = actionHistory.filter(a => a.street === currentStreet);
              const bettorAction = currentStreetActions.find(a => a.action === "bet");
              const isCBet = bettorAction && preflopRaiser && bettorAction.position === preflopRaiser.position;

              if (isCBet) {
                newHeroStats.facedCBet++;
                if (action === "fold") {
                  newHeroStats.foldToCBet++;
                } else if (action === "call") {
                  newHeroStats.callCBet++;
                } else if (action === "raise" || action === "allin") {
                  newHeroStats.raiseCBet++;
                }
              }
            }

            // Check-raise tracking
            const heroActionsThisStreet = actionHistory.filter(
              a => a.street === currentStreet && a.isHero
            );
            const heroCheckedFirst = heroActionsThisStreet.length === 1 &&
              heroActionsThisStreet[0].action === "check";

            if (heroCheckedFirst && currentBet > 0) {
              newHeroStats.checkRaiseOpportunity++;
              if (action === "raise" || action === "allin") {
                newHeroStats.checkRaiseCount++;
              }
            }
          }
        }

        // Check if hand should end (only 1 player left)
        const activePlayers = countActivePlayers(newPlayers);
        if (activePlayers === 1) {
          // Hand is over, award pot to remaining player
          set({
            players: newPlayers,
            pot: newPot,
            actionHistory: newActionHistory,
            heroStats: newHeroStats,
            phase: "result",
          });
          get().determineWinners();
          return;
        }

        // Find next player to act
        const nextPlayerIndex = getNextActivePlayerIndex(newPlayers, activePlayerIndex);

        // If no one can act (all players all-in or only 1 active), run out the board
        if (nextPlayerIndex === -1) {
          // Check if all remaining players are all-in (need to deal remaining cards)
          if (areAllPlayersAllIn(newPlayers)) {
            set({
              players: newPlayers,
              pot: newPot,
              actionHistory: newActionHistory,
              heroStats: newHeroStats,
              isTransitioning: true,
            });

            // Deal remaining community cards with delays for dramatic effect
            get().runOutBoard();
            return;
          }

          // Only 1 player left scenario (shouldn't happen, handled above)
          set({
            players: newPlayers,
            pot: newPot,
            actionHistory: newActionHistory,
            heroStats: newHeroStats,
            phase: "showdown",
          });
          get().determineWinners();
          return;
        }

        // Check if betting round is complete (pass updated values, not stale state)
        const isRoundComplete = state.checkBettingRoundComplete(
          newPlayers,
          nextPlayerIndex,
          newLastAggressor,
          newCurrentBet,
          newActionsThisRound
        );

        if (isRoundComplete) {
          // Move to next street
          set({
            players: newPlayers,
            pot: newPot,
            currentBet: newCurrentBet,
            minRaise: config.blinds.bb, // Reset minRaise for new street
            actionsThisRound: 0, // Reset action counter for new street
            lastAggressorIndex: newLastAggressor,
            actionHistory: newActionHistory,
            heroStats: newHeroStats,
          });

          // Mark as transitioning to prevent race conditions
          set({ isTransitioning: true });

          // Add delay before dealing next street for better UX
          const dealNextStreet = () => {
            const { isTransitioning, phase } = get();

            // Abort if transition was cancelled (e.g., by resetSession)
            if (!isTransitioning || phase !== "playing") {
              return;
            }

            set({ isTransitioning: false });

            const street = get().currentStreet;
            if (street === "preflop") {
              get().dealFlop();
            } else if (street === "flop") {
              get().dealTurn();
            } else if (street === "turn") {
              get().dealRiver();
            } else {
              // Showdown
              set({ phase: "showdown" });
              get().determineWinners();
            }
          };

          // Delay for street transition (feels more natural)
          setTimeout(dealNextStreet, TIMING.STREET_TRANSITION);
        } else {
          // Continue betting round
          set({
            players: newPlayers,
            pot: newPot,
            currentBet: newCurrentBet,
            minRaise: newMinRaise,
            actionsThisRound: newActionsThisRound,
            lastAggressorIndex: newLastAggressor,
            activePlayerIndex: nextPlayerIndex,
            actionHistory: newActionHistory,
            heroStats: newHeroStats,
          });

          // If next player is AI, trigger AI turn
          if (!newPlayers[nextPlayerIndex].isHero) {
            get().processAITurn();
          }
        }
      },

      checkBettingRoundComplete: (
        players: Player[],
        nextIndex: number,
        lastAggressor: number | null,
        currentBetAmount: number,
        actionsCount: number
      ) => {
        // Players who can still act (not folded, not all-in)
        const playersWhoCanAct = players.filter(p => p.isActive && !p.isFolded && !p.isAllIn);

        // If nobody can act, round is complete
        if (playersWhoCanAct.length === 0) return true;

        // If only 1 player can act, check if they need to call
        // This handles the case when someone is all-in and one player needs to respond
        if (playersWhoCanAct.length === 1) {
          const player = playersWhoCanAct[0];
          // If they have less bet than current, they need to act (call or fold)
          if (player.currentBet < currentBetAmount) return false;
          // Otherwise round is complete (they've already matched or checked)
          return true;
        }

        // Multiple players can act - check if bets are equal
        const allBetsEqual = playersWhoCanAct.every(p => p.currentBet === currentBetAmount);

        // Round is complete when:
        // 1. All bets are equal (everyone has matched or checked)
        // 2. AND everyone has had a chance to act (actions >= number of active players)
        if (allBetsEqual && actionsCount >= playersWhoCanAct.length) {
          return true;
        }

        return false;
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
          // Minimum raise = current bet + raise increment (at least 1 BB)
          const { minRaise: raiseIncrement } = get();
          const minRaiseAmount = currentBet + Math.max(raiseIncrement, config.blinds.bb);
          actions.push({
            type: "raise",
            label: "Raise",
            labelZh: "加注",
            minAmount: minRaiseAmount,
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
        await new Promise(resolve => setTimeout(resolve, TIMING.AI_THINKING_MIN + Math.random() * TIMING.AI_THINKING_RANDOM));

        const { players, activePlayerIndex, currentBet, pot, currentStreet, communityCards, lastAggressorIndex, heroStats } = get();
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

        // Calculate position awareness (is AI in position vs active players)
        const { dealerSeatIndex, actionHistory } = get();
        const activePlayers = players.filter(p => p.isActive && !p.isFolded && !p.isAllIn);
        const aiSeatIndex = aiPlayer.seatIndex;
        // In position = acting last among remaining players
        const isInPosition = activePlayers.every(p =>
          p.seatIndex === aiSeatIndex ||
          ((p.seatIndex - dealerSeatIndex + 6) % 6) < ((aiSeatIndex - dealerSeatIndex + 6) % 6)
        );

        // Check if villain checked (last action on this street was a check)
        const streetActions = actionHistory.filter(a => a.street === currentStreet);
        const villainChecked = streetActions.length > 0 &&
          streetActions[streetActions.length - 1]?.action === "check" &&
          !streetActions[streetActions.length - 1]?.isHero;

        // Find preflop aggressor (who raised preflop)
        const preflopActions = actionHistory.filter(a => a.street === "preflop");
        const preflopRaiser = preflopActions.find(a => a.action === "raise" || a.action === "bet");
        const preflopAggressor = preflopRaiser?.position;

        // Check if AI was the aggressor on previous street
        const streetOrder: Street[] = ["preflop", "flop", "turn", "river"];
        const currentStreetIndex = streetOrder.indexOf(currentStreet);
        const previousStreet = currentStreetIndex > 0 ? streetOrder[currentStreetIndex - 1] : null;
        const wasLastStreetAggressor = previousStreet
          ? actionHistory.some(a =>
              a.street === previousStreet &&
              a.position === aiPlayer.position &&
              (a.action === "bet" || a.action === "raise")
            )
          : false;

        // Get AI decision using the decision engine with the player's profile
        // Pass heroStats for AI adaptation
        const decision = getAIDecision(
          {
            position: aiPlayer.position,
            holeCards: aiPlayer.holeCards,
            street: currentStreet,
            pot,
            currentBet,
            playerBet: aiPlayer.currentBet,
            stack: aiPlayer.stack,
            numActivePlayers: activePlayers.length,
            lastAggressor,
            hasRaiseInFront,
            communityCards,
            // New context fields for improved postflop logic
            isInPosition,
            villainChecked,
            wasLastStreetAggressor,
            preflopAggressor,
          },
          aiProfile,
          heroStats
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
            lastWonPot: pot, // Store pot for display
            pot: 0,
            phase: "result",
          });

          // Update session stats, hero stats, and position stats
          const heroPlayer = players.find(p => p.isHero);
          const heroInvested = heroPlayer?.totalInvested ?? 0;
          const heroPosition = heroPlayer?.position;
          const { sessionStats, heroStats, positionStats, handNumber, actionHistory, communityCards: cc, config, dealerSeatIndex } = get();
          const dealerPlayer = players.find(p => p.seatIndex === dealerSeatIndex);
          const dealerPosition = dealerPlayer?.position ?? "BTN";
          const newHeroStats = { ...heroStats, handsPlayed: heroStats.handsPlayed + 1 };

          // Update position stats
          const newPositionStats = { ...positionStats };
          if (heroPosition) {
            const posStats = newPositionStats[heroPosition];
            const netProfit = winner.isHero ? (pot - heroInvested) : -heroInvested;
            newPositionStats[heroPosition] = {
              handsPlayed: posStats.handsPlayed + 1,
              handsWon: posStats.handsWon + (winner.isHero ? 1 : 0),
              totalProfit: posStats.totalProfit + netProfit,
            };
          }

          // Record hand history
          const heroProfit = winner.isHero ? (pot - heroInvested) : -heroInvested;
          const handHistory = createHandHistory(
            handNumber,
            players,
            dealerPosition,
            actionHistory,
            cc,
            [winner],
            pot,
            heroPosition ?? "BTN",
            heroProfit,
            new Map(),
            config.blinds,
            config.ante
          );
          saveHandHistory(handHistory);

          if (winner.isHero) {
            // Hero won the pot
            const netProfit = pot - heroInvested;
            set({
              sessionStats: {
                ...sessionStats,
                handsPlayed: sessionStats.handsPlayed + 1,
                handsWon: sessionStats.handsWon + 1,
                totalProfit: sessionStats.totalProfit + netProfit,
                biggestPot: Math.max(sessionStats.biggestPot, pot),
              },
              heroStats: newHeroStats,
              positionStats: newPositionStats,
            });
          } else {
            // Hero lost (folded or was the one remaining when everyone folded)
            set({
              sessionStats: {
                ...sessionStats,
                handsPlayed: sessionStats.handsPlayed + 1,
                totalProfit: sessionStats.totalProfit - heroInvested,
                biggestPot: Math.max(sessionStats.biggestPot, pot),
              },
              heroStats: newHeroStats,
              positionStats: newPositionStats,
            });
          }
        } else {
          // Multiple players - evaluate hands
          const { communityCards } = get();

          // Only evaluate if we have 5 community cards
          if (communityCards.length < 5) {
            // This shouldn't happen - runOutBoard should be called first
            // But if it does, deal remaining cards synchronously
            console.warn("[determineWinners] Called with < 5 community cards, dealing remaining cards...");

            const newDeck = [...get().deck];
            const newCommunityCards = [...communityCards];

            while (newCommunityCards.length < 5) {
              newDeck.pop(); // Burn
              const card = newDeck.pop();
              if (card) newCommunityCards.push(card);
            }

            set({
              deck: newDeck,
              communityCards: newCommunityCards,
              currentStreet: "river",
            });

            // Re-evaluate with full board
            get().determineWinners();
            return;
          }

          // Evaluate all active players' hands
          const playersWithCards = activePlayers
            .filter(p => p.holeCards !== null)
            .map(p => ({
              id: p.id,
              holeCards: p.holeCards as [Card, Card],
            }));

          // Store hand evaluations for all players
          const evaluations = new Map<string, ReturnType<typeof evaluateHand>>();
          for (const player of playersWithCards) {
            const eval_ = evaluateHand(player.holeCards, communityCards);
            evaluations.set(player.id, eval_);
          }

          // Calculate side pots for proper multi-way all-in handling
          const sidePots = calculateSidePots(players);

          // Track winnings for each player
          const winnings = new Map<string, number>();
          const allWinnerIds = new Set<string>();

          // Award each pot to its winner(s)
          for (const sidePot of sidePots) {
            // Find eligible players with cards for this pot
            const eligibleWithCards = playersWithCards.filter(
              p => sidePot.eligiblePlayers.includes(p.id)
            );

            if (eligibleWithCards.length === 0) continue;

            // Find winner(s) among eligible players
            const potWinners = findWinners(eligibleWithCards, communityCards);
            const potShare = sidePot.amount / potWinners.length;

            // Record winnings
            for (const winner of potWinners) {
              const current = winnings.get(winner.playerId) || 0;
              winnings.set(winner.playerId, current + potShare);
              allWinnerIds.add(winner.playerId);
            }
          }

          // Update player stacks
          const newPlayers = [...players];
          for (let i = 0; i < newPlayers.length; i++) {
            const playerWinnings = winnings.get(newPlayers[i].id);
            if (playerWinnings && playerWinnings > 0) {
              newPlayers[i] = {
                ...newPlayers[i],
                stack: newPlayers[i].stack + playerWinnings,
              };
            }
          }

          // Get winner Player objects (players who won at least one pot)
          const winnerPlayers = activePlayers.filter(p => allWinnerIds.has(p.id));

          set({
            players: newPlayers,
            winners: winnerPlayers,
            handEvaluations: evaluations,
            sidePots, // Store side pots for potential UI display
            lastWonPot: pot, // Store pot for display
            pot: 0,
            phase: "showdown",
          });

          // Update session stats, hero stats, and position stats
          const heroPlayer = players.find(p => p.isHero);
          const heroInvested = heroPlayer?.totalInvested ?? 0;
          const heroWinnings = heroPlayer ? (winnings.get(heroPlayer.id) || 0) : 0;
          const heroWon = heroWinnings > 0;
          const heroPosition = heroPlayer?.position;
          const { sessionStats, heroStats, positionStats, handNumber, actionHistory, config, dealerSeatIndex } = get();
          const dealerPlayer = players.find(p => p.seatIndex === dealerSeatIndex);
          const dealerPosition = dealerPlayer?.position ?? "BTN";

          // Track showdown stats (WT = Went to Showdown, WSD = Won at Showdown)
          const heroWentToShowdown = heroPlayer && !heroPlayer.isFolded;
          const newHeroStats = {
            ...heroStats,
            handsPlayed: heroStats.handsPlayed + 1,
            wentToShowdown: heroStats.wentToShowdown + (heroWentToShowdown ? 1 : 0),
            wonAtShowdown: heroStats.wonAtShowdown + (heroWentToShowdown && heroWon ? 1 : 0),
          };

          // Update position stats
          const newPositionStats = { ...positionStats };
          if (heroPosition) {
            const posStats = newPositionStats[heroPosition];
            const netProfit = heroWon ? (heroWinnings - heroInvested) : -heroInvested;
            newPositionStats[heroPosition] = {
              handsPlayed: posStats.handsPlayed + 1,
              handsWon: posStats.handsWon + (heroWon ? 1 : 0),
              totalProfit: posStats.totalProfit + netProfit,
            };
          }

          // Record hand history (showdown)
          const heroProfit = heroWon ? (heroWinnings - heroInvested) : -heroInvested;
          const handHistory = createHandHistory(
            handNumber,
            players,
            dealerPosition,
            actionHistory,
            communityCards,
            winnerPlayers,
            pot,
            heroPosition ?? "BTN",
            heroProfit,
            evaluations,
            config.blinds,
            config.ante
          );
          saveHandHistory(handHistory);

          if (heroWon) {
            // Hero won (or split a pot)
            const netProfit = heroWinnings - heroInvested;
            set({
              sessionStats: {
                ...sessionStats,
                handsPlayed: sessionStats.handsPlayed + 1,
                handsWon: sessionStats.handsWon + 1,
                totalProfit: sessionStats.totalProfit + netProfit,
                biggestPot: Math.max(sessionStats.biggestPot, pot),
              },
              heroStats: newHeroStats,
              positionStats: newPositionStats,
            });
          } else {
            // Hero lost (folded earlier or lost at showdown)
            set({
              sessionStats: {
                ...sessionStats,
                handsPlayed: sessionStats.handsPlayed + 1,
                totalProfit: sessionStats.totalProfit - heroInvested,
                biggestPot: Math.max(sessionStats.biggestPot, pot),
              },
              heroStats: newHeroStats,
              positionStats: newPositionStats,
            });
          }
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
          isTransitioning: false, // Cancel any pending street transitions
        });
      },

      // ========================================
      // UI
      // ========================================

      setShowBetSlider: (show: boolean) => set({ showBetSlider: show }),
      setSelectedBetSize: (size: number) => set({ selectedBetSize: size }),

      // Auto rotation
      setAutoRotate: (autoRotate: boolean) => set({ autoRotate }),
    }),
    {
      name: "table-store",
      version: 2, // Bump version to clear corrupted stats data
      partialize: (state) => ({
        sessionStats: state.sessionStats,
        trainingMode: state.trainingMode,
        autoRotate: state.autoRotate,
        heroStats: state.heroStats,
        positionStats: state.positionStats,
      }),
      migrate: (persistedState: unknown, version: number) => {
        // Clear old corrupted data from version 0/1
        if (version < 2) {
          return {
            sessionStats: { handsPlayed: 0, handsWon: 0, totalProfit: 0, biggestPot: 0 },
            trainingMode: {
              enabled: false,
              scenario: null,
              showGTOHints: false,
              showEV: false,
              hintMode: "off" as const,
            },
            autoRotate: true,
            heroStats: { ...DEFAULT_HERO_STATS },
            positionStats: {
              BTN: { handsPlayed: 0, handsWon: 0, totalProfit: 0 },
              CO: { handsPlayed: 0, handsWon: 0, totalProfit: 0 },
              HJ: { handsPlayed: 0, handsWon: 0, totalProfit: 0 },
              UTG: { handsPlayed: 0, handsWon: 0, totalProfit: 0 },
              SB: { handsPlayed: 0, handsWon: 0, totalProfit: 0 },
              BB: { handsPlayed: 0, handsWon: 0, totalProfit: 0 },
            },
          };
        }
        return persistedState as TableState;
      },
    }
  )
);
