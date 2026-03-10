"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Trophy,
  Target,
  Flame,
  TrendingUp,
  Calendar,
  Crown,
  Medal,
  Award,
  User,
} from "lucide-react";
import {
  getLeaderboard,
  getUserRank,
  type LeaderboardEntry,
  type LeaderboardType,
} from "@/lib/supabase/leaderboard";
import { useAuthStore } from "@/stores/authStore";

const LEADERBOARD_TABS: {
  value: LeaderboardType;
  label: string;
  labelZh: string;
  icon: React.ReactNode;
}[] = [
  { value: "total", label: "All Time", labelZh: "總榜", icon: <Trophy className="h-4 w-4" /> },
  { value: "weekly", label: "Weekly", labelZh: "週榜", icon: <Calendar className="h-4 w-4" /> },
  { value: "monthly", label: "Monthly", labelZh: "月榜", icon: <TrendingUp className="h-4 w-4" /> },
  { value: "streak", label: "Streak", labelZh: "連勝", icon: <Flame className="h-4 w-4" /> },
  { value: "accuracy", label: "Accuracy", labelZh: "準確率", icon: <Target className="h-4 w-4" /> },
];

function getRankIcon(rank: number) {
  if (rank === 1) return <Crown className="h-5 w-5 text-yellow-500" />;
  if (rank === 2) return <Medal className="h-5 w-5 text-gray-400" />;
  if (rank === 3) return <Award className="h-5 w-5 text-amber-600" />;
  return <span className="text-muted-foreground w-5 text-center font-mono">{rank}</span>;
}

function getRankBgColor(rank: number) {
  if (rank === 1) return "bg-yellow-500/10 border-yellow-500/30";
  if (rank === 2) return "bg-gray-400/10 border-gray-400/30";
  if (rank === 3) return "bg-amber-600/10 border-amber-600/30";
  return "bg-card";
}

export default function LeaderboardPage() {
  const t = useTranslations();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<LeaderboardType>("total");
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const data = await getLeaderboard(activeTab, 50);
        setLeaderboard(data);

        if (user?.id) {
          const rank = await getUserRank(user.id, activeTab);
          setUserRank(rank);
        }
      } catch (error) {
        console.error("Failed to fetch leaderboard:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [activeTab, user?.id]);

  const getDisplayValue = (entry: LeaderboardEntry) => {
    switch (activeTab) {
      case "weekly":
        return `${entry.weekly_hands} hands`;
      case "monthly":
        return `${entry.monthly_hands} hands`;
      case "streak":
        return `${entry.best_streak} streak`;
      case "accuracy":
        return `${entry.accuracy}%`;
      default:
        return `${entry.total_hands} hands`;
    }
  };

  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="mb-8 text-center">
        <h1 className="flex items-center justify-center gap-2 text-3xl font-bold">
          <Trophy className="h-8 w-8 text-yellow-500" />
          {t("leaderboard.title") || "Leaderboard"}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("leaderboard.description") || "See how you rank against other players"}
        </p>
      </div>

      {/* User's Current Rank */}
      {user && userRank && (
        <Card className="bg-primary/5 border-primary/20 mb-6">
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/20 flex h-10 w-10 items-center justify-center rounded-full">
                <User className="text-primary h-5 w-5" />
              </div>
              <div>
                <p className="font-medium">{t("leaderboard.yourRank") || "Your Rank"}</p>
                <p className="text-muted-foreground text-sm">
                  {LEADERBOARD_TABS.find((tab) => tab.value === activeTab)?.label}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-primary text-3xl font-bold">#{userRank}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as LeaderboardType)}>
        <TabsList className="mb-6 grid w-full grid-cols-5">
          {LEADERBOARD_TABS.map((tab) => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="flex items-center gap-1 text-xs sm:text-sm"
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {LEADERBOARD_TABS.map((tab) => (
          <TabsContent key={tab.value} value={tab.value}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {tab.icon}
                  {tab.label} {t("leaderboard.rankings") || "Rankings"}
                </CardTitle>
                <CardDescription>
                  {tab.value === "total" &&
                    (t("leaderboard.totalDesc") || "Top players by total hands practiced")}
                  {tab.value === "weekly" &&
                    (t("leaderboard.weeklyDesc") || "This week's most active players")}
                  {tab.value === "monthly" &&
                    (t("leaderboard.monthlyDesc") || "This month's most active players")}
                  {tab.value === "streak" &&
                    (t("leaderboard.streakDesc") || "Players with the longest winning streaks")}
                  {tab.value === "accuracy" &&
                    (t("leaderboard.accuracyDesc") || "Highest accuracy (min 100 hands)")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[...Array(10)].map((_, i) => (
                      <Skeleton key={i} className="h-14 w-full" />
                    ))}
                  </div>
                ) : leaderboard.length > 0 ? (
                  <div className="space-y-2">
                    {leaderboard.map((entry) => (
                      <div
                        key={entry.user_id}
                        className={cn(
                          "flex items-center justify-between rounded-lg border p-3 transition-colors",
                          getRankBgColor(entry.rank),
                          user?.id === entry.user_id && "ring-primary ring-2"
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex w-8 justify-center">{getRankIcon(entry.rank)}</div>
                          <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
                            {entry.avatar_url ? (
                              <img
                                src={entry.avatar_url}
                                alt={entry.display_name}
                                className="h-10 w-10 rounded-full object-cover"
                              />
                            ) : (
                              <User className="text-muted-foreground h-5 w-5" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">
                              {entry.display_name}
                              {user?.id === entry.user_id && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  You
                                </Badge>
                              )}
                            </p>
                            <div className="text-muted-foreground flex items-center gap-2 text-sm">
                              <span>{entry.total_hands} total</span>
                              <span>•</span>
                              <span>{entry.accuracy}% accuracy</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">{getDisplayValue(entry)}</p>
                          {activeTab !== "streak" && (
                            <p className="text-muted-foreground text-xs">
                              <Flame className="mr-1 inline h-3 w-3" />
                              {entry.best_streak} best
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center">
                    <Trophy className="text-muted-foreground/50 mx-auto mb-4 h-12 w-12" />
                    <p className="text-muted-foreground">
                      {t("leaderboard.noData") || "No rankings yet. Be the first!"}
                    </p>
                    <Button className="mt-4" asChild>
                      <a href="/drill/rfi">{t("drill.startDrill") || "Start Practicing"}</a>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Info */}
      <div className="text-muted-foreground mt-6 text-center text-sm">
        <p>
          {t("leaderboard.minRequirement") || "Minimum 10 hands required to appear on leaderboard"}
        </p>
        <p className="mt-1">{t("leaderboard.updateFrequency") || "Rankings update in real-time"}</p>
      </div>
    </div>
  );
}
