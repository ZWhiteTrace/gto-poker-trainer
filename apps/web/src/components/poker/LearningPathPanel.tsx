"use client";

import { useMemo } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { HeroStats } from "@/lib/poker/types";
import {
  generateLearningPath,
  type LearningPath,
  type DrillRecommendation,
} from "@/lib/poker/learningPath";

interface LearningPathPanelProps {
  stats: HeroStats;
  className?: string;
}

const difficultyColors = {
  beginner: "bg-green-600/20 text-green-400 border-green-600/30",
  intermediate: "bg-yellow-600/20 text-yellow-400 border-yellow-600/30",
  advanced: "bg-red-600/20 text-red-400 border-red-600/30",
};

const difficultyLabels = {
  beginner: "初級",
  intermediate: "中級",
  advanced: "進階",
};

const panelCopy = {
  "zh-TW": {
    loading: "載入中...",
    title: "學習路徑",
    subtitle: "根據你的統計數據個性化推薦",
    focusAreas: "重點改進領域",
    weaknesses: "統計偏離",
    tooHigh: "偏高",
    tooLow: "偏低",
    recommendedDrills: "推薦練習",
    weeklyGoals: "本週目標",
    noIssues: "你的統計數據非常接近 GTO！繼續保持練習。",
    estimatedTimeSeparator: "•",
    difficultyLabels,
  },
  en: {
    loading: "Loading...",
    title: "Learning Path",
    subtitle: "Personalized recommendations based on your current stats",
    focusAreas: "Priority Focus Areas",
    weaknesses: "Stat Deviations",
    tooHigh: "Too High",
    tooLow: "Too Low",
    recommendedDrills: "Recommended Drills",
    weeklyGoals: "Weekly Goals",
    noIssues: "Your stats are very close to GTO baselines. Keep the reps steady.",
    estimatedTimeSeparator: "•",
    difficultyLabels: {
      beginner: "Beginner",
      intermediate: "Intermediate",
      advanced: "Advanced",
    },
  },
} as const;

function DrillCard({ drill, locale }: { drill: DrillRecommendation; locale: "zh-TW" | "en" }) {
  const copy = panelCopy[locale];
  return (
    <Link
      href={drill.path}
      className="block rounded-lg border border-gray-700/50 bg-gray-800/50 p-3 transition-colors hover:border-gray-600/50 hover:bg-gray-700/50"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h4 className="font-medium text-gray-200">
            {locale === "en" ? drill.drillName : drill.drillNameZh}
          </h4>
          <p className="mt-1 text-xs text-gray-400">
            {locale === "en" ? drill.description : drill.descriptionZh}
          </p>
        </div>
        <span
          className={cn("rounded border px-2 py-0.5 text-xs", difficultyColors[drill.difficulty])}
        >
          {copy.difficultyLabels[drill.difficulty]}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-gray-500">{drill.estimatedTime}</span>
        <span className="text-xs text-gray-600">{copy.estimatedTimeSeparator}</span>
        <span className="text-xs text-gray-500">{drill.relevantStats.slice(0, 2).join(", ")}</span>
      </div>
    </Link>
  );
}

function WeeklyGoalItem({
  goal,
  locale,
}: {
  goal: LearningPath["weeklyGoals"][0];
  locale: "zh-TW" | "en";
}) {
  const progress = Math.min(100, (goal.currentValue / goal.targetValue) * 100);

  return (
    <div className="rounded bg-gray-900/50 p-2">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-gray-300">{locale === "en" ? goal.goal : goal.goalZh}</span>
        <span className="text-xs text-gray-500">
          {goal.currentValue}/{goal.targetValue}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-700">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            goal.completed ? "bg-green-500" : "bg-blue-500"
          )}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function LearningPathPanel({ stats, className }: LearningPathPanelProps) {
  const locale = useLocale() === "en" ? "en" : "zh-TW";
  const copy = panelCopy[locale];
  const learningPath = useMemo(() => generateLearningPath(stats), [stats]);

  if (!learningPath) {
    return (
      <div className={cn("rounded-xl bg-gray-900/90 p-4", className)}>
        <div className="text-center text-gray-500">{copy.loading}</div>
      </div>
    );
  }

  const levelColors = {
    beginner: "bg-green-600",
    intermediate: "bg-blue-600",
    advanced: "bg-purple-600",
    expert: "bg-yellow-500",
  };

  return (
    <div className={cn("overflow-hidden rounded-xl bg-gray-900/90", className)}>
      {/* Header */}
      <div className="border-b border-gray-700/50 bg-gradient-to-r from-blue-600/20 to-purple-600/20 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-100">{copy.title}</h3>
            <p className="mt-1 text-xs text-gray-400">{copy.subtitle}</p>
          </div>
          <span
            className={cn(
              "rounded-full px-3 py-1 text-sm font-medium text-white",
              levelColors[learningPath.level]
            )}
          >
            {locale === "en" ? learningPath.levelLabel : learningPath.levelZh}
          </span>
        </div>
      </div>

      <div className="space-y-4 p-4">
        {/* Focus Areas */}
        {learningPath.focusAreas.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-300">{copy.focusAreas}</h4>
            <div className="space-y-2">
              {learningPath.focusAreas.map((area, i) => (
                <div
                  key={area.area}
                  className="rounded-lg border border-orange-800/30 bg-orange-900/20 p-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-orange-600/30 px-1.5 py-0.5 text-xs text-orange-400">
                      #{i + 1}
                    </span>
                    <span className="text-sm font-medium text-orange-300">
                      {locale === "en" ? area.area : area.areaZh}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">
                    {locale === "en" ? area.description : area.descriptionZh}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weaknesses */}
        {learningPath.weaknesses.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-300">{copy.weaknesses}</h4>
            <div className="flex flex-wrap gap-2">
              {learningPath.weaknesses.slice(0, 4).map((w) => (
                <div
                  key={w.stat}
                  className={cn(
                    "rounded border px-2 py-1 text-xs",
                    w.status === "too_high"
                      ? "border-red-800/30 bg-red-900/20 text-red-400"
                      : "border-blue-800/30 bg-blue-900/20 text-blue-400"
                  )}
                >
                  {locale === "en" ? w.stat : w.statZh}: {(w.value * 100).toFixed(0)}%
                  <span className="ml-1 opacity-70">
                    ({w.status === "too_high" ? copy.tooHigh : copy.tooLow})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Drills */}
        <div>
          <h4 className="mb-2 text-sm font-semibold text-gray-300">{copy.recommendedDrills}</h4>
          <div className="space-y-2">
            {learningPath.recommendations.map((drill) => (
              <DrillCard key={drill.drillId} drill={drill} locale={locale} />
            ))}
          </div>
        </div>

        {/* Weekly Goals */}
        {learningPath.weeklyGoals.length > 0 && (
          <div>
            <h4 className="mb-2 text-sm font-semibold text-gray-300">{copy.weeklyGoals}</h4>
            <div className="space-y-2">
              {learningPath.weeklyGoals.map((goal, i) => (
                <WeeklyGoalItem key={i} goal={goal} locale={locale} />
              ))}
            </div>
          </div>
        )}

        {/* No Issues */}
        {learningPath.weaknesses.length === 0 && (
          <div className="py-4 text-center">
            <div className="mb-2 text-2xl">🎉</div>
            <p className="text-sm text-gray-400">{copy.noIssues}</p>
          </div>
        )}
      </div>
    </div>
  );
}
