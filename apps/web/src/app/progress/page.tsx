"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuthStore } from "@/stores/authStore";
import { useProgressStore } from "@/stores/progressStore";
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
} from "lucide-react";

type DrillType = "rfi" | "vs_rfi" | "vs_3bet" | "vs_4bet" | "push_fold" | "push_fold_defense" | "push_fold_resteal" | "push_fold_hu" | "table_trainer";
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
};

const quizTypeLabels: Record<QuizType, { en: string; zh: string }> = {
  equity: { en: "Equity Quiz", zh: "權益測驗" },
  outs: { en: "Outs Quiz", zh: "出數測驗" },
  ev: { en: "EV Quiz", zh: "EV 測驗" },
  logic: { en: "Logic Quiz", zh: "邏輯測驗" },
  exploit: { en: "Exploit Quiz", zh: "剝削測驗" },
};

export default function ProgressPage() {
  const t = useTranslations();
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();
  const { stats, quizStats, recentResults, getWeakPositions, syncToCloud, isSyncing, lastSyncedAt } =
    useProgressStore();

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
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
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
      ? Math.round(
          ((totalStats.correct + totalStats.acceptable) / totalStats.total) *
            100
        )
      : 0;

  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("progress.title")}</h1>
          <p className="text-muted-foreground">
            {t("progress.description")}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => syncToCloud(user.id)}
          disabled={isSyncing}
        >
          <RefreshCw
            className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`}
          />
          {t("progress.sync")}
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold">{totalStats.total}</div>
            <div className="text-sm text-muted-foreground">{t("progress.totalHands")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-green-500">
              {totalStats.correct}
            </div>
            <div className="text-sm text-muted-foreground">{t("progress.correct")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-yellow-500">
              {totalStats.acceptable}
            </div>
            <div className="text-sm text-muted-foreground">{t("progress.acceptable")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-3xl font-bold text-primary">
              {overallAccuracy}%
            </div>
            <div className="text-sm text-muted-foreground">{t("progress.accuracy")}</div>
          </CardContent>
        </Card>
      </div>

      {/* Section Header - Drill Stats */}
      <h2 className="text-xl font-bold mb-4">{t("progress.drillStats")}</h2>

      {/* Drill Stats */}
      <div className="grid gap-6 md:grid-cols-2 mb-8">
        {(Object.keys(stats) as DrillType[]).map((drillType) => {
          const drillStats = stats[drillType];
          const weakPositions = getWeakPositions(drillType);
          const accuracy =
            drillStats.total > 0
              ? Math.round(
                  ((drillStats.correct + drillStats.acceptable) /
                    drillStats.total) *
                    100
                )
              : 0;

          return (
            <Card key={drillType}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
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
                      <div className="text-xs text-muted-foreground">{t("progress.hands")}</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-green-500">
                        {accuracy}%
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("progress.accuracy")}
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {Object.keys(drillStats.byPosition).length}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {t("progress.positions")}
                      </div>
                    </div>
                  </div>

                  {/* Position breakdown */}
                  {Object.keys(drillStats.byPosition).length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-2">
                        {t("progress.positionBreakdown")}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(drillStats.byPosition).map(
                          ([pos, posStats]) => {
                            const posAccuracy =
                              posStats.total > 0
                                ? Math.round(
                                    ((posStats.correct + posStats.acceptable) /
                                      posStats.total) *
                                      100
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
                          }
                        )}
                      </div>
                    </div>
                  )}

                  {/* Weak positions */}
                  {weakPositions.length > 0 && (
                    <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10">
                      <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="text-sm font-medium">
                          {t("progress.needsImprovement")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {t("progress.focusOn")}: {weakPositions.join(", ")}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Practice button */}
                  <Button
                    className="w-full"
                    onClick={() =>
                      router.push(
                        `/drill/${drillType.replace("_", "-")}`
                      )
                    }
                  >
                    {t("progress.practiceNow")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Section Header - Quiz Stats */}
      <h2 className="text-xl font-bold mb-4">{t("progress.quizStats")}</h2>

      {/* Quiz Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
        {(Object.keys(quizStats) as QuizType[]).map((quizType) => {
          const qStats = quizStats[quizType];
          const accuracy =
            qStats.total > 0
              ? Math.round((qStats.correct / qStats.total) * 100)
              : 0;

          return (
            <Card key={quizType}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  {quizType === "equity" && <Calculator className="h-4 w-4 text-primary" />}
                  {quizType === "outs" && <Brain className="h-4 w-4 text-primary" />}
                  {quizType === "ev" && <TrendingUp className="h-4 w-4 text-primary" />}
                  {quizType === "logic" && <Lightbulb className="h-4 w-4 text-primary" />}
                  {quizType === "exploit" && <Target className="h-4 w-4 text-primary" />}
                  {quizTypeLabels[quizType].zh}
                </CardTitle>
                <CardDescription>
                  {qStats.total > 0
                    ? `${t("progress.lastPracticed")}: ${qStats.lastPracticed ? new Date(qStats.lastPracticed).toLocaleDateString() : "N/A"}`
                    : t("progress.notPracticed")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-center mb-4">
                  <div>
                    <div className="text-2xl font-bold">{qStats.total}</div>
                    <div className="text-xs text-muted-foreground">{t("progress.questions")}</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-500">
                      {accuracy}%
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t("progress.accuracy")}
                    </div>
                  </div>
                </div>

                {/* Category breakdown */}
                {Object.keys(qStats.byCategory).length > 0 && (
                  <div className="mb-4">
                    <div className="text-xs text-muted-foreground mb-2">
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
      {recentResults.filter(r => !r.is_correct && !r.is_acceptable).length > 0 && (
        <>
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            {t("progress.wrongAnswers") || "錯題複習"}
          </h2>

          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <XCircle className="h-5 w-5 text-destructive" />
                {t("progress.recentMistakes") || "最近錯誤"}
              </CardTitle>
              <CardDescription>
                {t("progress.reviewMistakesDesc") || "複習這些錯誤的手牌，加強記憶"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {recentResults
                  .filter(r => !r.is_correct && !r.is_acceptable)
                  .slice(0, 20)
                  .map((result, index) => (
                    <div
                      key={result.id || index}
                      className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/20"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-xl font-bold font-mono">{result.hand}</div>
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

              {/* Practice button for the drill type of the most common mistake */}
              {(() => {
                const wrongAnswers = recentResults.filter(r => !r.is_correct && !r.is_acceptable);
                if (wrongAnswers.length === 0) return null;

                // Find most common drill type among wrong answers
                const drillCounts = wrongAnswers.reduce((acc, r) => {
                  acc[r.drill_type] = (acc[r.drill_type] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>);

                const mostCommonDrill = Object.entries(drillCounts)
                  .sort(([, a], [, b]) => b - a)[0]?.[0] as DrillType;

                if (!mostCommonDrill) return null;

                return (
                  <Button
                    className="w-full mt-4"
                    variant="destructive"
                    onClick={() => router.push(`/drill/${mostCommonDrill.replace(/_/g, "-")}`)}
                  >
                    {t("progress.practiceWeakArea") || "練習弱項"}: {drillTypeLabels[mostCommonDrill]?.zh || mostCommonDrill}
                  </Button>
                );
              })()}
            </CardContent>
          </Card>
        </>
      )}

      {/* Last synced */}
      {lastSyncedAt && (
        <div className="mt-8 text-center text-sm text-muted-foreground">
          {t("stats.lastSynced")}: {new Date(lastSyncedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}
