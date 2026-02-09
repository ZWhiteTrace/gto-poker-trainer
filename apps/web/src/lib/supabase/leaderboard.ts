import { createClient } from "./client";
import { createModuleLogger } from "@/lib/errors";

const log = createModuleLogger("Leaderboard");

export type LeaderboardType = "total" | "weekly" | "monthly" | "streak" | "accuracy";

export interface LeaderboardEntry {
  rank: number;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_hands: number;
  correct_hands: number;
  accuracy: number;
  best_streak: number;
  weekly_hands: number;
  monthly_hands: number;
}

export interface UserProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  is_public: boolean;
}

export interface LeaderboardStats {
  total_hands: number;
  correct_hands: number;
  current_streak: number;
  best_streak: number;
  weekly_hands: number;
  monthly_hands: number;
}

// Get leaderboard data
export async function getLeaderboard(
  type: LeaderboardType = "total",
  limit: number = 50
): Promise<LeaderboardEntry[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_leaderboard", {
    p_type: type,
    p_limit: limit,
  });

  if (error) {
    log.error("Error fetching leaderboard:", error);
    return [];
  }

  return data || [];
}

// Get user's rank
export async function getUserRank(
  userId: string,
  type: LeaderboardType = "total"
): Promise<number | null> {
  const supabase = createClient();

  // Get all ranked users and find position
  const { data, error } = await supabase.rpc("get_leaderboard", {
    p_type: type,
    p_limit: 1000,
  });

  if (error || !data) return null;

  const userEntry = data.find((entry: LeaderboardEntry) => entry.user_id === userId);
  return userEntry?.rank || null;
}

// Update user's leaderboard stats
export async function updateLeaderboardStats(
  userId: string,
  isCorrect: boolean
): Promise<{ newAchievements: Achievement[] } | null> {
  const supabase = createClient();

  // First, get or create stats
  const { data: existing } = await supabase
    .from("leaderboard_stats")
    .select("*")
    .eq("user_id", userId)
    .single();

  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);

  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  if (existing) {
    // Check if we need to reset weekly/monthly
    const existingWeekStart = new Date(existing.week_start_at);
    const existingMonthStart = new Date(existing.month_start_at);

    const resetWeekly = existingWeekStart < weekStart;
    const resetMonthly = existingMonthStart < monthStart;

    // Calculate new streak
    const newStreak = isCorrect ? existing.current_streak + 1 : 0;
    const newBestStreak = Math.max(existing.best_streak, newStreak);

    const { error } = await supabase
      .from("leaderboard_stats")
      .update({
        total_hands: existing.total_hands + 1,
        correct_hands: existing.correct_hands + (isCorrect ? 1 : 0),
        current_streak: newStreak,
        best_streak: newBestStreak,
        weekly_hands: resetWeekly ? 1 : existing.weekly_hands + 1,
        weekly_correct: resetWeekly
          ? (isCorrect ? 1 : 0)
          : existing.weekly_correct + (isCorrect ? 1 : 0),
        monthly_hands: resetMonthly ? 1 : existing.monthly_hands + 1,
        monthly_correct: resetMonthly
          ? (isCorrect ? 1 : 0)
          : existing.monthly_correct + (isCorrect ? 1 : 0),
        week_start_at: resetWeekly ? weekStart.toISOString() : existing.week_start_at,
        month_start_at: resetMonthly ? monthStart.toISOString() : existing.month_start_at,
        last_activity_at: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .eq("user_id", userId);

    if (error) {
      log.error("Error updating leaderboard stats:", error);
      return null;
    }
  } else {
    // Create new stats
    const { error } = await supabase.from("leaderboard_stats").insert({
      user_id: userId,
      total_hands: 1,
      correct_hands: isCorrect ? 1 : 0,
      current_streak: isCorrect ? 1 : 0,
      best_streak: isCorrect ? 1 : 0,
      weekly_hands: 1,
      weekly_correct: isCorrect ? 1 : 0,
      monthly_hands: 1,
      monthly_correct: isCorrect ? 1 : 0,
      week_start_at: weekStart.toISOString(),
      month_start_at: monthStart.toISOString(),
    });

    if (error) {
      log.error("Error creating leaderboard stats:", error);
      return null;
    }
  }

  // Check for new achievements
  const newAchievements = await checkAchievements(userId);
  return { newAchievements };
}

// User profile functions
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    return null;
  }

  return data;
}

export async function updateUserProfile(
  userId: string,
  profile: Partial<UserProfile>
): Promise<boolean> {
  const supabase = createClient();

  const { error } = await supabase
    .from("user_profiles")
    .upsert({
      id: userId,
      ...profile,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    log.error("Error updating profile:", error);
    return false;
  }

  return true;
}

// Achievement types
export interface Achievement {
  id: string;
  name: string;
  name_zh: string;
  description: string;
  description_zh: string;
  icon: string;
  category: string;
  points: number;
  tier: "bronze" | "silver" | "gold" | "platinum";
  requirement?: { type: string; value: number; min_hands?: number };
  unlocked_at?: string;
}

export interface AchievementSummary {
  total_achievements: number;
  total_points: number;
  achievements: Achievement[];
}

// Get all achievements
export async function getAllAchievements(): Promise<Achievement[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("achievements")
    .select("*")
    .order("category", { ascending: true })
    .order("points", { ascending: true });

  if (error) {
    log.error("Error fetching achievements:", error);
    return [];
  }

  return data || [];
}

// Get user's achievements (client-side implementation)
export async function getUserAchievements(userId: string): Promise<AchievementSummary> {
  const supabase = createClient();

  try {
    // Get user's unlocked achievements with full achievement data
    const { data: userAchievements, error: uaError } = await supabase
      .from("user_achievements")
      .select(`
        achievement_id,
        unlocked_at,
        achievements (*)
      `)
      .eq("user_id", userId);

    if (uaError) {
      log.error("Error fetching user achievements:", uaError);
      return { total_achievements: 0, total_points: 0, achievements: [] };
    }

    if (!userAchievements || userAchievements.length === 0) {
      return { total_achievements: 0, total_points: 0, achievements: [] };
    }

    // Map to Achievement type with unlocked_at
    const achievements: Achievement[] = userAchievements
      .filter((ua) => ua.achievements)
      .map((ua) => ({
        ...(ua.achievements as unknown as Achievement),
        unlocked_at: ua.unlocked_at,
      }));

    const totalPoints = achievements.reduce((sum, a) => sum + (a.points || 0), 0);

    return {
      total_achievements: achievements.length,
      total_points: totalPoints,
      achievements,
    };
  } catch (error) {
    log.error("Error in getUserAchievements:", error);
    return { total_achievements: 0, total_points: 0, achievements: [] };
  }
}

// Check and award new achievements (client-side implementation)
export async function checkAchievements(userId: string): Promise<Achievement[]> {
  const supabase = createClient();
  const newlyUnlocked: Achievement[] = [];

  try {
    // 1. Get user's current stats (extended fields)
    const { data: stats, error: statsError } = await supabase
      .from("leaderboard_stats")
      .select("total_hands, correct_hands, current_streak, best_streak, weekly_hands, monthly_hands")
      .eq("user_id", userId)
      .single();

    if (statsError || !stats) {
      log.error("Error fetching stats for achievement check:", statsError);
      return [];
    }

    // 2. Get all achievements
    const { data: allAchievements, error: achievementsError } = await supabase
      .from("achievements")
      .select("*");

    if (achievementsError || !allAchievements) {
      log.error("Error fetching achievements:", achievementsError);
      return [];
    }

    // 3. Get user's already unlocked achievements
    const { data: unlockedData, error: unlockedError } = await supabase
      .from("user_achievements")
      .select("achievement_id")
      .eq("user_id", userId);

    if (unlockedError) {
      log.error("Error fetching unlocked achievements:", unlockedError);
      return [];
    }

    const unlockedIds = new Set((unlockedData || []).map((ua) => ua.achievement_id));

    // 4. Check each achievement
    const accuracy = stats.total_hands > 0
      ? (stats.correct_hands / stats.total_hands) * 100
      : 0;

    for (const achievement of allAchievements) {
      // Skip if already unlocked
      if (unlockedIds.has(achievement.id)) continue;

      const req = achievement.requirement as { type: string; value: number; min_hands?: number };
      if (!req || !req.type) continue;

      let isUnlocked = false;

      switch (req.type) {
        case "hands":
          isUnlocked = stats.total_hands >= req.value;
          break;
        case "streak":
          isUnlocked = stats.best_streak >= req.value;
          break;
        case "accuracy":
          // Accuracy achievements need minimum hands
          const minHands = req.min_hands || 50;
          isUnlocked = stats.total_hands >= minHands && accuracy >= req.value;
          break;
        case "weekly_hands":
          isUnlocked = (stats.weekly_hands || 0) >= req.value;
          break;
        case "daily_hands":
          // This would need daily tracking - for now, check if weekly >= value
          // (approximation: if weekly hands >= value, they had at least one good day)
          isUnlocked = (stats.weekly_hands || 0) >= req.value;
          break;
        // Note: accuracy_improvement and all_positions require more complex tracking
        // These are future implementations that need additional data structures
      }

      if (isUnlocked) {
        // Award the achievement
        const { error: insertError } = await supabase
          .from("user_achievements")
          .insert({
            user_id: userId,
            achievement_id: achievement.id,
            unlocked_at: new Date().toISOString(),
          });

        if (!insertError) {
          newlyUnlocked.push({
            ...achievement,
            unlocked_at: new Date().toISOString(),
          });
        } else {
          log.error("Error inserting achievement:", insertError);
        }
      }
    }
  } catch (error) {
    log.error("Error checking achievements:", error);
    return [];
  }

  return newlyUnlocked;
}

// Get user's leaderboard stats
export async function getUserLeaderboardStats(userId: string): Promise<LeaderboardStats | null> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from("leaderboard_stats")
    .select("total_hands, correct_hands, current_streak, best_streak, weekly_hands, monthly_hands")
    .eq("user_id", userId)
    .single();

  if (error) {
    return null;
  }

  return data;
}
