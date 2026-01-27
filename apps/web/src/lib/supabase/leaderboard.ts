import { createClient } from "./client";

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
    console.error("Error fetching leaderboard:", error);
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
    let newStreak = isCorrect ? existing.current_streak + 1 : 0;
    let newBestStreak = Math.max(existing.best_streak, newStreak);

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
      console.error("Error updating leaderboard stats:", error);
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
      console.error("Error creating leaderboard stats:", error);
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
    console.error("Error updating profile:", error);
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
    console.error("Error fetching achievements:", error);
    return [];
  }

  return data || [];
}

// Get user's achievements
export async function getUserAchievements(userId: string): Promise<AchievementSummary> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("get_user_achievements_summary", {
    p_user_id: userId,
  });

  if (error || !data || data.length === 0) {
    return { total_achievements: 0, total_points: 0, achievements: [] };
  }

  return data[0];
}

// Check and award new achievements
export async function checkAchievements(userId: string): Promise<Achievement[]> {
  const supabase = createClient();

  const { data, error } = await supabase.rpc("check_achievements", {
    p_user_id: userId,
  });

  if (error) {
    console.error("Error checking achievements:", error);
    return [];
  }

  return data || [];
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
