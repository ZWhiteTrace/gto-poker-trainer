import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api, SpotResponse, EvaluateResponse } from "@/lib/api";

type DrillType = "rfi" | "vs_rfi" | "vs_3bet" | "vs_4bet";

interface DrillState {
  // Current drill session
  drillType: DrillType;
  currentSpot: SpotResponse | null;
  lastResult: EvaluateResponse | null;
  isLoading: boolean;
  error: string | null;

  // Session stats
  sessionStats: {
    total: number;
    correct: number;
    acceptable: number;
    streak: number;
    bestStreak: number;
  };

  // Settings
  enabledPositions: string[];

  // Actions
  setDrillType: (type: DrillType) => void;
  setEnabledPositions: (positions: string[]) => void;
  generateSpot: () => Promise<void>;
  submitAnswer: (action: string) => Promise<EvaluateResponse | null>;
  resetSession: () => void;
}

const initialStats = {
  total: 0,
  correct: 0,
  acceptable: 0,
  streak: 0,
  bestStreak: 0,
};

export const useDrillStore = create<DrillState>()(
  persist(
    (set, get) => ({
      // Initial state
      drillType: "rfi",
      currentSpot: null,
      lastResult: null,
      isLoading: false,
      error: null,
      sessionStats: { ...initialStats },
      enabledPositions: ["UTG", "HJ", "CO", "BTN", "SB"],

      // Actions
      setDrillType: (type) => set({ drillType: type }),

      setEnabledPositions: (positions) => set({ enabledPositions: positions }),

      generateSpot: async () => {
        const { drillType, enabledPositions } = get();
        set({ isLoading: true, error: null, lastResult: null });

        try {
          const spot = await api.generateSpot({
            drill_type: drillType,
            enabled_positions: enabledPositions,
          });
          set({ currentSpot: spot, isLoading: false });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to generate spot",
            isLoading: false,
          });
        }
      },

      submitAnswer: async (action) => {
        const { currentSpot, sessionStats } = get();
        if (!currentSpot) return null;

        set({ isLoading: true, error: null });

        try {
          const result = await api.evaluateAction({
            hand: currentSpot.hand,
            scenario_key: currentSpot.scenario_key,
            action,
          });

          // Update stats
          const newStats = { ...sessionStats };
          newStats.total += 1;

          if (result.is_correct) {
            newStats.correct += 1;
            newStats.streak += 1;
            newStats.bestStreak = Math.max(newStats.streak, newStats.bestStreak);
          } else if (result.is_acceptable) {
            newStats.acceptable += 1;
            newStats.streak += 1;
            newStats.bestStreak = Math.max(newStats.streak, newStats.bestStreak);
          } else {
            newStats.streak = 0;
          }

          set({
            lastResult: result,
            sessionStats: newStats,
            isLoading: false,
          });

          return result;
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : "Failed to evaluate",
            isLoading: false,
          });
          return null;
        }
      },

      resetSession: () =>
        set({
          currentSpot: null,
          lastResult: null,
          sessionStats: { ...initialStats },
          error: null,
        }),
    }),
    {
      name: "drill-storage",
      partialize: (state) => ({
        drillType: state.drillType,
        enabledPositions: state.enabledPositions,
        sessionStats: state.sessionStats,
      }),
    }
  )
);
