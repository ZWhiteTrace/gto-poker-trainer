import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createClient } from "@/lib/supabase/client";
import { useProgressStore } from "./progressStore";
import { createModuleLogger } from "@/lib/errors";

const log = createModuleLogger("Quiz");

// Types
export type QuizType = "equity" | "outs" | "ev" | "logic" | "exploit";

export interface QuizStats {
  total: number;
  correct: number;
  byCategory: Record<string, { total: number; correct: number }>;
  lastPracticed?: string;
}

export interface QuestionAttempt {
  questionId: string;
  attempts: number;
  correctOnFirstTry: boolean;
  lastAttemptCorrect: boolean;
  lastAttemptAt: string;
}

export interface QuizProgressState {
  totalQuestionsInBank: number;
  attemptedQuestions: Record<string, QuestionAttempt>;
}

interface QuizProgressStoreState {
  // Quiz stats by quiz type
  quizStats: Record<QuizType, QuizStats>;

  // Quiz progress tracking (question-level)
  quizProgress: QuizProgressState;

  // Actions
  recordQuizResult: (
    quizType: QuizType,
    category: string,
    isCorrect: boolean,
    userId?: string
  ) => Promise<void>;
  recordQuestionAttempt: (questionId: string, isCorrect: boolean) => void;
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
  resetQuizStats: () => void;
}

const initialQuizStats: QuizStats = {
  total: 0,
  correct: 0,
  byCategory: {},
};

const TOTAL_QUIZ_QUESTIONS = 45; // Default value, updated dynamically

const initialState = {
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
};

export const useQuizProgressStore = create<QuizProgressStoreState>()(
  persist(
    (set, get) => ({
      ...initialState,

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

        // Update shared daily history in progressStore
        useProgressStore.getState().addToDailyHistory(isCorrect);

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
            log.error("Failed to sync quiz result to cloud:", error);
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

      getQuizCompletionStats: () => {
        const { quizProgress } = get();
        const attempts = Object.values(quizProgress.attemptedQuestions);
        const total = quizProgress.totalQuestionsInBank;

        const attempted = attempts.length;
        const mastered = attempts.filter(
          (a) => a.correctOnFirstTry || a.lastAttemptCorrect
        ).length;
        const needsReview = attempts.filter((a) => !a.lastAttemptCorrect).length;

        return {
          attempted,
          mastered,
          needsReview,
          total,
          completionRate: total > 0 ? Math.round((attempted / total) * 100) : 0,
          masteryRate:
            attempted > 0 ? Math.round((mastered / attempted) * 100) : 0,
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
        const attemptedIds = new Set(
          Object.keys(quizProgress.attemptedQuestions)
        );
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

      resetQuizStats: () => {
        set(initialState);
      },
    }),
    {
      name: "quiz-progress-storage",
      partialize: (state) => ({
        quizStats: state.quizStats,
        quizProgress: state.quizProgress,
      }),
    }
  )
);
