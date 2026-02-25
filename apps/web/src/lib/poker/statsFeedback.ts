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
  suggestion: string;
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

const FEEDBACK_TEMPLATES: Record<
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
    const template = FEEDBACK_TEMPLATES.vpip[vpipStatus === "too_high" ? "tooHigh" : "tooLow"];
    feedback.push({
      stat: "VPIP",
      statZh: "自願進池率",
      value: vpip,
      target: [STAT_TARGETS.vpip.min, STAT_TARGETS.vpip.max],
      status: vpipStatus,
      feedback: template.feedback,
      suggestion: template.suggestion,
      priority: 5, // VPIP 最重要
    });
  }

  // PFR Analysis
  const pfr = getPlayerPFR(stats);
  const pfrStatus = analyzeStatValue(pfr, STAT_TARGETS.pfr.min, STAT_TARGETS.pfr.max);
  if (pfrStatus !== "good") {
    const template = FEEDBACK_TEMPLATES.pfr[pfrStatus === "too_high" ? "tooHigh" : "tooLow"];
    feedback.push({
      stat: "PFR",
      statZh: "翻前加注率",
      value: pfr,
      target: [STAT_TARGETS.pfr.min, STAT_TARGETS.pfr.max],
      status: pfrStatus,
      feedback: template.feedback,
      suggestion: template.suggestion,
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
    const template =
      FEEDBACK_TEMPLATES.threeBet[threeBetStatus === "too_high" ? "tooHigh" : "tooLow"];
    feedback.push({
      stat: "3-Bet",
      statZh: "3-Bet 頻率",
      value: threeBet,
      target: [STAT_TARGETS.threeBet.min, STAT_TARGETS.threeBet.max],
      status: threeBetStatus,
      feedback: template.feedback,
      suggestion: template.suggestion,
      priority: 4,
    });
  }

  // ATS Analysis
  const ats = getPlayerATS(stats);
  const atsStatus = analyzeStatValue(ats, STAT_TARGETS.ats.min, STAT_TARGETS.ats.max);
  if (atsStatus !== "good") {
    const template = FEEDBACK_TEMPLATES.ats[atsStatus === "too_high" ? "tooHigh" : "tooLow"];
    feedback.push({
      stat: "ATS",
      statZh: "偷盲嘗試率",
      value: ats,
      target: [STAT_TARGETS.ats.min, STAT_TARGETS.ats.max],
      status: atsStatus,
      feedback: template.feedback,
      suggestion: template.suggestion,
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
    const template =
      FEEDBACK_TEMPLATES.flopCbet[flopCbetStatus === "too_high" ? "tooHigh" : "tooLow"];
    feedback.push({
      stat: "Flop CB",
      statZh: "翻牌 C-Bet",
      value: flopCbet,
      target: [STAT_TARGETS.flopCbet.min, STAT_TARGETS.flopCbet.max],
      status: flopCbetStatus,
      feedback: template.feedback,
      suggestion: template.suggestion,
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
    const template =
      FEEDBACK_TEMPLATES.foldToCbet[foldToCbetStatus === "too_high" ? "tooHigh" : "tooLow"];
    feedback.push({
      stat: "Fold to CB",
      statZh: "面對 C-Bet 棄牌率",
      value: foldToCbet,
      target: [STAT_TARGETS.foldToCbet.min, STAT_TARGETS.foldToCbet.max],
      status: foldToCbetStatus,
      feedback: template.feedback,
      suggestion: template.suggestion,
      priority: 2,
    });
  }

  // WTSD Analysis
  const wtsd = getWTSD(stats);
  const wtsdStatus = analyzeStatValue(wtsd, STAT_TARGETS.wtsd.min, STAT_TARGETS.wtsd.max);
  if (wtsdStatus !== "good") {
    const template = FEEDBACK_TEMPLATES.wtsd[wtsdStatus === "too_high" ? "tooHigh" : "tooLow"];
    feedback.push({
      stat: "WTSD",
      statZh: "攤牌率",
      value: wtsd,
      target: [STAT_TARGETS.wtsd.min, STAT_TARGETS.wtsd.max],
      status: wtsdStatus,
      feedback: template.feedback,
      suggestion: template.suggestion,
      priority: 2,
    });
  }

  // W$SD Analysis
  const wsd = getWSD(stats);
  const wsdStatus = analyzeStatValue(wsd, STAT_TARGETS.wsd.min, STAT_TARGETS.wsd.max);
  if (wsdStatus !== "good") {
    const template = FEEDBACK_TEMPLATES.wsd[wsdStatus === "too_high" ? "tooHigh" : "tooLow"];
    feedback.push({
      stat: "W$SD",
      statZh: "攤牌勝率",
      value: wsd,
      target: [STAT_TARGETS.wsd.min, STAT_TARGETS.wsd.max],
      status: wsdStatus,
      feedback: template.feedback,
      suggestion: template.suggestion,
      priority: 2,
    });
  }

  // TAF Analysis
  const taf = getTAF(stats);
  const tafStatus = analyzeStatValue(taf, STAT_TARGETS.taf.min, STAT_TARGETS.taf.max);
  if (tafStatus !== "good") {
    const template = FEEDBACK_TEMPLATES.taf[tafStatus === "too_high" ? "tooHigh" : "tooLow"];
    feedback.push({
      stat: "TAF",
      statZh: "侵略因子",
      value: taf,
      target: [STAT_TARGETS.taf.min, STAT_TARGETS.taf.max],
      status: tafStatus,
      feedback: template.feedback,
      suggestion: template.suggestion,
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
  levelZh: string;
  description: string;
} {
  const feedback = analyzePlayerStats(stats);
  const highPriorityIssues = feedback.filter((f) => f.priority >= 4).length;
  const totalIssues = feedback.length;

  if (totalIssues === 0) {
    return {
      level: "excellent",
      levelZh: "優秀",
      description: "你的數據非常接近 GTO！繼續保持。",
    };
  }

  if (highPriorityIssues === 0 && totalIssues <= 2) {
    return {
      level: "good",
      levelZh: "良好",
      description: "整體表現不錯，有小幅改進空間。",
    };
  }

  if (highPriorityIssues <= 1) {
    return {
      level: "needs_work",
      levelZh: "需改進",
      description: "有些關鍵數據偏離 GTO，建議針對性練習。",
    };
  }

  return {
    level: "poor",
    levelZh: "需加強",
    description: "多個核心數據偏離目標，建議系統性學習。",
  };
}
