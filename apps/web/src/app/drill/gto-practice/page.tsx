"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  RefreshCw,
  Play,
  RotateCcw,
  Trophy,
  Bot,
  User,
  ArrowRight,
} from "lucide-react";

// Card types
const SUITS = ["h", "d", "c", "s"] as const;
const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"] as const;
type Suit = (typeof SUITS)[number];
type Rank = (typeof RANKS)[number];

interface CardType {
  rank: Rank;
  suit: Suit;
}

type Position = "BTN" | "BB";
type GamePhase = "setup" | "preflop" | "result";
type Action = "fold" | "call" | "raise" | "check" | "allin" | "3bet" | "4bet";

interface GameState {
  phase: GamePhase;
  userPosition: Position;
  userHand: [CardType, CardType] | null;
  aiHand: [CardType, CardType] | null;
  pot: number;
  userStack: number;
  aiStack: number;
  currentBet: number;
  actions: { player: "user" | "ai"; action: Action; amount?: number }[];
  winner: "user" | "ai" | "tie" | null;
  showdown: boolean;
}

// GTO Range data (simplified for BTN vs BB)
const GTO_RANGES = {
  BTN_RFI: {
    // BTN opening range (simplified)
    "AA": 100, "KK": 100, "QQ": 100, "JJ": 100, "TT": 100, "99": 100, "88": 100, "77": 100, "66": 100, "55": 100, "44": 100, "33": 100, "22": 100,
    "AKs": 100, "AQs": 100, "AJs": 100, "ATs": 100, "A9s": 100, "A8s": 100, "A7s": 100, "A6s": 100, "A5s": 100, "A4s": 100, "A3s": 100, "A2s": 100,
    "KQs": 100, "KJs": 100, "KTs": 100, "K9s": 100, "K8s": 100, "K7s": 100, "K6s": 100, "K5s": 100, "K4s": 100, "K3s": 100, "K2s": 100,
    "QJs": 100, "QTs": 100, "Q9s": 100, "Q8s": 100, "Q7s": 100, "Q6s": 100, "Q5s": 100, "Q4s": 100, "Q3s": 100, "Q2s": 100,
    "JTs": 100, "J9s": 100, "J8s": 100, "J7s": 100, "J6s": 100, "J5s": 100, "J4s": 100,
    "T9s": 100, "T8s": 100, "T7s": 100, "T6s": 100,
    "98s": 100, "97s": 100, "96s": 100,
    "87s": 100, "86s": 100, "85s": 100,
    "76s": 100, "75s": 100,
    "65s": 100, "64s": 100,
    "54s": 100, "53s": 100,
    "43s": 100,
    "AKo": 100, "AQo": 100, "AJo": 100, "ATo": 100, "A9o": 100, "A8o": 100, "A7o": 100, "A6o": 100, "A5o": 100, "A4o": 100,
    "KQo": 100, "KJo": 100, "KTo": 100, "K9o": 100, "K8o": 100,
    "QJo": 100, "QTo": 100, "Q9o": 100,
    "JTo": 100, "J9o": 100,
    "T9o": 100, "T8o": 100,
    "98o": 100, "97o": 70,
    "87o": 70,
  } as Record<string, number>,

  BB_VS_BTN: {
    // BB defense vs BTN open (simplified - 3bet or call)
    "AA": { "3bet": 100 }, "KK": { "3bet": 100 }, "QQ": { "3bet": 100 }, "JJ": { "3bet": 85, "call": 15 },
    "TT": { "3bet": 50, "call": 50 }, "99": { "3bet": 30, "call": 70 }, "88": { "call": 100 }, "77": { "call": 100 },
    "66": { "call": 100 }, "55": { "call": 100 }, "44": { "call": 100 }, "33": { "call": 100 }, "22": { "call": 100 },
    "AKs": { "3bet": 100 }, "AQs": { "3bet": 70, "call": 30 }, "AJs": { "3bet": 50, "call": 50 }, "ATs": { "call": 100 },
    "A9s": { "call": 100 }, "A8s": { "call": 100 }, "A7s": { "call": 100 }, "A6s": { "call": 100 },
    "A5s": { "3bet": 50, "call": 50 }, "A4s": { "3bet": 40, "call": 60 }, "A3s": { "call": 100 }, "A2s": { "call": 100 },
    "KQs": { "3bet": 60, "call": 40 }, "KJs": { "call": 100 }, "KTs": { "call": 100 }, "K9s": { "call": 100 },
    "QJs": { "call": 100 }, "QTs": { "call": 100 }, "Q9s": { "call": 100 },
    "JTs": { "call": 100 }, "J9s": { "call": 100 }, "J8s": { "call": 80, "fold": 20 },
    "T9s": { "call": 100 }, "T8s": { "call": 100 },
    "98s": { "call": 100 }, "97s": { "call": 100 },
    "87s": { "call": 100 }, "86s": { "call": 100 },
    "76s": { "call": 100 }, "75s": { "call": 100 },
    "65s": { "call": 100 }, "64s": { "call": 100 },
    "54s": { "call": 100 }, "53s": { "call": 80 },
    "43s": { "call": 70 },
    "AKo": { "3bet": 100 }, "AQo": { "3bet": 50, "call": 50 }, "AJo": { "call": 100 }, "ATo": { "call": 100 },
    "KQo": { "call": 100 }, "KJo": { "call": 100 }, "KTo": { "call": 100 },
    "QJo": { "call": 100 }, "QTo": { "call": 100 },
    "JTo": { "call": 100 },
    "T9o": { "call": 80 },
    "98o": { "call": 70 },
  } as Record<string, Record<string, number>>,

  BTN_VS_3BET: {
    // BTN facing 3bet from BB
    "AA": { "4bet": 100 }, "KK": { "4bet": 100 }, "QQ": { "4bet": 70, "call": 30 }, "JJ": { "4bet": 40, "call": 60 },
    "TT": { "call": 100 }, "99": { "call": 100 }, "88": { "call": 80, "fold": 20 }, "77": { "call": 60, "fold": 40 },
    "AKs": { "4bet": 100 }, "AQs": { "4bet": 50, "call": 50 }, "AJs": { "call": 100 }, "ATs": { "call": 100 },
    "A5s": { "4bet": 50, "fold": 50 }, "A4s": { "4bet": 40, "fold": 60 },
    "KQs": { "call": 100 }, "KJs": { "call": 80, "fold": 20 },
    "QJs": { "call": 80, "fold": 20 }, "JTs": { "call": 80, "fold": 20 },
    "T9s": { "call": 60, "fold": 40 }, "98s": { "call": 50, "fold": 50 },
    "AKo": { "4bet": 100 }, "AQo": { "call": 70, "fold": 30 }, "AJo": { "fold": 100 },
    "KQo": { "fold": 100 },
  } as Record<string, Record<string, number>>,
};

// Helper functions
function createDeck(): CardType[] {
  const deck: CardType[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit });
    }
  }
  return deck;
}

function shuffleDeck(deck: CardType[]): CardType[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function getHandNotation(hand: [CardType, CardType]): string {
  const [c1, c2] = hand;
  const r1 = RANKS.indexOf(c1.rank);
  const r2 = RANKS.indexOf(c2.rank);

  // Sort by rank (lower index = higher rank)
  const [high, low] = r1 < r2 ? [c1, c2] : [c2, c1];

  if (high.rank === low.rank) {
    return `${high.rank}${low.rank}`; // Pair
  }

  const suited = high.suit === low.suit;
  return `${high.rank}${low.rank}${suited ? "s" : "o"}`;
}

function getGTOAction(hand: string, range: Record<string, number | Record<string, number>>): Action {
  const handData = range[hand];

  if (!handData) {
    return "fold";
  }

  // If it's just a number (RFI range), it's the raise frequency
  if (typeof handData === "number") {
    const roll = Math.random() * 100;
    return roll < handData ? "raise" : "fold";
  }

  // If it's an object with action frequencies
  const roll = Math.random() * 100;
  let cumulative = 0;

  for (const [action, freq] of Object.entries(handData)) {
    cumulative += freq;
    if (roll < cumulative) {
      return action as Action;
    }
  }

  return "fold";
}

// Card display component
function PlayingCard({ card, hidden = false }: { card: CardType; hidden?: boolean }) {
  const suitSymbols: Record<Suit, string> = {
    h: "♥",
    d: "♦",
    c: "♣",
    s: "♠",
  };

  const suitColors: Record<Suit, string> = {
    h: "text-red-500",
    d: "text-blue-500",
    c: "text-green-600",
    s: "text-gray-800 dark:text-gray-200",
  };

  if (hidden) {
    return (
      <div className="w-14 h-20 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg shadow-md flex items-center justify-center border-2 border-blue-400">
        <span className="text-white text-2xl">?</span>
      </div>
    );
  }

  return (
    <div className="w-14 h-20 bg-white dark:bg-gray-100 rounded-lg shadow-md flex flex-col items-center justify-center border-2 border-gray-200">
      <span className={cn("font-bold text-xl", suitColors[card.suit])}>
        {card.rank}
      </span>
      <span className={cn("text-lg", suitColors[card.suit])}>
        {suitSymbols[card.suit]}
      </span>
    </div>
  );
}

// Initial state
const initialState: GameState = {
  phase: "setup",
  userPosition: "BTN",
  userHand: null,
  aiHand: null,
  pot: 1.5, // SB + BB
  userStack: 100,
  aiStack: 100,
  currentBet: 1, // BB
  actions: [],
  winner: null,
  showdown: false,
};

export default function GTOPracticePage() {
  const t = useTranslations();
  const [gameState, setGameState] = useState<GameState>(initialState);
  const [stats, setStats] = useState({ wins: 0, losses: 0, ties: 0 });
  const [lastAIAction, setLastAIAction] = useState<string | null>(null);
  const [gtoAdvice, setGtoAdvice] = useState<string | null>(null);

  const startGame = useCallback(() => {
    const deck = shuffleDeck(createDeck());
    const userHand: [CardType, CardType] = [deck[0], deck[1]];
    const aiHand: [CardType, CardType] = [deck[2], deck[3]];

    setGameState({
      ...initialState,
      phase: "preflop",
      userPosition: gameState.userPosition,
      userHand,
      aiHand,
      pot: 1.5,
      userStack: gameState.userPosition === "BTN" ? 99.5 : 99, // BTN posts SB, BB posts BB
      aiStack: gameState.userPosition === "BTN" ? 99 : 99.5,
    });
    setLastAIAction(null);
    setGtoAdvice(null);
  }, [gameState.userPosition]);

  const handleUserAction = useCallback((action: Action) => {
    if (!gameState.userHand || !gameState.aiHand) return;

    const userHandNotation = getHandNotation(gameState.userHand);
    const aiHandNotation = getHandNotation(gameState.aiHand);

    let newState = { ...gameState };
    newState.actions = [...gameState.actions, { player: "user", action }];

    if (gameState.userPosition === "BTN") {
      // User is BTN (first to act)
      if (action === "fold") {
        newState.phase = "result";
        newState.winner = "ai";
        setStats(s => ({ ...s, losses: s.losses + 1 }));
      } else if (action === "raise") {
        // User raises, AI responds
        const aiResponse = getGTOAction(aiHandNotation, GTO_RANGES.BB_VS_BTN);
        newState.actions.push({ player: "ai", action: aiResponse });
        setLastAIAction(aiResponse);

        if (aiResponse === "fold") {
          newState.phase = "result";
          newState.winner = "user";
          setStats(s => ({ ...s, wins: s.wins + 1 }));
        } else if (aiResponse === "call") {
          // Showdown
          newState.phase = "result";
          newState.showdown = true;
          // Simple random winner for now (in reality would compare hands)
          const winner = Math.random() > 0.5 ? "user" : "ai";
          newState.winner = winner;
          setStats(s => winner === "user" ? { ...s, wins: s.wins + 1 } : { ...s, losses: s.losses + 1 });
        } else if (aiResponse === "3bet") {
          // AI 3bets, user needs to respond
          setGtoAdvice(`AI 3bet! 你的 ${userHandNotation} 應該根據 GTO...`);
        }
      }
    } else {
      // User is BB (second to act after BTN opens)
      if (action === "fold") {
        newState.phase = "result";
        newState.winner = "ai";
        setStats(s => ({ ...s, losses: s.losses + 1 }));
      } else if (action === "call") {
        newState.phase = "result";
        newState.showdown = true;
        const winner = Math.random() > 0.5 ? "user" : "ai";
        newState.winner = winner;
        setStats(s => winner === "user" ? { ...s, wins: s.wins + 1 } : { ...s, losses: s.losses + 1 });
      } else if (action === "raise") {
        // User 3bets, AI responds
        const aiResponse = getGTOAction(aiHandNotation, GTO_RANGES.BTN_VS_3BET);
        newState.actions.push({ player: "ai", action: aiResponse });
        setLastAIAction(aiResponse);

        if (aiResponse === "fold") {
          newState.phase = "result";
          newState.winner = "user";
          setStats(s => ({ ...s, wins: s.wins + 1 }));
        } else if (aiResponse === "call") {
          newState.phase = "result";
          newState.showdown = true;
          const winner = Math.random() > 0.5 ? "user" : "ai";
          newState.winner = winner;
          setStats(s => winner === "user" ? { ...s, wins: s.wins + 1 } : { ...s, losses: s.losses + 1 });
        } else if (aiResponse === "4bet") {
          newState.phase = "result";
          newState.showdown = true;
          const winner = Math.random() > 0.5 ? "user" : "ai";
          newState.winner = winner;
          setStats(s => winner === "user" ? { ...s, wins: s.wins + 1 } : { ...s, losses: s.losses + 1 });
        }
      }
    }

    // Show GTO advice
    if (newState.phase === "result" && gameState.userHand) {
      const range = gameState.userPosition === "BTN"
        ? GTO_RANGES.BTN_RFI
        : GTO_RANGES.BB_VS_BTN;
      const gtoAction = getGTOAction(userHandNotation, range);
      setGtoAdvice(`你的 ${userHandNotation}：GTO 建議 ${gtoAction === action ? "✓ 正確" : `${gtoAction} (你選了 ${action})`}`);
    }

    setGameState(newState);
  }, [gameState]);

  const resetGame = () => {
    setGameState(initialState);
    setLastAIAction(null);
    setGtoAdvice(null);
  };

  // AI acts first if user is BB
  useEffect(() => {
    if (gameState.phase === "preflop" && gameState.userPosition === "BB" && gameState.actions.length === 0 && gameState.aiHand) {
      const aiHandNotation = getHandNotation(gameState.aiHand);
      const aiAction = getGTOAction(aiHandNotation, GTO_RANGES.BTN_RFI);

      if (aiAction === "raise") {
        setLastAIAction("open raise");
        setGameState(prev => ({
          ...prev,
          actions: [{ player: "ai", action: "raise" }],
        }));
      } else {
        // AI folds preflop (limp not supported)
        setLastAIAction("fold");
        setGameState(prev => ({
          ...prev,
          phase: "result",
          winner: "user",
          actions: [{ player: "ai", action: "fold" }],
        }));
        setStats(s => ({ ...s, wins: s.wins + 1 }));
      }
    }
  }, [gameState.phase, gameState.userPosition, gameState.actions.length, gameState.aiHand]);

  return (
    <div className="container max-w-2xl py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("drill.gtoPractice.title")}</h1>
        <p className="text-muted-foreground">{t("drill.gtoPractice.description")}</p>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-lg px-3 py-1">
            <Trophy className="h-4 w-4 mr-1" />
            {stats.wins}W - {stats.losses}L
          </Badge>
          <span className="text-muted-foreground">
            {stats.wins + stats.losses > 0
              ? `${Math.round((stats.wins / (stats.wins + stats.losses)) * 100)}%`
              : "0%"}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={resetGame}>
          <RotateCcw className="h-4 w-4 mr-1" />
          {t("drill.gtoPractice.reset")}
        </Button>
      </div>

      {/* Game Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            {t("drill.gtoPractice.btnVsBb")}
          </CardTitle>
          <CardDescription>
            {gameState.phase === "setup" && t("drill.gtoPractice.selectPosition")}
            {gameState.phase === "preflop" && t("drill.gtoPractice.preflop")}
            {gameState.phase === "result" && t("drill.gtoPractice.gameOver")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Setup Phase */}
          {gameState.phase === "setup" && (
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">{t("drill.gtoPractice.selectPosition")}</p>
                <div className="flex justify-center gap-4">
                  <Button
                    variant={gameState.userPosition === "BTN" ? "default" : "outline"}
                    onClick={() => setGameState(s => ({ ...s, userPosition: "BTN" }))}
                    className="w-32"
                  >
                    <User className="h-4 w-4 mr-2" />
                    BTN
                  </Button>
                  <Button
                    variant={gameState.userPosition === "BB" ? "default" : "outline"}
                    onClick={() => setGameState(s => ({ ...s, userPosition: "BB" }))}
                    className="w-32"
                  >
                    <User className="h-4 w-4 mr-2" />
                    BB
                  </Button>
                </div>
              </div>
              <div className="text-center">
                <Button onClick={startGame} size="lg">
                  <Play className="h-5 w-5 mr-2" />
                  {t("drill.gtoPractice.startGame")}
                </Button>
              </div>
            </div>
          )}

          {/* Preflop / Result Phase */}
          {(gameState.phase === "preflop" || gameState.phase === "result") && (
            <div className="space-y-6">
              {/* AI Hand */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Bot className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    AI ({gameState.userPosition === "BTN" ? "BB" : "BTN"})
                  </span>
                  {lastAIAction && (
                    <Badge variant="secondary">{lastAIAction}</Badge>
                  )}
                </div>
                <div className="flex justify-center gap-2">
                  {gameState.aiHand && (
                    <>
                      <PlayingCard
                        card={gameState.aiHand[0]}
                        hidden={!gameState.showdown && gameState.phase !== "result"}
                      />
                      <PlayingCard
                        card={gameState.aiHand[1]}
                        hidden={!gameState.showdown && gameState.phase !== "result"}
                      />
                    </>
                  )}
                </div>
                {gameState.showdown && gameState.aiHand && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {getHandNotation(gameState.aiHand)}
                  </p>
                )}
              </div>

              {/* Pot */}
              <div className="text-center py-4 bg-green-900/20 rounded-lg">
                <p className="text-sm text-muted-foreground">{t("drill.gtoPractice.pot")}</p>
                <p className="text-2xl font-bold">{gameState.pot.toFixed(1)} BB</p>
              </div>

              {/* User Hand */}
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <User className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {t("drill.gtoPractice.you")} ({gameState.userPosition})
                  </span>
                </div>
                <div className="flex justify-center gap-2">
                  {gameState.userHand && (
                    <>
                      <PlayingCard card={gameState.userHand[0]} />
                      <PlayingCard card={gameState.userHand[1]} />
                    </>
                  )}
                </div>
                {gameState.userHand && (
                  <p className="text-sm text-muted-foreground mt-1">
                    {getHandNotation(gameState.userHand)}
                  </p>
                )}
              </div>

              {/* Actions */}
              {gameState.phase === "preflop" && (
                <div className="flex justify-center gap-3">
                  <Button
                    variant="destructive"
                    onClick={() => handleUserAction("fold")}
                    className="w-24"
                  >
                    {t("drill.actions.fold")}
                  </Button>
                  {gameState.userPosition === "BB" && gameState.actions.some(a => a.player === "ai" && a.action === "raise") && (
                    <Button
                      variant="secondary"
                      onClick={() => handleUserAction("call")}
                      className="w-24"
                    >
                      {t("drill.actions.call")}
                    </Button>
                  )}
                  <Button
                    variant="default"
                    onClick={() => handleUserAction("raise")}
                    className="w-24"
                  >
                    {gameState.userPosition === "BTN" ? t("drill.actions.raise") : "3-Bet"}
                  </Button>
                </div>
              )}

              {/* Result */}
              {gameState.phase === "result" && (
                <div className="text-center space-y-4">
                  <div
                    className={cn(
                      "text-xl font-bold",
                      gameState.winner === "user" ? "text-green-500" : "text-red-500"
                    )}
                  >
                    {gameState.winner === "user" ? t("drill.gtoPractice.youWin") : t("drill.gtoPractice.aiWins")}
                  </div>

                  {gtoAdvice && (
                    <div className="p-3 bg-muted/50 rounded-lg text-sm">
                      {gtoAdvice}
                    </div>
                  )}

                  <Button onClick={startGame}>
                    <ArrowRight className="h-4 w-4 mr-2" />
                    {t("drill.gtoPractice.nextHand")}
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("drill.gtoPractice.tips.title")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>• {t("drill.gtoPractice.tips.tip1")}</p>
          <p>• {t("drill.gtoPractice.tips.tip2")}</p>
          <p>• {t("drill.gtoPractice.tips.tip3")}</p>
          <p>• {t("drill.gtoPractice.tips.tip4")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
