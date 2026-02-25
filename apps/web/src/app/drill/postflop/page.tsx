"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { RefreshCw, CheckCircle2, XCircle, Trophy } from "lucide-react";
import { API_BASE_URL } from "@/lib/api";
import { SUIT_SYMBOLS, SUIT_CARD_COLORS } from "@/lib/poker/types";
import { useProgressStore } from "@/stores/progressStore";
import { useAuthStore } from "@/stores/authStore";

type Street = "flop" | "turn" | "river";
type DrillMode = "ip_bet" | "oop_defense" | "sizing_only";

interface BaseScenario {
  id: string;
  preflop: string;
  hero_position: string;
  villain_position: string;
  pot_type: string;
  texture: string;
  texture_zh: string;
  hero_hand: string;
  correct_action: string;
  correct_sizing: string | null;
  frequency: number;
  explanation_zh: string;
  explanation_en: string;
}

interface FlopScenario extends BaseScenario {
  flop: string[];
  flop_suits: string[];
}

interface TurnScenario extends BaseScenario {
  flop: string[];
  flop_suits: string[];
  turn: string;
  turn_suit: string;
  flop_action: string;
}

interface RiverScenario extends BaseScenario {
  board: string[];
  board_suits: string[];
  previous_action: string;
}

type Scenario = FlopScenario | TurnScenario | RiverScenario;

function BoardCard({ rank, suit }: { rank: string; suit: string }) {
  return (
    <div className="flex h-20 w-14 flex-col items-center justify-center rounded-lg border-2 border-gray-200 bg-white shadow-md sm:h-24 sm:w-16 dark:bg-gray-100">
      <span className={cn("text-2xl font-bold sm:text-3xl", SUIT_CARD_COLORS[suit])}>{rank}</span>
      <span className={cn("text-xl sm:text-2xl", SUIT_CARD_COLORS[suit])}>
        {SUIT_SYMBOLS[suit]}
      </span>
    </div>
  );
}

function getBoardCards(scenario: Scenario, street: Street): string[] {
  if (street === "river") {
    const s = scenario as RiverScenario;
    return s.board.map((rank, i) => `${rank}${s.board_suits?.[i] || ""}`);
  }
  if (street === "turn") {
    const s = scenario as TurnScenario;
    const cards = s.flop.map((rank, i) => `${rank}${s.flop_suits?.[i] || ""}`);
    cards.push(`${s.turn}${s.turn_suit || ""}`);
    return cards;
  }
  const s = scenario as FlopScenario;
  return s.flop.map((rank, i) => `${rank}${s.flop_suits?.[i] || ""}`);
}

function HeroHand({ hand, board = [] }: { hand: string; board?: string[] }) {
  const rank1 = hand[0];
  const rank2 = hand[1];
  const suited = hand.endsWith("s");
  const isPair = rank1 === rank2 && hand.length <= 3;

  // Pick suits that don't conflict with board cards
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
    suit1 = allSuits.find((s) => !used1.has(s) && !used2.has(s)) || "h";
    suit2 = suit1;
  } else if (isPair) {
    const avail = allSuits.filter((s) => !used1.has(s));
    suit1 = avail[0] || "h";
    suit2 = avail[1] || "d";
  } else {
    suit1 = allSuits.find((s) => !used1.has(s)) || "s";
    suit2 = allSuits.find((s) => !used2.has(s) && s !== suit1) || "c";
  }

  return (
    <div className="flex gap-2">
      <div className="border-primary flex h-16 w-12 flex-col items-center justify-center rounded-lg border-2 bg-white shadow-md sm:h-20 sm:w-14 dark:bg-gray-100">
        <span className={cn("text-xl font-bold sm:text-2xl", SUIT_CARD_COLORS[suit1])}>
          {rank1}
        </span>
        <span className={cn("text-lg", SUIT_CARD_COLORS[suit1])}>{SUIT_SYMBOLS[suit1]}</span>
      </div>
      <div className="border-primary flex h-16 w-12 flex-col items-center justify-center rounded-lg border-2 bg-white shadow-md sm:h-20 sm:w-14 dark:bg-gray-100">
        <span className={cn("text-xl font-bold sm:text-2xl", SUIT_CARD_COLORS[suit2])}>
          {rank2}
        </span>
        <span className={cn("text-lg", SUIT_CARD_COLORS[suit2])}>{SUIT_SYMBOLS[suit2]}</span>
      </div>
    </div>
  );
}

const FLOP_ACTIONS = [
  { key: "bet_33", label: "Bet 33%", labelZh: "下注 33%" },
  { key: "bet_50", label: "Bet 50%", labelZh: "下注 50%" },
  { key: "bet_75", label: "Bet 75%", labelZh: "下注 75%" },
  { key: "check", label: "Check", labelZh: "過牌" },
];

const TURN_ACTIONS = [
  { key: "bet_33", label: "Bet 33%", labelZh: "下注 33%" },
  { key: "bet_50", label: "Bet 50%", labelZh: "下注 50%" },
  { key: "bet_66", label: "Bet 66%", labelZh: "下注 66%" },
  { key: "bet_75", label: "Bet 75%", labelZh: "下注 75%" },
  { key: "check", label: "Check", labelZh: "過牌" },
];

const RIVER_ACTIONS = [
  { key: "bet_25", label: "Bet 25%", labelZh: "下注 25%" },
  { key: "bet_50", label: "Bet 50%", labelZh: "下注 50%" },
  { key: "bet_75", label: "Bet 75%", labelZh: "下注 75%" },
  { key: "bet_100", label: "Bet 100%", labelZh: "下注 100%" },
  { key: "bet_150", label: "Overbet 150%", labelZh: "超池 150%" },
  { key: "check", label: "Check", labelZh: "過牌" },
  { key: "raise", label: "Raise", labelZh: "加注" },
];

// Defense actions (facing bet)
const DEFENSE_ACTIONS = [
  { key: "call", label: "Call", labelZh: "跟注" },
  { key: "raise", label: "Raise", labelZh: "加注" },
  { key: "fold", label: "Fold", labelZh: "棄牌" },
];

// Sizing only actions
const SIZING_ACTIONS = [
  { key: "bet_25", label: "25%", labelZh: "25%" },
  { key: "bet_33", label: "33%", labelZh: "33%" },
  { key: "bet_50", label: "50%", labelZh: "50%" },
  { key: "bet_66", label: "66%", labelZh: "66%" },
  { key: "bet_75", label: "75%", labelZh: "75%" },
  { key: "bet_100", label: "100%", labelZh: "100%" },
  { key: "bet_150", label: "150%", labelZh: "150%" },
];

const DRILL_MODE_OPTIONS = [
  { key: "ip_bet" as DrillMode, label: "IP Betting", labelZh: "有位置下注" },
  { key: "oop_defense" as DrillMode, label: "OOP Defense", labelZh: "無位置防守" },
  { key: "sizing_only" as DrillMode, label: "Sizing Quiz", labelZh: "尺寸選擇" },
];

function getActionsForStreet(street: Street, mode: DrillMode) {
  if (mode === "oop_defense") {
    return DEFENSE_ACTIONS;
  }
  if (mode === "sizing_only") {
    return SIZING_ACTIONS;
  }
  switch (street) {
    case "flop":
      return FLOP_ACTIONS;
    case "turn":
      return TURN_ACTIONS;
    case "river":
      return RIVER_ACTIONS;
  }
}

function getStreetTitle(street: Street, mode: DrillMode): string {
  if (mode === "oop_defense") {
    return `${street.charAt(0).toUpperCase() + street.slice(1)} Defense`;
  }
  if (mode === "sizing_only") {
    return `${street.charAt(0).toUpperCase() + street.slice(1)} Sizing`;
  }
  switch (street) {
    case "flop":
      return "Flop C-Bet";
    case "turn":
      return "Turn Barrel";
    case "river":
      return "River Decision";
  }
}

export default function PostflopDrillPage() {
  const t = useTranslations();
  const [street, setStreet] = useState<Street>("flop");
  const [drillMode, setDrillMode] = useState<DrillMode>("ip_bet");
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [result, setResult] = useState<{
    correct: boolean;
    explanation: string;
    correctAction: string;
    correctSizing: string | null;
    frequency: number;
  } | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [textureFilter, setTextureFilter] = useState<string | null>(null);
  const [textures, setTextures] = useState<Record<string, string>>({});
  const { recordResult } = useProgressStore();
  const { user } = useAuthStore();

  // Load available textures for current street
  useEffect(() => {
    const endpoint = street === "flop" ? "cbet" : street === "turn" ? "turn" : "river";
    fetch(`${API_BASE_URL}/api/postflop/${endpoint}/textures`)
      .then((res) => res.json())
      .then((data) => setTextures(data.textures || {}))
      .catch(console.error);
  }, [street]);

  const loadScenario = useCallback(async () => {
    setLoading(true);
    setSelectedAction(null);
    setResult(null);
    setError(null);

    try {
      const endpoint = street === "flop" ? "cbet" : street === "turn" ? "turn" : "river";
      const params = new URLSearchParams();
      if (textureFilter) params.set("texture", textureFilter);

      const res = await fetch(`${API_BASE_URL}/api/postflop/${endpoint}/random?${params}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setScenario(data.scenario);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("common.error");
      setError(msg);
      console.error("Failed to load scenario:", err);
    } finally {
      setLoading(false);
    }
  }, [street, textureFilter, t]);

  useEffect(() => {
    loadScenario();
  }, [loadScenario]);

  const handleStreetChange = (newStreet: Street) => {
    setStreet(newStreet);
    setTextureFilter(null);
    setScore({ correct: 0, total: 0 });
  };

  const handleAction = async (action: string) => {
    if (selectedAction || !scenario) return;

    setSelectedAction(action);

    try {
      const endpoint = street === "flop" ? "cbet" : street === "turn" ? "turn" : "river";
      const res = await fetch(`${API_BASE_URL}/api/postflop/${endpoint}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario_id: scenario.id,
          user_action: action,
          street: street,
        }),
      });
      const data = await res.json();

      setResult({
        correct: data.correct,
        explanation: data.explanation_zh,
        correctAction: data.correct_action,
        correctSizing: data.correct_sizing,
        frequency: data.frequency,
      });

      setScore((prev) => ({
        correct: prev.correct + (data.correct ? 1 : 0),
        total: prev.total + 1,
      }));

      // Persist to progressStore
      await recordResult(
        {
          drill_type: "postflop",
          hand: scenario.hero_hand,
          hero_position: scenario.hero_position,
          villain_position: scenario.villain_position,
          player_action: action,
          correct_action: data.correct_action,
          is_correct: data.correct,
          is_acceptable: false,
          frequency: data.frequency,
        },
        user?.id
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : t("common.error");
      setError(msg);
      console.error("Failed to evaluate:", err);
    }
  };

  const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  const renderBoard = () => {
    if (!scenario) return null;

    if (street === "river") {
      const riverScenario = scenario as RiverScenario;
      return (
        <div className="mb-6">
          <div className="text-muted-foreground mb-2 text-center text-sm">Board</div>
          <div className="flex flex-wrap justify-center gap-2 rounded-lg bg-green-800/30 px-6 py-4">
            {riverScenario.board.map((rank, i) => (
              <BoardCard key={i} rank={rank} suit={riverScenario.board_suits?.[i]} />
            ))}
          </div>
        </div>
      );
    }

    if (street === "turn") {
      const turnScenario = scenario as TurnScenario;
      return (
        <div className="mb-6">
          <div className="text-muted-foreground mb-2 text-center text-sm">Board</div>
          <div className="flex justify-center gap-2 rounded-lg bg-green-800/30 px-6 py-4">
            {turnScenario.flop.map((rank, i) => (
              <BoardCard key={i} rank={rank} suit={turnScenario.flop_suits?.[i]} />
            ))}
            <div className="w-2" />
            <BoardCard rank={turnScenario.turn} suit={turnScenario.turn_suit} />
          </div>
        </div>
      );
    }

    // Flop
    const flopScenario = scenario as FlopScenario;
    return (
      <div className="mb-6">
        <div className="text-muted-foreground mb-2 text-center text-sm">Flop</div>
        <div className="flex justify-center gap-2 rounded-lg bg-green-800/30 px-6 py-4">
          {flopScenario.flop.map((rank, i) => (
            <BoardCard key={i} rank={rank} suit={flopScenario.flop_suits?.[i]} />
          ))}
        </div>
      </div>
    );
  };

  const renderPreviousAction = () => {
    if (street === "turn") {
      const turnScenario = scenario as TurnScenario;
      return (
        <div className="text-muted-foreground mb-2 text-center text-sm">
          Flop Action: {turnScenario.flop_action}
        </div>
      );
    }
    if (street === "river") {
      const riverScenario = scenario as RiverScenario;
      return (
        <div className="text-muted-foreground mb-2 text-center text-sm">
          {riverScenario.previous_action}
        </div>
      );
    }
    return null;
  };

  const getCorrectActionDisplay = () => {
    if (!result) return "";
    if (result.correctAction === "check") return "Check";
    if (result.correctAction === "raise") return `Raise ${result.correctSizing}%`;
    return `Bet ${result.correctSizing}%`;
  };

  const isExactCorrect = (optionKey: string) => {
    if (!result) return false;
    if (result.correctAction === "check") return optionKey === "check";
    if (result.correctAction === "raise") return optionKey === "raise";
    return optionKey === `bet_${result.correctSizing}`;
  };

  if (loading && !scenario) {
    return (
      <div className="container max-w-2xl py-8">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  const actionOptions = getActionsForStreet(street, drillMode);

  return (
    <div className="container max-w-2xl py-4 pb-24 sm:py-8 sm:pb-8">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl font-bold sm:text-2xl">{t("postflop.title")}</h1>
        <p className="text-muted-foreground text-sm">{t("postflop.description")}</p>
      </div>

      {/* Drill Mode Selector - horizontal scroll on mobile */}
      <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {DRILL_MODE_OPTIONS.map((mode) => (
          <Button
            key={mode.key}
            variant={drillMode === mode.key ? "default" : "outline"}
            size="sm"
            className="shrink-0"
            onClick={() => {
              setDrillMode(mode.key);
              setScore({ correct: 0, total: 0 });
            }}
          >
            {mode.labelZh}
          </Button>
        ))}
      </div>

      {/* Street Tabs */}
      <Tabs
        value={street}
        onValueChange={(v) => handleStreetChange(v as Street)}
        className="mb-4 sm:mb-6"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="flop" className="text-sm sm:text-base">
            Flop
          </TabsTrigger>
          <TabsTrigger value="turn" className="text-sm sm:text-base">
            Turn
          </TabsTrigger>
          <TabsTrigger value="river" className="text-sm sm:text-base">
            River
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Score - compact on mobile */}
      <div className="mb-4 flex items-center justify-between sm:mb-6">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="px-3 py-1 text-lg">
            <Trophy className="mr-1 h-4 w-4" />
            {score.correct}/{score.total}
          </Badge>
          <span className="text-muted-foreground">{accuracy}%</span>
        </div>
        <select
          className="bg-muted rounded-md px-3 py-1.5 text-sm"
          value={textureFilter || "all"}
          onChange={(e) => {
            setTextureFilter(e.target.value === "all" ? null : e.target.value);
            setScore({ correct: 0, total: 0 });
          }}
        >
          <option value="all">{t("quiz.allCategories")}</option>
          {Object.entries(textures).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive mb-4 rounded-lg p-4 text-center">
          {error}
          <Button variant="outline" size="sm" className="ml-3" onClick={loadScenario}>
            {t("common.retry") || "重試"}
          </Button>
        </div>
      )}

      {scenario && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>
                <Badge variant="secondary">{scenario.texture_zh}</Badge>
              </CardDescription>
              <Badge variant="outline">
                {scenario.hero_position} vs {scenario.villain_position}
              </Badge>
            </div>
            <CardTitle className="mt-2 text-lg">{getStreetTitle(street, drillMode)}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Preflop Action */}
            <div className="text-muted-foreground mb-2 text-center text-sm">{scenario.preflop}</div>

            {/* Mode-specific context */}
            {drillMode === "sizing_only" && (
              <div className="bg-primary/10 mb-2 rounded-lg p-2 text-center text-sm">
                {t("postflop.sizingPrompt")}
              </div>
            )}
            {drillMode === "oop_defense" && (
              <div className="mb-2 rounded-lg bg-amber-500/10 p-2 text-center text-sm">
                {t("postflop.oopDefensePrompt")}
              </div>
            )}

            {/* Previous Action (for turn/river) */}
            {renderPreviousAction()}

            {/* Board Display */}
            {renderBoard()}

            {/* Hero Hand */}
            <div className="mb-6">
              <div className="text-muted-foreground mb-2 text-center text-sm">
                {t("postflop.cbet.yourHand")}
              </div>
              <div className="flex justify-center">
                <HeroHand hand={scenario.hero_hand} board={getBoardCards(scenario, street)} />
              </div>
            </div>

            {/* Action Buttons */}
            <div
              className={cn(
                "grid gap-3",
                actionOptions.length <= 4 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
              )}
            >
              {actionOptions.map((option) => {
                const isSelected = selectedAction === option.key;
                const showResult = selectedAction !== null;
                const isCorrect = isExactCorrect(option.key);

                return (
                  <Button
                    key={option.key}
                    variant={
                      showResult
                        ? isCorrect
                          ? "default"
                          : isSelected
                            ? "destructive"
                            : "outline"
                        : "outline"
                    }
                    className={cn(
                      "touch-target-lg h-12 sm:h-auto sm:py-3",
                      showResult && isCorrect && "bg-green-600 hover:bg-green-600",
                      showResult && isSelected && !isCorrect && "bg-red-600"
                    )}
                    onClick={() => handleAction(option.key)}
                    disabled={showResult}
                  >
                    <span className="text-sm font-medium">{option.labelZh}</span>
                    {showResult && isCorrect && <CheckCircle2 className="ml-2 h-4 w-4" />}
                    {showResult && isSelected && !isCorrect && <XCircle className="ml-2 h-4 w-4" />}
                  </Button>
                );
              })}
            </div>

            {/* Result */}
            {result && (
              <div className="mt-6 text-center">
                {result.correct ? (
                  <p className="font-medium text-green-500">{t("drill.result.correct")}</p>
                ) : (
                  <p className="font-medium text-red-500">
                    {t("drill.result.incorrect")} - {getCorrectActionDisplay()} ({result.frequency}
                    %)
                  </p>
                )}
                <p className="text-muted-foreground bg-muted/30 mt-2 rounded-lg p-3 text-sm">
                  {result.explanation}
                </p>
                <Button onClick={loadScenario} className="mt-4">
                  {t("drill.nextHand")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("postflop.tipsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          {street === "flop" && (
            <>
              <p>{t("postflop.cbet.tip1")}</p>
              <p>{t("postflop.cbet.tip2")}</p>
              <p>{t("postflop.cbet.tip3")}</p>
            </>
          )}
          {street === "turn" && (
            <>
              <p>{t("postflop.turn.tip1")}</p>
              <p>{t("postflop.turn.tip2")}</p>
              <p>{t("postflop.turn.tip3")}</p>
            </>
          )}
          {street === "river" && (
            <>
              <p>{t("postflop.river.tip1")}</p>
              <p>{t("postflop.river.tip2")}</p>
              <p>{t("postflop.river.tip3")}</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
