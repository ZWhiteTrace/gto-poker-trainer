"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import { useProgressStore } from "@/stores/progressStore";
import { useQuizProgressStore } from "@/stores/quizProgressStore";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Trophy,
  Target,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  Activity,
  BarChart3,
  Clock,
  PieChart as PieChartIcon,
  BookOpen,
  Award,
  Lightbulb,
  ArrowRight,
  Flame,
  Zap,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { WeaknessHeatmap } from "@/components/stats/WeaknessHeatmap";
import { ShareCard } from "@/components/stats/ShareCard";
import Link from "next/link";
import {
  TrackedDrillType,
  DRILL_LABELS,
  POSITIONS,
  drillTypeToPath,
} from "@/lib/constants/drills";

// Dynamic import for recharts to reduce initial bundle size
const AreaChart = dynamic(
  () => import("recharts").then((mod) => mod.AreaChart),
  { ssr: false }
);
const Area = dynamic(() => import("recharts").then((mod) => mod.Area), {
  ssr: false,
});
const XAxis = dynamic(() => import("recharts").then((mod) => mod.XAxis), {
  ssr: false,
});
const YAxis = dynamic(() => import("recharts").then((mod) => mod.YAxis), {
  ssr: false,
});
const CartesianGrid = dynamic(
  () => import("recharts").then((mod) => mod.CartesianGrid),
  { ssr: false }
);
const Tooltip = dynamic(() => import("recharts").then((mod) => mod.Tooltip), {
  ssr: false,
});
const ResponsiveContainer = dynamic(
  () => import("recharts").then((mod) => mod.ResponsiveContainer),
  { ssr: false }
);
const PieChart = dynamic(
  () => import("recharts").then((mod) => mod.PieChart),
  { ssr: false }
);
const Pie = dynamic(() => import("recharts").then((mod) => mod.Pie), {
  ssr: false,
});
const Cell = dynamic(() => import("recharts").then((mod) => mod.Cell), {
  ssr: false,
});

type DrillType = TrackedDrillType;

const CHART_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];

type TrendRange = 7 | 30;

export default function StatsPage() {
  const t = useTranslations();
  const { stats, recentResults, lastSyncedAt, resetStats, getWeakPositions, getDailyHistory } =
    useProgressStore();
  const { getQuizCompletionStats } = useQuizProgressStore();

  // Trend range state
  const [trendRange, setTrendRange] = useState<TrendRange>(7);

  // Get trend data based on selected range
  const trendData = getDailyHistory(trendRange).map((day) => ({
    date: day.date.slice(5), // MM-DD format
    total: day.total,
    correct: day.correct,
    accuracy: day.total > 0 ? Math.round((day.correct / day.total) * 100) : 0,
  }));

  // Calculate trend statistics
  const trendStats = {
    totalHands: trendData.reduce((sum, d) => sum + d.total, 0),
    totalCorrect: trendData.reduce((sum, d) => sum + d.correct, 0),
    avgAccuracy: (() => {
      const daysWithData = trendData.filter(d => d.total > 0);
      if (daysWithData.length === 0) return 0;
      return Math.round(daysWithData.reduce((sum, d) => sum + d.accuracy, 0) / daysWithData.length);
    })(),
    activeDays: trendData.filter(d => d.total > 0).length,
    bestDay: trendData.reduce((best, d) => d.total > best.total ? d : best, { total: 0, correct: 0, accuracy: 0, date: "" }),
  };

  // Pie chart data for drill distribution
  const pieData = (Object.keys(stats) as DrillType[])
    .map((drill) => ({
      name: DRILL_LABELS[drill].en,
      value: stats[drill].total,
    }))
    .filter((d) => d.value > 0);

  // Calculate overall stats
  const totalHands = Object.values(stats).reduce((sum, s) => sum + s.total, 0);
  const totalCorrect = Object.values(stats).reduce(
    (sum, s) => sum + s.correct + s.acceptable,
    0
  );
  const overallAccuracy = totalHands > 0 ? (totalCorrect / totalHands) * 100 : 0;

  // Calculate best streak from recent results
  let bestStreak = 0;
  let currentStreak = 0;
  for (const result of [...recentResults].reverse()) {
    if (result.is_correct || result.is_acceptable) {
      currentStreak++;
      bestStreak = Math.max(bestStreak, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  // Get weak areas
  const weakAreas: Array<{ drill: DrillType; positions: string[] }> = [];
  (Object.keys(stats) as DrillType[]).forEach((drill) => {
    const weak = getWeakPositions(drill);
    if (weak.length > 0) {
      weakAreas.push({ drill, positions: weak });
    }
  });

  // Calculate accuracy by drill type
  const drillAccuracies = (Object.keys(stats) as DrillType[]).map((drill) => {
    const s = stats[drill];
    const accuracy = s.total > 0 ? ((s.correct + s.acceptable) / s.total) * 100 : 0;
    return { drill, ...s, accuracy };
  });

  // Position accuracy matrix
  const positionMatrix: Record<string, Record<DrillType, { total: number; accuracy: number }>> = {};
  POSITIONS.forEach((pos) => {
    positionMatrix[pos] = {} as Record<DrillType, { total: number; accuracy: number }>;
    (Object.keys(stats) as DrillType[]).forEach((drill) => {
      const posStats = stats[drill].byPosition[pos];
      if (posStats) {
        const accuracy =
          posStats.total > 0
            ? ((posStats.correct + posStats.acceptable) / posStats.total) * 100
            : 0;
        positionMatrix[pos][drill] = { total: posStats.total, accuracy };
      } else {
        positionMatrix[pos][drill] = { total: 0, accuracy: 0 };
      }
    });
  });

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 80) return "text-green-500";
    if (accuracy >= 60) return "text-yellow-500";
    return "text-red-500";
  };

  const getAccuracyBgColor = (accuracy: number, total: number) => {
    if (total === 0) return "bg-muted/30";
    if (accuracy >= 80) return "bg-green-500/20";
    if (accuracy >= 60) return "bg-yellow-500/20";
    return "bg-red-500/20";
  };

  return (
    <div className="container max-w-6xl py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t("stats.title") || "Statistics"}</h1>
          <p className="text-muted-foreground">
            {t("stats.description") || "Track your progress and identify weak spots"}
          </p>
        </div>
        <div className="flex gap-2">
          <ShareCard
            stats={{
              totalHands,
              accuracy: overallAccuracy,
              bestStreak,
              weeklyHands: trendStats.totalHands,
            }}
          />
          <Button variant="outline" onClick={resetStats}>
            <RotateCcw className="mr-2 h-4 w-4" />
            {t("common.reset")}
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4 sm:p-6 text-center">
            <Activity className="h-8 w-8 mx-auto mb-2 text-primary" />
            <div className="text-2xl sm:text-3xl font-bold">{totalHands}</div>
            <div className="text-sm text-muted-foreground">
              {t("stats.totalHands") || "Total Hands"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6 text-center">
            <Target className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <div
              className={cn("text-2xl sm:text-3xl font-bold", getAccuracyColor(overallAccuracy))}
            >
              {overallAccuracy.toFixed(1)}%
            </div>
            <div className="text-sm text-muted-foreground">
              {t("stats.overallAccuracy") || "Overall Accuracy"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6 text-center">
            <Trophy className="h-8 w-8 mx-auto mb-2 text-yellow-500" />
            <div className="text-2xl sm:text-3xl font-bold">{bestStreak}</div>
            <div className="text-sm text-muted-foreground">
              {t("stats.bestStreak") || "Best Streak"}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 sm:p-6 text-center">
            <TrendingUp className="h-8 w-8 mx-auto mb-2 text-blue-500" />
            <div className="text-2xl sm:text-3xl font-bold">{totalCorrect}</div>
            <div className="text-sm text-muted-foreground">
              {t("stats.correctAnswers") || "Correct Answers"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weakness Heatmap */}
      <div className="mb-8">
        <WeaknessHeatmap stats={stats} />
      </div>

      {/* Personalized Recommendations */}
      {(() => {
        // Generate personalized recommendations based on data
        const recommendations: Array<{
          priority: "high" | "medium" | "low";
          icon: React.ReactNode;
          title: string;
          description: string;
          action: string;
          href: string;
        }> = [];

        // 1. Weak positions (< 70% accuracy with at least 5 hands)
        weakAreas.forEach(({ drill, positions }) => {
          positions.slice(0, 2).forEach((pos) => {
            const posStats = stats[drill].byPosition[pos];
            const accuracy = posStats
              ? ((posStats.correct + posStats.acceptable) / posStats.total) * 100
              : 0;
            recommendations.push({
              priority: accuracy < 50 ? "high" : "medium",
              icon: <AlertTriangle className="h-5 w-5 text-amber-500" />,
              title: `${pos} 在 ${DRILL_LABELS[drill].zh || DRILL_LABELS[drill].en} 表現偏弱`,
              description: `準確率 ${accuracy.toFixed(0)}%（${posStats?.total || 0} 手）需要加強練習`,
              action: "立即練習",
              href: `${DRILL_LABELS[drill].href}?position=${pos}`,
            });
          });
        });

        // 2. Drills with < 20 hands (need more practice volume)
        (Object.keys(stats) as DrillType[]).forEach((drill) => {
          if (stats[drill].total > 0 && stats[drill].total < 20) {
            recommendations.push({
              priority: "low",
              icon: <Zap className="h-5 w-5 text-blue-500" />,
              title: `${DRILL_LABELS[drill].zh || DRILL_LABELS[drill].en} 練習量不足`,
              description: `只有 ${stats[drill].total} 手，建議至少練習 50 手以建立穩定數據`,
              action: "增加練習",
              href: DRILL_LABELS[drill].href,
            });
          }
        });

        // 3. Suggest quiz if not attempted many questions
        const quizStats = getQuizCompletionStats();
        if (quizStats.completionRate < 50) {
          recommendations.push({
            priority: "medium",
            icon: <BookOpen className="h-5 w-5 text-purple-500" />,
            title: "完成更多考題",
            description: `題庫完成度 ${quizStats.completionRate}%，繼續作答可強化概念理解`,
            action: "前往考題",
            href: "/exam",
          });
        }

        // 4. If needs review questions exist
        if (quizStats.needsReview > 0) {
          recommendations.push({
            priority: "high",
            icon: <Flame className="h-5 w-5 text-red-500" />,
            title: `${quizStats.needsReview} 題需要複習`,
            description: "這些題目上次答錯，建議重新練習",
            action: "複習錯題",
            href: "/exam?mode=review",
          });
        }

        // 5. If no practice in last 3 days
        const recentDays = getDailyHistory(3);
        const recentTotal = recentDays.reduce((sum, d) => sum + d.total, 0);
        if (recentTotal === 0 && totalHands > 0) {
          recommendations.push({
            priority: "high",
            icon: <Activity className="h-5 w-5 text-green-500" />,
            title: "保持練習習慣！",
            description: "已經 3 天沒有練習了，每天 10-20 手可維持手感",
            action: "開始練習",
            href: "/drill/rfi",
          });
        }

        // Sort by priority
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

        // Only show top 4 recommendations
        const topRecommendations = recommendations.slice(0, 4);

        if (topRecommendations.length === 0 && totalHands > 50) {
          return (
            <Card className="mb-8 border-green-500/30 bg-green-500/5">
              <CardContent className="p-6 text-center">
                <Trophy className="h-12 w-12 mx-auto text-green-500 mb-3" />
                <h3 className="text-lg font-semibold mb-2">表現優異！</h3>
                <p className="text-muted-foreground">
                  目前沒有明顯弱點，繼續保持練習以維持水準
                </p>
              </CardContent>
            </Card>
          );
        }

        if (topRecommendations.length === 0) return null;

        return (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-amber-500" />
                {t("stats.recommendations") || "Personalized Recommendations"}
              </CardTitle>
              <CardDescription>
                {t("stats.recommendationsDesc") || "Based on your practice data, here's what to focus on"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2">
                {topRecommendations.map((rec, idx) => (
                  <Link
                    key={idx}
                    href={rec.href}
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-lg border transition-all hover:shadow-md",
                      rec.priority === "high"
                        ? "border-red-500/30 bg-red-500/5 hover:bg-red-500/10"
                        : rec.priority === "medium"
                        ? "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10"
                        : "border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10"
                    )}
                  >
                    <div className="shrink-0 mt-0.5">{rec.icon}</div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm mb-1">{rec.title}</h4>
                      <p className="text-xs text-muted-foreground mb-2">{rec.description}</p>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                        {rec.action}
                        <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Learning Curve - Full Width */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                {t("stats.learningCurve") || "Learning Curve"}
              </CardTitle>
              <CardDescription>
                {trendRange === 7
                  ? (t("stats.weeklyTrendDesc") || "Your practice activity over the last week")
                  : (t("stats.monthlyTrendDesc") || "Your practice activity over the last month")}
              </CardDescription>
            </div>
            {/* Range Toggle */}
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              <Button
                variant={trendRange === 7 ? "default" : "ghost"}
                size="sm"
                onClick={() => setTrendRange(7)}
                className="text-xs px-3"
              >
                7 {t("common.days") || "Days"}
              </Button>
              <Button
                variant={trendRange === 30 ? "default" : "ghost"}
                size="sm"
                onClick={() => setTrendRange(30)}
                className="text-xs px-3"
              >
                30 {t("common.days") || "Days"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Period Summary */}
          {trendStats.totalHands > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <div className="text-xl font-bold">{trendStats.totalHands}</div>
                <div className="text-xs text-muted-foreground">{t("stats.totalHands") || "Total Hands"}</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-green-500">{trendStats.avgAccuracy}%</div>
                <div className="text-xs text-muted-foreground">{t("stats.avgAccuracy") || "Avg Accuracy"}</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold">{trendStats.activeDays}</div>
                <div className="text-xs text-muted-foreground">{t("stats.activeDays") || "Active Days"}</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-primary">{trendStats.bestDay.total}</div>
                <div className="text-xs text-muted-foreground">{t("stats.bestDay") || "Best Day"}</div>
              </div>
            </div>
          )}

          {/* Chart */}
          {trendData.some((d) => d.total > 0) ? (
            <div className={cn("w-full", trendRange === 30 ? "h-[250px]" : "h-[200px]")}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorCorrect" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    className="text-muted-foreground"
                    interval={trendRange === 30 ? 4 : 0}
                  />
                  <YAxis
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="total"
                    name={t("stats.totalHands") || "Total"}
                    stroke="#3b82f6"
                    fillOpacity={1}
                    fill="url(#colorTotal)"
                  />
                  <Area
                    type="monotone"
                    dataKey="correct"
                    name={t("stats.correctAnswers") || "Correct"}
                    stroke="#22c55e"
                    fillOpacity={1}
                    fill="url(#colorCorrect)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
              {t("stats.noDataYet") || "No data yet. Start practicing!"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="mb-8 grid gap-6 md:grid-cols-2">
        {/* Drill Distribution Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5" />
              {t("stats.drillDistribution") || "Practice Distribution"}
            </CardTitle>
            <CardDescription>
              {t("stats.drillDistributionDesc") || "Breakdown by drill type"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={70}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                      labelLine={false}
                    >
                      {pieData.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                {t("stats.noDataYet") || "No data yet. Start practicing!"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Exam Progress Section */}
      {(() => {
        const quizStats = getQuizCompletionStats();
        return (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                {t("stats.examProgress") || "Exam Progress"}
              </CardTitle>
              <CardDescription>
                {t("stats.examProgressDesc") || "Your question bank mastery status"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{quizStats.total}</div>
                  <div className="text-xs text-muted-foreground">{t("stats.totalQuestions") || "Total Questions"}</div>
                </div>
                <div className="text-center p-4 bg-blue-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-blue-500">{quizStats.attempted}</div>
                  <div className="text-xs text-muted-foreground">{t("stats.attempted") || "Attempted"}</div>
                </div>
                <div className="text-center p-4 bg-green-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-green-500">{quizStats.mastered}</div>
                  <div className="text-xs text-muted-foreground">{t("stats.mastered") || "Mastered"}</div>
                </div>
                <div className="text-center p-4 bg-amber-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-amber-500">{quizStats.needsReview}</div>
                  <div className="text-xs text-muted-foreground">{t("stats.needsReview") || "Needs Review"}</div>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t("stats.completionRate") || "Completion Rate"}</span>
                  <span className="font-medium">{quizStats.completionRate}%</span>
                </div>
                <Progress value={quizStats.completionRate} className="h-2" />
              </div>
              <div className="mt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{t("stats.masteryRate") || "Mastery Rate"}</span>
                  <span className="font-medium text-green-500">{quizStats.masteryRate}%</span>
                </div>
                <Progress value={quizStats.masteryRate} className="h-2 [&>div]:bg-green-500" />
              </div>
              <Link href="/exam">
                <Button className="w-full mt-4">
                  <Award className="mr-2 h-4 w-4" />
                  {t("stats.takeExam") || "Take Exam"}
                </Button>
              </Link>
            </CardContent>
          </Card>
        );
      })()}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Drill Type Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              {t("stats.byDrillType") || "By Drill Type"}
            </CardTitle>
            <CardDescription>
              {t("stats.byDrillTypeDesc") || "Accuracy breakdown by drill type"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {drillAccuracies.map(({ drill, total, accuracy }) => (
                <div key={drill} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Link href={DRILL_LABELS[drill].href}>
                      <span className="font-medium hover:text-primary hover:underline">
                        {DRILL_LABELS[drill].en}
                      </span>
                    </Link>
                    <span className="text-sm text-muted-foreground">
                      {total} {t("stats.hands") || "hands"}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={cn(
                        "h-full transition-all duration-300",
                        accuracy >= 80
                          ? "bg-green-500"
                          : accuracy >= 60
                          ? "bg-yellow-500"
                          : accuracy > 0
                          ? "bg-red-500"
                          : "bg-muted"
                      )}
                      style={{ width: `${Math.max(accuracy, 0)}%` }}
                    />
                  </div>
                  <div className="flex justify-end">
                    <span className={cn("text-sm font-medium", getAccuracyColor(accuracy))}>
                      {total > 0 ? `${accuracy.toFixed(1)}%` : "-"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Weak Spots */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              {t("stats.weakSpots") || "Weak Spots"}
            </CardTitle>
            <CardDescription>
              {t("stats.weakSpotsDesc") || "Areas that need more practice (< 70% accuracy)"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {weakAreas.length > 0 ? (
              <div className="space-y-4">
                {weakAreas.map(({ drill, positions }) => (
                  <div key={drill} className="flex items-start gap-3">
                    <Badge variant="outline" className="mt-0.5">
                      {DRILL_LABELS[drill].en}
                    </Badge>
                    <div className="flex flex-wrap gap-2">
                      {positions.map((pos) => (
                        <Badge key={pos} variant="destructive">
                          {pos}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : totalHands > 0 ? (
              <div className="text-center py-8">
                <Trophy className="h-12 w-12 mx-auto text-green-500 mb-2" />
                <p className="text-muted-foreground">
                  {t("stats.noWeakSpots") || "Great job! No weak spots detected."}
                </p>
              </div>
            ) : (
              <div className="text-center py-8">
                <Activity className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">
                  {t("stats.startPracticing") || "Start practicing to see your weak spots"}
                </p>
                <Link href="/drill/rfi">
                  <Button className="mt-4">{t("drill.startDrill")}</Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Position Accuracy Matrix */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {t("stats.positionMatrix") || "Position Accuracy Matrix"}
          </CardTitle>
          <CardDescription>
            {t("stats.positionMatrixDesc") ||
              "Accuracy by position and drill type. Click to focus on weak areas."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-2 font-medium">{t("drill.position")}</th>
                  {(Object.keys(stats) as DrillType[]).map((drill) => (
                    <th key={drill} className="text-center p-2 font-medium">
                      {DRILL_LABELS[drill].en}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {POSITIONS.map((pos) => (
                  <tr key={pos} className="border-t">
                    <td className="p-2 font-medium">{pos}</td>
                    {(Object.keys(stats) as DrillType[]).map((drill) => {
                      const data = positionMatrix[pos][drill];
                      return (
                        <td key={drill} className="p-2 text-center">
                          <div
                            className={cn(
                              "inline-block px-3 py-1 rounded-md min-w-[60px]",
                              getAccuracyBgColor(data.accuracy, data.total)
                            )}
                          >
                            {data.total > 0 ? (
                              <span className={getAccuracyColor(data.accuracy)}>
                                {data.accuracy.toFixed(0)}%
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            {t("stats.recentActivity") || "Recent Activity"}
          </CardTitle>
          <CardDescription>
            {t("stats.recentActivityDesc") || "Your last 20 practice hands"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentResults.length > 0 ? (
            <div className="space-y-2">
              {recentResults.slice(0, 20).map((result, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex items-center justify-between p-2 rounded-lg",
                    result.is_correct
                      ? "bg-green-500/10"
                      : result.is_acceptable
                      ? "bg-yellow-500/10"
                      : "bg-red-500/10"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold">{result.hand}</span>
                    <Badge variant="outline" className="text-xs">
                      {result.hero_position}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      {DRILL_LABELS[result.drill_type as DrillType]?.en || result.drill_type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {result.player_action} → {result.correct_action}
                    </span>
                    {result.is_correct ? (
                      <Badge className="bg-green-500">OK</Badge>
                    ) : result.is_acceptable ? (
                      <Badge className="bg-yellow-500">OK</Badge>
                    ) : (
                      <Badge variant="destructive">X</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {t("stats.noRecentActivity") || "No recent activity. Start practicing!"}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Info */}
      {lastSyncedAt && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t("stats.lastSynced") || "Last synced"}:{" "}
          {new Date(lastSyncedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
