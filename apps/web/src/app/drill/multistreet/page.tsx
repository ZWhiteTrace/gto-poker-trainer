"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
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
} from "lucide-react";

import { API_BASE_URL } from "@/lib/api";
import { SUIT_SYMBOLS, SUIT_CARD_COLORS, RANKS, SUITS } from "@/lib/poker/types";

// Storage key
const MULTISTREET_STATS_KEY = "multistreet-drill-stats";

// Streets
type Street = "flop" | "turn" | "river" | "complete";

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
  villainAction?: string;
}

type VillainAction = "check" | "bet_50" | "bet_75" | "check_raise";

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
      <span className={cn("text-xl sm:text-2xl font-bold", SUIT_CARD_COLORS[suit])}>
        {rank}
      </span>
      <span className={cn("text-lg sm:text-xl", SUIT_CARD_COLORS[suit])}>
        {SUIT_SYMBOLS[suit]}
      </span>
    </div>
  );
}

// Resolve abstract hand notation (e.g. "AKs") to concrete card strings avoiding board conflicts
function resolveHeroCards(hand: string, board: string[]): [string, string] {
  const rank1 = hand[0];
  const rank2 = hand[1];
  const suited = hand.endsWith("s");
  const isPair = rank1 === rank2 && hand.length === 2;

  const boardSuitsFor = (rank: string) => {
    const s = new Set<string>();
    for (const c of board) if (c[0] === rank) s.add(c[1]?.toLowerCase());
    return s;
  };
  const used1 = boardSuitsFor(rank1);
  const used2 = boardSuitsFor(rank2);
  const allSuits = ["h", "d", "c", "s"];

  let suit1: string;
  let suit2: string;
  if (suited) {
    suit1 = allSuits.find(s => !used1.has(s) && !used2.has(s)) || "h";
    suit2 = suit1;
  } else if (isPair) {
    const avail = allSuits.filter(s => !used1.has(s));
    suit1 = avail[0] || "h";
    suit2 = avail[1] || "d";
  } else {
    suit1 = allSuits.find(s => !used1.has(s)) || "s";
    suit2 = allSuits.find(s => !used2.has(s) && s !== suit1) || "c";
  }
  return [`${rank1}${suit1}`, `${rank2}${suit2}`];
}

function HeroHand({ hand, board = [] }: { hand: string; board?: string[] }) {
  const [card1, card2] = resolveHeroCards(hand, board);
  const rank1 = card1[0];
  const suit1 = card1[1];
  const rank2 = card2[0];
  const suit2 = card2[1];

  return (
    <div className="flex gap-2">
      <div className="bg-white dark:bg-gray-100 rounded-lg shadow-md w-12 h-16 sm:w-14 sm:h-20 flex flex-col items-center justify-center border-2 border-primary">
        <span className={cn("text-xl sm:text-2xl font-bold", SUIT_CARD_COLORS[suit1])}>
          {rank1}
        </span>
        <span className={cn("text-lg sm:text-xl", SUIT_CARD_COLORS[suit1])}>
          {SUIT_SYMBOLS[suit1]}
        </span>
      </div>
      <div className="bg-white dark:bg-gray-100 rounded-lg shadow-md w-12 h-16 sm:w-14 sm:h-20 flex flex-col items-center justify-center border-2 border-primary">
        <span className={cn("text-xl sm:text-2xl font-bold", SUIT_CARD_COLORS[suit2])}>
          {rank2}
        </span>
        <span className={cn("text-lg sm:text-xl", SUIT_CARD_COLORS[suit2])}>
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
  fold: "Fold",
  call: "Call",
  raise: "Raise",
};

// Opponent bet frequency based on texture and position
function shouldVillainBet(
  texture: string,
  previousHeroAction: string,
  street: Street
): { shouldBet: boolean; sizing: "bet_50" | "bet_75" } {
  // Villain only bets if hero checked
  if (previousHeroAction !== "check") {
    return { shouldBet: false, sizing: "bet_50" };
  }

  // Base probe bet frequency varies by street and texture
  let probeFreq = 0.25; // Base 25%

  // Adjust by texture
  if (texture.includes("dry") || texture.includes("rainbow")) {
    probeFreq = 0.35; // Dry boards: more stabs
  } else if (texture.includes("wet") || texture.includes("two_tone")) {
    probeFreq = 0.3;
  } else if (texture.includes("monotone") || texture.includes("connected")) {
    probeFreq = 0.2; // Scary boards: fewer stabs
  }

  // Increase on river (polarized)
  if (street === "river") {
    probeFreq = Math.min(probeFreq + 0.1, 0.4);
  }

  const shouldBet = Math.random() < probeFreq;
  const sizing = Math.random() < 0.6 ? "bet_50" : "bet_75";

  return { shouldBet, sizing };
}

// When hero faces bet, what's the GTO response?
function getResponseStrategy(
  heroHand: string,
  texture: string,
  villainSizing: string
): { fold: number; call: number; raise: number } {
  // Simplified MDF-based response
  // MDF = 1 - (bet / (pot + bet))
  // bet_50 → MDF ~67%, bet_75 → MDF ~57%
  const mdf = villainSizing === "bet_50" ? 67 : 57;

  // Check hand strength heuristically
  const isPair = heroHand[0] === heroHand[1];
  const hasAce = heroHand.includes("A");
  const hasKing = heroHand.includes("K");
  const isSuited = heroHand.endsWith("s");
  const isConnector = Math.abs("AKQJT98765432".indexOf(heroHand[0]) - "AKQJT98765432".indexOf(heroHand[1])) <= 2;

  let foldFreq = 100 - mdf;
  let callFreq = mdf * 0.8;
  let raiseFreq = mdf * 0.2;

  // Strong hands: more raise
  if (isPair || (hasAce && hasKing)) {
    foldFreq = Math.max(0, foldFreq - 20);
    raiseFreq = Math.min(30, raiseFreq + 15);
  }

  // Medium hands: more call
  if (hasAce || hasKing || isPair) {
    foldFreq = Math.max(5, foldFreq - 10);
    callFreq += 10;
  }

  // Weak hands: more fold
  if (!hasAce && !hasKing && !isPair) {
    foldFreq = Math.min(60, foldFreq + 15);
  }

  // Normalize
  const total = foldFreq + callFreq + raiseFreq;
  return {
    fold: Math.round((foldFreq / total) * 100),
    call: Math.round((callFreq / total) * 100),
    raise: Math.round((raiseFreq / total) * 100),
  };
}

// When hero bets, check if villain check-raises
function shouldVillainCheckRaise(
  texture: string,
  street: Street
): boolean {
  let crFreq = 0.08; // Base 8%

  if (texture.includes("wet") || texture.includes("two_tone")) {
    crFreq = 0.12;
  } else if (texture.includes("monotone") || texture.includes("connected")) {
    crFreq = 0.15;
  } else if (texture.includes("dry") || texture.includes("rainbow")) {
    crFreq = 0.08;
  }

  // Later streets: less frequent
  if (street === "turn") crFreq *= 0.7;
  else if (street === "river") crFreq *= 0.6;

  return Math.random() < crFreq;
}

// Hero's response strategy when facing a check-raise (3x pot)
function getCheckRaiseResponseStrategy(
  heroHand: string
): { fold: number; call: number; raise: number } {
  // CR to 3x → MDF ~50%
  const mdf = 50;

  const isPair = heroHand[0] === heroHand[1];
  const hasAce = heroHand.includes("A");
  const hasKing = heroHand.includes("K");

  let foldFreq = 100 - mdf; // 50% base fold
  let callFreq = mdf * 0.75; // 37.5% call
  let raiseFreq = mdf * 0.25; // 12.5% re-raise

  // Strong hands: less fold, more re-raise
  if (isPair && (hasAce || hasKing)) {
    foldFreq = Math.max(5, foldFreq - 25);
    raiseFreq = Math.min(40, raiseFreq + 20);
  } else if (isPair || (hasAce && hasKing)) {
    foldFreq = Math.max(10, foldFreq - 15);
    callFreq += 15;
  }

  // Weak hands: more fold
  if (!hasAce && !hasKing && !isPair) {
    foldFreq = Math.min(75, foldFreq + 15);
    raiseFreq = Math.max(0, raiseFreq - 10);
  }

  // Normalize
  const total = foldFreq + callFreq + raiseFreq;
  return {
    fold: Math.round((foldFreq / total) * 100),
    call: Math.round((callFreq / total) * 100),
    raise: Math.round((raiseFreq / total) * 100),
  };
}

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
  const t = useTranslations("drill.multistreet");
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

  // Opponent action state
  const [villainAction, setVillainAction] = useState<VillainAction | null>(null);
  const [facingBet, setFacingBet] = useState(false);
  const [responseStrategy, setResponseStrategy] = useState<{ fold: number; call: number; raise: number } | null>(null);

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
    setVillainAction(null);
    setFacingBet(false);
    setResponseStrategy(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/solver/random-drill?pot_type=srp`);
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
        `${API_BASE_URL}/api/solver/turn/classify?flop=${flopStr}&turn=${turn}`
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
        `${API_BASE_URL}/api/solver/river/classify?board=${boardStr}&river=${river}`
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
        `${API_BASE_URL}/api/solver/turn?flop_texture=${texture}&turn_type=${turnType}&position=ip&hand_category=value`
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

    // If facing a bet, handle response
    if (facingBet && responseStrategy) {
      const actionFreq = responseStrategy[action as "fold" | "call" | "raise"] || 0;
      const isCorrect = actionFreq >= 25;

      const decision: StreetDecision = {
        street: currentStreet,
        action,
        isCorrect,
        gtoStrategy: { fold: responseStrategy.fold, call: responseStrategy.call, raise: responseStrategy.raise },
        villainAction: villainAction || undefined,
      };

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
      setFacingBet(false);
      setVillainAction(null);
      setResponseStrategy(null);
      return;
    }

    const actionFreq = currentStrategy[action] || 0;
    const isCorrect = actionFreq >= 25; // 25% threshold for multi-street

    // If hero bets, check if villain check-raises
    if (action.startsWith("bet_") && scenario) {
      if (shouldVillainCheckRaise(scenario.texture, currentStreet)) {
        setVillainAction("check_raise");
        setFacingBet(true);
        const response = getCheckRaiseResponseStrategy(scenario.hand);
        setResponseStrategy(response);
        return;
      }
    }

    // If hero checks, check if villain bets
    if (action === "check" && currentStreet !== "flop") {
      const previousDecision = decisions.find(d => d.street === (currentStreet === "turn" ? "flop" : "turn"));
      const { shouldBet, sizing } = shouldVillainBet(
        scenario.texture,
        previousDecision?.action || "check",
        currentStreet
      );

      if (shouldBet) {
        // Villain bets - hero needs to respond
        setVillainAction(sizing);
        setFacingBet(true);
        const response = getResponseStrategy(scenario.hand, scenario.texture, sizing);
        setResponseStrategy(response);
        return;
      }
    }

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
      // Deal turn — exclude board + hero hand cards
      const heroCards = resolveHeroCards(scenario.hand, scenario.board);
      const usedCards = [...scenario.board, ...heroCards];
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
          const checkFreq = currentStrategy.check || 0;

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
      // Deal river — exclude board + turn + hero hand cards
      const heroCardsR = resolveHeroCards(scenario.hand, [...scenario.board, turnCard!]);
      const usedCards = [...scenario.board, turnCard!, ...heroCardsR];
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
    // If facing a bet, return response options
    if (facingBet) {
      return ["fold", "call", "raise"];
    }

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
          {t("title")}
        </h1>
        <p className="text-muted-foreground">
          {t("description")}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-lg font-bold">{stats.totalHands}</div>
            <div className="text-xs text-muted-foreground">{t("totalHands")}</div>
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
            <div className="text-xs text-muted-foreground">{t("perfect")}</div>
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
                  <div className="text-sm text-muted-foreground mb-2">{t("yourHand")}</div>
                  <HeroHand hand={scenario.hand} board={getCurrentBoard()} />
                </div>
              </div>

              {/* Current Street Label */}
              <div className="text-center space-y-2">
                <Badge variant="outline" className="text-lg px-4 py-1">
                  {currentStreet === "flop" && t("flopDecision")}
                  {currentStreet === "turn" && t("turnDecision")}
                  {currentStreet === "river" && t("riverDecision")}
                  {currentStreet === "complete" && t("handComplete")}
                </Badge>

                {/* Villain action notification */}
                {facingBet && villainAction && (
                  <div className={`p-3 rounded-lg border ${
                    villainAction === "check_raise"
                      ? "bg-red-500/20 border-red-500/30"
                      : "bg-orange-500/20 border-orange-500/30"
                  }`}>
                    <div className="flex items-center justify-center gap-2">
                      <span className={`font-bold ${
                        villainAction === "check_raise" ? "text-red-600" : "text-orange-600"
                      }`}>
                        {villainAction === "check_raise" ? t("villainCheckRaise") : t("villainBets")}
                      </span>
                      <Badge className={villainAction === "check_raise" ? "bg-red-500" : "bg-orange-500"}>
                        {villainAction === "check_raise"
                          ? "3× Pot"
                          : villainAction === "bet_50"
                            ? "50% Pot"
                            : "75% Pot"}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {villainAction === "check_raise"
                        ? t("villainCRPrompt")
                        : t("villainBetPrompt")}
                    </div>
                  </div>
                )}
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
                  {decisions.length > 0 && (() => {
                    const lastDecision = decisions[decisions.length - 1];
                    const gtoStrategy = lastDecision.gtoStrategy;

                    return (
                      <div
                        className={cn(
                          "p-4 rounded-lg",
                          lastDecision.isCorrect
                            ? "bg-green-500/10 border border-green-500/30"
                            : "bg-red-500/10 border border-red-500/30"
                        )}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {lastDecision.isCorrect ? (
                            <>
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                              <span className="font-bold text-green-600">{t("correct")}</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="h-5 w-5 text-red-500" />
                              <span className="font-bold text-red-600">{t("couldBeBetter")}</span>
                            </>
                          )}
                          {lastDecision.villainAction && (
                            <Badge variant="outline" className="ml-2">
                              vs {lastDecision.villainAction === "check_raise"
                                ? "Check-Raise"
                                : lastDecision.villainAction === "bet_50"
                                  ? "50% Bet"
                                  : "75% Bet"}
                            </Badge>
                          )}
                        </div>

                        <div className="text-sm text-muted-foreground">
                          {t("gtoFrequency")}
                          {Object.entries(gtoStrategy)
                            .filter(([, freq]) => (freq as number) > 0)
                            .sort(([, a], [, b]) => (b as number) - (a as number))
                            .map(([action, freq]) => (
                              <span key={action} className="mx-1">
                                {ACTION_LABELS[action] || action} {freq}%
                              </span>
                            ))}
                        </div>
                      </div>
                    );
                  })()}

                  <Button onClick={handleNextStreet} className="w-full gap-2">
                    {currentStreet === "river" ? t("completeHand") : t("dealNext")}
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Complete Summary */}
              {currentStreet === "complete" && (
                <div className="space-y-4">
                  <div className="text-center text-lg font-bold mb-4">
                    {t("handReview")}
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
                        {d.villainAction && (
                          <Badge variant="secondary" className="text-xs">
                            vs {d.villainAction === "check_raise"
                              ? "Check-Raise"
                              : d.villainAction === "bet_50"
                                ? "50% Bet"
                                : "75% Bet"}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm">
                        {t("youChose")} {ACTION_LABELS[d.action] || d.action}
                      </div>
                    </div>
                  ))}

                  <div className="text-center pt-4">
                    {decisions.every(d => d.isCorrect) ? (
                      <div className="text-green-600 font-bold text-lg">
                        🎉 {t("perfectPlay")}
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        {t("correctStreets", { correct: decisions.filter(d => d.isCorrect).length, total: decisions.length })}
                      </div>
                    )}
                  </div>

                  <Button onClick={fetchNewScenario} className="w-full gap-2">
                    <RefreshCw className="h-4 w-4" />
                    {t("nextHand")}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {t("loading")}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("tipsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-500" />
            <span><strong>{t("tipBrickLabel")}</strong>{t("tipBrickDesc")}</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <span><strong>{t("tipCompleteLabel")}</strong>{t("tipCompleteDesc")}</span>
          </div>
          <div className="flex items-center gap-2">
            <Minus className="h-4 w-4 text-yellow-500" />
            <span><strong>{t("tipPairedLabel")}</strong>{t("tipPairedDesc")}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
