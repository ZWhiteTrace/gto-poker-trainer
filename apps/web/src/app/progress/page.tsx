"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/authStore";
import { useProgressStore } from "@/stores/progressStore";
import { getDrillHref } from "@/lib/constants/drills";
import { useQuizProgressStore } from "@/stores/quizProgressStore";
import {
  Target,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  RefreshCw,
  Brain,
  Calculator,
  Lightbulb,
  RotateCcw,
  XCircle,
  Filter,
  ChevronDown,
  Trash2,
} from "lucide-react";

type DrillType =
  | "rfi"
  | "vs_rfi"
  | "vs_3bet"
  | "vs_4bet"
  | "push_fold"
  | "push_fold_defense"
  | "push_fold_resteal"
  | "push_fold_hu"
  | "table_trainer"
  | "postflop";
type QuizType = "equity" | "outs" | "ev" | "logic" | "exploit";

const drillTypeLabels: Record<DrillType, { en: string; zh: string }> = {
  rfi: { en: "RFI Drill", zh: "RFI 開池練習" },
  vs_rfi: { en: "VS RFI Drill", zh: "VS RFI 練習" },
  vs_3bet: { en: "VS 3-Bet Drill", zh: "VS 3-Bet 練習" },
  vs_4bet: { en: "VS 4-Bet Drill", zh: "VS 4-Bet 練習" },
  push_fold: { en: "Push/Fold Drill", zh: "Push/Fold 練習" },
  push_fold_defense: { en: "Defense vs Shove", zh: "防守 vs Shove" },
  push_fold_resteal: { en: "Resteal Drill", zh: "Resteal 練習" },
  push_fold_hu: { en: "Heads Up P/F", zh: "單挑 Push/Fold" },
  table_trainer: { en: "Table Trainer", zh: "撲克桌訓練" },
  postflop: { en: "Postflop Drill", zh: "翻後練習" },
};

const quizTypeLabels: Record<QuizType, { en: string; zh: string }> = {
  equity: { en: "Equity Quiz", zh: "權益測驗" },
  outs: { en: "Outs Quiz", zh: "出數測驗" },
  ev: { en: "EV Quiz", zh: "EV 測驗" },
  logic: { en: "Logic Quiz", zh: "邏輯測驗" },
  exploit: { en: "Exploit Quiz", zh: "剝削測驗" },
};

const POSITIONS = ["UTG", "HJ", "CO", "BTN", "SB", "BB"];

type TimeRange = "all" | "today" | "week" | "month";

const TIME_RANGE_LABELS: Record<TimeRange, string> = {
  all: "全部",
  today: "今天",
  week: "本週",
  month: "本月",
};

function isWithinTimeRange(dateStr: string | undefined, range: TimeRange): boolean {
  if (!dateStr || range === "all") return true;

  const date = new Date(dateStr);
  const now = new Date();

  switch (range) {
    case "today":
      return date.toDateString() === now.toDateString();
    case "week": {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return date >= weekAgo;
    }
    case "month": {
      const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return date >= monthAgo;
    }
    default:
      return true;
  }
}

export default function ProgressPage() {
  const t = useTranslations();
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();
  const {
    stats,
    recentResults,
    getWeakPositions,
    syncToCloud,
    isSyncing,
    lastSyncedAt,
    resetDrillStats,
  } = useProgressStore();
  const { quizStats } = useQuizProgressStore();

  // Filter state for wrong answers
  const [filterDrillType, setFilterDrillType] = useState<DrillType | "all">("all");
  const [filterPosition, setFilterPosition] = useState<string>("all");
  const [filterTimeRange, setFilterTimeRange] = useState<TimeRange>("all");
  const [showFilters, setShowFilters] = useState(false);

  // Filter wrong answers
  const filteredWrongAnswers = useMemo(() => {
    return recentResults
      .filter((r) => !r.is_correct && !r.is_acceptable)
      .filter((r) => filterDrillType === "all" || r.drill_type === filterDrillType)
      .filter((r) => filterPosition === "all" || r.hero_position === filterPosition)
      .filter((r) => isWithinTimeRange(r.created_at, filterTimeRange));
  }, [recentResults, filterDrillType, filterPosition, filterTimeRange]);

  // Analyze error patterns
  const errorPatterns = useMemo(() => {
    const patterns: Record<string, { count: number; action: string; correctAction: string }> = {};

    filteredWrongAnswers.forEach((r) => {
      const key = `${r.drill_type}-${r.hero_position}-${r.player_action}`;
      if (!patterns[key]) {
        patterns[key] = { count: 0, action: r.player_action, correctAction: r.correct_action };
      }
      patterns[key].count++;
    });

    return Object.entries(patterns)
      .sort(([, a], [, b]) => b.count - a.count)
      .slice(0, 5)
      .map(([key, data]) => {
        const [drillType, position] = key.split("-");
        return {
          drillType: drillType as DrillType,
          position,
          ...data,
        };
      });
  }, [filteredWrongAnswers]);

  // Redirect to home if not logged in
  useEffect(() => {
    if (isInitialized && !user) {
      router.push("/");
    }
  }, [isInitialized, user, router]);

  if (!isInitialized || !user) {
    return (
      <div className="container max-w-4xl py-8">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  const totalStats = Object.values(stats).reduce(
    (acc, drill) => ({
      total: acc.total + drill.total,
      correct: acc.correct + drill.correct,
      acceptable: acc.acceptable + drill.acceptable,
    }),
    { total: 0, correct: 0, acceptable: 0 }
  );

  const overallAccuracy =
    totalStats.total > 0
      ? Math.round(((totalStats.correct + totalStats.acceptable) / totalStats.total) * 100)
      : 0;

  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("progress.title")}</h1>
          <p className="text-muted-foreground">{t("progress.description")}</p>
        </div>
        <Button variant="outline" onClick={() => syncToCloud(user.id)} disabled={isSyncing}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isSyncing ? "animate-spin" : ""}`} />
          {t("progress.sync")}
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold">{totalStats.total}</div>
            <div className="text-muted-foreground text-sm">{t("progress.totalHands")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-green-500">{totalStats.correct}</div>
            <div className="text-muted-foreground text-sm">{t("progress.correct")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-yellow-500">{totalStats.acceptable}</div>
            <div className="text-muted-foreground text-sm">{t("progress.acceptable")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-primary text-3xl font-bold">{overallAccuracy}%</div>
            <div className="text-muted-foreground text-sm">{t("progress.accuracy")}</div>
          </CardContent>
        </Card>
      </div>

      {/* Section Header - Drill Stats */}
      <h2 className="mb-4 text-xl font-bold">{t("progress.drillStats")}</h2>

      {/* Drill Stats */}
      <div className="mb-8 grid gap-6 md:grid-cols-2">
        {(Object.keys(stats) as DrillType[]).map((drillType) => {
          const drillStats = stats[drillType];
          const weakPositions = getWeakPositions(drillType);
          const accuracy =
            drillStats.total > 0
              ? Math.round(((drillStats.correct + drillStats.acceptable) / drillStats.total) * 100)
              : 0;

          return (
            <Card key={drillType}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="text-primary h-5 w-5" />
                  {drillTypeLabels[drillType].zh}
                </CardTitle>
                <CardDescription>
                  {drillStats.total > 0
                    ? `${t("progress.lastPracticed")}: ${drillStats.lastPracticed ? new Date(drillStats.lastPracticed).toLocaleDateString() : "N/A"}`
                    : t("progress.notPracticed")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold">{drillStats.total}</div>
                      <div className="text-muted-foreground text-xs">{t("progress.hands")}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-500">{accuracy}%</div>
                      <div className="text-muted-foreground text-xs">{t("progress.accuracy")}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {Object.keys(drillStats.byPosition).length}
                      </div>
                      <div className="text-muted-foreground text-xs">{t("progress.positions")}</div>
                    </div>
                  </div>

                  {/* Position breakdown */}
                  {Object.keys(drillStats.byPosition).length > 0 && (
                    <div>
                      <div className="mb-2 text-sm font-medium">
                        {t("progress.positionBreakdown")}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(drillStats.byPosition).map(([pos, posStats]) => {
                          const posAccuracy =
                            posStats.total > 0
                              ? Math.round(
                                  ((posStats.correct + posStats.acceptable) / posStats.total) * 100
                                )
                              : 0;
                          return (
                            <Badge
                              key={pos}
                              variant={
                                posAccuracy >= 80
                                  ? "default"
                                  : posAccuracy >= 60
                                    ? "secondary"
                                    : "destructive"
                              }
                            >
                              {pos}: {posAccuracy}%
                            </Badge>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Weak positions */}
                  {weakPositions.length > 0 && (
                    <div className="bg-destructive/10 flex items-start gap-2 rounded-lg p-3">
                      <AlertTriangle className="text-destructive mt-0.5 h-5 w-5 flex-shrink-0" />
                      <div>
                        <div className="text-sm font-medium">{t("progress.needsImprovement")}</div>
                        <div className="text-muted-foreground text-sm">
                          {t("progress.focusOn")}: {weakPositions.join(", ")}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Practice button */}
                  <Button
                    className="w-full"
                    onClick={() => router.push(`/drill/${drillType.replace("_", "-")}`)}
                  >
                    {t("progress.practiceNow")}
                  </Button>

                  {/* Reset this drill type */}
                  {drillStats.total > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground hover:text-destructive w-full"
                      onClick={() => {
                        if (
                          window.confirm(
                            `確定要重置「${drillTypeLabels[drillType]?.zh || drillType}」的統計數據嗎？\n此類型的所有歷史記錄將被清除。`
                          )
                        ) {
                          resetDrillStats(drillType);
                        }
                      }}
                    >
                      <Trash2 className="mr-1 h-3 w-3" />
                      {t("progress.resetDrill") || "重置此練習統計"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Section Header - Quiz Stats */}
      <h2 className="mb-4 text-xl font-bold">{t("progress.quizStats")}</h2>

      {/* Quiz Stats */}
      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {(Object.keys(quizStats) as QuizType[]).map((quizType) => {
          const qStats = quizStats[quizType];
          const accuracy = qStats.total > 0 ? Math.round((qStats.correct / qStats.total) * 100) : 0;

          return (
            <Card key={quizType}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  {quizType === "equity" && <Calculator className="text-primary h-4 w-4" />}
                  {quizType === "outs" && <Brain className="text-primary h-4 w-4" />}
                  {quizType === "ev" && <TrendingUp className="text-primary h-4 w-4" />}
                  {quizType === "logic" && <Lightbulb className="text-primary h-4 w-4" />}
                  {quizType === "exploit" && <Target className="text-primary h-4 w-4" />}
                  {quizTypeLabels[quizType].zh}
                </CardTitle>
                <CardDescription>
                  {qStats.total > 0
                    ? `${t("progress.lastPracticed")}: ${qStats.lastPracticed ? new Date(qStats.lastPracticed).toLocaleDateString() : "N/A"}`
                    : t("progress.notPracticed")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4 grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{qStats.total}</div>
                    <div className="text-muted-foreground text-xs">{t("progress.questions")}</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-500">{accuracy}%</div>
                    <div className="text-muted-foreground text-xs">{t("progress.accuracy")}</div>
                  </div>
                </div>

                {/* Category breakdown */}
                {Object.keys(qStats.byCategory).length > 0 && (
                  <div className="mb-4">
                    <div className="text-muted-foreground mb-2 text-xs">
                      {t("progress.categoryBreakdown")}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(qStats.byCategory).map(([cat, catStats]) => {
                        const catAccuracy =
                          catStats.total > 0
                            ? Math.round((catStats.correct / catStats.total) * 100)
                            : 0;
                        return (
                          <Badge
                            key={cat}
                            variant={
                              catAccuracy >= 80
                                ? "default"
                                : catAccuracy >= 60
                                  ? "secondary"
                                  : "destructive"
                            }
                            className="text-xs"
                          >
                            {catAccuracy}%
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Practice button */}
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => router.push(`/quiz/${quizType}`)}
                >
                  {t("progress.practiceNow")}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Section Header - Wrong Answers Review */}
      {recentResults.filter((r) => !r.is_correct && !r.is_acceptable).length > 0 && (
        <>
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
            <RotateCcw className="h-5 w-5" />
            {t("progress.wrongAnswers") || "錯題複習"}
          </h2>

          {/* Error Pattern Analysis */}
          {errorPatterns.length > 0 && (
            <Card className="mb-4">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle className="h-5 w-5 text-yellow-500" />
                  {t("progress.errorPatterns") || "常見錯誤模式"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {errorPatterns.map((pattern, idx) => (
                    <div
                      key={idx}
                      className="bg-muted/50 flex items-center justify-between rounded p-2"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{pattern.position}</Badge>
                        <span className="text-sm">
                          {drillTypeLabels[pattern.drillType]?.zh || pattern.drillType}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-destructive">{pattern.action}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="text-green-500">{pattern.correctAction}</span>
                        <Badge variant="secondary">{pattern.count}x</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-1 h-7 px-2"
                          onClick={() =>
                            router.push(
                              `${getDrillHref(pattern.drillType as import("@/lib/constants/drills").DrillType)}?position=${pattern.position}`
                            )
                          }
                        >
                          <Target className="mr-1 h-3 w-3" />
                          練習
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <XCircle className="text-destructive h-5 w-5" />
                    {t("progress.recentMistakes") || "最近錯誤"}
                    <Badge variant="secondary" className="ml-2">
                      {filteredWrongAnswers.length}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {t("progress.reviewMistakesDesc") || "複習這些錯誤的手牌，加強記憶"}
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}>
                  <Filter className="mr-1 h-4 w-4" />
                  {t("common.filter") || "篩選"}
                  <ChevronDown
                    className={`ml-1 h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`}
                  />
                </Button>
              </div>

              {/* Filters */}
              {showFilters && (
                <div className="bg-muted/50 mt-4 space-y-3 rounded-lg p-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    {/* Drill Type Filter */}
                    <div>
                      <label className="text-muted-foreground mb-1 block text-xs font-medium">
                        {t("progress.drillType") || "練習類型"}
                      </label>
                      <select
                        className="bg-background w-full rounded border p-2 text-sm"
                        value={filterDrillType}
                        onChange={(e) => setFilterDrillType(e.target.value as DrillType | "all")}
                      >
                        <option value="all">{t("common.all") || "全部"}</option>
                        {(Object.keys(drillTypeLabels) as DrillType[]).map((type) => (
                          <option key={type} value={type}>
                            {drillTypeLabels[type].zh}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Position Filter */}
                    <div>
                      <label className="text-muted-foreground mb-1 block text-xs font-medium">
                        {t("drill.position") || "位置"}
                      </label>
                      <select
                        className="bg-background w-full rounded border p-2 text-sm"
                        value={filterPosition}
                        onChange={(e) => setFilterPosition(e.target.value)}
                      >
                        <option value="all">{t("common.all") || "全部"}</option>
                        {POSITIONS.map((pos) => (
                          <option key={pos} value={pos}>
                            {pos}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Time Range Filter */}
                    <div>
                      <label className="text-muted-foreground mb-1 block text-xs font-medium">
                        {t("progress.timeRange") || "時間範圍"}
                      </label>
                      <select
                        className="bg-background w-full rounded border p-2 text-sm"
                        value={filterTimeRange}
                        onChange={(e) => setFilterTimeRange(e.target.value as TimeRange)}
                      >
                        {(Object.keys(TIME_RANGE_LABELS) as TimeRange[]).map((range) => (
                          <option key={range} value={range}>
                            {TIME_RANGE_LABELS[range]}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Clear filters */}
                  {(filterDrillType !== "all" ||
                    filterPosition !== "all" ||
                    filterTimeRange !== "all") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setFilterDrillType("all");
                        setFilterPosition("all");
                        setFilterTimeRange("all");
                      }}
                    >
                      <RotateCcw className="mr-1 h-3 w-3" />
                      {t("common.clearFilters") || "清除篩選"}
                    </Button>
                  )}
                </div>
              )}
            </CardHeader>
            <CardContent>
              {filteredWrongAnswers.length === 0 ? (
                <div className="text-muted-foreground py-8 text-center">
                  {t("progress.noMatchingErrors") || "沒有符合條件的錯題"}
                </div>
              ) : (
                <div className="max-h-96 space-y-3 overflow-y-auto">
                  {filteredWrongAnswers.slice(0, 50).map((result, index) => (
                    <div
                      key={result.id || index}
                      className="bg-destructive/5 border-destructive/20 flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-4">
                        <div className="font-mono text-xl font-bold">{result.hand}</div>
                        <div className="text-sm">
                          <Badge variant="outline" className="mr-2">
                            {result.hero_position}
                          </Badge>
                          {result.villain_position && (
                            <span className="text-muted-foreground">
                              vs {result.villain_position}
                            </span>
                          )}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {drillTypeLabels[result.drill_type as DrillType]?.zh || result.drill_type}
                        </Badge>
                      </div>
                      <div className="text-right text-sm">
                        <div className="text-destructive">
                          你: <span className="font-semibold">{result.player_action}</span>
                        </div>
                        <div className="text-green-500">
                          正解: <span className="font-semibold">{result.correct_action}</span>
                          <span className="text-muted-foreground ml-1">({result.frequency}%)</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Practice button for filtered results */}
              {filteredWrongAnswers.length > 0 &&
                (() => {
                  // Find most common drill type among filtered wrong answers
                  const drillCounts = filteredWrongAnswers.reduce(
                    (acc, r) => {
                      acc[r.drill_type] = (acc[r.drill_type] || 0) + 1;
                      return acc;
                    },
                    {} as Record<string, number>
                  );

                  const mostCommonDrill = Object.entries(drillCounts).sort(
                    ([, a], [, b]) => b - a
                  )[0]?.[0] as DrillType;

                  if (!mostCommonDrill) return null;

                  return (
                    <Button
                      className="mt-4 w-full"
                      variant="destructive"
                      onClick={() => router.push(`/drill/${mostCommonDrill.replace(/_/g, "-")}`)}
                    >
                      {t("progress.practiceWeakArea") || "練習弱項"}:{" "}
                      {drillTypeLabels[mostCommonDrill]?.zh || mostCommonDrill}
                    </Button>
                  );
                })()}
            </CardContent>
          </Card>
        </>
      )}

      {/* Last synced */}
      {lastSyncedAt && (
        <div className="text-muted-foreground mt-8 text-center text-sm">
          {t("stats.lastSynced")}: {new Date(lastSyncedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}
