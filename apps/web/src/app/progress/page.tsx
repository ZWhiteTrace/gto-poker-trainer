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
} from "lucide-react";

type DrillType = "rfi" | "vs_rfi" | "vs_3bet" | "vs_4bet";

const drillTypeLabels: Record<DrillType, { en: string; zh: string }> = {
  rfi: { en: "RFI Drill", zh: "RFI 開池練習" },
  vs_rfi: { en: "VS RFI Drill", zh: "VS RFI 練習" },
  vs_3bet: { en: "VS 3-Bet Drill", zh: "VS 3-Bet 練習" },
  vs_4bet: { en: "VS 4-Bet Drill", zh: "VS 4-Bet 練習" },
};

export default function ProgressPage() {
  const t = useTranslations();
  const router = useRouter();
  const { user, isInitialized } = useAuthStore();
  const { stats, getWeakPositions, syncToCloud, isSyncing, lastSyncedAt } =
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

      {/* Drill Stats */}
      <div className="grid gap-6 md:grid-cols-2">
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

      {/* Last synced */}
      {lastSyncedAt && (
        <div className="mt-8 text-center text-sm text-muted-foreground">
          {t("stats.lastSynced")}: {new Date(lastSyncedAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}
