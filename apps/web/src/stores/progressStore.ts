import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createClient } from "@/lib/supabase/client";
import { updateLeaderboardStats, type Achievement } from "@/lib/supabase/leaderboard";

type DrillType = "rfi" | "vs_rfi" | "vs_3bet" | "vs_4bet" | "push_fold" | "push_fold_defense" | "push_fold_resteal" | "push_fold_hu" | "table_trainer";
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

// Track individual question attempts
interface QuestionAttempt {
  questionId: string;
  attempts: number;
  correctOnFirstTry: boolean;
  lastAttemptCorrect: boolean;
  lastAttemptAt: string;
}

// Quiz progress tracking
interface QuizProgressState {
  totalQuestionsInBank: number;
  attemptedQuestions: Record<string, QuestionAttempt>;
}

interface DailyRecord {
  date: string; // YYYY-MM-DD
  total: number;
  correct: number;
}

interface ProgressState {
  // Stats by drill type
  stats: Record<DrillType, DrillStats>;

  // Quiz stats by quiz type
  quizStats: Record<QuizType, QuizStats>;

  // Quiz progress tracking (question-level)
  quizProgress: QuizProgressState;

  // Recent results (local cache)
  recentResults: DrillResult[];

  // Daily history for trend charts (last 30 days)
  dailyHistory: DailyRecord[];

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
  recordQuestionAttempt: (
    questionId: string,
    isCorrect: boolean
  ) => void;
  recordTableTrainerHand: (
    heroPosition: string,
    isWin: boolean,
    profitBB: number,
    userId?: string
  ) => Promise<void>;
  syncToCloud: (userId: string) => Promise<void>;
  loadFromCloud: (userId: string) => Promise<void>;
  getWeakPositions: (drillType: DrillType) => string[];
  getDailyHistory: (days: number) => DailyRecord[];
  getQuizCompletionStats: () => {
    attempted: number;
    mastered: number;
    needsReview: number;
    total: number;
    completionRate: number;
    masteryRate: number;
  };
  getMasteredQuestionIds: () => string[];
  getNeedsReviewQuestionIds: () => string[];
  getUnansweredQuestionIds: (allQuestionIds: string[]) => string[];
  setTotalQuestionsInBank: (total: number) => void;
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

// Total questions available in the quiz bank (will be dynamically updated by exam page)
const TOTAL_QUIZ_QUESTIONS = 45; // Default value, updated dynamically

const initialState = {
  stats: {
    rfi: { ...initialStats },
    vs_rfi: { ...initialStats },
    vs_3bet: { ...initialStats },
    vs_4bet: { ...initialStats },
    push_fold: { ...initialStats },
    push_fold_defense: { ...initialStats },
    push_fold_resteal: { ...initialStats },
    push_fold_hu: { ...initialStats },
    table_trainer: { ...initialStats },
  },
  quizStats: {
    equity: { ...initialQuizStats },
    outs: { ...initialQuizStats },
    ev: { ...initialQuizStats },
    logic: { ...initialQuizStats },
    exploit: { ...initialQuizStats },
  },
  quizProgress: {
    totalQuestionsInBank: TOTAL_QUIZ_QUESTIONS,
    attemptedQuestions: {} as Record<string, QuestionAttempt>,
  },
  recentResults: [],
  dailyHistory: [],
  isSyncing: false,
  lastSyncedAt: null,
};

// Helper to get today's date string
function getTodayDate(): string {
  return new Date().toISOString().split("T")[0];
}

// Helper to update daily history
function updateDailyHistory(
  history: DailyRecord[],
  isCorrect: boolean
): DailyRecord[] {
  const today = getTodayDate();
  const existingIndex = history.findIndex((r) => r.date === today);

  let newHistory: DailyRecord[];
  if (existingIndex >= 0) {
    newHistory = [...history];
    newHistory[existingIndex] = {
      ...newHistory[existingIndex],
      total: newHistory[existingIndex].total + 1,
      correct: newHistory[existingIndex].correct + (isCorrect ? 1 : 0),
    };
  } else {
    newHistory = [
      ...history,
      { date: today, total: 1, correct: isCorrect ? 1 : 0 },
    ];
  }

  // Keep only last 30 days
  return newHistory.slice(-30);
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      ...initialState,

      recordResult: async (result: DrillResult, userId?: string) => {
        const { stats, recentResults, dailyHistory } = get();
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

        // Update daily history
        const newDailyHistory = updateDailyHistory(
          dailyHistory,
          result.is_correct || result.is_acceptable
        );

        set({
          stats: { ...stats, [result.drill_type]: newStats },
          recentResults: newResults,
          dailyHistory: newDailyHistory,
        });

        // Sync to cloud if user is logged in
        if (userId) {
          try {
            const supabase = createClient();

            // Save drill result
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

            // Update leaderboard stats and check achievements
            const isCorrect = result.is_correct || result.is_acceptable;
            const leaderboardResult = await updateLeaderboardStats(userId, isCorrect);

            // If new achievements were unlocked, dispatch a custom event
            if (leaderboardResult?.newAchievements?.length) {
              window.dispatchEvent(
                new CustomEvent("achievement-unlocked", {
                  detail: leaderboardResult.newAchievements,
                })
              );
            }
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
        const { quizStats, dailyHistory } = get();
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

        // Update daily history
        const newDailyHistory = updateDailyHistory(dailyHistory, isCorrect);

        set({
          quizStats: { ...quizStats, [quizType]: newStats },
          dailyHistory: newDailyHistory,
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

      recordQuestionAttempt: (questionId: string, isCorrect: boolean) => {
        const { quizProgress } = get();
        const existing = quizProgress.attemptedQuestions[questionId];
        const now = new Date().toISOString();

        const newAttempt: QuestionAttempt = existing
          ? {
              ...existing,
              attempts: existing.attempts + 1,
              lastAttemptCorrect: isCorrect,
              lastAttemptAt: now,
            }
          : {
              questionId,
              attempts: 1,
              correctOnFirstTry: isCorrect,
              lastAttemptCorrect: isCorrect,
              lastAttemptAt: now,
            };

        set({
          quizProgress: {
            ...quizProgress,
            attemptedQuestions: {
              ...quizProgress.attemptedQuestions,
              [questionId]: newAttempt,
            },
          },
        });
      },

      recordTableTrainerHand: async (
        heroPosition: string,
        isWin: boolean,
        profitBB: number,
        userId?: string
      ) => {
        const { stats, dailyHistory } = get();
        const drillStats = stats.table_trainer;

        // Update local stats
        const newStats = { ...drillStats };
        newStats.total += 1;
        if (isWin) newStats.correct += 1;
        newStats.lastPracticed = new Date().toISOString();

        // Update position stats
        const posStats = newStats.byPosition[heroPosition] || {
          total: 0,
          correct: 0,
          acceptable: 0,
        };
        posStats.total += 1;
        if (isWin) posStats.correct += 1;
        newStats.byPosition[heroPosition] = posStats;

        // Update daily history
        const newDailyHistory = updateDailyHistory(dailyHistory, isWin);

        set({
          stats: { ...stats, table_trainer: newStats },
          dailyHistory: newDailyHistory,
        });

        // Sync to leaderboard if user is logged in
        if (userId) {
          try {
            await updateLeaderboardStats(userId, isWin);
          } catch (error) {
            console.error("Failed to update leaderboard:", error);
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

      getDailyHistory: (days: number) => {
        const { dailyHistory } = get();
        const today = new Date();
        const result: DailyRecord[] = [];

        // Generate last N days with data (fill gaps with zeros)
        for (let i = days - 1; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split("T")[0];

          const existing = dailyHistory.find((r) => r.date === dateStr);
          result.push(existing || { date: dateStr, total: 0, correct: 0 });
        }

        return result;
      },

      getQuizCompletionStats: () => {
        const { quizProgress } = get();
        const attempts = Object.values(quizProgress.attemptedQuestions);
        const total = quizProgress.totalQuestionsInBank;

        const attempted = attempts.length;
        const mastered = attempts.filter((a) => a.correctOnFirstTry || a.lastAttemptCorrect).length;
        const needsReview = attempts.filter((a) => !a.lastAttemptCorrect).length;

        return {
          attempted,
          mastered,
          needsReview,
          total,
          completionRate: total > 0 ? Math.round((attempted / total) * 100) : 0,
          masteryRate: attempted > 0 ? Math.round((mastered / attempted) * 100) : 0,
        };
      },

      getMasteredQuestionIds: () => {
        const { quizProgress } = get();
        return Object.values(quizProgress.attemptedQuestions)
          .filter((a) => a.correctOnFirstTry || a.lastAttemptCorrect)
          .map((a) => a.questionId);
      },

      getNeedsReviewQuestionIds: () => {
        const { quizProgress } = get();
        return Object.values(quizProgress.attemptedQuestions)
          .filter((a) => !a.lastAttemptCorrect)
          .map((a) => a.questionId);
      },

      getUnansweredQuestionIds: (allQuestionIds: string[]) => {
        const { quizProgress } = get();
        const attemptedIds = new Set(Object.keys(quizProgress.attemptedQuestions));
        return allQuestionIds.filter((id) => !attemptedIds.has(id));
      },

      setTotalQuestionsInBank: (total: number) => {
        set((state) => ({
          quizProgress: {
            ...state.quizProgress,
            totalQuestionsInBank: total,
          },
        }));
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
        quizProgress: state.quizProgress,
        recentResults: state.recentResults,
        dailyHistory: state.dailyHistory,
        lastSyncedAt: state.lastSyncedAt,
      }),
    }
  )
);
