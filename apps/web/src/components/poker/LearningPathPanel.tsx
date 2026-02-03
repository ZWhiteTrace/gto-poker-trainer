"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
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

function DrillCard({ drill }: { drill: DrillRecommendation }) {
  return (
    <Link
      href={drill.path}
      className="block p-3 bg-gray-800/50 hover:bg-gray-700/50 rounded-lg transition-colors border border-gray-700/50 hover:border-gray-600/50"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h4 className="font-medium text-gray-200">{drill.drillNameZh}</h4>
          <p className="text-xs text-gray-400 mt-1">{drill.descriptionZh}</p>
        </div>
        <span className={cn("text-xs px-2 py-0.5 rounded border", difficultyColors[drill.difficulty])}>
          {difficultyLabels[drill.difficulty]}
        </span>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-xs text-gray-500">{drill.estimatedTime}</span>
        <span className="text-xs text-gray-600">•</span>
        <span className="text-xs text-gray-500">{drill.relevantStats.slice(0, 2).join(", ")}</span>
      </div>
    </Link>
  );
}

function WeeklyGoalItem({ goal }: {
  goal: LearningPath["weeklyGoals"][0];
}) {
  const progress = Math.min(100, (goal.currentValue / goal.targetValue) * 100);

  return (
    <div className="p-2 bg-gray-900/50 rounded">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-300">{goal.goalZh}</span>
        <span className="text-xs text-gray-500">
          {goal.currentValue}/{goal.targetValue}
        </span>
      </div>
      <div className="h-1.5 bg-gray-700 rounded-full overflow-hidden">
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
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null);

  useEffect(() => {
    // Generate learning path when stats change
    const path = generateLearningPath(stats);
    setLearningPath(path);
  }, [stats]);

  if (!learningPath) {
    return (
      <div className={cn("p-4 bg-gray-900/90 rounded-xl", className)}>
        <div className="text-center text-gray-500">載入中...</div>
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
    <div className={cn("bg-gray-900/90 rounded-xl overflow-hidden", className)}>
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-gray-700/50">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-100">學習路徑</h3>
            <p className="text-xs text-gray-400 mt-1">根據你的統計數據個性化推薦</p>
          </div>
          <span className={cn("px-3 py-1 rounded-full text-sm font-medium text-white", levelColors[learningPath.level])}>
            {learningPath.levelZh}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Focus Areas */}
        {learningPath.focusAreas.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-2">重點改進領域</h4>
            <div className="space-y-2">
              {learningPath.focusAreas.map((area, i) => (
                <div
                  key={area.area}
                  className="p-2 bg-orange-900/20 border border-orange-800/30 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-1.5 py-0.5 bg-orange-600/30 text-orange-400 rounded">
                      #{i + 1}
                    </span>
                    <span className="text-sm font-medium text-orange-300">{area.areaZh}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{area.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Weaknesses */}
        {learningPath.weaknesses.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-2">統計偏離</h4>
            <div className="flex flex-wrap gap-2">
              {learningPath.weaknesses.slice(0, 4).map((w) => (
                <div
                  key={w.stat}
                  className={cn(
                    "text-xs px-2 py-1 rounded border",
                    w.status === "too_high"
                      ? "bg-red-900/20 text-red-400 border-red-800/30"
                      : "bg-blue-900/20 text-blue-400 border-blue-800/30"
                  )}
                >
                  {w.statZh}: {(w.value * 100).toFixed(0)}%
                  <span className="ml-1 opacity-70">
                    ({w.status === "too_high" ? "偏高" : "偏低"})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recommended Drills */}
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-2">推薦練習</h4>
          <div className="space-y-2">
            {learningPath.recommendations.map((drill) => (
              <DrillCard key={drill.drillId} drill={drill} />
            ))}
          </div>
        </div>

        {/* Weekly Goals */}
        {learningPath.weeklyGoals.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold text-gray-300 mb-2">本週目標</h4>
            <div className="space-y-2">
              {learningPath.weeklyGoals.map((goal, i) => (
                <WeeklyGoalItem key={i} goal={goal} />
              ))}
            </div>
          </div>
        )}

        {/* No Issues */}
        {learningPath.weaknesses.length === 0 && (
          <div className="text-center py-4">
            <div className="text-2xl mb-2">🎉</div>
            <p className="text-sm text-gray-400">
              你的統計數據非常接近 GTO！繼續保持練習。
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
