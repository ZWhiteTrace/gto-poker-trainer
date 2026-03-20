import type { Metadata } from "next";
import { createPageMetadata, type AppLocale, toAppLocale } from "@/lib/metadata";

type SectionKey =
  | "achievements"
  | "analyze"
  | "blog"
  | "exam"
  | "leaderboard"
  | "learn"
  | "mtt-icm"
  | "mtt-push-fold"
  | "privacy"
  | "profile"
  | "progress"
  | "quiz"
  | "quiz-equity"
  | "quiz-ev"
  | "quiz-exploit"
  | "quiz-logic"
  | "quiz-outs"
  | "range"
  | "stats"
  | "terms";

type SectionCopy = {
  path: string;
  title: Record<AppLocale, string>;
  description: Record<AppLocale, string>;
  robots?: Metadata["robots"];
};

const SECTION_METADATA: Record<SectionKey, SectionCopy> = {
  achievements: {
    path: "/achievements",
    title: {
      "zh-TW": "成就系統 - 解鎖德撲訓練徽章",
      en: "Achievements - Unlock Poker Training Badges",
    },
    description: {
      "zh-TW": "通過練習解鎖成就徽章。里程碑成就、連勝成就、準確率成就等，讓訓練更有成就感。",
      en: "Unlock milestone, streak, and accuracy badges as you progress through your poker training.",
    },
  },
  analyze: {
    path: "/analyze",
    title: {
      "zh-TW": "手牌歷史分析 - 找出你的 GTO 漏洞",
      en: "Hand History Analyzer - Find Your GTO Leaks",
    },
    description: {
      "zh-TW": "上傳 GGPoker 手牌歷史，AI 自動分析你的翻前漏洞。找出 RFI、3-bet、4-bet 決策中的錯誤，提供改進建議。",
      en: "Upload GGPoker hand histories and get AI analysis for preflop leaks across RFI, 3-bet, and 4-bet decisions.",
    },
  },
  blog: {
    path: "/blog",
    title: {
      "zh-TW": "撲克策略文章 - GTO Poker Trainer",
      en: "Poker Strategy Articles - GTO Poker Trainer",
    },
    description: {
      "zh-TW": "閱讀最新的德州撲克策略文章。GTO 理論解析、實戰技巧、手牌分析等高質量中文內容。",
      en: "Read poker strategy articles covering GTO concepts, practical adjustments, and hand analysis.",
    },
  },
  exam: {
    path: "/exam",
    title: {
      "zh-TW": "GTO 模擬考 - 綜合德撲知識測驗",
      en: "GTO Mock Exam - Comprehensive Poker Knowledge Test",
    },
    description: {
      "zh-TW": "用計時測驗檢驗你的 GTO 知識。涵蓋 GTO 理論、手牌勝率、位置策略、Push/Fold 決策等綜合內容。",
      en: "Take a timed exam covering GTO theory, equity, positional strategy, and push-fold decisions.",
    },
  },
  leaderboard: {
    path: "/leaderboard",
    title: {
      "zh-TW": "排行榜 - 德撲訓練玩家排名",
      en: "Leaderboard - Poker Training Rankings",
    },
    description: {
      "zh-TW": "查看 GTO Poker Trainer 玩家排名。比較練習手數、準確率和連勝記錄，與其他玩家一較高下。",
      en: "Compare hand volume, accuracy, and streaks with other GTO Poker Trainer players.",
    },
  },
  learn: {
    path: "/learn",
    title: {
      "zh-TW": "學習中心 - GTO Poker Trainer",
      en: "Learning Center - GTO Poker Strategy Guides",
    },
    description: {
      "zh-TW": "深入學習 GTO 撲克策略：翻前範圍、3-bet 應對、Push/Fold、ICM 計算等",
      en: "Study structured guides on preflop ranges, 3-bet defense, push-fold play, ICM, and postflop strategy.",
    },
  },
  "mtt-icm": {
    path: "/mtt/icm",
    title: {
      "zh-TW": "ICM 計算器 - 錦標賽籌碼價值計算",
      en: "ICM Calculator - Tournament Chip Value Tool",
    },
    description: {
      "zh-TW": "免費在線 ICM 計算器。計算錦標賽中籌碼的真實美元價值，理解泡沫期和決賽桌的 ICM 壓力。",
      en: "Calculate tournament chip value online and understand ICM pressure on bubbles and final tables.",
    },
  },
  "mtt-push-fold": {
    path: "/mtt/push-fold",
    title: {
      "zh-TW": "Push/Fold 圖表 - MTT 錦標賽短籌碼策略",
      en: "Push/Fold Charts - MTT Short Stack Strategy",
    },
    description: {
      "zh-TW": "基於 Nash 均衡的 Push/Fold 圖表。查看 3-15BB 各位置的最優全下範圍，掌握錦標賽生存策略。",
      en: "Study Nash-based push-fold ranges for 3-15BB tournament spots and improve short stack decisions.",
    },
  },
  privacy: {
    path: "/privacy",
    title: {
      "zh-TW": "隱私政策 - GTO Poker Trainer",
      en: "Privacy Policy - GTO Poker Trainer",
    },
    description: {
      "zh-TW": "GTO Poker Trainer 的隱私政策。了解我們如何收集、使用和保護你的個人資訊。",
      en: "Learn how GTO Poker Trainer collects, uses, and protects your personal information.",
    },
  },
  profile: {
    path: "/profile",
    title: {
      "zh-TW": "個人檔案 - GTO 撲克訓練器",
      en: "Profile - GTO Poker Trainer",
    },
    description: {
      "zh-TW": "管理你的 GTO 訓練器個人檔案。查看等級、成就、訓練記錄，自訂偏好設定。",
      en: "Manage your training profile, review your level and achievements, and adjust your preferences.",
    },
    robots: { index: false, follow: true },
  },
  progress: {
    path: "/progress",
    title: {
      "zh-TW": "學習進度 - 追蹤你的訓練數據",
      en: "Learning Progress - Track Your Training Data",
    },
    description: {
      "zh-TW": "查看你的 GTO 訓練進度。統計各練習類型的準確率、弱點區域分析、歷史活動記錄。",
      en: "Review your training progress with drill accuracy, weakness analysis, and activity history.",
    },
  },
  quiz: {
    path: "/quiz",
    title: {
      "zh-TW": "撲克測驗中心 - 檢驗你的德撲知識",
      en: "Poker Quiz Center - Test Your Hold'em Knowledge",
    },
    description: {
      "zh-TW": "通過互動測驗檢驗你的撲克知識。包含勝率計算、Outs 計算、EV 期望值、GTO 邏輯等多種測驗類型。",
      en: "Challenge yourself with quizzes on equity, outs, EV, GTO logic, and exploit strategy.",
    },
  },
  "quiz-equity": {
    path: "/quiz/equity",
    title: {
      "zh-TW": "勝率計算測驗 - Equity 練習",
      en: "Equity Quiz - Preflop Equity Practice",
    },
    description: {
      "zh-TW": "測試你對翻前手牌勝率的理解。練習計算 AA vs KK、AK vs 對子等常見對決的勝率，提升概率直覺。",
      en: "Practice common preflop equity matchups like AA vs KK and AK vs pairs to sharpen your intuition.",
    },
  },
  "quiz-ev": {
    path: "/quiz/ev",
    title: {
      "zh-TW": "EV 期望值計算測驗 - 底池賠率練習",
      en: "EV Quiz - Pot Odds and Expected Value Practice",
    },
    description: {
      "zh-TW": "練習計算期望值（EV）和底池賠率。學會判斷跟注是否有利可圖，用數學思維做出正確決策。",
      en: "Practice EV and pot odds calculations so you can make stronger math-driven decisions at the table.",
    },
  },
  "quiz-exploit": {
    path: "/quiz/exploit",
    title: {
      "zh-TW": "剝削策略測驗 - Exploit 對手弱點",
      en: "Exploit Quiz - Punish Opponent Leaks",
    },
    description: {
      "zh-TW": "學習根據對手類型調整 GTO 策略。針對跟注站、緊弱型、激進魚等不同玩家類型制定剝削策略。",
      en: "Learn how to adjust beyond baseline GTO against calling stations, nits, and aggressive fish.",
    },
  },
  "quiz-logic": {
    path: "/quiz/logic",
    title: {
      "zh-TW": "GTO 邏輯測驗 - 博弈論原理理解",
      en: "GTO Logic Quiz - Understand Game Theory Principles",
    },
    description: {
      "zh-TW": "測試你對 GTO 博弈論原理的理解。學習平衡範圍、剝削策略、混合頻率等核心概念。",
      en: "Test your understanding of balanced ranges, mixed frequencies, and exploitative adjustments.",
    },
  },
  "quiz-outs": {
    path: "/quiz/outs",
    title: {
      "zh-TW": "Outs 計算測驗 - 聽牌出路練習",
      en: "Outs Quiz - Draw Counting Practice",
    },
    description: {
      "zh-TW": "練習計算翻後聽牌的 Outs 數量。同花聽牌、順子聽牌、組合聽牌，快速判斷改進概率。",
      en: "Practice counting outs for flush draws, straight draws, and combo draws to improve postflop intuition.",
    },
  },
  range: {
    path: "/range",
    title: {
      "zh-TW": "GTO 範圍表查看器 - 翻前範圍可視化",
      en: "GTO Range Viewer - Visualize Preflop Charts",
    },
    description: {
      "zh-TW": "以 13x13 網格可視化查看 GTO 翻前範圍。包含 RFI、VS RFI、VS 3-Bet、VS 4-Bet 的完整範圍表。",
      en: "Browse GTO preflop charts in a 13x13 grid for RFI, vs RFI, vs 3-bet, and vs 4-bet spots.",
    },
  },
  stats: {
    path: "/stats",
    title: {
      "zh-TW": "練習統計 - 追蹤你的 GTO 訓練表現",
      en: "Training Stats - Track Your GTO Practice Performance",
    },
    description: {
      "zh-TW": "查看詳細的 GTO 訓練統計數據。各位置準確率、練習趨勢圖表、弱點分析，幫你針對性提升。",
      en: "Review accuracy by position, training trends, and leak analysis to improve with focused practice.",
    },
  },
  terms: {
    path: "/terms",
    title: {
      "zh-TW": "服務條款 - GTO Poker Trainer",
      en: "Terms of Service - GTO Poker Trainer",
    },
    description: {
      "zh-TW": "GTO Poker Trainer 的服務條款。使用本網站前請閱讀並了解相關條款和條件。",
      en: "Read the terms and conditions for using GTO Poker Trainer.",
    },
  },
};

export function createSectionMetadata(locale: string, sectionKey: SectionKey): Metadata {
  const appLocale = toAppLocale(locale);
  const metadata = SECTION_METADATA[sectionKey];
  const pageMetadata = createPageMetadata({
    locale: appLocale,
    path: metadata.path,
    title: metadata.title[appLocale],
    description: metadata.description[appLocale],
  });

  if (!metadata.robots) {
    return pageMetadata;
  }

  return {
    ...pageMetadata,
    robots: metadata.robots,
  };
}
