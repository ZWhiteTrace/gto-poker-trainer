"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trophy, X } from "lucide-react";
import type { Achievement } from "@/lib/supabase/leaderboard";

export function AchievementToast() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    const handleAchievement = (event: CustomEvent<Achievement[]>) => {
      setAchievements((prev) => [...prev, ...event.detail]);
    };

    window.addEventListener(
      "achievement-unlocked",
      handleAchievement as EventListener
    );

    return () => {
      window.removeEventListener(
        "achievement-unlocked",
        handleAchievement as EventListener
      );
    };
  }, []);

  const dismissAchievement = (id: string) => {
    setAchievements((prev) => prev.filter((a) => a.id !== id));
  };

  // Auto-dismiss after 5 seconds
  useEffect(() => {
    if (achievements.length > 0) {
      const timer = setTimeout(() => {
        setAchievements((prev) => prev.slice(1));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [achievements]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {achievements.map((achievement) => (
          <motion.div
            key={achievement.id}
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.8 }}
            className="relative bg-gradient-to-r from-yellow-500/20 to-orange-500/20 border border-yellow-500/40 rounded-lg p-4 shadow-lg backdrop-blur-sm max-w-sm"
          >
            <button
              onClick={() => dismissAchievement(achievement.id)}
              className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 h-12 w-12 rounded-full bg-yellow-500/20 flex items-center justify-center text-2xl">
                {achievement.icon}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-yellow-500" />
                  <span className="text-xs font-medium text-yellow-500 uppercase">
                    Achievement Unlocked!
                  </span>
                </div>
                <h4 className="font-semibold">{achievement.name}</h4>
                <p className="text-sm text-muted-foreground">
                  +{achievement.points} points
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
