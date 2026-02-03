"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Layers,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowRight,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api.grindgto.com";

// Storage key
const MULTISTREET_STATS_KEY = "multistreet-drill-stats";

// Streets
type Street = "flop" | "turn" | "river" | "complete";

// Card display
const SUIT_SYMBOLS: Record<string, string> = {
  s: "♠",
  h: "♥",
  d: "♦",
  c: "♣",
};

const SUIT_COLORS: Record<string, string> = {
  s: "text-slate-900 dark:text-slate-100",
  h: "text-red-500",
  d: "text-blue-500",
  c: "text-green-600",
};

// All possible cards for dealing
const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
const SUITS = ["s", "h", "d", "c"];

interface FlopScenario {
  scenario_id: string;
  position: string;
  villain: string;
  pot_type: string;
  board: string[];
  texture: string;
  texture_zh: string;
  hand: string;
  options: string[];
  correct_strategy: Record<string, number>;
}

interface TurnClassification {
  turn_type: string;
  turn_type_zh: string;
}

interface RiverClassification {
  river_type: string;
  river_type_zh: string;
}

interface StreetDecision {
  street: Street;
  action: string;
  isCorrect: boolean;
  gtoStrategy: Record<string, number>;
  cardType?: string;
  cardTypeZh?: string;
  adjustment?: string;
}

interface Stats {
  totalHands: number;
  correctFlop: number;
  correctTurn: number;
  correctRiver: number;
  perfectHands: number; // All 3 streets correct
}

function loadStats(): Stats {
  if (typeof window === "undefined") {
    return { totalHands: 0, correctFlop: 0, correctTurn: 0, correctRiver: 0, perfectHands: 0 };
  }
  try {
    const saved = localStorage.getItem(MULTISTREET_STATS_KEY);
    if (saved) return JSON.parse(saved);
  } catch { /* ignore */ }
  return { totalHands: 0, correctFlop: 0, correctTurn: 0, correctRiver: 0, perfectHands: 0 };
}

function saveStats(stats: Stats) {
  if (typeof window !== "undefined") {
    localStorage.setItem(MULTISTREET_STATS_KEY, JSON.stringify(stats));
  }
}

function BoardCard({ card, isNew = false }: { card: string; isNew?: boolean }) {
  const rank = card[0];
  const suit = card[1]?.toLowerCase() || "s";

  return (
    <div className={cn(
      "bg-white dark:bg-gray-100 rounded-lg shadow-md w-12 h-16 sm:w-14 sm:h-20 flex flex-col items-center justify-center border-2",
      isNew ? "border-yellow-500 ring-2 ring-yellow-500/50" : "border-gray-200"
    )}>
      <span className={cn("text-xl sm:text-2xl font-bold", SUIT_COLORS[suit])}>
        {rank}
      </span>
      <span className={cn("text-lg sm:text-xl", SUIT_COLORS[suit])}>
        {SUIT_SYMBOLS[suit]}
      </span>
    </div>
  );
}

function HeroHand({ hand }: { hand: string }) {
  const rank1 = hand[0];
  const rank2 = hand[1];
  const suited = hand.endsWith("s");
  const isPair = rank1 === rank2 && hand.length === 2;

  const suit1 = suited ? "h" : "s";
  const suit2 = suited ? "h" : isPair ? "d" : "c";

  return (
    <div className="flex gap-2">
      <div className="bg-white dark:bg-gray-100 rounded-lg shadow-md w-12 h-16 sm:w-14 sm:h-20 flex flex-col items-center justify-center border-2 border-primary">
        <span className={cn("text-xl sm:text-2xl font-bold", SUIT_COLORS[suit1])}>
          {rank1}
        </span>
        <span className={cn("text-lg sm:text-xl", SUIT_COLORS[suit1])}>
          {SUIT_SYMBOLS[suit1]}
        </span>
      </div>
      <div className="bg-white dark:bg-gray-100 rounded-lg shadow-md w-12 h-16 sm:w-14 sm:h-20 flex flex-col items-center justify-center border-2 border-primary">
        <span className={cn("text-xl sm:text-2xl font-bold", SUIT_COLORS[suit2])}>
          {rank2}
        </span>
        <span className={cn("text-lg sm:text-xl", SUIT_COLORS[suit2])}>
          {SUIT_SYMBOLS[suit2]}
        </span>
      </div>
    </div>
  );
}

const ACTION_LABELS: Record<string, string> = {
  check: "Check",
  bet_33: "Bet 33%",
  bet_50: "Bet 50%",
  bet_66: "Bet 66%",
  bet_75: "Bet 75%",
  bet_100: "Bet 100%",
};

function getRandomCard(excludeCards: string[]): string {
  const excludeSet = new Set(excludeCards.map(c => c.toUpperCase()));
  const available: string[] = [];

  for (const rank of RANKS) {
    for (const suit of SUITS) {
      const card = `${rank}${suit}`;
      if (!excludeSet.has(card.toUpperCase())) {
        available.push(card);
      }
    }
  }

  return available[Math.floor(Math.random() * available.length)];
}

export default function MultistreetDrillPage() {
  const [scenario, setScenario] = useState<FlopScenario | null>(null);
  const [currentStreet, setCurrentStreet] = useState<Street>("flop");
  const [turnCard, setTurnCard] = useState<string | null>(null);
  const [riverCard, setRiverCard] = useState<string | null>(null);
  const [turnClassification, setTurnClassification] = useState<TurnClassification | null>(null);
  const [riverClassification, setRiverClassification] = useState<RiverClassification | null>(null);
  const [decisions, setDecisions] = useState<StreetDecision[]>([]);
  const [showStreetResult, setShowStreetResult] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats>(() => loadStats());

  // Current strategy (adjusted for turn/river)
  const [currentStrategy, setCurrentStrategy] = useState<Record<string, number>>({});

  const fetchNewScenario = useCallback(async () => {
    setLoading(true);
    setCurrentStreet("flop");
    setTurnCard(null);
    setRiverCard(null);
    setTurnClassification(null);
    setRiverClassification(null);
    setDecisions([]);
    setShowStreetResult(false);
    setCurrentStrategy({});

    try {
      const response = await fetch(`${API_URL}/api/solver/random-drill?pot_type=srp`);
      if (!response.ok) throw new Error("Failed to fetch");

      const data: FlopScenario = await response.json();
      setScenario(data);
      setCurrentStrategy(data.correct_strategy || {});
    } catch (error) {
      console.error("Error fetching scenario:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNewScenario();
  }, [fetchNewScenario]);

  const classifyTurnCard = async (flop: string[], turn: string) => {
    try {
      const flopStr = flop.join("");
      const response = await fetch(
        `${API_URL}/api/solver/turn/classify?flop=${flopStr}&turn=${turn}`
      );
      if (response.ok) {
        const data = await response.json();
        setTurnClassification(data);
        return data;
      }
    } catch (error) {
      console.error("Turn classification failed:", error);
    }
    return null;
  };

  const classifyRiverCard = async (board: string[], river: string) => {
    try {
      const boardStr = board.join("");
      const response = await fetch(
        `${API_URL}/api/solver/river/classify?board=${boardStr}&river=${river}`
      );
      if (response.ok) {
        const data = await response.json();
        setRiverClassification(data);
        return data;
      }
    } catch (error) {
      console.error("River classification failed:", error);
    }
    return null;
  };

  const getTurnAdjustment = async (texture: string, turnType: string) => {
    try {
      const response = await fetch(
        `${API_URL}/api/solver/turn?flop_texture=${texture}&turn_type=${turnType}&position=ip&hand_category=value`
      );
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error("Turn adjustment failed:", error);
    }
    return null;
  };

  const handleActionSelect = async (action: string) => {
    if (!scenario || showStreetResult) return;

    const actionFreq = currentStrategy[action] || 0;
    const isCorrect = actionFreq >= 25; // 25% threshold for multi-street

    const decision: StreetDecision = {
      street: currentStreet,
      action,
      isCorrect,
      gtoStrategy: { ...currentStrategy },
    };

    // Add card type info for turn/river
    if (currentStreet === "turn" && turnClassification) {
      decision.cardType = turnClassification.turn_type;
      decision.cardTypeZh = turnClassification.turn_type_zh;
    }
    if (currentStreet === "river" && riverClassification) {
      decision.cardType = riverClassification.river_type;
      decision.cardTypeZh = riverClassification.river_type_zh;
    }

    setDecisions(prev => [...prev, decision]);
    setShowStreetResult(true);
  };

  const handleNextStreet = async () => {
    if (!scenario) return;

    if (currentStreet === "flop") {
      // Deal turn
      const usedCards = [...scenario.board];
      const turn = getRandomCard(usedCards);
      setTurnCard(turn);

      // Classify and get adjustment
      const classification = await classifyTurnCard(scenario.board, turn);
      if (classification && scenario.texture) {
        const adjustment = await getTurnAdjustment(scenario.texture, classification.turn_type);
        if (adjustment) {
          // Apply simple adjustment (reduce bet freq if negative delta)
          const delta = adjustment.bet_frequency_delta || 0;
          const newStrategy: Record<string, number> = {};
          let totalBet = 0;
          let checkFreq = currentStrategy.check || 0;

          for (const [key, val] of Object.entries(currentStrategy)) {
            if (key.startsWith("bet_")) {
              totalBet += val as number;
            }
          }

          // Adjust
          const betMultiplier = totalBet > 0 ? Math.max(0, (totalBet + delta) / totalBet) : 1;
          for (const [key, val] of Object.entries(currentStrategy)) {
            if (key.startsWith("bet_")) {
              newStrategy[key] = Math.round((val as number) * betMultiplier);
            } else if (key === "check") {
              newStrategy[key] = Math.round(checkFreq - delta);
            }
          }

          setCurrentStrategy(newStrategy);
        }
      }

      setCurrentStreet("turn");
      setShowStreetResult(false);
    } else if (currentStreet === "turn") {
      // Deal river
      const usedCards = [...scenario.board, turnCard!];
      const river = getRandomCard(usedCards);
      setRiverCard(river);

      // Classify river
      await classifyRiverCard([...scenario.board, turnCard!], river);

      setCurrentStreet("river");
      setShowStreetResult(false);
    } else if (currentStreet === "river") {
      // Complete - update stats
      const newStats = { ...stats };
      newStats.totalHands++;

      const flopDecision = decisions.find(d => d.street === "flop");
      const turnDecision = decisions.find(d => d.street === "turn");
      const riverDecision = decisions.find(d => d.street === "river");

      if (flopDecision?.isCorrect) newStats.correctFlop++;
      if (turnDecision?.isCorrect) newStats.correctTurn++;
      if (riverDecision?.isCorrect) newStats.correctRiver++;

      if (flopDecision?.isCorrect && turnDecision?.isCorrect && riverDecision?.isCorrect) {
        newStats.perfectHands++;
      }

      setStats(newStats);
      saveStats(newStats);
      setCurrentStreet("complete");
    }
  };

  const getCurrentBoard = () => {
    if (!scenario) return [];
    const board = [...scenario.board];
    if (turnCard) board.push(turnCard);
    if (riverCard) board.push(riverCard);
    return board;
  };

  const getStreetProgress = () => {
    if (currentStreet === "flop") return 33;
    if (currentStreet === "turn") return 66;
    return 100;
  };

  const getOptions = () => {
    // Return available actions based on current strategy
    const options = new Set<string>();
    for (const key of Object.keys(currentStrategy)) {
      if (currentStrategy[key] > 0) {
        options.add(key);
      }
    }
    // Ensure basic options
    if (options.size === 0) {
      options.add("check");
      options.add("bet_33");
      options.add("bet_75");
    }
    return Array.from(options);
  };

  const flopAccuracy = stats.totalHands > 0 ? Math.round((stats.correctFlop / stats.totalHands) * 100) : 0;
  const turnAccuracy = stats.totalHands > 0 ? Math.round((stats.correctTurn / stats.totalHands) * 100) : 0;
  const riverAccuracy = stats.totalHands > 0 ? Math.round((stats.correctRiver / stats.totalHands) * 100) : 0;
  const perfectRate = stats.totalHands > 0 ? Math.round((stats.perfectHands / stats.totalHands) * 100) : 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <Layers className="h-6 w-6" />
          多街道練習
        </h1>
        <p className="text-muted-foreground">
          從 Flop 到 River，練習完整的多街決策
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold">{stats.totalHands}</div>
            <div className="text-xs text-muted-foreground">總手數</div>
          </CardContent>
        </Card>
        <Card className="bg-blue-500/10">
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-blue-600">{flopAccuracy}%</div>
            <div className="text-xs text-muted-foreground">Flop</div>
          </CardContent>
        </Card>
        <Card className="bg-orange-500/10">
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-orange-600">{turnAccuracy}%</div>
            <div className="text-xs text-muted-foreground">Turn</div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/10">
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold text-green-600">{perfectRate}%</div>
            <div className="text-xs text-muted-foreground">完美</div>
          </CardContent>
        </Card>
      </div>

      {/* Street Progress */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className={cn(currentStreet === "flop" && "font-bold text-primary")}>Flop</span>
          <span className={cn(currentStreet === "turn" && "font-bold text-primary")}>Turn</span>
          <span className={cn(currentStreet === "river" && "font-bold text-primary")}>River</span>
        </div>
        <Progress value={getStreetProgress()} className="h-2" />
      </div>

      {/* Main Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {scenario && (
                <>
                  <Badge variant="secondary">
                    {scenario.position} vs {scenario.villain}
                  </Badge>
                  <Badge variant="outline">{scenario.texture_zh}</Badge>
                  {turnClassification && currentStreet !== "flop" && (
                    <Badge className="bg-yellow-500">
                      Turn: {turnClassification.turn_type_zh}
                    </Badge>
                  )}
                  {riverClassification && currentStreet === "river" && (
                    <Badge className="bg-purple-500">
                      River: {riverClassification.river_type_zh}
                    </Badge>
                  )}
                </>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchNewScenario}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : scenario ? (
            <>
              {/* Board */}
              <div className="flex justify-center gap-2">
                {getCurrentBoard().map((card, i) => (
                  <BoardCard
                    key={i}
                    card={card}
                    isNew={
                      (i === 3 && currentStreet === "turn") ||
                      (i === 4 && currentStreet === "river")
                    }
                  />
                ))}
              </div>

              {/* Hero Hand */}
              <div className="flex justify-center">
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-2">你的手牌</div>
                  <HeroHand hand={scenario.hand} />
                </div>
              </div>

              {/* Current Street Label */}
              <div className="text-center">
                <Badge variant="outline" className="text-lg px-4 py-1">
                  {currentStreet === "flop" && "Flop 決策"}
                  {currentStreet === "turn" && "Turn 決策"}
                  {currentStreet === "river" && "River 決策"}
                  {currentStreet === "complete" && "手牌完成"}
                </Badge>
              </div>

              {/* Action Buttons or Result */}
              {currentStreet !== "complete" && !showStreetResult && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {getOptions().map((action) => (
                    <Button
                      key={action}
                      variant="outline"
                      className="h-auto py-3"
                      onClick={() => handleActionSelect(action)}
                    >
                      {ACTION_LABELS[action] || action}
                    </Button>
                  ))}
                </div>
              )}

              {/* Street Result */}
              {showStreetResult && currentStreet !== "complete" && (
                <div className="space-y-4">
                  {decisions.length > 0 && (
                    <div
                      className={cn(
                        "p-4 rounded-lg",
                        decisions[decisions.length - 1].isCorrect
                          ? "bg-green-500/10 border border-green-500/30"
                          : "bg-red-500/10 border border-red-500/30"
                      )}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {decisions[decisions.length - 1].isCorrect ? (
                          <>
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                            <span className="font-bold text-green-600">正確！</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-5 w-5 text-red-500" />
                            <span className="font-bold text-red-600">可以更好</span>
                          </>
                        )}
                      </div>

                      <div className="text-sm text-muted-foreground">
                        GTO 頻率：
                        {Object.entries(currentStrategy)
                          .filter(([, freq]) => (freq as number) > 0)
                          .sort(([, a], [, b]) => (b as number) - (a as number))
                          .map(([action, freq]) => (
                            <span key={action} className="mx-1">
                              {ACTION_LABELS[action] || action} {freq}%
                            </span>
                          ))}
                      </div>
                    </div>
                  )}

                  <Button onClick={handleNextStreet} className="w-full gap-2">
                    {currentStreet === "river" ? "完成手牌" : "發下一張"}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Complete Summary */}
              {currentStreet === "complete" && (
                <div className="space-y-4">
                  <div className="text-center text-lg font-bold mb-4">
                    手牌回顧
                  </div>

                  {decisions.map((d, i) => (
                    <div
                      key={i}
                      className={cn(
                        "p-3 rounded-lg flex items-center justify-between",
                        d.isCorrect ? "bg-green-500/10" : "bg-red-500/10"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {d.isCorrect ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        <span className="font-medium capitalize">{d.street}</span>
                        {d.cardTypeZh && (
                          <Badge variant="outline" className="text-xs">
                            {d.cardTypeZh}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm">
                        你選: {ACTION_LABELS[d.action] || d.action}
                      </div>
                    </div>
                  ))}

                  <div className="text-center pt-4">
                    {decisions.every(d => d.isCorrect) ? (
                      <div className="text-green-600 font-bold text-lg">
                        🎉 完美的多街決策！
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        正確 {decisions.filter(d => d.isCorrect).length} / {decisions.length} 街
                      </div>
                    )}
                  </div>

                  <Button onClick={fetchNewScenario} className="w-full gap-2">
                    <RefreshCw className="h-4 w-4" />
                    下一手
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              載入中...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">多街道提示</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span><strong>Brick (磚塊)：</strong>有利於進攻方，聽牌落空</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <span><strong>完成牌：</strong>同花/順子完成時需減速</span>
          </div>
          <div className="flex items-center gap-2">
            <Minus className="h-4 w-4 text-yellow-500" />
            <span><strong>配對牌：</strong>策略更極化，中等牌貶值</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
