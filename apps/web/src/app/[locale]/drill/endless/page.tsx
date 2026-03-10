"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  RefreshCw,
  CheckCircle2,
  XCircle,
  Trophy,
  Flame,
  Target,
  Zap,
  AlertTriangle,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { updateLeaderboardStats } from "@/lib/supabase/leaderboard";
import { API_BASE_URL } from "@/lib/api";
import { SUIT_SYMBOLS, SUIT_CARD_COLORS } from "@/lib/poker/types";

// Local storage key for endless drill stats
const ENDLESS_STATS_KEY = "endless-drill-stats";

// Pot types with Chinese names
const POT_TYPE_COLORS: Record<string, string> = {
  all: "bg-purple-500",
  srp: "bg-blue-500",
  "3bet": "bg-orange-500",
  "4bet": "bg-red-500",
  multiway: "bg-green-500",
  limp: "bg-gray-500",
  squeeze: "bg-pink-500",
};
const POT_TYPE_KEYS = Object.keys(POT_TYPE_COLORS);

interface Scenario {
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

interface Stats {
  total: number;
  correct: number;
  streak: number;
  maxStreak: number;
  byPotType: Record<string, { total: number; correct: number }>;
  byTexture: Record<string, { total: number; correct: number }>;
}

// Get weakpoints (accuracy < 60%)
function getWeakpoints(stats: Stats): { potTypes: string[]; textures: string[] } {
  const weakPotTypes = Object.entries(stats.byPotType)
    .filter(([, s]) => s.total >= 3 && s.correct / s.total < 0.6)
    .map(([key]) => key);

  const weakTextures = Object.entries(stats.byTexture)
    .filter(([, s]) => s.total >= 3 && s.correct / s.total < 0.6)
    .map(([key]) => key);

  return { potTypes: weakPotTypes, textures: weakTextures };
}

// Load stats from localStorage
function loadStats(): Stats {
  if (typeof window === "undefined") {
    return { total: 0, correct: 0, streak: 0, maxStreak: 0, byPotType: {}, byTexture: {} };
  }
  try {
    const saved = localStorage.getItem(ENDLESS_STATS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch {
    // Ignore
  }
  return { total: 0, correct: 0, streak: 0, maxStreak: 0, byPotType: {}, byTexture: {} };
}

// Save stats to localStorage
function saveStats(stats: Stats) {
  if (typeof window !== "undefined") {
    localStorage.setItem(ENDLESS_STATS_KEY, JSON.stringify(stats));
  }
}

function BoardCard({ card }: { card: string }) {
  const rank = card[0];
  const suit = card[1]?.toLowerCase() || "s";

  return (
    <div className="flex h-16 w-12 flex-col items-center justify-center rounded-lg border-2 border-gray-200 bg-white shadow-md sm:h-20 sm:w-14 dark:bg-gray-100">
      <span className={cn("text-xl font-bold sm:text-2xl", SUIT_CARD_COLORS[suit])}>{rank}</span>
      <span className={cn("text-lg sm:text-xl", SUIT_CARD_COLORS[suit])}>{SUIT_SYMBOLS[suit]}</span>
    </div>
  );
}

function HeroHand({ hand, board = [] }: { hand: string; board?: string[] }) {
  const rank1 = hand[0];
  const rank2 = hand[1];
  const suited = hand.endsWith("s");
  const isPair = rank1 === rank2 && hand.length === 2;

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
        <span className={cn("text-lg sm:text-xl", SUIT_CARD_COLORS[suit1])}>
          {SUIT_SYMBOLS[suit1]}
        </span>
      </div>
      <div className="border-primary flex h-16 w-12 flex-col items-center justify-center rounded-lg border-2 bg-white shadow-md sm:h-20 sm:w-14 dark:bg-gray-100">
        <span className={cn("text-xl font-bold sm:text-2xl", SUIT_CARD_COLORS[suit2])}>
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
  check: "Check 過牌",
  check_raise: "Check-Raise",
  donk_33: "Donk 33%",
  bet_33: "Bet 33%",
  bet_50: "Bet 50%",
  bet_66: "Bet 66%",
  bet_75: "Bet 75%",
  bet_100: "Bet 100%",
  all_in: "All-in 全下",
};

export default function EndlessDrillPage() {
  const t = useTranslations("drill.endless");
  const { user } = useAuthStore();
  const [selectedPotType, setSelectedPotType] = useState<string>("all");
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Stats>(() => loadStats());
  const [weakpoints, setWeakpoints] = useState<{ potTypes: string[]; textures: string[] }>({
    potTypes: [],
    textures: [],
  });

  // Update weakpoints when stats change
  useEffect(() => {
    setWeakpoints(getWeakpoints(stats));
  }, [stats]);

  const fetchScenario = useCallback(async () => {
    setLoading(true);
    setSelectedAction(null);
    setShowResult(false);

    try {
      // Build query params
      const params = new URLSearchParams();
      if (selectedPotType !== "all") {
        params.set("pot_type", selectedPotType);
      }

      const response = await fetch(`${API_BASE_URL}/api/solver/random-drill?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch scenario");
      }

      const data = await response.json();
      setScenario(data);
    } catch (error) {
      console.error("Error fetching scenario:", error);
      // Fallback to level1 drill if random-drill doesn't exist
      try {
        const response = await fetch(`${API_BASE_URL}/api/solver/level1/drill`);
        if (response.ok) {
          const data = await response.json();
          setScenario({
            scenario_id: data.texture_id,
            position: "BTN",
            villain: "BB",
            pot_type: "srp",
            board: data.board,
            texture: data.texture_id,
            texture_zh: data.texture_zh,
            hand: data.hand,
            options: data.options,
            correct_strategy: {},
          });
        }
      } catch {
        console.error("Fallback also failed");
      }
    } finally {
      setLoading(false);
    }
  }, [selectedPotType]);

  useEffect(() => {
    fetchScenario();
  }, [fetchScenario]);

  const handleActionSelect = async (action: string) => {
    if (showResult || !scenario) return;

    setSelectedAction(action);
    setShowResult(true);

    // Check if correct (action has >= 30% frequency)
    const strategy = scenario.correct_strategy || {};
    const actionFreq = strategy[action] || 0;
    const correct = actionFreq >= 25;

    setIsCorrect(correct);

    // Update stats with pot type and texture tracking
    const newStats: Stats = {
      total: stats.total + 1,
      correct: stats.correct + (correct ? 1 : 0),
      streak: correct ? stats.streak + 1 : 0,
      maxStreak: correct ? Math.max(stats.maxStreak, stats.streak + 1) : stats.maxStreak,
      byPotType: { ...stats.byPotType },
      byTexture: { ...stats.byTexture },
    };

    // Update pot type stats
    const potType = scenario.pot_type;
    const potStats = newStats.byPotType[potType] || { total: 0, correct: 0 };
    newStats.byPotType[potType] = {
      total: potStats.total + 1,
      correct: potStats.correct + (correct ? 1 : 0),
    };

    // Update texture stats
    const texture = scenario.texture;
    const texStats = newStats.byTexture[texture] || { total: 0, correct: 0 };
    newStats.byTexture[texture] = {
      total: texStats.total + 1,
      correct: texStats.correct + (correct ? 1 : 0),
    };

    setStats(newStats);
    saveStats(newStats);

    // Update leaderboard if user is logged in
    if (user?.id) {
      try {
        await updateLeaderboardStats(user.id, correct);
      } catch (error) {
        console.error("Failed to update leaderboard:", error);
      }
    }
  };

  const handleNext = () => {
    fetchScenario();
  };

  const accuracy = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="mb-2 text-2xl font-bold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
      </div>

      {/* Stats Bar */}
      <div className="mb-6 grid grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/10">
          <CardContent className="flex items-center gap-3 p-4">
            <Target className="h-8 w-8 text-blue-500" />
            <div>
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-muted-foreground text-xs">{t("totalQuestions")}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/10">
          <CardContent className="flex items-center gap-3 p-4">
            <CheckCircle2 className="h-8 w-8 text-green-500" />
            <div>
              <div className="text-2xl font-bold">{accuracy}%</div>
              <div className="text-muted-foreground text-xs">{t("accuracy")}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/10">
          <CardContent className="flex items-center gap-3 p-4">
            <Flame className="h-8 w-8 text-orange-500" />
            <div>
              <div className="text-2xl font-bold">{stats.streak}</div>
              <div className="text-muted-foreground text-xs">{t("streak")}</div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/10">
          <CardContent className="flex items-center gap-3 p-4">
            <Trophy className="h-8 w-8 text-purple-500" />
            <div>
              <div className="text-2xl font-bold">{stats.maxStreak}</div>
              <div className="text-muted-foreground text-xs">{t("maxStreak")}</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pot Type Filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        {POT_TYPE_KEYS.map((key) => (
          <Button
            key={key}
            variant={selectedPotType === key ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedPotType(key)}
            className={cn(selectedPotType === key && POT_TYPE_COLORS[key])}
          >
            {t(`potTypes.${key}`)}
          </Button>
        ))}
      </div>

      {/* Main Drill Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {scenario && (
                <>
                  <Badge variant="secondary">
                    {scenario.position} vs {scenario.villain}
                  </Badge>
                  <Badge className={POT_TYPE_COLORS[scenario.pot_type] || "bg-gray-500"}>
                    {t(`potTypes.${scenario.pot_type}`)}
                  </Badge>
                  <Badge variant="outline">{scenario.texture_zh}</Badge>
                </>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={handleNext} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
          ) : scenario ? (
            <>
              {/* Board */}
              <div className="flex justify-center gap-2">
                {scenario.board.map((card, i) => (
                  <BoardCard key={i} card={card} />
                ))}
              </div>

              {/* Hero Hand */}
              <div className="flex justify-center">
                <div className="text-center">
                  <div className="text-muted-foreground mb-2 text-sm">{t("yourHand")}</div>
                  <HeroHand hand={scenario.hand} board={scenario.board} />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {scenario.options.map((action) => {
                  const freq = scenario.correct_strategy?.[action] || 0;
                  const isSelected = selectedAction === action;
                  const isGoodAction = freq >= 25;

                  return (
                    <Button
                      key={action}
                      variant={isSelected ? "default" : "outline"}
                      className={cn(
                        "flex h-auto flex-col gap-1 py-3",
                        showResult && isGoodAction && "ring-2 ring-green-500",
                        showResult && isSelected && !isGoodAction && "ring-2 ring-red-500"
                      )}
                      onClick={() => handleActionSelect(action)}
                      disabled={showResult}
                    >
                      <span>{ACTION_LABELS[action] || action}</span>
                      {showResult && <span className="text-xs opacity-75">{freq}%</span>}
                    </Button>
                  );
                })}
              </div>

              {/* Result */}
              {showResult && (
                <div
                  className={cn(
                    "rounded-lg p-4 text-center",
                    isCorrect
                      ? "border border-green-500/30 bg-green-500/10"
                      : "border border-red-500/30 bg-red-500/10"
                  )}
                >
                  <div className="mb-2 flex items-center justify-center gap-2">
                    {isCorrect ? (
                      <>
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                        <span className="font-bold text-green-600">{t("correct")}</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-6 w-6 text-red-500" />
                        <span className="font-bold text-red-600">{t("couldBeBetter")}</span>
                      </>
                    )}
                  </div>

                  <div className="text-muted-foreground mb-4 text-sm">
                    {t("bestStrategy")}
                    {Object.entries(scenario.correct_strategy || {})
                      .filter(([, freq]) => (freq as number) > 0)
                      .sort(([, a], [, b]) => (b as number) - (a as number))
                      .map(([action, freq]) => (
                        <span key={action} className="mx-1">
                          {ACTION_LABELS[action] || action} {freq as number}%
                        </span>
                      ))}
                  </div>

                  <Button onClick={handleNext} className="gap-2">
                    <Zap className="h-4 w-4" />
                    {t("nextQuestion")}
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="text-muted-foreground py-12 text-center">{t("loading")}</div>
          )}
        </CardContent>
      </Card>

      {/* Weakpoints */}
      {(weakpoints.potTypes.length > 0 || weakpoints.textures.length > 0) && (
        <Card className="border-orange-500/30 bg-orange-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              {t("weakpoints")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {weakpoints.potTypes.length > 0 && (
              <div>
                <span className="text-muted-foreground">{t("weakPotTypes")}</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {weakpoints.potTypes.map((pt) => (
                    <Badge
                      key={pt}
                      variant="outline"
                      className="cursor-pointer hover:bg-orange-500/20"
                      onClick={() => setSelectedPotType(pt)}
                    >
                      {t(`potTypes.${pt}`)}
                      {stats.byPotType[pt] && (
                        <span className="ml-1 text-orange-500">
                          {Math.round(
                            (stats.byPotType[pt].correct / stats.byPotType[pt].total) * 100
                          )}
                          %
                        </span>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {weakpoints.textures.length > 0 && (
              <div>
                <span className="text-muted-foreground">{t("weakTextures")}</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {weakpoints.textures.slice(0, 5).map((tex) => (
                    <Badge key={tex} variant="outline">
                      {tex}
                      {stats.byTexture[tex] && (
                        <span className="ml-1 text-orange-500">
                          {Math.round(
                            (stats.byTexture[tex].correct / stats.byTexture[tex].total) * 100
                          )}
                          %
                        </span>
                      )}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">{t("tipsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="text-muted-foreground space-y-2 text-sm">
          <p>
            <strong>{t("tipCorrectLabel")}</strong>
            {t("tipCorrectDesc")}
          </p>
          <p>
            <strong>{t("tipMixedLabel")}</strong>
            {t("tipMixedDesc")}
          </p>
          <p>
            <strong>{t("tipPositionLabel")}</strong>
            {t("tipPositionDesc")}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
