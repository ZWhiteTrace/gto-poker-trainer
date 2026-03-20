import type { Metadata } from "next";
import { createPageMetadata, type AppLocale, toAppLocale } from "@/lib/metadata";

type DrillKey =
  | "endless"
  | "flop-texture"
  | "multistreet"
  | "postflop"
  | "push-fold"
  | "rfi"
  | "squeeze"
  | "table-trainer"
  | "texture-training"
  | "vs-3bet"
  | "vs-4bet"
  | "vs-rfi";

type DrillCopy = {
  path: string;
  title: Record<AppLocale, string>;
  description: Record<AppLocale, string>;
};

const DRILL_METADATA: Record<DrillKey, DrillCopy> = {
  endless: {
    path: "/drill/endless",
    title: {
      "zh-TW": "無限練習模式 - 持續訓練 GTO 翻前決策",
      en: "Endless Drill - Continuous GTO Preflop Training",
    },
    description: {
      "zh-TW": "不間斷的 GTO 翻前練習。隨機場景持續挑戰，追蹤連勝紀錄，強化肌肉記憶。",
      en: "Train preflop decisions continuously with random scenarios, streak tracking, and instant GTO feedback.",
    },
  },
  "flop-texture": {
    path: "/drill/flop-texture",
    title: {
      "zh-TW": "牌面結構分析練習 - Flop Texture 識別訓練",
      en: "Flop Texture Drill - Board Texture Recognition Training",
    },
    description: {
      "zh-TW": "學習識別不同的翻牌面結構（乾燥、濕潤、配對等），理解牌面結構如何影響你的策略選擇。",
      en: "Learn to identify dry, wet, paired, and connected boards so you can adjust your strategy by texture.",
    },
  },
  multistreet: {
    path: "/drill/multistreet",
    title: {
      "zh-TW": "多街道練習 - Flop Turn River 連續決策訓練",
      en: "Multi-Street Drill - Flop Turn River Decision Training",
    },
    description: {
      "zh-TW": "練習翻牌到河牌的多街道決策。從 Preflop 到 River 完整模擬，提升翻後策略思維。",
      en: "Practice flop, turn, and river decisions in sequence with full hand simulations from preflop to showdown.",
    },
  },
  postflop: {
    path: "/drill/postflop",
    title: {
      "zh-TW": "翻後 C-Bet 練習 - 持續下注策略訓練",
      en: "Postflop C-Bet Drill - Continuation Betting Strategy Training",
    },
    description: {
      "zh-TW": "練習翻後持續下注（C-Bet）策略。學習在不同牌面結構下的最優下注頻率和尺寸，提升翻後打法。",
      en: "Train continuation-bet frequencies and sizings across different board textures to sharpen your postflop game.",
    },
  },
  "push-fold": {
    path: "/drill/push-fold",
    title: {
      "zh-TW": "Push/Fold 推圖練習 - MTT 短籌碼全下策略",
      en: "Push/Fold Drill - MTT Short Stack Jam Strategy Trainer",
    },
    description: {
      "zh-TW": "練習錦標賽短籌碼時的 Push/Fold 決策。基於 Nash 均衡的最優全下範圍，掌握 3-15BB 的生存策略。",
      en: "Practice Nash-based push or fold decisions for 3-15BB tournament spots and learn the correct short stack jams.",
    },
  },
  rfi: {
    path: "/drill/rfi",
    title: {
      "zh-TW": "RFI 翻前開池練習 - 免費德州撲克 GTO 訓練",
      en: "RFI Drill - Free GTO Preflop Opening Range Trainer",
    },
    description: {
      "zh-TW": "練習各位置的 RFI（Raise First In）開池範圍。掌握 UTG、HJ、CO、BTN、SB 的 GTO 開牌策略，即時反饋幫你快速進步。",
      en: "Practice GTO opening ranges from UTG, HJ, CO, BTN, and SB with instant feedback on every preflop decision.",
    },
  },
  squeeze: {
    path: "/drill/squeeze",
    title: {
      "zh-TW": "Squeeze 練習 - 多人底池 3-Bet 訓練",
      en: "Squeeze Drill - Multiway 3-Bet Decision Training",
    },
    description: {
      "zh-TW": "練習多人底池的 Squeeze（擠壓加注）策略。學習何時 3-Bet、何時 Call、何時 Fold，掌握 Squeeze 時機。",
      en: "Practice squeeze spots in multiway pots and learn when to 3-bet, call, or fold against open-plus-call scenarios.",
    },
  },
  "table-trainer": {
    path: "/drill/table-trainer",
    title: {
      "zh-TW": "牌桌模擬訓練 - 全場景 GTO 實戰練習",
      en: "GTO Table Trainer - 6-Max Full Scenario Practice",
    },
    description: {
      "zh-TW": "在模擬牌桌上進行 GTO 實戰訓練。面對不同位置與場景，做出最優決策。",
      en: "Train on a simulated 6-max poker table and practice GTO decisions across positions, stack sizes, and action trees.",
    },
  },
  "texture-training": {
    path: "/drill/texture-training",
    title: {
      "zh-TW": "牌面質地訓練 - 學會分析 Board Texture",
      en: "Board Texture Training - Learn to Read Flop Structures",
    },
    description: {
      "zh-TW": "訓練判斷牌面質地的能力。辨識乾燥、濕潤、連接牌面，學會根據牌面調整策略。",
      en: "Improve your board reading by identifying dry, wet, and connected textures and adjusting strategy correctly.",
    },
  },
  "vs-3bet": {
    path: "/drill/vs-3bet",
    title: {
      "zh-TW": "VS 3-Bet 應對練習 - 面對 3-Bet 的 GTO 策略",
      en: "VS 3-Bet Drill - GTO Responses to 3-Bets",
    },
    description: {
      "zh-TW": "練習開池後面對 3-bet 的應對策略。學習何時 4-bet、跟注或棄牌，掌握 GTO 最優決策。",
      en: "Practice facing 3-bets after opening and learn when to 4-bet, call, or fold in GTO preflop spots.",
    },
  },
  "vs-4bet": {
    path: "/drill/vs-4bet",
    title: {
      "zh-TW": "VS 4-Bet 應對練習 - 面對 4-Bet 的 GTO 策略",
      en: "VS 4-Bet Drill - GTO Responses to 4-Bets",
    },
    description: {
      "zh-TW": "練習 3-bet 後面對 4-bet 的應對策略。學習何時 5-bet 全下、跟注或棄牌，掌握高壓情況下的 GTO 決策。",
      en: "Practice 3-bet pots facing a 4-bet and learn the right GTO response between 5-bet jam, call, or fold.",
    },
  },
  "vs-rfi": {
    path: "/drill/vs-rfi",
    title: {
      "zh-TW": "VS RFI 防守練習 - 面對開池加注的 GTO 策略",
      en: "VS RFI Drill - GTO Defense Against Open Raises",
    },
    description: {
      "zh-TW": "練習面對對手開池加注時的防守策略。學習何時 3-bet、跟注或棄牌，掌握各位置的 GTO 防守範圍。",
      en: "Practice defending versus open raises and learn the correct GTO mix of 3-bets, calls, and folds by position.",
    },
  },
};

export function createDrillMetadata(locale: string, drillKey: DrillKey): Metadata {
  const appLocale = toAppLocale(locale);
  const metadata = DRILL_METADATA[drillKey];

  return createPageMetadata({
    locale: appLocale,
    path: metadata.path,
    title: metadata.title[appLocale],
    description: metadata.description[appLocale],
  });
}
