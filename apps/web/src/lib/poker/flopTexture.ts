/**
 * Flop Texture Analysis System
 * Based on Gareth James' 12-category rank-structure framework
 * with suit distribution as an orthogonal overlay dimension.
 *
 * Reference: MTT Poker School OTB #048, PokerListings "Poker Math" series
 */

import type { Suit, Rank } from "./types";

// ============================================
// Types
// ============================================

/**
 * Gareth James 12 flop texture categories (rank-structure oriented).
 * Suit overlay (rainbow/twotone/monotone) is tracked separately.
 */
export type FlopTextureType =
  | "ABB" // Ace + 2 Broadway (AKQ, AKJ, AKT, AQJ, AQT, AJT)
  | "ABx" // Ace + 1 Broadway + 1 low card
  | "Axx" // Ace + 2 low cards (9 or below)
  | "BBB" // 3 Broadway no Ace (KQJ, KQT, KJT, QJT)
  | "BBx" // 2 Broadway + 1 low card
  | "KQx" // K or Q as sole Broadway + 2 low cards
  | "JTx" // J or T as sole Broadway + 2 disconnected low
  | "JT_conn" // J or T as sole Broadway + connected low cards
  | "Low_conn" // All ≤9, connected (gapSum ≤ 4)
  | "Low_unconn" // All ≤9, disconnected (gapSum > 4)
  | "Paired" // Two cards same rank
  | "Trips"; // Three cards same rank

export type SuitDistribution = "rainbow" | "twotone" | "monotone";
export type SizingProfile = "small" | "large" | "mixed" | "polarized";
export type AdvantageTier = "high" | "medium" | "low" | "special";
export type FrequencyAdjust = "much_higher" | "higher" | "same" | "lower" | "much_lower";
export type SizingAdjust = "much_larger" | "larger" | "same" | "smaller";

/**
 * Live game exploit adjustments vs GTO baseline.
 * Applicable to most live cash games worldwide.
 */
export interface LiveExploitData {
  frequencyAdjust: FrequencyAdjust; // Frequency vs GTO baseline
  sizingAdjust: SizingAdjust; // Sizing vs GTO baseline
  multiWayNote: string; // Multi-way pot strategy (zh)
  commonLeaks: string[]; // Opponent tendencies to exploit (zh)
  exploitTip: string; // Key exploit note (zh)
  dangerSigns: string[]; // When to stop / warning signs (zh)
}

export interface FlopTextureCategory {
  id: FlopTextureType;
  nameZh: string;
  nameEn: string;
  description: string;
  descriptionZh: string;
  frequencyPct: number;
  advantageTier: AdvantageTier;
  ip: {
    cbetFreqMin: number;
    cbetFreqMax: number;
    sizing: SizingProfile;
    sizingPcts: number[];
  };
  oop: {
    cbetFreqMin: number;
    cbetFreqMax: number;
    sizing: SizingProfile;
    sizingPcts: number[];
  };
  strategyNotesZh: string;
  monotoneModifier: string;
  twotoneModifier: string;
  liveExploit: LiveExploitData;
}

export interface FlopAnalysis {
  texture: FlopTextureType;
  suitDistribution: SuitDistribution;
  // Rank structure
  aceCount: number;
  broadwayCount: number; // T, J, Q, K (not A)
  lowCount: number; // 2-9
  highestRank: number; // numeric (A=14)
  // Pairing
  isPaired: boolean;
  isTrips: boolean;
  pairedRank?: number;
  // Connectivity
  connectednessScore: number; // 0-1
  isConnected: boolean; // gapSum ≤ 4
  gapSum: number;
  // Draws
  hasFlushDraw: boolean;
  hasStraightDraw: boolean;
  // Display
  displayLabel: string;
  displayLabelZh: string;
}

// ============================================
// Constants
// ============================================

const RANK_VALUES: Record<string, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  T: 10,
  J: 11,
  Q: 12,
  K: 13,
  A: 14,
};

const BROADWAY: Rank[] = ["T", "J", "Q", "K"];
const LOW: Rank[] = ["2", "3", "4", "5", "6", "7", "8", "9"];

/** Connectivity threshold: gapSum ≤ this value = "connected" */
const CONNECTED_GAP_THRESHOLD = 4;

export const FLOP_TEXTURE_CATEGORIES: Record<FlopTextureType, FlopTextureCategory> = {
  ABB: {
    id: "ABB",
    nameZh: "A+雙大牌",
    nameEn: "Ace + 2 Broadway",
    description:
      "Ace with two Broadway cards (AKQ, AKJ, AKT, AQJ, AQT, AJT). Massive range advantage for PFR.",
    descriptionZh: "Ace 加兩張大牌（T-K）。翻前加注者 range 優勢極大，BB 幾乎無強牌。",
    frequencyPct: 1.5,
    advantageTier: "high",
    ip: { cbetFreqMin: 95, cbetFreqMax: 100, sizing: "large", sizingPcts: [66, 100] },
    oop: { cbetFreqMin: 70, cbetFreqMax: 85, sizing: "large", sizingPcts: [66] },
    strategyNotesZh: "幾乎 100% c-bet。PFR 有壓倒性 nut advantage（set、兩對、順子）。大尺寸下注。",
    monotoneModifier: "頻率降至 60-70%，無同花 draw 的 Ax 考慮 check",
    twotoneModifier: "影響極小，仍 90%+ c-bet",
    liveExploit: {
      frequencyAdjust: "same",
      sizingAdjust: "larger",
      multiWayNote: "多路仍可打，但只用強 Ax，空氣放棄",
      commonLeaks: ["小注=詐唬迷思，愛 call 一張看看", "不願棄掉任何 Ax"],
      exploitTip: "價值尺寸放大到 60-75%，Turn 繼續壓。對手不會相信你有 AK/AQ。",
      dangerSigns: ["被 raise = 兩對或 set，別硬拼", "River 被 check-raise 幾乎都是真貨"],
    },
  },
  ABx: {
    id: "ABx",
    nameZh: "A+大牌+低牌",
    nameEn: "Ace + Broadway + Low",
    description: "Ace with one Broadway and one low card (AK7, AQ3, AJ5, AT8).",
    descriptionZh: "Ace 加一張大牌加一張低牌。PFR 有強 range 優勢但低牌與 BB range 有交集。",
    frequencyPct: 9.27,
    advantageTier: "high",
    ip: { cbetFreqMin: 80, cbetFreqMax: 90, sizing: "mixed", sizingPcts: [33, 66] },
    oop: { cbetFreqMin: 55, cbetFreqMax: 70, sizing: "mixed", sizingPcts: [33, 66] },
    strategyNotesZh: "高頻率混合尺寸。33% 做全 range bet，66% 做價值/聽牌。",
    monotoneModifier: "頻率降至 50-60%",
    twotoneModifier: "略降至 75-85%",
    liveExploit: {
      frequencyAdjust: "same",
      sizingAdjust: "larger",
      multiWayNote: "多路收縮，只打 Ax 或強聽牌",
      commonLeaks: ["會用任何 Ax call 到底", "低牌部分容易被忽略"],
      exploitTip: "AK/AQ 價值三條街。弱 Ax 可大尺寸逼對手犯錯。",
      dangerSigns: ["River 被加注 = 兩對+", "多人底池被 call 要警覺"],
    },
  },
  Axx: {
    id: "Axx",
    nameZh: "A+雙低牌",
    nameEn: "Ace + 2 Low Cards",
    description: "Ace-high with two low cards (A72, A83, A95). PFR favored but less dominant.",
    descriptionZh: "Ace 高加兩張低牌。PFR 仍有利但低牌連接 BB 的 range。",
    frequencyPct: 8.5,
    advantageTier: "medium",
    ip: { cbetFreqMin: 65, cbetFreqMax: 80, sizing: "mixed", sizingPcts: [33, 66] },
    oop: { cbetFreqMin: 45, cbetFreqMax: 60, sizing: "small", sizingPcts: [33] },
    strategyNotesZh: "中高頻率。小尺寸全 range 或 66% 選擇性下注。BB 有更多低牌組合。",
    monotoneModifier: "頻率降至 40-50%",
    twotoneModifier: "略降至 60-75%",
    liveExploit: {
      frequencyAdjust: "lower",
      sizingAdjust: "larger",
      multiWayNote: "多路大幅降頻，無真 A 不碰",
      commonLeaks: ["「你不一定有 A」的懷疑", "call station 愛看 Turn"],
      exploitTip: "翻牌可小注，Turn 被 call 後要放大尺寸收割。",
      dangerSigns: ["低牌連接被 call = 對手可能有 set 或兩對", "Turn 大張改變要謹慎"],
    },
  },
  BBB: {
    id: "BBB",
    nameZh: "三大牌無A",
    nameEn: "3 Broadway (No Ace)",
    description:
      "Three Broadway cards without Ace (KQJ, KQT, KJT, QJT). PFR dominates with overpairs + sets.",
    descriptionZh: "三張大牌無 Ace。PFR 有超對（AA）和 set 優勢。BB 有些順子聽牌。",
    frequencyPct: 1.2,
    advantageTier: "high",
    ip: { cbetFreqMin: 95, cbetFreqMax: 100, sizing: "large", sizingPcts: [66, 100] },
    oop: { cbetFreqMin: 65, cbetFreqMax: 80, sizing: "large", sizingPcts: [66] },
    strategyNotesZh: "接近 100% c-bet。PFR 有 AA/KK/QQ 等超對優勢，BB 的強牌（如 KQs）多已 3-bet。",
    monotoneModifier: "頻率降至 55-65%",
    twotoneModifier: "仍 85%+ c-bet",
    liveExploit: {
      frequencyAdjust: "same",
      sizingAdjust: "much_larger",
      multiWayNote: "多路極危險！只打 nuts 或強 draw",
      commonLeaks: ["愛用頂對纏鬥到底", "低估順子完成可能"],
      exploitTip: "超額下注效果極好，對手常 overfold。持有 nuts 時榨到底。",
      dangerSigns: ["被 call 兩條街 = 對手 range 很強", "River 加注幾乎都是順子"],
    },
  },
  BBx: {
    id: "BBx",
    nameZh: "雙大牌+低牌",
    nameEn: "2 Broadway + Low",
    description: "Two Broadway cards plus one low card (KQ5, JT3, KJ8, QT4).",
    descriptionZh: "兩張大牌加一張低牌。PFR 有明顯優勢，但低牌給 BB 一些連接。",
    frequencyPct: 13.9,
    advantageTier: "high",
    ip: { cbetFreqMin: 75, cbetFreqMax: 85, sizing: "mixed", sizingPcts: [33, 66] },
    oop: { cbetFreqMin: 50, cbetFreqMax: 65, sizing: "mixed", sizingPcts: [33, 66] },
    strategyNotesZh: "高頻率。混合小尺寸全 range 和大尺寸選擇性下注。",
    monotoneModifier: "頻率降至 45-55%",
    twotoneModifier: "略降至 70-80%",
    liveExploit: {
      frequencyAdjust: "same",
      sizingAdjust: "larger",
      multiWayNote: "多路收縮至強頂對+，弱對子直接放棄",
      commonLeaks: ["頂對會 call 到底", "低估後門聽牌"],
      exploitTip: "價值牌放大尺寸。Turn 出高牌或完成 draw 時果斷開火。",
      dangerSigns: ["被 check-raise = 兩對或 set", "連接牌完成時要減速"],
    },
  },
  KQx: {
    id: "KQx",
    nameZh: "K/Q高+雙低牌",
    nameEn: "K or Q High + 2 Low",
    description: "K or Q as the only high card with two low cards (K83, Q72, K94, Q63).",
    descriptionZh: "K 或 Q 為唯一高牌，加兩張低牌。PFR 有 range 優勢但 BB 有更多低牌。",
    frequencyPct: 16.22,
    advantageTier: "medium",
    ip: { cbetFreqMin: 70, cbetFreqMax: 80, sizing: "mixed", sizingPcts: [33, 66] },
    oop: { cbetFreqMin: 40, cbetFreqMax: 55, sizing: "small", sizingPcts: [33] },
    strategyNotesZh: "Range 優勢仍在。小尺寸為預設。K 高比 Q 高更適合 c-bet。",
    monotoneModifier: "頻率降至 40-50%",
    twotoneModifier: "略降至 65-75%",
    liveExploit: {
      frequencyAdjust: "lower",
      sizingAdjust: "same",
      multiWayNote: "多路幾乎全 check，除非有 overpair",
      commonLeaks: ["「你一定有 K」的恐懼很強", "中對愛 call 一條街"],
      exploitTip: "小注效果好。Turn 沒改善直接停手，別浪費籌碼。",
      dangerSigns: ["Turn 被 call = 對手 range 不弱", "River 大注幾乎只能 fold"],
    },
  },
  JTx: {
    id: "JTx",
    nameZh: "J/T高+斷裂低牌",
    nameEn: "J/T High + Disconnected",
    description: "J or T high with two disconnected low cards (J83, T52, J74, T93).",
    descriptionZh: "J 或 T 為最高牌，加兩張不連接低牌。PFR 優勢減弱，BB 有更多中低對子。",
    frequencyPct: 13.61,
    advantageTier: "medium",
    ip: { cbetFreqMin: 65, cbetFreqMax: 75, sizing: "mixed", sizingPcts: [33, 66] },
    oop: { cbetFreqMin: 35, cbetFreqMax: 50, sizing: "small", sizingPcts: [33] },
    strategyNotesZh: "中等優勢。BB 有更多低對子和中牌。混合尺寸策略。",
    monotoneModifier: "頻率降至 35-45%",
    twotoneModifier: "略降至 60-70%",
    liveExploit: {
      frequencyAdjust: "lower",
      sizingAdjust: "same",
      multiWayNote: "多路幾乎不打，對手低對太多",
      commonLeaks: ["Jx/Tx 不會輕易放棄", "高估自己的中對"],
      exploitTip: "只在持有 overpair 或強 draw 時價值下注。空氣少打。",
      dangerSigns: ["被 call = 有對子", "Turn 連接牌要立刻減速"],
    },
  },
  JT_conn: {
    id: "JT_conn",
    nameZh: "J/T高+連接低牌",
    nameEn: "J/T High + Connected",
    description: "J or T high with connected low cards (J98, T87, J97, T76). Dynamic board.",
    descriptionZh: "J 或 T 高加連接低牌。牌面動態高，BB 有大量順子/兩對組合。",
    frequencyPct: 3.5,
    advantageTier: "low",
    ip: { cbetFreqMin: 50, cbetFreqMax: 60, sizing: "polarized", sizingPcts: [66, 100] },
    oop: { cbetFreqMin: 25, cbetFreqMax: 40, sizing: "polarized", sizingPcts: [66] },
    strategyNotesZh: "極端化策略：強牌/combo draw 下大注，其他過牌。BB 可能有順子、兩對、set。",
    monotoneModifier: "頻率降至 30-40%",
    twotoneModifier: "略降至 45-55%",
    liveExploit: {
      frequencyAdjust: "much_lower",
      sizingAdjust: "larger",
      multiWayNote: "多路完全不 bluff，只打 nuts",
      commonLeaks: ["追順子不看賠率", "中對不願放棄"],
      exploitTip: "持有兩對或 set 時大尺寸收割。Bluff 幾乎無意義。",
      dangerSigns: ["翻牌被 raise = 已經中了", "這種牌面 bluff 成本極高"],
    },
  },
  Low_conn: {
    id: "Low_conn",
    nameZh: "低牌連接",
    nameEn: "All Low Connected",
    description: "All cards 9 or below and connected (987, 876, 765, 654, 543).",
    descriptionZh: "全部 9 以下連接牌。BB range 優勢明顯，有大量兩對、順子、set。",
    frequencyPct: 4.5,
    advantageTier: "low",
    ip: { cbetFreqMin: 40, cbetFreqMax: 55, sizing: "polarized", sizingPcts: [66, 100] },
    oop: { cbetFreqMin: 20, cbetFreqMax: 35, sizing: "polarized", sizingPcts: [66] },
    strategyNotesZh: "BB 優勢牌面。只用強牌（set、兩對、combo draw）下注。其他全部過牌。",
    monotoneModifier: "頻率降至 20-30%",
    twotoneModifier: "略降至 35-45%",
    liveExploit: {
      frequencyAdjust: "much_lower",
      sizingAdjust: "larger",
      multiWayNote: "多路完全不碰，除非有 set",
      commonLeaks: ["業餘 AA/KK 不願 check", "低估 976 這類牌面的危險"],
      exploitTip: "在 BB 位可用 check-raise 剝削那些硬打 overpair 的人。",
      dangerSigns: ["這是 BB 優勢牌面", "持 AA 也要考慮 check/fold"],
    },
  },
  Low_unconn: {
    id: "Low_unconn",
    nameZh: "低牌不連接",
    nameEn: "All Low Disconnected",
    description: "All cards 9 or below, disconnected (952, 842, 732, 963).",
    descriptionZh: "全部 9 以下不連接牌。比連接低牌稍好，因為 BB 較少順子。",
    frequencyPct: 5.5,
    advantageTier: "low",
    ip: { cbetFreqMin: 45, cbetFreqMax: 60, sizing: "polarized", sizingPcts: [33, 66] },
    oop: { cbetFreqMin: 25, cbetFreqMax: 40, sizing: "small", sizingPcts: [33] },
    strategyNotesZh: "極端化或小尺寸。比連接低牌好（無順子），但 BB 仍有暗三、兩對。",
    monotoneModifier: "頻率降至 25-35%",
    twotoneModifier: "略降至 40-55%",
    liveExploit: {
      frequencyAdjust: "lower",
      sizingAdjust: "same",
      multiWayNote: "多路高頻 check",
      commonLeaks: ["「誰都沒中」心態愛 call", "高張迷信"],
      exploitTip: "翻牌可小注。Turn 出高牌是絕佳第二槍機會。",
      dangerSigns: ["被 call = 多半真的有對子", "Turn 繼續被 call 要減速"],
    },
  },
  Paired: {
    id: "Paired",
    nameZh: "配對牌面",
    nameEn: "Paired Board",
    description: "Two cards of the same rank (KK5, 773, AA2, 993). Stable board texture.",
    descriptionZh: "兩張同 rank 的配對牌面。牌面穩定，很少有人有三條。",
    frequencyPct: 16.97,
    advantageTier: "medium",
    ip: { cbetFreqMin: 75, cbetFreqMax: 85, sizing: "small", sizingPcts: [25, 33] },
    oop: { cbetFreqMin: 50, cbetFreqMax: 65, sizing: "small", sizingPcts: [25, 33] },
    strategyNotesZh: "高頻率小注。牌面穩定，廉價否認 equity。雙方都不太可能有三條。",
    monotoneModifier: "頻率降至 50-60%",
    twotoneModifier: "略降至 70-80%",
    liveExploit: {
      frequencyAdjust: "same",
      sizingAdjust: "larger",
      multiWayNote: "多路仍可小注，對手很難有三條",
      commonLeaks: ["「公對=沒人中」迷思", "高牌配對愛 call 到底"],
      exploitTip: "有三條時慢打誘導。對手常懷疑你是詐唬。",
      dangerSigns: ["被 raise = 真的有三條或 full house", "小心對手的慢打"],
    },
  },
  Trips: {
    id: "Trips",
    nameZh: "三條牌面",
    nameEn: "Trips Board",
    description: "Three cards of the same rank (222, 777, KKK). Extremely rare (~0.24%).",
    descriptionZh: "三張同 rank。極稀有（約 0.24%）。幾乎不可能有人有四條。",
    frequencyPct: 0.24,
    advantageTier: "special",
    ip: { cbetFreqMin: 80, cbetFreqMax: 95, sizing: "small", sizingPcts: [25, 33] },
    oop: { cbetFreqMin: 55, cbetFreqMax: 70, sizing: "small", sizingPcts: [25, 33] },
    strategyNotesZh: "極小注高頻率。雙方都不太可能有四條，高牌踢腳很重要。",
    monotoneModifier: "N/A（三條牌面花色無意義）",
    twotoneModifier: "影響極小",
    liveExploit: {
      frequencyAdjust: "same",
      sizingAdjust: "same",
      multiWayNote: "多路可打，誰都不太可能有四條",
      commonLeaks: ["認為「不可能有」所以愛 call", "高踢腳高估自己"],
      exploitTip: "有 A/K 踢腳就大膽 value。Bluff 可信度極高。",
      dangerSigns: ["被 raise = 真的有四條或 full house", "極稀有場景，保持冷靜"],
    },
  },
};

// ============================================
// Analysis Functions
// ============================================

/**
 * Analyze suit distribution of a flop
 */
export function analyzeSuitDistribution(suits: Suit[]): SuitDistribution {
  const suitCounts = new Map<Suit, number>();
  for (const suit of suits) {
    suitCounts.set(suit, (suitCounts.get(suit) || 0) + 1);
  }
  const maxCount = Math.max(...suitCounts.values());
  if (maxCount === 3) return "monotone";
  if (maxCount === 2) return "twotone";
  return "rainbow";
}

/**
 * Calculate connectivity score (0-1). Higher = more connected.
 * Reused by other systems — do not change behavior.
 */
export function calculateConnectedness(ranks: Rank[]): number {
  const values = ranks.map((r) => RANK_VALUES[r] || 0).sort((a, b) => a - b);

  // Special case: Ace-low boards (A-2-3, A-2-4, etc.)
  if (values[2] === 14 && values[1] <= 5) {
    const lowGap = values[1] - values[0];
    if (lowGap === 1) return 0.3; // A-2-3: wheel possible but narrow
    return 0.1; // A-2-5 etc: very disconnected
  }

  const gap1 = values[1] - values[0];
  const gap2 = values[2] - values[1];

  if (gap1 === 1 && gap2 === 1) return 1.0; // Perfect: 789
  if ((gap1 === 1 && gap2 === 2) || (gap1 === 2 && gap2 === 1)) return 0.8; // 79T
  if (gap1 === 1 || gap2 === 1) return 0.6; // One connector
  if ((gap1 === 2 && gap2 === 2) || gap1 + gap2 <= 4) return 0.4; // Gapped
  if (gap1 + gap2 <= 6) return 0.2; // Somewhat connected
  return 0.0; // Disconnected
}

/**
 * Compute gap sum: sum of rank gaps between sorted card values.
 * Used as the primary connectivity test for Gareth James categories.
 * e.g. J(11)-9-7 → (11-9)+(9-7) = 4 → connected
 * e.g. J(11)-8-3 → (11-8)+(8-3) = 8 → disconnected
 */
export function computeGapSum(ranks: Rank[]): number {
  const values = ranks.map((r) => RANK_VALUES[r] || 0).sort((a, b) => b - a);
  let sum = 0;
  for (let i = 0; i < values.length - 1; i++) {
    sum += values[i] - values[i + 1];
  }
  return sum;
}

/**
 * Check if board is paired or trips
 */
export function checkPaired(ranks: Rank[]): {
  isPaired: boolean;
  isTrips: boolean;
  pairedRank?: number;
} {
  const counts = new Map<Rank, number>();
  for (const rank of ranks) {
    counts.set(rank, (counts.get(rank) || 0) + 1);
  }
  const maxCount = Math.max(...counts.values());
  let pairedRank: number | undefined;
  if (maxCount >= 2) {
    for (const [rank, count] of counts) {
      if (count >= 2) {
        pairedRank = RANK_VALUES[rank];
        break;
      }
    }
  }
  return {
    isPaired: maxCount >= 2,
    isTrips: maxCount === 3,
    pairedRank,
  };
}

/**
 * Classify a flop into one of the 12 Gareth James categories.
 * Decision tree: rank-structure first, connectivity for JT/Low splits.
 */
export function classifyFlop(ranks: Rank[]): FlopTextureType {
  const { isPaired, isTrips } = checkPaired(ranks);

  // Step 1: Trips
  if (isTrips) return "Trips";

  // Step 2: Paired
  if (isPaired) return "Paired";

  // Step 3: Count rank categories
  const values = ranks.map((r) => RANK_VALUES[r] || 0);
  const aceCount = values.filter((v) => v === 14).length;
  const broadwayCount = values.filter((v) => v >= 10 && v <= 13).length; // T, J, Q, K
  const gapSum = computeGapSum(ranks);

  // Step 3a: Ace present
  if (aceCount === 1) {
    if (broadwayCount === 2) return "ABB";
    if (broadwayCount === 1) return "ABx";
    return "Axx";
  }

  // Step 3b: No Ace, all Broadway
  if (broadwayCount === 3) return "BBB";

  // Step 3c: 2 Broadway + 1 low
  if (broadwayCount === 2) return "BBx";

  // Step 3d: 1 Broadway + 2 low
  if (broadwayCount === 1) {
    const bwayValue = values.find((v) => v >= 10 && v <= 13)!;
    if (bwayValue >= 12) return "KQx"; // K(13) or Q(12)
    // J(11) or T(10) — check connectivity
    if (gapSum <= CONNECTED_GAP_THRESHOLD) return "JT_conn";
    return "JTx";
  }

  // Step 3e: All low cards (all ≤ 9)
  if (gapSum <= CONNECTED_GAP_THRESHOLD) return "Low_conn";
  return "Low_unconn";
}

/**
 * Full flop texture analysis
 */
export function analyzeFlop(ranks: Rank[], suits: Suit[]): FlopAnalysis {
  const suitDistribution = analyzeSuitDistribution(suits);
  const { isPaired, isTrips, pairedRank } = checkPaired(ranks);
  const connectednessScore = calculateConnectedness(ranks);
  const gapSum = computeGapSum(ranks);
  const texture = classifyFlop(ranks);

  const values = ranks.map((r) => RANK_VALUES[r] || 0);
  const aceCount = values.filter((v) => v === 14).length;
  const broadwayCount = values.filter((v) => v >= 10 && v <= 13).length;
  const lowCount = values.filter((v) => v <= 9).length;
  const highestRank = Math.max(...values);
  const isConnected = gapSum <= CONNECTED_GAP_THRESHOLD;

  const cat = FLOP_TEXTURE_CATEGORIES[texture];
  const suitLabel = suitDistribution === "rainbow" ? "" : ` (${suitDistribution})`;

  return {
    texture,
    suitDistribution,
    aceCount,
    broadwayCount,
    lowCount,
    highestRank,
    isPaired,
    isTrips,
    pairedRank,
    connectednessScore,
    isConnected,
    gapSum,
    hasFlushDraw: suitDistribution === "twotone" || suitDistribution === "monotone",
    hasStraightDraw: isConnected,
    displayLabel: `${cat.nameEn}${suitLabel}`,
    displayLabelZh: `${cat.nameZh}${suitLabel === "" ? "" : ` (${suitDistribution === "twotone" ? "雙花" : "單花"})`}`,
  };
}

// ============================================
// Generation
// ============================================

/**
 * Generate a random flop of a specific texture type.
 * Suit distribution defaults to random (rainbow-weighted).
 */
export function generateFlopOfTexture(
  texture: FlopTextureType,
  _depth = 0
): { ranks: Rank[]; suits: Suit[] } {
  const allSuits: Suit[] = ["s", "h", "d", "c"];

  const shuffleArray = <T>(arr: T[]): T[] => {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  };

  const pickRandom = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  const pickNDistinct = <T>(arr: T[], n: number): T[] => {
    const shuffled = shuffleArray(arr);
    return shuffled.slice(0, n);
  };

  /** Generate rainbow suits (all different) */
  const rainbowSuits = (): Suit[] => shuffleArray(allSuits).slice(0, 3) as Suit[];

  /** Generate random suits (weighted toward variety) */
  const randomSuits = (): Suit[] => {
    // 60% rainbow, 35% twotone, 5% monotone (matches real distribution)
    const r = Math.random();
    if (r < 0.6) return rainbowSuits();
    if (r < 0.95) {
      const s = pickRandom(allSuits);
      const other = pickRandom(allSuits.filter((x) => x !== s));
      return shuffleArray([s, s, other]) as Suit[];
    }
    const s = pickRandom(allSuits);
    return [s, s, s];
  };

  let ranks: Rank[];
  let suits: Suit[];

  switch (texture) {
    case "ABB": {
      const two = pickNDistinct(BROADWAY, 2);
      ranks = ["A", ...two];
      suits = randomSuits();
      break;
    }

    case "ABx": {
      ranks = ["A", pickRandom(BROADWAY), pickRandom(LOW)];
      suits = randomSuits();
      break;
    }

    case "Axx": {
      const twoLow = pickNDistinct(LOW, 2);
      ranks = ["A", ...twoLow];
      suits = randomSuits();
      break;
    }

    case "BBB": {
      // Pick 3 from [T,J,Q,K] — only 4 possible combos: KQJ, KQT, KJT, QJT
      const three = pickNDistinct(BROADWAY, 3);
      ranks = three;
      suits = randomSuits();
      break;
    }

    case "BBx": {
      const twoBway = pickNDistinct(BROADWAY, 2);
      ranks = [...twoBway, pickRandom(LOW)];
      suits = randomSuits();
      break;
    }

    case "KQx": {
      const high = pickRandom(["K", "Q"] as Rank[]);
      const twoLow = pickNDistinct(LOW, 2);
      ranks = [high, ...twoLow];
      suits = randomSuits();
      break;
    }

    case "JTx": {
      // J or T + 2 disconnected low (gapSum > 4)
      const high = pickRandom(["J", "T"] as Rank[]);
      let twoLow: Rank[];
      let attempts = 0;
      do {
        twoLow = pickNDistinct(LOW, 2);
        const allRanks = [high, ...twoLow];
        const gs = computeGapSum(allRanks);
        if (gs > CONNECTED_GAP_THRESHOLD) break;
        attempts++;
      } while (attempts < 50);
      ranks = [high, ...twoLow];
      suits = randomSuits();
      break;
    }

    case "JT_conn": {
      // J or T + connected low cards (gapSum ≤ 4)
      const connSets: Record<string, Rank[][]> = {
        J: [
          ["9", "8"],
          ["9", "7"],
          ["8", "7"],
          ["8", "6"],
          ["T", "9"],
          ["T", "8"],
        ],
        T: [
          ["8", "7"],
          ["8", "6"],
          ["7", "6"],
          ["7", "5"],
          ["9", "8"],
          ["9", "7"],
        ],
      };
      const high = pickRandom(["J", "T"] as Rank[]);
      // Filter to only valid sets (gapSum ≤ 4 with the high card)
      const validSets = connSets[high].filter((pair) => {
        const gs = computeGapSum([high, pair[0] as Rank, pair[1] as Rank]);
        return gs <= CONNECTED_GAP_THRESHOLD;
      });
      const pair = pickRandom(validSets.length > 0 ? validSets : connSets[high]);
      ranks = [high, pair[0] as Rank, pair[1] as Rank];
      suits = randomSuits();
      break;
    }

    case "Low_conn": {
      // All ≤ 9, connected (gapSum ≤ 4)
      const allConnSets: Rank[][] = [
        ["9", "8", "7"],
        ["8", "7", "6"],
        ["7", "6", "5"],
        ["6", "5", "4"],
        ["5", "4", "3"],
        ["4", "3", "2"],
        ["9", "8", "6"],
        ["8", "7", "5"],
        ["7", "6", "4"],
        ["6", "5", "3"],
        ["5", "4", "2"],
        ["9", "7", "6"],
        ["8", "6", "5"],
        ["7", "5", "4"],
        ["6", "4", "3"],
        ["5", "3", "2"],
      ];
      const connSets = allConnSets.filter((set) => computeGapSum(set) <= CONNECTED_GAP_THRESHOLD);
      ranks = [...pickRandom(connSets)];
      suits = randomSuits();
      break;
    }

    case "Low_unconn": {
      // All ≤ 9, disconnected (gapSum > 4)
      let picked: Rank[];
      let attempts = 0;
      do {
        picked = pickNDistinct(LOW, 3);
        const gs = computeGapSum(picked);
        if (gs > CONNECTED_GAP_THRESHOLD) break;
        attempts++;
      } while (attempts < 50);
      ranks = picked;
      suits = randomSuits();
      break;
    }

    case "Paired": {
      const allRanksForPair: Rank[] = [
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "T",
        "J",
        "Q",
        "K",
        "A",
      ];
      const pairRank = pickRandom(allRanksForPair);
      const remaining = allRanksForPair.filter((r) => r !== pairRank);
      ranks = [pairRank, pairRank, pickRandom(remaining)];
      // Paired cards must have different suits
      const pairSuits = pickNDistinct(allSuits, 2);
      const thirdSuit = pickRandom(allSuits);
      suits = [pairSuits[0], pairSuits[1], thirdSuit];
      break;
    }

    case "Trips": {
      const allRanksForTrips: Rank[] = [
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "T",
        "J",
        "Q",
        "K",
        "A",
      ];
      const tripRank = pickRandom(allRanksForTrips);
      ranks = [tripRank, tripRank, tripRank];
      // Trips must have 3 different suits
      suits = shuffleArray(allSuits).slice(0, 3) as Suit[];
      break;
    }

    default:
      ranks = shuffleArray([...BROADWAY, ...LOW, "A"] as Rank[]).slice(0, 3);
      suits = rainbowSuits();
  }

  // Validate: non-paired textures must have unique ranks
  if (texture !== "Paired" && texture !== "Trips") {
    const uniqueRanks = [...new Set(ranks)];
    if (uniqueRanks.length < 3) {
      if (_depth >= 10) {
        // Safety fallback
        ranks = shuffleArray([...BROADWAY, ...LOW, "A"] as Rank[]).slice(0, 3);
        suits = rainbowSuits();
      } else {
        return generateFlopOfTexture(texture, _depth + 1);
      }
    }
  }

  // Double-check classification matches target
  const classified = classifyFlop(ranks);
  if (classified !== texture && _depth < 10) {
    return generateFlopOfTexture(texture, _depth + 1);
  }

  return { ranks, suits };
}

// ============================================
// Utility Exports
// ============================================

/**
 * Get texture info for display
 */
export function getTextureInfo(texture: FlopTextureType): FlopTextureCategory {
  return FLOP_TEXTURE_CATEGORIES[texture];
}

/**
 * Get all texture types as array
 */
export function getAllTextureTypes(): FlopTextureCategory[] {
  return Object.values(FLOP_TEXTURE_CATEGORIES);
}

/**
 * Get the advantage tier color for UI display
 */
export function getAdvantageColor(tier: AdvantageTier): string {
  switch (tier) {
    case "high":
      return "text-green-600";
    case "medium":
      return "text-yellow-600";
    case "low":
      return "text-red-600";
    case "special":
      return "text-purple-600";
  }
}

/**
 * Get IP c-bet midpoint for a texture (used by training modes)
 */
export function getIpCbetMidpoint(texture: FlopTextureType): number {
  const cat = FLOP_TEXTURE_CATEGORIES[texture];
  return Math.round((cat.ip.cbetFreqMin + cat.ip.cbetFreqMax) / 2);
}

/**
 * Get OOP c-bet midpoint for a texture
 */
export function getOopCbetMidpoint(texture: FlopTextureType): number {
  const cat = FLOP_TEXTURE_CATEGORIES[texture];
  return Math.round((cat.oop.cbetFreqMin + cat.oop.cbetFreqMax) / 2);
}
