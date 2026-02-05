"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, MttDrillSpotResponse, MttDrillEvaluateResponse } from "@/lib/api";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Settings,
  Layers,
} from "lucide-react";
import { useProgressStore } from "@/stores/progressStore";
import { useAuthStore } from "@/stores/authStore";

type DrillMode = "push" | "defense" | "resteal" | "hu";

// Map drill mode to progressStore drill type
const modeToDrillType = {
  push: "push_fold",
  defense: "push_fold_defense",
  resteal: "push_fold_resteal",
  hu: "push_fold_hu",
} as const;

interface SessionStats {
  total: number;
  correct: number;
  streak: number;
  bestStreak: number;
}

const initialStats: SessionStats = {
  total: 0,
  correct: 0,
  streak: 0,
  bestStreak: 0,
};

const STACK_DEPTHS = ["3bb", "5bb", "8bb", "10bb", "12bb", "15bb", "20bb", "25bb"];

const DEFENSE_SCENARIOS = [
  { key: "BB_vs_SB_shove", label: "BB vs SB Shove" },
  { key: "BB_vs_BTN_shove", label: "BB vs BTN Shove" },
  { key: "SB_vs_BTN_shove", label: "SB vs BTN Shove" },
  { key: "BB_vs_CO_shove", label: "BB vs CO Shove" },
  { key: "BB_vs_HJ_shove", label: "BB vs HJ Shove" },
];

const RESTEAL_SCENARIOS = [
  { key: "SB_resteal_vs_BTN", label: "SB 3bet vs BTN" },
  { key: "BB_resteal_vs_BTN", label: "BB 3bet vs BTN" },
  { key: "BB_resteal_vs_CO", label: "BB 3bet vs CO" },
  { key: "BB_resteal_vs_HJ", label: "BB 3bet vs HJ" },
  { key: "SB_resteal_vs_CO", label: "SB 3bet vs CO" },
];

const HU_SCENARIOS = [
  { key: "SB_push", label: "SB Push (HU)" },
  { key: "BB_call_vs_SB_shove", label: "BB Call vs SB (HU)" },
];

function PushFoldDrillInner() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const focusPosition = searchParams.get("position") || undefined;

  const [mode, setMode] = useState<DrillMode>("push");
  const [currentSpot, setCurrentSpot] = useState<MttDrillSpotResponse | null>(null);
  const [lastResult, setLastResult] = useState<MttDrillEvaluateResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats>(initialStats);
  const [showSettings, setShowSettings] = useState(false);

  // Progress persistence
  const { stats, recordResult } = useProgressStore();
  const { user } = useAuthStore();
  const drillType = modeToDrillType[mode];
  const cumulativeStats = stats[drillType];

  const allPositions = ["UTG", "HJ", "CO", "BTN", "SB"];
  // Settings state
  const [enabledPositions, setEnabledPositions] = useState<string[]>(
    focusPosition && allPositions.includes(focusPosition) ? [focusPosition] : allPositions
  );
  const [enabledStackDepths, setEnabledStackDepths] = useState<string[]>(["5bb", "8bb", "10bb", "12bb", "15bb"]);
  const [enabledScenarios, setEnabledScenarios] = useState<string[]>([]);

  const generateSpot = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setLastResult(null);

    try {
      const spot = await api.generateMttDrillSpot({
        mode,
        enabled_positions: enabledPositions,
        enabled_stack_depths: enabledStackDepths,
        enabled_scenarios: enabledScenarios.length > 0 ? enabledScenarios : undefined,
      });
      setCurrentSpot(spot);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setIsLoading(false);
    }
  }, [mode, enabledPositions, enabledStackDepths, enabledScenarios, t]);

  const submitAnswer = async (action: string) => {
    if (!currentSpot) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await api.evaluateMttDrillAction({
        hand: currentSpot.hand,
        position: currentSpot.position,
        stack_depth: currentSpot.stack_depth,
        mode: currentSpot.mode,
        action,
        scenario: currentSpot.scenario || undefined,
      });

      // Update stats
      const newStats = { ...sessionStats };
      newStats.total += 1;

      if (result.is_correct) {
        newStats.correct += 1;
        newStats.streak += 1;
        newStats.bestStreak = Math.max(newStats.streak, newStats.bestStreak);
      } else {
        newStats.streak = 0;
      }

      setSessionStats(newStats);
      setLastResult(result);

      // Persist to progressStore (localStorage + Supabase if logged in)
      await recordResult(
        {
          drill_type: drillType,
          hand: currentSpot.hand,
          hero_position: currentSpot.position,
          villain_position: currentSpot.scenario || undefined,
          player_action: action,
          correct_action: result.correct_action,
          is_correct: result.is_correct,
          is_acceptable: false, // Push-fold is binary
          frequency: result.range_pct,
        },
        user?.id
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setIsLoading(false);
    }
  };

  const resetSession = () => {
    setCurrentSpot(null);
    setLastResult(null);
    setSessionStats(initialStats);
    setError(null);
  };

  const handleModeChange = (newMode: string) => {
    setMode(newMode as DrillMode);
    resetSession();
    // Reset scenarios when mode changes
    setEnabledScenarios([]);
  };

  const togglePosition = (pos: string) => {
    setEnabledPositions((prev) =>
      prev.includes(pos) ? prev.filter((p) => p !== pos) : [...prev, pos]
    );
  };

  const toggleStackDepth = (depth: string) => {
    setEnabledStackDepths((prev) =>
      prev.includes(depth) ? prev.filter((d) => d !== depth) : [...prev, depth]
    );
  };

  const toggleScenario = (scenario: string) => {
    setEnabledScenarios((prev) =>
      prev.includes(scenario) ? prev.filter((s) => s !== scenario) : [...prev, scenario]
    );
  };

  // Generate first spot on mount and mode change
  useEffect(() => {
    if (!currentSpot && !isLoading) {
      generateSpot();
    }
  }, [mode]);

  const accuracy =
    sessionStats.total > 0
      ? Math.round((sessionStats.correct / sessionStats.total) * 100)
      : 0;

  const getActionLabel = (action: string) => {
    const actionMap: Record<string, string> = {
      push: t("drill.actions.push") || "Push",
      fold: t("drill.actions.fold"),
      call: t("drill.actions.call"),
      shove: t("drill.actions.shove") || "Shove",
    };
    return actionMap[action] || action;
  };

  const getModeTitle = (m: DrillMode) => {
    const titles: Record<DrillMode, string> = {
      push: t("drill.pushFold.modes.push") || "Open Shove",
      defense: t("drill.pushFold.modes.defense") || "Defense vs Shove",
      resteal: t("drill.pushFold.modes.resteal") || "3bet Shove (Resteal)",
      hu: t("drill.pushFold.modes.hu") || "Heads Up",
    };
    return titles[m];
  };

  const getScenarioOptions = () => {
    switch (mode) {
      case "defense":
        return DEFENSE_SCENARIOS;
      case "resteal":
        return RESTEAL_SCENARIOS;
      case "hu":
        return HU_SCENARIOS;
      default:
        return [];
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("drill.pushFold.title") || "Push/Fold Drill"}</h1>
          <p className="text-muted-foreground">
            {t("drill.pushFold.description") || "Practice MTT short stack all-in decisions"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowSettings(!showSettings)}
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={resetSession}>
            <RotateCcw className="mr-2 h-4 w-4" />
            {t("common.reset")}
          </Button>
        </div>
      </div>

      {/* Mode Tabs */}
      <Tabs value={mode} onValueChange={handleModeChange} className="mb-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="push">{getModeTitle("push")}</TabsTrigger>
          <TabsTrigger value="defense">{getModeTitle("defense")}</TabsTrigger>
          <TabsTrigger value="resteal">{getModeTitle("resteal")}</TabsTrigger>
          <TabsTrigger value="hu">{getModeTitle("hu")}</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Settings Panel */}
      {showSettings && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Layers className="h-5 w-5" />
              {t("drill.settings") || "Drill Settings"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Positions (only for push mode) */}
            {mode === "push" && (
              <div>
                <p className="text-sm font-medium mb-2">{t("drill.positionFilter")}</p>
                <div className="flex flex-wrap gap-2">
                  {["UTG", "HJ", "CO", "BTN", "SB"].map((pos) => (
                    <Button
                      key={pos}
                      variant={enabledPositions.includes(pos) ? "default" : "outline"}
                      size="sm"
                      onClick={() => togglePosition(pos)}
                    >
                      {pos}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Stack Depths */}
            <div>
              <p className="text-sm font-medium mb-2">{t("drill.pushFold.stackDepth") || "Stack Depths"}</p>
              <div className="flex flex-wrap gap-2">
                {STACK_DEPTHS.map((depth) => (
                  <Button
                    key={depth}
                    variant={enabledStackDepths.includes(depth) ? "default" : "outline"}
                    size="sm"
                    onClick={() => toggleStackDepth(depth)}
                  >
                    {depth}
                  </Button>
                ))}
              </div>
            </div>

            {/* Scenarios (for defense/resteal/hu modes) */}
            {mode !== "push" && (
              <div>
                <p className="text-sm font-medium mb-2">{t("drill.pushFold.scenarios") || "Scenarios"}</p>
                <div className="flex flex-wrap gap-2">
                  {getScenarioOptions().map((scenario) => (
                    <Button
                      key={scenario.key}
                      variant={enabledScenarios.includes(scenario.key) ? "default" : "outline"}
                      size="sm"
                      onClick={() => toggleScenario(scenario.key)}
                    >
                      {scenario.label}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t("drill.pushFold.scenariosHint") || "Leave empty to include all scenarios"}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats Bar */}
      <div className="mb-8 grid grid-cols-4 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold">{sessionStats.total}</div>
            <div className="text-xs sm:text-sm text-muted-foreground">{t("common.total")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold text-green-500">
              {sessionStats.correct}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground">{t("common.correct")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold">{accuracy}%</div>
            <div className="text-xs sm:text-sm text-muted-foreground">{t("common.accuracy")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold text-primary">
              {sessionStats.streak}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground">{t("common.streak")}</div>
          </CardContent>
        </Card>
      </div>

      {/* Cumulative Stats (All-time) */}
      {cumulativeStats && cumulativeStats.total > 0 && (
        <div className="mb-8 p-3 rounded-lg bg-muted/50 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("drill.allTime") || "All-time"}:</span>
          <div className="flex gap-4">
            <span>{cumulativeStats.total} {t("common.total")}</span>
            <span className="text-green-500">
              {cumulativeStats.total > 0
                ? Math.round((cumulativeStats.correct / cumulativeStats.total) * 100)
                : 0}% {t("common.accuracy")}
            </span>
          </div>
        </div>
      )}

      {/* Main Drill Area */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{t("drill.whatsYourPlay")}</CardTitle>
          <CardDescription>{getModeTitle(mode)}</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 rounded-lg bg-destructive/10 p-4 text-destructive">
              {error}
            </div>
          )}

          {isLoading && !currentSpot ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : currentSpot ? (
            <div className="space-y-6">
              {/* Scenario Display */}
              {currentSpot.scenario_display && (
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">{currentSpot.scenario_display}</span>
                </div>
              )}

              {/* Hand, Position & Stack Display */}
              <div className="flex items-center justify-center gap-4 sm:gap-8 flex-wrap">
                <div className="text-center">
                  <div className="text-4xl sm:text-6xl font-bold">{currentSpot.hand}</div>
                  <div className="mt-2 text-sm text-muted-foreground">{t("drill.yourHand")}</div>
                </div>
                <div className="text-center">
                  <Badge variant="secondary" className="text-base sm:text-lg px-3 sm:px-4 py-1 sm:py-2">
                    {currentSpot.position}
                  </Badge>
                  <div className="mt-2 text-sm text-muted-foreground">{t("drill.position")}</div>
                </div>
                <div className="text-center">
                  <Badge variant="outline" className="text-base sm:text-lg px-3 sm:px-4 py-1 sm:py-2">
                    {currentSpot.stack_depth}
                  </Badge>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {t("drill.pushFold.stack") || "Stack"}
                  </div>
                </div>
              </div>

              {/* Result Display */}
              {lastResult && (
                <div
                  className={`rounded-lg p-4 ${
                    lastResult.is_correct
                      ? "bg-green-500/10 border border-green-500/20"
                      : "bg-red-500/10 border border-red-500/20"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {lastResult.is_correct ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <span className="font-semibold text-green-500">
                          {t("drill.result.correct")}
                        </span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-red-500" />
                        <span className="font-semibold text-red-500">
                          {t("drill.result.incorrect")}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-sm">
                    {t("drill.gto") || "GTO"}:{" "}
                    <strong>{getActionLabel(lastResult.correct_action)}</strong>{" "}
                    ({t("drill.pushFold.rangeSize") || "Range"}: {lastResult.range_pct}%)
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {lastResult.explanation_zh || lastResult.explanation}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              {!lastResult ? (
                <div className="grid grid-cols-2 gap-4">
                  {currentSpot.available_actions.map((action) => (
                    <Button
                      key={action}
                      size="lg"
                      variant={action === "fold" ? "outline" : "default"}
                      onClick={() => submitAnswer(action)}
                      disabled={isLoading}
                      className="h-16 text-lg"
                    >
                      {isLoading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        getActionLabel(action)
                      )}
                    </Button>
                  ))}
                </div>
              ) : (
                <Button
                  size="lg"
                  onClick={generateSpot}
                  className="w-full h-16 text-lg"
                >
                  {t("drill.nextHand")}
                </Button>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              {t("drill.clickToStart")}
              <Button onClick={generateSpot} className="mt-4 block mx-auto">
                {t("drill.startDrill")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reference Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t("drill.pushFold.reference") || "Push/Fold Reference"}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("drill.pushFold.referenceDesc") ||
              "Push/Fold charts are based on Nash equilibrium ranges for tournament play. The correct decision depends on your stack size, position, and the action before you."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="secondary">
              {t("drill.pushFold.stackTip1") || "< 10bb: Usually push or fold"}
            </Badge>
            <Badge variant="secondary">
              {t("drill.pushFold.stackTip2") || "10-15bb: Standard short stack"}
            </Badge>
            <Badge variant="secondary">
              {t("drill.pushFold.stackTip3") || "> 15bb: Consider raise/fold"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PushFoldDrillPage() {
  return (
    <Suspense>
      <PushFoldDrillInner />
    </Suspense>
  );
}
