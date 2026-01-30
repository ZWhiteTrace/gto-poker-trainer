"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Trophy,
  Lock,
  Star,
  Target,
  Flame,
  Award,
  Sparkles,
  RefreshCcw,
} from "lucide-react";
import {
  getAllAchievements,
  getUserAchievements,
  getUserLeaderboardStats,
  checkAchievements,
  type Achievement,
  type AchievementSummary,
  type LeaderboardStats,
} from "@/lib/supabase/leaderboard";
import { useAuthStore } from "@/stores/authStore";
import Link from "next/link";

const TIER_COLORS = {
  bronze: "border-amber-700 bg-amber-700/10 text-amber-700",
  silver: "border-gray-400 bg-gray-400/10 text-gray-400",
  gold: "border-yellow-500 bg-yellow-500/10 text-yellow-500",
  platinum: "border-cyan-400 bg-cyan-400/10 text-cyan-400",
};

const TIER_LABELS = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
};

const CATEGORY_ICONS = {
  milestone: <Target className="h-5 w-5" />,
  streak: <Flame className="h-5 w-5" />,
  accuracy: <Star className="h-5 w-5" />,
  special: <Sparkles className="h-5 w-5" />,
};

const CATEGORY_LABELS = {
  milestone: "Milestones",
  streak: "Streaks",
  accuracy: "Accuracy",
  special: "Special",
};

function AchievementCard({
  achievement,
  isUnlocked,
  userStats,
  locale,
}: {
  achievement: Achievement;
  isUnlocked: boolean;
  userStats: LeaderboardStats | null;
  locale: string;
}) {
  const name = locale === "zh-TW" ? achievement.name_zh : achievement.name;
  const description = locale === "zh-TW" ? achievement.description_zh : achievement.description;

  // Calculate progress
  let progress = 0;
  let progressText = "";
  if (userStats && !isUnlocked) {
    const req = achievement.requirement as { type: string; value: number; min_hands?: number };
    switch (req.type) {
      case "hands":
        progress = Math.min((userStats.total_hands / req.value) * 100, 100);
        progressText = `${userStats.total_hands} / ${req.value}`;
        break;
      case "streak":
        progress = Math.min((userStats.best_streak / req.value) * 100, 100);
        progressText = `${userStats.best_streak} / ${req.value}`;
        break;
      case "accuracy":
        const accuracy = userStats.total_hands > 0
          ? (userStats.correct_hands / userStats.total_hands) * 100
          : 0;
        progress = Math.min((accuracy / req.value) * 100, 100);
        progressText = `${accuracy.toFixed(1)}% / ${req.value}%`;
        break;
    }
  }

  return (
    <div
      className={cn(
        "relative p-4 rounded-lg border-2 transition-all",
        isUnlocked
          ? TIER_COLORS[achievement.tier]
          : "border-muted bg-muted/30 opacity-60"
      )}
    >
      {/* Lock overlay for locked achievements */}
      {!isUnlocked && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-lg">
          <Lock className="h-8 w-8 text-muted-foreground/50" />
        </div>
      )}

      <div className="flex items-start gap-3">
        <div className="text-3xl">{achievement.icon}</div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{name}</h3>
            <Badge
              variant="outline"
              className={cn("text-xs", isUnlocked && TIER_COLORS[achievement.tier])}
            >
              {TIER_LABELS[achievement.tier]}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{description}</p>

          {/* Progress bar for locked achievements */}
          {!isUnlocked && userStats && progress > 0 && (
            <div className="mt-2">
              <div className="flex justify-between text-xs text-muted-foreground mb-1">
                <span>Progress</span>
                <span>{progressText}</span>
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          )}

          {/* Points */}
          <div className="mt-2 flex items-center gap-1 text-sm">
            <Award className="h-4 w-4 text-yellow-500" />
            <span className="font-medium">{achievement.points} pts</span>
          </div>
        </div>
      </div>

      {/* Unlocked timestamp */}
      {isUnlocked && achievement.unlocked_at && (
        <div className="absolute top-2 right-2">
          <Badge variant="secondary" className="text-xs">
            {new Date(achievement.unlocked_at).toLocaleDateString()}
          </Badge>
        </div>
      )}
    </div>
  );
}

export default function AchievementsPage() {
  const t = useTranslations();
  const { user } = useAuthStore();
  const [allAchievements, setAllAchievements] = useState<Achievement[]>([]);
  const [userSummary, setUserSummary] = useState<AchievementSummary | null>(null);
  const [userStats, setUserStats] = useState<LeaderboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isChecking, setIsChecking] = useState(false);
  const [locale, setLocale] = useState("en");

  useEffect(() => {
    // Get locale from html lang attribute
    const htmlLang = document.documentElement.lang;
    setLocale(htmlLang || "en");
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const achievements = await getAllAchievements();
      setAllAchievements(achievements);

      if (user?.id) {
        const [summary, stats] = await Promise.all([
          getUserAchievements(user.id),
          getUserLeaderboardStats(user.id),
        ]);
        setUserSummary(summary);
        setUserStats(stats);
      }
    } catch (error) {
      console.error("Failed to fetch achievements:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user?.id]);

  const handleCheckAchievements = async () => {
    if (!user?.id || isChecking) return;
    setIsChecking(true);
    try {
      const newAchievements = await checkAchievements(user.id);
      if (newAchievements.length > 0) {
        // Refresh the data to show newly unlocked achievements
        await fetchData();
      }
    } catch (error) {
      console.error("Failed to check achievements:", error);
    } finally {
      setIsChecking(false);
    }
  };

  // Group achievements by category
  const groupedAchievements = allAchievements.reduce((acc, achievement) => {
    const category = achievement.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(achievement);
    return acc;
  }, {} as Record<string, Achievement[]>);

  const unlockedIds = new Set(userSummary?.achievements.map((a) => a.id) || []);
  const totalAchievements = allAchievements.length;
  const unlockedCount = userSummary?.total_achievements || 0;
  const totalPoints = userSummary?.total_points || 0;
  const completionPercent = totalAchievements > 0 ? (unlockedCount / totalAchievements) * 100 : 0;

  if (!user) {
    return (
      <div className="container max-w-4xl py-8">
        <Card className="text-center py-12">
          <CardContent>
            <Trophy className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {t("achievements.loginRequired") || "Login Required"}
            </h2>
            <p className="text-muted-foreground mb-4">
              {t("achievements.loginRequiredDesc") || "Sign in to track your achievements"}
            </p>
            <Button asChild>
              <Link href="/login">{t("common.login") || "Login"}</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold flex items-center justify-center gap-2">
          <Trophy className="h-8 w-8 text-yellow-500" />
          {t("achievements.title") || "Achievements"}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("achievements.description") || "Unlock achievements as you progress"}
        </p>
      </div>

      {/* Summary Card */}
      <Card className="mb-8 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border-yellow-500/20">
        <CardContent className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="grid grid-cols-3 gap-4 text-center flex-1">
              <div>
                <div className="text-3xl font-bold text-yellow-500">{unlockedCount}</div>
                <div className="text-sm text-muted-foreground">
                  {t("achievements.unlocked") || "Unlocked"}
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold text-primary">{totalPoints}</div>
                <div className="text-sm text-muted-foreground">
                  {t("achievements.totalPoints") || "Total Points"}
                </div>
              </div>
              <div>
                <div className="text-3xl font-bold">{totalAchievements}</div>
                <div className="text-sm text-muted-foreground">
                  {t("achievements.total") || "Total"}
                </div>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCheckAchievements}
              disabled={isChecking}
              className="ml-4"
            >
              <RefreshCcw className={cn("h-4 w-4 mr-2", isChecking && "animate-spin")} />
              {isChecking
                ? (locale === "zh-TW" ? "檢查中..." : "Checking...")
                : (locale === "zh-TW" ? "檢查成就" : "Check Achievements")}
            </Button>
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span>{t("achievements.completion") || "Completion"}</span>
              <span>{completionPercent.toFixed(0)}%</span>
            </div>
            <Progress value={completionPercent} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Achievement Categories */}
      {isLoading ? (
        <div className="space-y-6">
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <Skeleton className="h-8 w-32 mb-4" />
              <div className="grid gap-4 sm:grid-cols-2">
                {[...Array(4)].map((_, j) => (
                  <Skeleton key={j} className="h-32" />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedAchievements).map(([category, achievements]) => (
            <div key={category}>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                {CATEGORY_ICONS[category as keyof typeof CATEGORY_ICONS]}
                {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] || category}
                <Badge variant="secondary">
                  {achievements.filter((a) => unlockedIds.has(a.id)).length} / {achievements.length}
                </Badge>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {achievements
                  .sort((a, b) => {
                    // Sort: unlocked first, then by points
                    const aUnlocked = unlockedIds.has(a.id);
                    const bUnlocked = unlockedIds.has(b.id);
                    if (aUnlocked !== bUnlocked) return bUnlocked ? 1 : -1;
                    return a.points - b.points;
                  })
                  .map((achievement) => (
                    <AchievementCard
                      key={achievement.id}
                      achievement={{
                        ...achievement,
                        unlocked_at: userSummary?.achievements.find(
                          (a) => a.id === achievement.id
                        )?.unlocked_at,
                      }}
                      isUnlocked={unlockedIds.has(achievement.id)}
                      userStats={userStats}
                      locale={locale}
                    />
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Call to Action */}
      {!isLoading && unlockedCount < totalAchievements && (
        <Card className="mt-8 text-center">
          <CardContent className="py-8">
            <p className="text-muted-foreground mb-4">
              {t("achievements.keepPracticing") ||
                "Keep practicing to unlock more achievements!"}
            </p>
            <Button asChild>
              <Link href="/drill/rfi">{t("drill.startDrill") || "Start Practicing"}</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
