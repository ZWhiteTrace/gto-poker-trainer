"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { api, SpotResponse, EvaluateResponse } from "@/lib/api";
import { getErrorMessage } from "@/lib/errors";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
  Settings,
} from "lucide-react";
import { useProgressStore } from "@/stores/progressStore";
import { useAuthStore } from "@/stores/authStore";
import { HoleCards } from "@/components/poker/cards/PlayingCard";
import type { Card as PokerCard, Suit, Rank } from "@/lib/poker/types";

type DrillType = "rfi" | "vs_rfi" | "vs_3bet" | "vs_4bet";

interface DrillSessionProps {
  drillType: DrillType;
  titleKey: string;
  descriptionKey: string;
  positions?: string[];
  initialPosition?: string;
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

// Convert hand notation (e.g., "Q9s", "AKo", "TT") to visual cards
function handNotationToCards(hand: string): [PokerCard, PokerCard] | null {
  if (!hand || hand.length < 2) return null;

  const rank1 = hand[0] as Rank;
  const rank2 = hand[1] as Rank;
  const suffix = hand[2] as "s" | "o" | undefined;

  // Validate ranks
  const validRanks = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
  if (!validRanks.includes(rank1) || !validRanks.includes(rank2)) return null;

  if (rank1 === rank2) {
    // Pair: use different suits (spades and hearts)
    return [
      { rank: rank1, suit: "s" },
      { rank: rank2, suit: "h" },
    ];
  } else if (suffix === "s") {
    // Suited: same suit (spades)
    return [
      { rank: rank1, suit: "s" },
      { rank: rank2, suit: "s" },
    ];
  } else {
    // Offsuit: different suits (spades and hearts)
    return [
      { rank: rank1, suit: "s" },
      { rank: rank2, suit: "h" },
    ];
  }
}

export function DrillSession({
  drillType,
  titleKey,
  descriptionKey,
  positions = ["UTG", "HJ", "CO", "BTN", "SB", "BB"],
  initialPosition,
}: DrillSessionProps) {
  const t = useTranslations();
  const [currentSpot, setCurrentSpot] = useState<SpotResponse | null>(null);
  const [lastResult, setLastResult] = useState<EvaluateResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sessionStats, setSessionStats] = useState<SessionStats>(initialStats);
  const [enabledPositions, setEnabledPositions] = useState<string[]>(
    initialPosition && positions.includes(initialPosition)
      ? [initialPosition]
      : positions
  );
  const [showSettings, setShowSettings] = useState(false);

  // Progress persistence
  const { stats, recordResult } = useProgressStore();
  const { user } = useAuthStore();
  const cumulativeStats = stats[drillType];

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
      setError(getErrorMessage(err, t("common.error")));
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

      // Update session stats (for current session display)
      const newStats = { ...sessionStats };
      newStats.total += 1;

      if (result.is_correct) {
        newStats.correct += 1;
        newStats.streak += 1;
        newStats.bestStreak = Math.max(newStats.streak, newStats.bestStreak);
      } else if (result.is_acceptable) {
        newStats.acceptable += 1;
        // Acceptable keeps streak alive but doesn't increment
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
          hero_position: currentSpot.hero_position,
          villain_position: currentSpot.villain_position ?? undefined,
          player_action: action,
          correct_action: result.correct_action,
          is_correct: result.is_correct,
          is_acceptable: result.is_acceptable,
          frequency: result.frequency,
        },
        user?.id
      );
    } catch (err) {
      setError(getErrorMessage(err, t("common.error")));
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

  // Refs to avoid stale closures in keyboard handler
  const submitAnswerRef = useRef(submitAnswer);
  submitAnswerRef.current = submitAnswer;
  const generateSpotRef = useRef(generateSpot);
  generateSpotRef.current = generateSpot;

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // If showing result, Space/Enter goes to next hand
      if (lastResult) {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          generateSpotRef.current();
        }
        return;
      }

      // If no spot or loading, ignore
      if (!currentSpot || isLoading) return;

      const actions = currentSpot.available_actions;
      let action: string | null = null;

      switch (e.key.toLowerCase()) {
        case "r":
          if (actions.includes("raise")) action = "raise";
          else if (actions.includes("3bet")) action = "3bet";
          else if (actions.includes("4bet")) action = "4bet";
          break;
        case "c":
          if (actions.includes("call")) action = "call";
          break;
        case "f":
          if (actions.includes("fold")) action = "fold";
          break;
        case "a":
          if (actions.includes("allin")) action = "allin";
          else if (actions.includes("5bet")) action = "5bet";
          break;
        case "3":
          if (actions.includes("3bet")) action = "3bet";
          else if (actions.includes("raise")) action = "raise";
          break;
        case "4":
          if (actions.includes("4bet")) action = "4bet";
          else if (actions.includes("allin")) action = "allin";
          break;
      }

      if (action) {
        e.preventDefault();
        submitAnswerRef.current(action);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSpot, lastResult, isLoading]);

  const accuracy =
    sessionStats.total > 0
      ? Math.round(
          ((sessionStats.correct + sessionStats.acceptable) /
            sessionStats.total) *
            100
        )
      : 0;

  const cumulativeAccuracy =
    cumulativeStats.total > 0
      ? Math.round(
          ((cumulativeStats.correct + cumulativeStats.acceptable) /
            cumulativeStats.total) *
            100
        )
      : 0;

  const getActionLabel = (action: string) => {
    const actionMap: Record<string, string> = {
      raise: t("drill.actions.raise"),
      "3bet": "3-Bet",
      "4bet": "4-Bet",
      "5bet": "5-Bet",
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

      {/* Session Stats Bar */}
      <div className="mb-4 grid grid-cols-4 gap-2 sm:gap-4">
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

      {/* Cumulative Stats (All-time) */}
      {cumulativeStats.total > 0 && (
        <div className="mb-8 p-3 rounded-lg bg-muted/50 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{t("drill.allTime")}:</span>
          <div className="flex gap-4">
            <span>{cumulativeStats.total} {t("common.total")}</span>
            <span className="text-green-500">{cumulativeAccuracy}% {t("common.accuracy")}</span>
          </div>
        </div>
      )}

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
            <div className="space-y-6">
              {/* Skeleton for scenario */}
              <Skeleton className="h-10 w-32 mx-auto" />
              {/* Skeleton for hand and position */}
              <div className="flex items-center justify-center gap-6 sm:gap-8">
                <div className="text-center">
                  <Skeleton className="h-16 w-24 mx-auto mb-2" />
                  <Skeleton className="h-4 w-16 mx-auto" />
                </div>
                <div className="text-center">
                  <Skeleton className="h-10 w-16 mx-auto mb-2" />
                  <Skeleton className="h-4 w-12 mx-auto" />
                </div>
              </div>
              {/* Skeleton for buttons */}
              <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-14 sm:h-16 w-full" />
                ))}
              </div>
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
              <motion.div
                key={currentSpot.hand + currentSpot.hero_position}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="flex items-center justify-center gap-6 sm:gap-8"
              >
                <div className="text-center">
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="flex justify-center"
                  >
                    <HoleCards
                      cards={handNotationToCards(currentSpot.hand)}
                      size="lg"
                    />
                  </motion.div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {currentSpot.hand}
                  </div>
                </div>
                <div className="text-center">
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Badge
                      variant="secondary"
                      className="text-base sm:text-lg px-3 sm:px-4 py-1 sm:py-2"
                    >
                      {currentSpot.hero_position}
                    </Badge>
                  </motion.div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {t("drill.position")}
                  </div>
                </div>
              </motion.div>

              {/* Result Display */}
              <AnimatePresence mode="wait">
              {lastResult && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
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
                </motion.div>
              )}
              </AnimatePresence>

              {/* Action Buttons */}
              {!lastResult ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
                    {currentSpot.available_actions.map((action) => {
                      const shortcutKey = action === "raise" ? "R" : action === "3bet" ? "3" : action === "4bet" ? "4" : action === "call" ? "C" : action === "fold" ? "F" : action === "allin" ? "A" : action === "5bet" ? "A" : "";
                      return (
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
                          className="h-14 sm:h-16 text-base sm:text-lg relative"
                        >
                          {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin" />
                          ) : (
                            <>
                              {getActionLabel(action)}
                              {shortcutKey && (
                                <kbd className="absolute top-1 right-1 hidden sm:inline-flex h-5 w-5 items-center justify-center rounded border bg-muted text-[10px] font-medium text-muted-foreground">
                                  {shortcutKey}
                                </kbd>
                              )}
                            </>
                          )}
                        </Button>
                      );
                    })}
                  </div>
                  <p className="text-xs text-center text-muted-foreground hidden sm:block">
                    {t("drill.keyboardShortcuts")}: R = Raise, C = Call, F = Fold, A = All-in
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Button
                    size="lg"
                    onClick={generateSpot}
                    className="w-full h-14 sm:h-16 text-base sm:text-lg"
                  >
                    {t("drill.nextHand")}
                    <kbd className="ml-2 hidden sm:inline-flex h-5 px-1.5 items-center justify-center rounded border bg-muted text-[10px] font-medium text-muted-foreground">
                      Space
                    </kbd>
                  </Button>
                </div>
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
