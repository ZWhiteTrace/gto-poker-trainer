"use client";

import { useEffect, useState } from "react";
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
import { api, SpotResponse, EvaluateResponse } from "@/lib/api";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
  Settings,
} from "lucide-react";

type DrillType = "rfi" | "vs_rfi" | "vs_3bet" | "vs_4bet";

interface DrillSessionProps {
  drillType: DrillType;
  titleKey: string;
  descriptionKey: string;
  positions?: string[];
}

interface SessionStats {
  total: number;
  correct: number;
  acceptable: number;
  streak: number;
  bestStreak: number;
}

const initialStats: SessionStats = {
  total: 0,
  correct: 0,
  acceptable: 0,
  streak: 0,
  bestStreak: 0,
};

export function DrillSession({
  drillType,
  titleKey,
  descriptionKey,
  positions = ["UTG", "HJ", "CO", "BTN", "SB", "BB"],
}: DrillSessionProps) {
  const t = useTranslations();
  const [currentSpot, setCurrentSpot] = useState<SpotResponse | null>(null);
  const [lastResult, setLastResult] = useState<EvaluateResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats>(initialStats);
  const [enabledPositions, setEnabledPositions] = useState<string[]>(positions);
  const [showSettings, setShowSettings] = useState(false);

  const generateSpot = async () => {
    setIsLoading(true);
    setError(null);
    setLastResult(null);

    try {
      const spot = await api.generateSpot({
        drill_type: drillType,
        enabled_positions: enabledPositions,
      });
      setCurrentSpot(spot);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setIsLoading(false);
    }
  };

  const submitAnswer = async (action: string) => {
    if (!currentSpot) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await api.evaluateAction({
        hand: currentSpot.hand,
        scenario_key: currentSpot.scenario_key,
        action,
      });

      // Update stats
      const newStats = { ...sessionStats };
      newStats.total += 1;

      if (result.is_correct) {
        newStats.correct += 1;
        newStats.streak += 1;
        newStats.bestStreak = Math.max(newStats.streak, newStats.bestStreak);
      } else if (result.is_acceptable) {
        newStats.acceptable += 1;
        newStats.streak += 1;
        newStats.bestStreak = Math.max(newStats.streak, newStats.bestStreak);
      } else {
        newStats.streak = 0;
      }

      setSessionStats(newStats);
      setLastResult(result);
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

  const togglePosition = (pos: string) => {
    setEnabledPositions((prev) =>
      prev.includes(pos) ? prev.filter((p) => p !== pos) : [...prev, pos]
    );
  };

  // Generate first spot on mount
  useEffect(() => {
    if (!currentSpot && !isLoading) {
      generateSpot();
    }
  }, []);

  const accuracy =
    sessionStats.total > 0
      ? Math.round(
          ((sessionStats.correct + sessionStats.acceptable) /
            sessionStats.total) *
            100
        )
      : 0;

  const getActionLabel = (action: string) => {
    const actionMap: Record<string, string> = {
      raise: t("drill.actions.raise"),
      call: t("drill.actions.call"),
      fold: t("drill.actions.fold"),
      allin: t("drill.actions.allin"),
    };
    return actionMap[action] || action;
  };

  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t(titleKey)}</h1>
          <p className="text-muted-foreground">{t(descriptionKey)}</p>
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

      {/* Settings Panel */}
      {showSettings && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">{t("drill.positionFilter")}</CardTitle>
            <CardDescription>{t("drill.selectPositions")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {positions.map((pos) => (
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
          </CardContent>
        </Card>
      )}

      {/* Stats Bar */}
      <div className="mb-8 grid grid-cols-4 gap-2 sm:gap-4">
        <Card>
          <CardContent className="p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold">
              {sessionStats.total}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground">
              {t("common.total")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold text-green-500">
              {sessionStats.correct}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground">
              {t("common.correct")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold">{accuracy}%</div>
            <div className="text-xs sm:text-sm text-muted-foreground">
              {t("common.accuracy")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 sm:p-4 text-center">
            <div className="text-xl sm:text-2xl font-bold text-primary">
              {sessionStats.streak}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground">
              {t("common.streak")}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Drill Area */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{t("drill.whatsYourPlay")}</CardTitle>
          <CardDescription>{t("drill.chooseAction")}</CardDescription>
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
              {currentSpot.villain_position && (
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <span className="text-muted-foreground">
                    {currentSpot.villain_position} opens
                  </span>
                </div>
              )}

              {/* Hand & Position Display */}
              <div className="flex items-center justify-center gap-6 sm:gap-8">
                <div className="text-center">
                  <div className="text-4xl sm:text-6xl font-bold">
                    {currentSpot.hand}
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {t("drill.yourHand")}
                  </div>
                </div>
                <div className="text-center">
                  <Badge
                    variant="secondary"
                    className="text-base sm:text-lg px-3 sm:px-4 py-1 sm:py-2"
                  >
                    {currentSpot.hero_position}
                  </Badge>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {t("drill.position")}
                  </div>
                </div>
              </div>

              {/* Result Display */}
              {lastResult && (
                <div
                  className={`rounded-lg p-4 ${
                    lastResult.is_correct
                      ? "bg-green-500/10 border border-green-500/20"
                      : lastResult.is_acceptable
                      ? "bg-yellow-500/10 border border-yellow-500/20"
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
                    ) : lastResult.is_acceptable ? (
                      <>
                        <AlertCircle className="h-5 w-5 text-yellow-500" />
                        <span className="font-semibold text-yellow-500">
                          {t("drill.result.acceptable")}
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
                    {t("drill.gto")}:{" "}
                    <strong>{getActionLabel(lastResult.correct_action)}</strong>{" "}
                    ({lastResult.frequency}%)
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {lastResult.explanation_zh || lastResult.explanation}
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              {!lastResult ? (
                <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
                  {currentSpot.available_actions.map((action) => (
                    <Button
                      key={action}
                      size="lg"
                      variant={
                        action === "raise" || action === "allin"
                          ? "default"
                          : "outline"
                      }
                      onClick={() => submitAnswer(action)}
                      disabled={isLoading}
                      className="h-14 sm:h-16 text-base sm:text-lg"
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
                  className="w-full h-14 sm:h-16 text-base sm:text-lg"
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

      {/* Position Reference */}
      <Card>
        <CardHeader>
          <CardTitle>{t("drill.positionReference")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {positions.map((pos) => (
              <Badge
                key={pos}
                variant={
                  currentSpot?.hero_position === pos ? "default" : "secondary"
                }
              >
                {pos}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default DrillSession;
