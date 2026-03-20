// ============================================
// Player Stats Feedback System
// 統計分析與可執行建議
// ============================================

import type { HeroStats } from "./types";
import {
  getPlayerVPIP,
  getPlayerPFR,
  getPlayer3Bet,
  getPlayerATS,
  getFlopCBet,
  getFoldToCBet,
  getWTSD,
  getWSD,
  getTAF,
} from "./playerStats";

// ============================================
// Types
// ============================================

export type StatStatus = "good" | "too_high" | "too_low";

export interface StatFeedback {
  stat: string;
  statZh: string;
  value: number;
  target: [number, number];
  status: StatStatus;
  feedback: string;
  feedbackZh: string;
  suggestion: string;
  suggestionZh: string;
  priority: number; // 1-5, higher = more important
}

// ============================================
// Constants
// ============================================

export const STATS_THRESHOLDS = {
  BASIC: 30, // 基礎統計 (VPIP, PFR)
  FULL: 100, // 完整統計 + 分析建議
} as const;

// GTO 目標範圍 (6-max cash game)
const STAT_TARGETS = {
  vpip: { min: 0.22, max: 0.26, name: "VPIP", nameZh: "自願進池率" },
  pfr: { min: 0.18, max: 0.22, name: "PFR", nameZh: "翻前加注率" },
  threeBet: { min: 0.08, max: 0.12, name: "3-Bet", nameZh: "3-Bet 頻率" },
  ats: { min: 0.32, max: 0.38, name: "ATS", nameZh: "偷盲嘗試率" },
  flopCbet: { min: 0.5, max: 0.6, name: "Flop CB", nameZh: "翻牌 C-Bet" },
  foldToCbet: { min: 0.38, max: 0.45, name: "Fold to CB", nameZh: "棄牌率" },
  wtsd: { min: 0.26, max: 0.32, name: "WTSD", nameZh: "攤牌率" },
  wsd: { min: 0.5, max: 0.55, name: "W$SD", nameZh: "攤牌勝率" },
  taf: { min: 1.8, max: 2.5, name: "TAF", nameZh: "侵略因子" },
} as const;

// ============================================
// Feedback Templates
// ============================================

const FEEDBACK_TEMPLATES_ZH: Record<
  string,
  {
    tooHigh: { feedback: string; suggestion: string };
    tooLow: { feedback: string; suggestion: string };
  }
> = {
  vpip: {
    tooHigh: {
      feedback: "你打得太鬆了，進入太多底池",
      suggestion: "收緊範圍：只在有位置時玩 speculative hands，減少 OOP 進池",
    },
    tooLow: {
      feedback: "你打得太緊了，錯過許多賺錢機會",
      suggestion: "放寬範圍：增加 suited connectors (76s, 98s) 和 suited Ax",
    },
  },
  pfr: {
    tooHigh: {
      feedback: "翻前加注過於頻繁，範圍太寬",
      suggestion: "減少邊緣加注：收緊 3-bet 和 open raise 範圍",
    },
    tooLow: {
      feedback: "太被動了，錯過了主動權",
      suggestion: "增加加注頻率：不要 limp，用加注取代跟注",
    },
  },
  threeBet: {
    tooHigh: {
      feedback: "3-Bet 過於頻繁，範圍太寬",
      suggestion: "減少詐唬 3-bet：保留 A5s, 67s 等阻擋牌，減少隨機詐唬",
    },
    tooLow: {
      feedback: "3-Bet 不足，讓對手太舒服",
      suggestion: "增加 3-bet bluffs：用 A2s-A5s, 67s, 78s 等詐唬 3-bet",
    },
  },
  ats: {
    tooHigh: {
      feedback: "偷盲過於頻繁，被 3-bet 剝削",
      suggestion: "選擇更好的偷盲時機：注意大盲玩家的防守傾向",
    },
    tooLow: {
      feedback: "偷盲不夠積極，浪費位置優勢",
      suggestion: "更積極偷盲：BTN 可以 open 40%+, CO 可以 open 28%+",
    },
  },
  flopCbet: {
    tooHigh: {
      feedback: "C-Bet 過於頻繁，空氣牌下注太多",
      suggestion: "減少 C-bet：在濕潤牌面和多人底池更多 check",
    },
    tooLow: {
      feedback: "C-Bet 不足，錯過價值和詐唬機會",
      suggestion: "增加 C-bet：乾燥牌面和單挑底池應該更常下注",
    },
  },
  foldToCbet: {
    tooHigh: {
      feedback: "面對 C-Bet 棄牌太多，被詐唬剝削",
      suggestion: "減少棄牌：用更多 floats 和 check-raises 對抗",
    },
    tooLow: {
      feedback: "面對 C-Bet 跟注太多，付出太多價值",
      suggestion: "增加棄牌：沒有牌力和 equity 時果斷放棄",
    },
  },
  wtsd: {
    tooHigh: {
      feedback: "攤牌率過高，跟注太多河牌",
      suggestion: "減少 bluff-catch：沒有明確理由時不要接池",
    },
    tooLow: {
      feedback: "攤牌率過低，被詐唬太多",
      suggestion: "增加 bluff-catch：用有阻擋牌的中等牌接池",
    },
  },
  wsd: {
    tooHigh: {
      feedback: "攤牌勝率很高，但可能打得太緊",
      suggestion: "可以稍微放寬攤牌範圍，增加邊緣 call",
    },
    tooLow: {
      feedback: "攤牌勝率低，可能接池太鬆",
      suggestion: "收緊接池範圍：只用強牌和好的阻擋牌 call down",
    },
  },
  taf: {
    tooHigh: {
      feedback: "打法過於激進，詐唬太多",
      suggestion: "平衡價值和詐唬比例：減少薄詐唬",
    },
    tooLow: {
      feedback: "打法過於被動，錯過詐唬機會",
      suggestion: "增加詐唬頻率：用聽牌和阻擋牌 semi-bluff",
    },
  },
};

const FEEDBACK_TEMPLATES_EN: Record<
  string,
  {
    tooHigh: { feedback: string; suggestion: string };
    tooLow: { feedback: string; suggestion: string };
  }
> = {
  vpip: {
    tooHigh: {
      feedback: "You are entering too many pots.",
      suggestion: "Tighten up: keep speculative hands mostly in position and cut back on out-of-position entries.",
    },
    tooLow: {
      feedback: "You are playing too tight and leaving money behind.",
      suggestion: "Widen up: add more suited connectors like 76s/98s and more suited Ax opens.",
    },
  },
  pfr: {
    tooHigh: {
      feedback: "Your preflop raising frequency is too high for the range quality.",
      suggestion: "Trim the fringe: tighten your 3-bet and open-raise ranges.",
    },
    tooLow: {
      feedback: "You are too passive preflop and giving up initiative.",
      suggestion: "Raise more often: stop limping and replace too many flats with raises.",
    },
  },
  threeBet: {
    tooHigh: {
      feedback: "You are 3-betting too aggressively with too many weak combos.",
      suggestion: "Reduce random bluff 3-bets and keep better blocker-based candidates like A5s or 67s.",
    },
    tooLow: {
      feedback: "Your 3-bet frequency is too low and opponents get to play too comfortably.",
      suggestion: "Add more bluff 3-bets with hands like A2s-A5s, 67s, and 78s.",
    },
  },
  ats: {
    tooHigh: {
      feedback: "You are stealing too often and opening yourself up to 3-bet punishment.",
      suggestion: "Choose better steal spots and pay more attention to blind defense tendencies.",
    },
    tooLow: {
      feedback: "You are not stealing enough and wasting positional edge.",
      suggestion: "Steal more aggressively: BTN can usually open 40%+ and CO around 28%+.",
    },
  },
  flopCbet: {
    tooHigh: {
      feedback: "You are c-betting too often with too much air.",
      suggestion: "Check more on wet boards and in multiway pots.",
    },
    tooLow: {
      feedback: "You are missing too many value bets and bluff spots with c-bets.",
      suggestion: "Bet more often on dry boards and in heads-up pots.",
    },
  },
  foldToCbet: {
    tooHigh: {
      feedback: "You fold too much versus c-bets and get run over.",
      suggestion: "Defend more with floats and check-raises in the right spots.",
    },
    tooLow: {
      feedback: "You call c-bets too often and pay off too much value.",
      suggestion: "Fold more decisively when you lack showdown value and usable equity.",
    },
  },
  wtsd: {
    tooHigh: {
      feedback: "Your showdown frequency is too high and you are calling down too wide.",
      suggestion: "Cut back on bluff-catching unless you have a clear reason to continue.",
    },
    tooLow: {
      feedback: "Your showdown frequency is too low and you may be over-folding to pressure.",
      suggestion: "Bluff-catch a bit more with medium-strength hands that block value.",
    },
  },
  wsd: {
    tooHigh: {
      feedback: "Your win-at-showdown is very high, which can mean you are arriving too tight.",
      suggestion: "You can widen some showdown decisions and add a few more marginal bluff-catches.",
    },
    tooLow: {
      feedback: "Your win-at-showdown is low and you may be hero-calling too loose.",
      suggestion: "Tighten your call-down range and continue mostly with strong hands plus good blockers.",
    },
  },
  taf: {
    tooHigh: {
      feedback: "Your aggression factor is too high and you are likely over-bluffing.",
      suggestion: "Rebalance value versus bluffs and cut back on thin bluff lines.",
    },
    tooLow: {
      feedback: "Your aggression factor is too low and you are missing bluff opportunities.",
      suggestion: "Add more semi-bluffs with draws and blocker-heavy hands.",
    },
  },
};

// ============================================
// Analysis Functions
// ============================================

function analyzeStatValue(value: number, min: number, max: number): StatStatus {
  if (value < min) return "too_low";
  if (value > max) return "too_high";
  return "good";
}

/**
 * 分析玩家統計數據，生成可執行反饋
 */
export function analyzePlayerStats(stats: HeroStats): StatFeedback[] {
  const feedback: StatFeedback[] = [];

  // VPIP Analysis
  const vpip = getPlayerVPIP(stats);
  const vpipStatus = analyzeStatValue(vpip, STAT_TARGETS.vpip.min, STAT_TARGETS.vpip.max);
  if (vpipStatus !== "good") {
    const templateKey = vpipStatus === "too_high" ? "tooHigh" : "tooLow";
    const templateEn = FEEDBACK_TEMPLATES_EN.vpip[templateKey];
    const templateZh = FEEDBACK_TEMPLATES_ZH.vpip[templateKey];
    feedback.push({
      stat: "VPIP",
      statZh: "自願進池率",
      value: vpip,
      target: [STAT_TARGETS.vpip.min, STAT_TARGETS.vpip.max],
      status: vpipStatus,
      feedback: templateEn.feedback,
      feedbackZh: templateZh.feedback,
      suggestion: templateEn.suggestion,
      suggestionZh: templateZh.suggestion,
      priority: 5, // VPIP 最重要
    });
  }

  // PFR Analysis
  const pfr = getPlayerPFR(stats);
  const pfrStatus = analyzeStatValue(pfr, STAT_TARGETS.pfr.min, STAT_TARGETS.pfr.max);
  if (pfrStatus !== "good") {
    const templateKey = pfrStatus === "too_high" ? "tooHigh" : "tooLow";
    const templateEn = FEEDBACK_TEMPLATES_EN.pfr[templateKey];
    const templateZh = FEEDBACK_TEMPLATES_ZH.pfr[templateKey];
    feedback.push({
      stat: "PFR",
      statZh: "翻前加注率",
      value: pfr,
      target: [STAT_TARGETS.pfr.min, STAT_TARGETS.pfr.max],
      status: pfrStatus,
      feedback: templateEn.feedback,
      feedbackZh: templateZh.feedback,
      suggestion: templateEn.suggestion,
      suggestionZh: templateZh.suggestion,
      priority: 5,
    });
  }

  // 3-Bet Analysis
  const threeBet = getPlayer3Bet(stats);
  const threeBetStatus = analyzeStatValue(
    threeBet,
    STAT_TARGETS.threeBet.min,
    STAT_TARGETS.threeBet.max
  );
  if (threeBetStatus !== "good") {
    const templateKey = threeBetStatus === "too_high" ? "tooHigh" : "tooLow";
    const templateEn = FEEDBACK_TEMPLATES_EN.threeBet[templateKey];
    const templateZh = FEEDBACK_TEMPLATES_ZH.threeBet[templateKey];
    feedback.push({
      stat: "3-Bet",
      statZh: "3-Bet 頻率",
      value: threeBet,
      target: [STAT_TARGETS.threeBet.min, STAT_TARGETS.threeBet.max],
      status: threeBetStatus,
      feedback: templateEn.feedback,
      feedbackZh: templateZh.feedback,
      suggestion: templateEn.suggestion,
      suggestionZh: templateZh.suggestion,
      priority: 4,
    });
  }

  // ATS Analysis
  const ats = getPlayerATS(stats);
  const atsStatus = analyzeStatValue(ats, STAT_TARGETS.ats.min, STAT_TARGETS.ats.max);
  if (atsStatus !== "good") {
    const templateKey = atsStatus === "too_high" ? "tooHigh" : "tooLow";
    const templateEn = FEEDBACK_TEMPLATES_EN.ats[templateKey];
    const templateZh = FEEDBACK_TEMPLATES_ZH.ats[templateKey];
    feedback.push({
      stat: "ATS",
      statZh: "偷盲嘗試率",
      value: ats,
      target: [STAT_TARGETS.ats.min, STAT_TARGETS.ats.max],
      status: atsStatus,
      feedback: templateEn.feedback,
      feedbackZh: templateZh.feedback,
      suggestion: templateEn.suggestion,
      suggestionZh: templateZh.suggestion,
      priority: 3,
    });
  }

  // Flop C-Bet Analysis
  const flopCbet = getFlopCBet(stats);
  const flopCbetStatus = analyzeStatValue(
    flopCbet,
    STAT_TARGETS.flopCbet.min,
    STAT_TARGETS.flopCbet.max
  );
  if (flopCbetStatus !== "good") {
    const templateKey = flopCbetStatus === "too_high" ? "tooHigh" : "tooLow";
    const templateEn = FEEDBACK_TEMPLATES_EN.flopCbet[templateKey];
    const templateZh = FEEDBACK_TEMPLATES_ZH.flopCbet[templateKey];
    feedback.push({
      stat: "Flop CB",
      statZh: "翻牌 C-Bet",
      value: flopCbet,
      target: [STAT_TARGETS.flopCbet.min, STAT_TARGETS.flopCbet.max],
      status: flopCbetStatus,
      feedback: templateEn.feedback,
      feedbackZh: templateZh.feedback,
      suggestion: templateEn.suggestion,
      suggestionZh: templateZh.suggestion,
      priority: 3,
    });
  }

  // Fold to C-Bet Analysis
  const foldToCbet = getFoldToCBet(stats);
  const foldToCbetStatus = analyzeStatValue(
    foldToCbet,
    STAT_TARGETS.foldToCbet.min,
    STAT_TARGETS.foldToCbet.max
  );
  if (foldToCbetStatus !== "good") {
    const templateKey = foldToCbetStatus === "too_high" ? "tooHigh" : "tooLow";
    const templateEn = FEEDBACK_TEMPLATES_EN.foldToCbet[templateKey];
    const templateZh = FEEDBACK_TEMPLATES_ZH.foldToCbet[templateKey];
    feedback.push({
      stat: "Fold to CB",
      statZh: "面對 C-Bet 棄牌率",
      value: foldToCbet,
      target: [STAT_TARGETS.foldToCbet.min, STAT_TARGETS.foldToCbet.max],
      status: foldToCbetStatus,
      feedback: templateEn.feedback,
      feedbackZh: templateZh.feedback,
      suggestion: templateEn.suggestion,
      suggestionZh: templateZh.suggestion,
      priority: 2,
    });
  }

  // WTSD Analysis
  const wtsd = getWTSD(stats);
  const wtsdStatus = analyzeStatValue(wtsd, STAT_TARGETS.wtsd.min, STAT_TARGETS.wtsd.max);
  if (wtsdStatus !== "good") {
    const templateKey = wtsdStatus === "too_high" ? "tooHigh" : "tooLow";
    const templateEn = FEEDBACK_TEMPLATES_EN.wtsd[templateKey];
    const templateZh = FEEDBACK_TEMPLATES_ZH.wtsd[templateKey];
    feedback.push({
      stat: "WTSD",
      statZh: "攤牌率",
      value: wtsd,
      target: [STAT_TARGETS.wtsd.min, STAT_TARGETS.wtsd.max],
      status: wtsdStatus,
      feedback: templateEn.feedback,
      feedbackZh: templateZh.feedback,
      suggestion: templateEn.suggestion,
      suggestionZh: templateZh.suggestion,
      priority: 2,
    });
  }

  // W$SD Analysis
  const wsd = getWSD(stats);
  const wsdStatus = analyzeStatValue(wsd, STAT_TARGETS.wsd.min, STAT_TARGETS.wsd.max);
  if (wsdStatus !== "good") {
    const templateKey = wsdStatus === "too_high" ? "tooHigh" : "tooLow";
    const templateEn = FEEDBACK_TEMPLATES_EN.wsd[templateKey];
    const templateZh = FEEDBACK_TEMPLATES_ZH.wsd[templateKey];
    feedback.push({
      stat: "W$SD",
      statZh: "攤牌勝率",
      value: wsd,
      target: [STAT_TARGETS.wsd.min, STAT_TARGETS.wsd.max],
      status: wsdStatus,
      feedback: templateEn.feedback,
      feedbackZh: templateZh.feedback,
      suggestion: templateEn.suggestion,
      suggestionZh: templateZh.suggestion,
      priority: 2,
    });
  }

  // TAF Analysis
  const taf = getTAF(stats);
  const tafStatus = analyzeStatValue(taf, STAT_TARGETS.taf.min, STAT_TARGETS.taf.max);
  if (tafStatus !== "good") {
    const templateKey = tafStatus === "too_high" ? "tooHigh" : "tooLow";
    const templateEn = FEEDBACK_TEMPLATES_EN.taf[templateKey];
    const templateZh = FEEDBACK_TEMPLATES_ZH.taf[templateKey];
    feedback.push({
      stat: "TAF",
      statZh: "侵略因子",
      value: taf,
      target: [STAT_TARGETS.taf.min, STAT_TARGETS.taf.max],
      status: tafStatus,
      feedback: templateEn.feedback,
      feedbackZh: templateZh.feedback,
      suggestion: templateEn.suggestion,
      suggestionZh: templateZh.suggestion,
      priority: 1,
    });
  }

  // Sort by priority (highest first)
  return feedback.sort((a, b) => b.priority - a.priority);
}

/**
 * 取得玩家最需要改進的領域（最多 3 個）
 */
export function getTopImprovementAreas(stats: HeroStats, limit = 3): StatFeedback[] {
  const allFeedback = analyzePlayerStats(stats);
  return allFeedback.slice(0, limit);
}

/**
 * 判斷玩家整體表現等級
 */
export function getOverallPerformance(stats: HeroStats): {
  level: "excellent" | "good" | "needs_work" | "poor";
  levelLabel: string;
  levelZh: string;
  description: string;
  descriptionZh: string;
} {
  const feedback = analyzePlayerStats(stats);
  const highPriorityIssues = feedback.filter((f) => f.priority >= 4).length;
  const totalIssues = feedback.length;

  if (totalIssues === 0) {
    return {
      level: "excellent",
      levelLabel: "Excellent",
      levelZh: "優秀",
      description: "Your stats are very close to GTO baselines. Keep the process stable.",
      descriptionZh: "你的數據非常接近 GTO！繼續保持。",
    };
  }

  if (highPriorityIssues === 0 && totalIssues <= 2) {
    return {
      level: "good",
      levelLabel: "Good",
      levelZh: "良好",
      description: "Overall performance is solid with a few manageable leaks to clean up.",
      descriptionZh: "整體表現不錯，有小幅改進空間。",
    };
  }

  if (highPriorityIssues <= 1) {
    return {
      level: "needs_work",
      levelLabel: "Needs Work",
      levelZh: "需改進",
      description: "Some important stats are drifting away from target and need focused reps.",
      descriptionZh: "有些關鍵數據偏離 GTO，建議針對性練習。",
    };
  }

  return {
    level: "poor",
    levelLabel: "Needs Improvement",
    levelZh: "需加強",
    description: "Several core stats are off target. This needs a more systematic correction pass.",
    descriptionZh: "多個核心數據偏離目標，建議系統性學習。",
  };
}
