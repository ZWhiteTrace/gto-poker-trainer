import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createClient } from "@/lib/supabase/client";

type DrillType = "rfi" | "vs_rfi" | "vs_3bet" | "vs_4bet";
type QuizType = "equity" | "outs" | "ev" | "logic" | "exploit";

interface DrillResult {
  id?: string;
  drill_type: DrillType;
  hand: string;
  hero_position: string;
  villain_position?: string;
  player_action: string;
  correct_action: string;
  is_correct: boolean;
  is_acceptable: boolean;
  frequency: number;
  created_at?: string;
}

interface PositionStats {
  total: number;
  correct: number;
  acceptable: number;
}

interface DrillStats {
  total: number;
  correct: number;
  acceptable: number;
  byPosition: Record<string, PositionStats>;
  lastPracticed?: string;
}

interface QuizStats {
  total: number;
  correct: number;
  byCategory: Record<string, { total: number; correct: number }>;
  lastPracticed?: string;
}

interface ProgressState {
  // Stats by drill type
  stats: Record<DrillType, DrillStats>;

  // Quiz stats by quiz type
  quizStats: Record<QuizType, QuizStats>;

  // Recent results (local cache)
  recentResults: DrillResult[];

  // Sync status
  isSyncing: boolean;
  lastSyncedAt: string | null;

  // Actions
  recordResult: (result: DrillResult, userId?: string) => Promise<void>;
  recordQuizResult: (
    quizType: QuizType,
    category: string,
    isCorrect: boolean,
    userId?: string
  ) => Promise<void>;
  syncToCloud: (userId: string) => Promise<void>;
  loadFromCloud: (userId: string) => Promise<void>;
  getWeakPositions: (drillType: DrillType) => string[];
  resetStats: () => void;
}

const initialStats: DrillStats = {
  total: 0,
  correct: 0,
  acceptable: 0,
  byPosition: {},
};

const initialQuizStats: QuizStats = {
  total: 0,
  correct: 0,
  byCategory: {},
};

const initialState = {
  stats: {
    rfi: { ...initialStats },
    vs_rfi: { ...initialStats },
    vs_3bet: { ...initialStats },
    vs_4bet: { ...initialStats },
  },
  quizStats: {
    equity: { ...initialQuizStats },
    outs: { ...initialQuizStats },
    ev: { ...initialQuizStats },
    logic: { ...initialQuizStats },
    exploit: { ...initialQuizStats },
  },
  recentResults: [],
  isSyncing: false,
  lastSyncedAt: null,
};

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...initialState,

      recordResult: async (result: DrillResult, userId?: string) => {
        const { stats, recentResults } = get();
        const drillStats = stats[result.drill_type];

        // Update local stats
        const newStats = { ...drillStats };
        newStats.total += 1;
        if (result.is_correct) newStats.correct += 1;
        else if (result.is_acceptable) newStats.acceptable += 1;
        newStats.lastPracticed = new Date().toISOString();

        // Update position stats
        const posKey = result.hero_position;
        const posStats = newStats.byPosition[posKey] || {
          total: 0,
          correct: 0,
          acceptable: 0,
        };
        posStats.total += 1;
        if (result.is_correct) posStats.correct += 1;
        else if (result.is_acceptable) posStats.acceptable += 1;
        newStats.byPosition[posKey] = posStats;

        // Add to recent results (keep last 100)
        const newResults = [result, ...recentResults].slice(0, 100);

        set({
          stats: { ...stats, [result.drill_type]: newStats },
          recentResults: newResults,
        });

        // Sync to cloud if user is logged in
        if (userId) {
          try {
            const supabase = createClient();
            await supabase.from("drill_results").insert({
              user_id: userId,
              drill_type: result.drill_type,
              hand: result.hand,
              hero_position: result.hero_position,
              villain_position: result.villain_position,
              player_action: result.player_action,
              correct_action: result.correct_action,
              is_correct: result.is_correct,
              is_acceptable: result.is_acceptable,
              frequency: result.frequency,
            });
          } catch (error) {
            console.error("Failed to sync result to cloud:", error);
          }
        }
      },

      recordQuizResult: async (
        quizType: QuizType,
        category: string,
        isCorrect: boolean,
        userId?: string
      ) => {
        const { quizStats } = get();
        const currentStats = quizStats[quizType] || { ...initialQuizStats };

        // Update local stats
        const newStats = { ...currentStats };
        newStats.total += 1;
        if (isCorrect) newStats.correct += 1;
        newStats.lastPracticed = new Date().toISOString();

        // Update category stats
        const catStats = newStats.byCategory[category] || { total: 0, correct: 0 };
        catStats.total += 1;
        if (isCorrect) catStats.correct += 1;
        newStats.byCategory[category] = catStats;

        set({
          quizStats: { ...quizStats, [quizType]: newStats },
        });

        // Sync to cloud if user is logged in
        if (userId) {
          try {
            const supabase = createClient();
            await supabase.from("quiz_results").insert({
              user_id: userId,
              quiz_type: quizType,
              category,
              is_correct: isCorrect,
            });
          } catch (error) {
            console.error("Failed to sync quiz result to cloud:", error);
          }
        }
      },

      syncToCloud: async (userId: string) => {
        set({ isSyncing: true });

        try {
          const supabase = createClient();
          const { stats } = get();

          // Upsert user stats
          const { error } = await supabase.from("user_stats").upsert({
            user_id: userId,
            stats: stats,
            updated_at: new Date().toISOString(),
          });

          if (error) {
            console.warn("Could not sync stats to cloud:", error.message);
          }

          set({
            isSyncing: false,
            lastSyncedAt: new Date().toISOString(),
          });
        } catch (error) {
          console.warn("Failed to sync to cloud:", error);
          set({ isSyncing: false });
        }
      },

      loadFromCloud: async (userId: string) => {
        set({ isSyncing: true });

        try {
          const supabase = createClient();

          // Load user stats - use maybeSingle() to handle missing rows gracefully
          const { data: statsData, error: statsError } = await supabase
            .from("user_stats")
            .select("stats")
            .eq("user_id", userId)
            .maybeSingle();

          // If table doesn't exist or other error, just log and continue
          if (statsError && statsError.code !== "PGRST116") {
            console.warn("Could not load user stats:", statsError.message);
          }

          // Load recent results
          const { data: resultsData, error: resultsError } = await supabase
            .from("drill_results")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(100);

          if (resultsError) {
            console.warn("Could not load drill results:", resultsError.message);
          }

          if (statsData?.stats) {
            set({
              stats: statsData.stats as Record<DrillType, DrillStats>,
              recentResults: resultsData || [],
              isSyncing: false,
              lastSyncedAt: new Date().toISOString(),
            });
          } else {
            set({ isSyncing: false });
          }
        } catch (error) {
          console.warn("Failed to load from cloud:", error);
          set({ isSyncing: false });
        }
      },

      getWeakPositions: (drillType: DrillType) => {
        const drillStats = get().stats[drillType];
        const positions = Object.entries(drillStats.byPosition);

        // Find positions with accuracy < 70%
        return positions
          .filter(([_, stats]) => {
            if (stats.total < 5) return false; // Need at least 5 attempts
            const accuracy =
              ((stats.correct + stats.acceptable) / stats.total) * 100;
            return accuracy < 70;
          })
          .map(([pos]) => pos);
      },

      resetStats: () => {
        set(initialState);
      },
    }),
    {
      name: "progress-storage",
      partialize: (state) => ({
        stats: state.stats,
        quizStats: state.quizStats,
        recentResults: state.recentResults,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);
