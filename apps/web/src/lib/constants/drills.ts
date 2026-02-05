/**
 * Centralized drill/quiz type definitions and labels
 */

// ============================================
// Drill Types
// ============================================

export type DrillType =
  | "rfi"
  | "vs_rfi"
  | "vs_3bet"
  | "vs_4bet"
  | "push_fold"
  | "push_fold_defense"
  | "push_fold_resteal"
  | "push_fold_hu"
  | "table_trainer"
  | "postflop"
  | "multistreet"
  | "endless"
  | "flop_texture"
  | "texture_training";

// Drills that track progress in store (preflop focused)
export type TrackedDrillType =
  | "rfi"
  | "vs_rfi"
  | "vs_3bet"
  | "vs_4bet"
  | "push_fold"
  | "push_fold_defense"
  | "push_fold_resteal"
  | "push_fold_hu"
  | "table_trainer"
  | "postflop";

export const TRACKED_DRILL_TYPES: TrackedDrillType[] = [
  "rfi",
  "vs_rfi",
  "vs_3bet",
  "vs_4bet",
  "push_fold",
  "push_fold_defense",
  "push_fold_resteal",
  "push_fold_hu",
  "table_trainer",
  "postflop",
];

// ============================================
// Quiz Types
// ============================================

export type QuizType = "equity" | "outs" | "ev" | "logic" | "exploit";

export const QUIZ_TYPES: QuizType[] = ["equity", "outs", "ev", "logic", "exploit"];

// ============================================
// Positions
// ============================================

export const POSITIONS = ["UTG", "HJ", "CO", "BTN", "SB", "BB"] as const;
export type Position = (typeof POSITIONS)[number];

// ============================================
// Drill Labels
// ============================================

export interface DrillLabel {
  en: string;
  zh: string;
  href: string;
  description?: string;
  category: "preflop" | "postflop" | "mtt" | "quiz";
}

export const DRILL_LABELS: Record<DrillType, DrillLabel> = {
  rfi: {
    en: "RFI",
    zh: "RFI 開池",
    href: "/drill/rfi",
    category: "preflop",
  },
  vs_rfi: {
    en: "VS RFI",
    zh: "VS RFI",
    href: "/drill/vs-rfi",
    category: "preflop",
  },
  vs_3bet: {
    en: "VS 3-Bet",
    zh: "VS 3-Bet",
    href: "/drill/vs-3bet",
    category: "preflop",
  },
  vs_4bet: {
    en: "VS 4-Bet",
    zh: "VS 4-Bet",
    href: "/drill/vs-4bet",
    category: "preflop",
  },
  push_fold: {
    en: "Push/Fold",
    zh: "Push/Fold",
    href: "/drill/push-fold",
    category: "mtt",
  },
  push_fold_defense: {
    en: "P/F Defense",
    zh: "P/F 防守",
    href: "/drill/push-fold",
    category: "mtt",
  },
  push_fold_resteal: {
    en: "P/F Resteal",
    zh: "P/F 反偷",
    href: "/drill/push-fold",
    category: "mtt",
  },
  push_fold_hu: {
    en: "P/F Heads-Up",
    zh: "P/F 單挑",
    href: "/drill/push-fold",
    category: "mtt",
  },
  table_trainer: {
    en: "Table Trainer",
    zh: "牌桌訓練",
    href: "/drill/table-trainer",
    category: "postflop",
  },
  postflop: {
    en: "Postflop",
    zh: "翻後練習",
    href: "/drill/postflop",
    category: "postflop",
  },
  multistreet: {
    en: "Multi-Street",
    zh: "多街道",
    href: "/drill/multistreet",
    category: "postflop",
  },
  endless: {
    en: "Endless",
    zh: "無限練習",
    href: "/drill/endless",
    category: "preflop",
  },
  flop_texture: {
    en: "Flop Texture",
    zh: "牌面質地",
    href: "/drill/flop-texture",
    category: "postflop",
  },
  texture_training: {
    en: "Texture Training",
    zh: "質地訓練",
    href: "/drill/texture-training",
    category: "postflop",
  },
};

export const QUIZ_LABELS: Record<QuizType, DrillLabel> = {
  equity: {
    en: "Equity",
    zh: "勝率計算",
    href: "/quiz/equity",
    category: "quiz",
  },
  outs: {
    en: "Outs",
    zh: "補牌計算",
    href: "/quiz/outs",
    category: "quiz",
  },
  ev: {
    en: "EV",
    zh: "期望值",
    href: "/quiz/ev",
    category: "quiz",
  },
  logic: {
    en: "Logic",
    zh: "GTO 邏輯",
    href: "/quiz/logic",
    category: "quiz",
  },
  exploit: {
    en: "Exploit",
    zh: "剝削策略",
    href: "/quiz/exploit",
    category: "quiz",
  },
};

// ============================================
// URL Helpers
// ============================================

/**
 * Convert drill type (underscore) to URL path (hyphen)
 * e.g., "vs_rfi" -> "vs-rfi"
 */
export function drillTypeToPath(drillType: string): string {
  return drillType.replace(/_/g, "-");
}

/**
 * Convert URL path (hyphen) to drill type (underscore)
 * e.g., "vs-rfi" -> "vs_rfi"
 */
export function pathToDrillType(path: string): string {
  return path.replace(/-/g, "_");
}

/**
 * Get drill href from drill type
 */
export function getDrillHref(drillType: DrillType): string {
  return DRILL_LABELS[drillType]?.href || `/drill/${drillTypeToPath(drillType)}`;
}
