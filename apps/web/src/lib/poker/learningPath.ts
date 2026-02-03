// ============================================
// Learning Path Recommendation System
// 根據玩家弱點推薦練習內容
// ============================================

import type { HeroStats } from "./types";
import type { StatFeedback } from "./statsFeedback";
import { analyzePlayerStats, getOverallPerformance } from "./statsFeedback";

// ============================================
// Types
// ============================================

export interface DrillRecommendation {
  drillId: string;
  drillName: string;
  drillNameZh: string;
  path: string;
  description: string;
  descriptionZh: string;
  relevantStats: string[];
  priority: number; // 1-5
  estimatedTime: string; // e.g., "10-15 min"
  difficulty: "beginner" | "intermediate" | "advanced";
}

export interface LearningPath {
  userId?: string;
  generatedAt: number;
  level: "beginner" | "intermediate" | "advanced" | "expert";
  levelZh: string;

  // Current weaknesses
  weaknesses: StatFeedback[];

  // Recommended drills in priority order
  recommendations: DrillRecommendation[];

  // Focus areas
  focusAreas: {
    area: string;
    areaZh: string;
    description: string;
    priority: number;
  }[];

  // Weekly goals (optional gamification)
  weeklyGoals: {
    goal: string;
    goalZh: string;
    targetValue: number;
    currentValue: number;
    completed: boolean;
  }[];
}

// ============================================
// Drill Database
// ============================================

const AVAILABLE_DRILLS: DrillRecommendation[] = [
  // Preflop Drills
  {
    drillId: "rfi",
    drillName: "Open Raising (RFI)",
    drillNameZh: "開池加注 (RFI)",
    path: "/drill/rfi",
    description: "Practice opening ranges from different positions",
    descriptionZh: "練習各位置的開池加注範圍",
    relevantStats: ["VPIP", "PFR", "ATS"],
    priority: 5,
    estimatedTime: "10-15 min",
    difficulty: "beginner",
  },
  {
    drillId: "vs-rfi",
    drillName: "Facing Open Raises",
    drillNameZh: "面對開池加注",
    path: "/drill/vs-rfi",
    description: "Practice responding to opens from different positions",
    descriptionZh: "練習面對不同位置開池的應對",
    relevantStats: ["VPIP", "3-Bet"],
    priority: 4,
    estimatedTime: "10-15 min",
    difficulty: "beginner",
  },
  {
    drillId: "vs-3bet",
    drillName: "Facing 3-Bets",
    drillNameZh: "面對 3-Bet",
    path: "/drill/vs-3bet",
    description: "Practice continuing vs 3-bets",
    descriptionZh: "練習面對 3-Bet 時的決策",
    relevantStats: ["3-Bet", "Fold to 3-Bet"],
    priority: 4,
    estimatedTime: "15-20 min",
    difficulty: "intermediate",
  },
  {
    drillId: "vs-4bet",
    drillName: "Facing 4-Bets",
    drillNameZh: "面對 4-Bet",
    path: "/drill/vs-4bet",
    description: "Practice high-stakes preflop decisions",
    descriptionZh: "練習高風險翻前決策",
    relevantStats: ["4-Bet", "Fold to 4-Bet"],
    priority: 3,
    estimatedTime: "10-15 min",
    difficulty: "advanced",
  },

  // Postflop Drills
  {
    drillId: "postflop",
    drillName: "Postflop Scenarios",
    drillNameZh: "翻後場景練習",
    path: "/drill/postflop",
    description: "Practice common postflop spots with Solver feedback",
    descriptionZh: "練習常見翻後場景，配合 Solver 反饋",
    relevantStats: ["Flop CB", "Fold to CB", "WTSD"],
    priority: 5,
    estimatedTime: "15-20 min",
    difficulty: "intermediate",
  },
  {
    drillId: "flop-texture",
    drillName: "Flop Texture Reading",
    drillNameZh: "翻牌面質地分析",
    path: "/drill/flop-texture",
    description: "Learn to categorize and play different board textures",
    descriptionZh: "學習辨識不同牌面質地並調整策略",
    relevantStats: ["Flop CB", "Fold to CB"],
    priority: 4,
    estimatedTime: "10-15 min",
    difficulty: "beginner",
  },
  {
    drillId: "texture-training",
    drillName: "Texture Training (Advanced)",
    drillNameZh: "質地訓練 (進階)",
    path: "/drill/texture-training",
    description: "Deep dive into board texture strategy",
    descriptionZh: "深入學習牌面質地策略",
    relevantStats: ["Flop CB", "TAF"],
    priority: 3,
    estimatedTime: "20-30 min",
    difficulty: "advanced",
  },

  // Full Game Practice
  {
    drillId: "table-trainer",
    drillName: "Table Trainer",
    drillNameZh: "牌桌訓練",
    path: "/drill/table-trainer",
    description: "Full hand practice with AI opponents and GTO hints",
    descriptionZh: "完整手牌練習，配合 AI 對手和 GTO 提示",
    relevantStats: ["VPIP", "PFR", "Flop CB", "WTSD", "TAF"],
    priority: 5,
    estimatedTime: "20-30 min",
    difficulty: "intermediate",
  },
  {
    drillId: "gto-practice",
    drillName: "GTO Practice Mode",
    drillNameZh: "GTO 練習模式",
    path: "/drill/gto-practice",
    description: "Guided practice with detailed GTO explanations",
    descriptionZh: "引導式練習，配合詳細 GTO 解說",
    relevantStats: ["All"],
    priority: 4,
    estimatedTime: "15-20 min",
    difficulty: "intermediate",
  },

  // Special Situations
  {
    drillId: "push-fold",
    drillName: "Push/Fold Charts",
    drillNameZh: "全押/棄牌圖表",
    path: "/drill/push-fold",
    description: "Short stack push/fold decisions",
    descriptionZh: "短籌碼全押/棄牌決策",
    relevantStats: ["ATS"],
    priority: 2,
    estimatedTime: "10-15 min",
    difficulty: "beginner",
  },

  // Quiz-based Learning
  {
    drillId: "quiz-equity",
    drillName: "Equity Quiz",
    drillNameZh: "權益測驗",
    path: "/quiz/equity",
    description: "Test your equity estimation skills",
    descriptionZh: "測試你的權益估算能力",
    relevantStats: ["WTSD", "W$SD"],
    priority: 3,
    estimatedTime: "5-10 min",
    difficulty: "intermediate",
  },
  {
    drillId: "quiz-ev",
    drillName: "EV Quiz",
    drillNameZh: "期望值測驗",
    path: "/quiz/ev",
    description: "Calculate expected value in various spots",
    descriptionZh: "計算不同情境的期望值",
    relevantStats: ["TAF", "WTSD"],
    priority: 3,
    estimatedTime: "5-10 min",
    difficulty: "advanced",
  },
];

// ============================================
// Stat to Drill Mapping
// ============================================

const STAT_DRILL_MAP: Record<string, string[]> = {
  // Preflop stats
  "VPIP": ["rfi", "vs-rfi", "table-trainer"],
  "PFR": ["rfi", "table-trainer"],
  "3-Bet": ["vs-rfi", "vs-3bet", "table-trainer"],
  "Fold to 3-Bet": ["vs-3bet"],
  "4-Bet": ["vs-4bet"],
  "ATS": ["rfi", "push-fold"],

  // Postflop stats
  "Flop CB": ["postflop", "flop-texture", "texture-training", "table-trainer"],
  "Fold to CB": ["postflop", "flop-texture"],
  "WTSD": ["postflop", "table-trainer", "quiz-equity"],
  "W$SD": ["table-trainer", "quiz-equity"],
  "TAF": ["postflop", "texture-training", "quiz-ev"],
};

// ============================================
// Focus Area Definitions
// ============================================

const FOCUS_AREAS = {
  preflop_tight: {
    area: "Preflop Range Expansion",
    areaZh: "翻前範圍擴展",
    description: "你的翻前範圍偏緊，需要學習更多 speculative hands 的價值。",
    drills: ["rfi", "vs-rfi"],
  },
  preflop_loose: {
    area: "Preflop Range Tightening",
    areaZh: "翻前範圍收緊",
    description: "你的翻前範圍偏寬，需要學習更精確的位置感。",
    drills: ["rfi", "table-trainer"],
  },
  aggression_low: {
    area: "Aggression Development",
    areaZh: "侵略性提升",
    description: "你的打法偏被動，需要增加下注和加注頻率。",
    drills: ["postflop", "texture-training", "table-trainer"],
  },
  aggression_high: {
    area: "Aggression Control",
    areaZh: "侵略性控制",
    description: "你的打法過於激進，需要學習選擇更好的詐唬時機。",
    drills: ["postflop", "quiz-ev"],
  },
  cbet_issues: {
    area: "C-Bet Strategy",
    areaZh: "持續下注策略",
    description: "你的 C-Bet 頻率需要調整，學習不同牌面的下注策略。",
    drills: ["flop-texture", "texture-training", "postflop"],
  },
  showdown_issues: {
    area: "Showdown Value",
    areaZh: "攤牌價值",
    description: "你的攤牌頻率或勝率有問題，需要改進河牌決策。",
    drills: ["postflop", "table-trainer", "quiz-equity"],
  },
  threeBet_issues: {
    area: "3-Bet Dynamics",
    areaZh: "3-Bet 動態",
    description: "你的 3-Bet 策略需要調整。",
    drills: ["vs-rfi", "vs-3bet"],
  },
};

// ============================================
// Main Functions
// ============================================

function determineFocusAreas(weaknesses: StatFeedback[]): typeof FOCUS_AREAS[keyof typeof FOCUS_AREAS][] {
  const areas: typeof FOCUS_AREAS[keyof typeof FOCUS_AREAS][] = [];

  for (const weakness of weaknesses) {
    const stat = weakness.stat;

    if (stat === "VPIP" || stat === "PFR") {
      if (weakness.status === "too_low") {
        areas.push(FOCUS_AREAS.preflop_tight);
      } else {
        areas.push(FOCUS_AREAS.preflop_loose);
      }
    }

    if (stat === "TAF") {
      if (weakness.status === "too_low") {
        areas.push(FOCUS_AREAS.aggression_low);
      } else {
        areas.push(FOCUS_AREAS.aggression_high);
      }
    }

    if (stat === "Flop CB" || stat === "Fold to CB") {
      areas.push(FOCUS_AREAS.cbet_issues);
    }

    if (stat === "WTSD" || stat === "W$SD") {
      areas.push(FOCUS_AREAS.showdown_issues);
    }

    if (stat === "3-Bet") {
      areas.push(FOCUS_AREAS.threeBet_issues);
    }
  }

  // Remove duplicates
  return [...new Map(areas.map(a => [a.area, a])).values()];
}

function getDrillsForWeaknesses(weaknesses: StatFeedback[]): DrillRecommendation[] {
  const drillIds = new Set<string>();

  // Collect all relevant drill IDs
  for (const weakness of weaknesses) {
    const relevantDrills = STAT_DRILL_MAP[weakness.stat] || [];
    for (const drillId of relevantDrills) {
      drillIds.add(drillId);
    }
  }

  // Get full drill info and sort by priority
  const drills = AVAILABLE_DRILLS
    .filter(d => drillIds.has(d.drillId))
    .sort((a, b) => b.priority - a.priority);

  return drills;
}

function determineLevel(stats: HeroStats): {
  level: LearningPath["level"];
  levelZh: string;
} {
  const performance = getOverallPerformance(stats);

  switch (performance.level) {
    case "excellent":
      return { level: "expert", levelZh: "專家" };
    case "good":
      return { level: "advanced", levelZh: "進階" };
    case "needs_work":
      return { level: "intermediate", levelZh: "中級" };
    default:
      return { level: "beginner", levelZh: "初級" };
  }
}

function generateWeeklyGoals(weaknesses: StatFeedback[], stats: HeroStats): LearningPath["weeklyGoals"] {
  const goals: LearningPath["weeklyGoals"] = [];

  // Always add a basic goal
  goals.push({
    goal: "Complete 5 drill sessions",
    goalZh: "完成 5 次練習",
    targetValue: 5,
    currentValue: 0,
    completed: false,
  });

  // Add goals based on weaknesses
  if (weaknesses.some(w => w.stat === "VPIP" || w.stat === "PFR")) {
    goals.push({
      goal: "Practice preflop ranges 3 times",
      goalZh: "練習翻前範圍 3 次",
      targetValue: 3,
      currentValue: 0,
      completed: false,
    });
  }

  if (weaknesses.some(w => w.stat === "Flop CB")) {
    goals.push({
      goal: "Complete texture training quiz",
      goalZh: "完成質地訓練測驗",
      targetValue: 1,
      currentValue: 0,
      completed: false,
    });
  }

  if (weaknesses.some(w => w.stat === "WTSD" || w.stat === "W$SD")) {
    goals.push({
      goal: "Play 20 hands in Table Trainer",
      goalZh: "在牌桌訓練玩 20 手",
      targetValue: 20,
      currentValue: stats.handsPlayed || 0,
      completed: (stats.handsPlayed || 0) >= 20,
    });
  }

  return goals.slice(0, 4); // Max 4 goals
}

/**
 * Generate a personalized learning path based on player stats
 */
export function generateLearningPath(stats: HeroStats, userId?: string): LearningPath {
  const weaknesses = analyzePlayerStats(stats);
  const { level, levelZh } = determineLevel(stats);
  const focusAreas = determineFocusAreas(weaknesses);
  const recommendations = getDrillsForWeaknesses(weaknesses);
  const weeklyGoals = generateWeeklyGoals(weaknesses, stats);

  // If no weaknesses, recommend general practice
  if (recommendations.length === 0) {
    recommendations.push(
      ...AVAILABLE_DRILLS.filter(d => d.priority >= 4).slice(0, 3)
    );
  }

  return {
    userId,
    generatedAt: Date.now(),
    level,
    levelZh,
    weaknesses,
    recommendations: recommendations.slice(0, 5), // Top 5 recommendations
    focusAreas: focusAreas.slice(0, 3).map((area, i) => ({
      area: area.area,
      areaZh: area.areaZh,
      description: area.description,
      priority: 3 - i,
    })),
    weeklyGoals,
  };
}

/**
 * Get a quick drill recommendation based on a specific weakness
 */
export function getQuickRecommendation(statName: string): DrillRecommendation | null {
  const drillIds = STAT_DRILL_MAP[statName];
  if (!drillIds || drillIds.length === 0) return null;

  // Return the highest priority drill for this stat
  const drill = AVAILABLE_DRILLS.find(d => drillIds.includes(d.drillId));
  return drill || null;
}

/**
 * Get all available drills
 */
export function getAllDrills(): DrillRecommendation[] {
  return [...AVAILABLE_DRILLS].sort((a, b) => b.priority - a.priority);
}

/**
 * Get drills by difficulty level
 */
export function getDrillsByDifficulty(difficulty: DrillRecommendation["difficulty"]): DrillRecommendation[] {
  return AVAILABLE_DRILLS.filter(d => d.difficulty === difficulty);
}
