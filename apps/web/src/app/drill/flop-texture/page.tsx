"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { CheckCircle2, XCircle, ArrowRight, Timer, RotateCcw } from "lucide-react";
import {
  FLOP_TEXTURE_CATEGORIES,
  analyzeFlop,
  generateFlopOfTexture,
  getIpCbetMidpoint,
  getOopCbetMidpoint,
  getAdvantageColor,
  type FlopTextureType,
  type AdvantageTier,
  type FrequencyAdjust,
  type SizingAdjust,
} from "@/lib/poker/flopTexture";
import type { Rank, Suit } from "@/lib/poker/types";
import { SUIT_SYMBOLS, SUIT_CARD_COLORS } from "@/lib/poker/types";

// ============================================
// Types
// ============================================

type DrillMode = "classify" | "cbet" | "quick" | "threelayer" | "mustcheck" | "checkfirst" | "liveexploit";

interface ClassifyScenario {
  flop: Rank[];
  suits: Suit[];
  correctTexture: FlopTextureType;
}

interface CbetScenario {
  flop: Rank[];
  suits: Suit[];
  texture: FlopTextureType;
  potType: "srp" | "3bp";
  position: "IP" | "OOP";
  correctFrequency: string;
  correctSizing: string;
}

interface QuickScenario {
  flop: Rank[];
  suits: Suit[];
  questionType: "connectivity" | "suit_distribution" | "texture_category" | "advantage_tier";
  correctAnswer: string;
}

// Three Layer Decision Framework
type ThreeLayerType = "initiative" | "volatility" | "purpose";

interface ThreeLayerScenario {
  flop: Rank[];
  suits: Suit[];
  texture: FlopTextureType;
  potType: "srp" | "3bp";
  position: "IP" | "OOP";
  heroRange: string;
  villainRange: string;
  currentLayer: ThreeLayerType;
  correctAnswer: string;
  explanationZh: string;
  // For complete decision flow
  layerAnswers?: {
    initiative: string;
    volatility: string;
    purpose: string;
  };
}

// Must-Check Scenarios
interface MustCheckScenario {
  flop: Rank[];
  suits: Suit[];
  texture: FlopTextureType;
  position: "IP" | "OOP";
  heroHand: string; // e.g., "AhKc", "7s6s"
  heroHandType: string; // e.g., "空氣牌", "中對", "頂對弱踢"
  shouldCheck: boolean;
  reasonZh: string;
  category: string; // Which of the 10 must-check categories
}

// ============================================
// Constants
// ============================================

const FREQUENCY_OPTIONS = [
  { key: "very_high", label: "很高 (80%+)" },
  { key: "medium_high", label: "中高 (65-79%)" },
  { key: "medium", label: "中等 (50-64%)" },
  { key: "low", label: "低 (35-49%)" },
  { key: "very_low", label: "很低 (<35%)" },
];

const SIZING_OPTIONS = [
  { key: "small", label: "小 (25-33%)" },
  { key: "mixed", label: "混合 (33/66%)" },
  { key: "large", label: "大 (66-100%)" },
  { key: "polarized", label: "極端化 (check/大注)" },
];

// ============================================
// Helpers
// ============================================

function generateClassifyScenario(): ClassifyScenario {
  const textures = Object.keys(FLOP_TEXTURE_CATEGORIES) as FlopTextureType[];
  const randomTexture = textures[Math.floor(Math.random() * textures.length)];
  const { ranks, suits } = generateFlopOfTexture(randomTexture);
  return {
    flop: ranks,
    suits,
    correctTexture: randomTexture,
  };
}

function generateCbetScenario(): CbetScenario {
  const textures = Object.keys(FLOP_TEXTURE_CATEGORIES) as FlopTextureType[];
  const randomTexture = textures[Math.floor(Math.random() * textures.length)];
  const category = FLOP_TEXTURE_CATEGORIES[randomTexture];
  const { ranks, suits } = generateFlopOfTexture(randomTexture);

  const potType = Math.random() > 0.7 ? "3bp" : "srp";
  const position = Math.random() > 0.3 ? "IP" : "OOP";

  // Use IP or OOP data based on position
  const stratData = position === "IP" ? category.ip : category.oop;
  const midFreq = Math.round((stratData.cbetFreqMin + stratData.cbetFreqMax) / 2);

  let correctFrequency: string;
  if (midFreq >= 80) correctFrequency = "very_high";
  else if (midFreq >= 65) correctFrequency = "medium_high";
  else if (midFreq >= 50) correctFrequency = "medium";
  else if (midFreq >= 35) correctFrequency = "low";
  else correctFrequency = "very_low";

  const correctSizing = stratData.sizing;

  return {
    flop: ranks,
    suits,
    texture: randomTexture,
    potType,
    position,
    correctFrequency,
    correctSizing,
  };
}

function generateQuickScenario(): QuickScenario {
  const textures = Object.keys(FLOP_TEXTURE_CATEGORIES) as FlopTextureType[];
  const randomTexture = textures[Math.floor(Math.random() * textures.length)];
  const { ranks, suits } = generateFlopOfTexture(randomTexture);

  const questionTypes: QuickScenario["questionType"][] = [
    "connectivity", "suit_distribution", "texture_category", "advantage_tier",
  ];
  const questionType = questionTypes[Math.floor(Math.random() * questionTypes.length)];

  const analysis = analyzeFlop(ranks, suits);
  let correctAnswer: string;

  switch (questionType) {
    case "connectivity":
      correctAnswer = analysis.isConnected ? "connected" : "disconnected";
      break;
    case "suit_distribution":
      correctAnswer = analysis.suitDistribution;
      break;
    case "texture_category":
      correctAnswer = analysis.texture;
      break;
    case "advantage_tier":
      correctAnswer = FLOP_TEXTURE_CATEGORIES[analysis.texture].advantageTier;
      break;
  }

  return {
    flop: ranks,
    suits,
    questionType,
    correctAnswer,
  };
}

// Four Questions Framework scenarios data
// ============================================
// Three Layer Decision Scenarios
// ============================================

// Layer 1: Initiative (主動權) - "這張翻牌，還能代表我翻前的故事嗎？"
// Layer 2: Volatility (變臉) - "Turn 會不會一張牌就讓局勢翻掉？"
// Layer 3: Purpose (目的) - "Value / Deny equity / Bluff - 選一個"

const THREE_LAYER_SCENARIOS: Array<{
  textureHint: FlopTextureType[];
  potType: "srp" | "3bp";
  position: "IP" | "OOP";
  heroRange: string;
  villainRange: string;
  boardExample: string;
  layers: {
    initiative: { answer: string; explanation: string };
    volatility: { answer: string; explanation: string };
    purpose: { answer: string; explanation: string };
  };
  actionSummary: string;
}> = [
  // ① A高乾燥（A72r / A83r）— Axx
  {
    textureHint: ["Axx", "KQx"],
    potType: "srp",
    position: "IP",
    heroRange: "BTN open",
    villainRange: "BB call",
    boardExample: "A72r / K83r",
    layers: {
      initiative: { answer: "yes", explanation: "高牌面代表你翻前的故事，Range 優勢明顯在你" },
      volatility: { answer: "low", explanation: "牌面穩定，Turn 大多是空白牌" },
      purpose: { answer: "deny", explanation: "用小注否認對手後門聽牌權益，收過路費" },
    },
    actionSummary: "高頻小尺寸 (25-33%)，幾乎整個 range 都可以碰",
  },
  // ② A+大牌連接（AKQ / AJT）— ABB
  {
    textureHint: ["ABB", "BBB"],
    potType: "srp",
    position: "IP",
    heroRange: "CO open",
    villainRange: "BB call",
    boardExample: "AKQ / KQJ",
    layers: {
      initiative: { answer: "yes", explanation: "壓倒性 range 優勢，BB 的強牌多已 3-bet" },
      volatility: { answer: "medium", explanation: "已有順子可能，但 PFR 仍主導" },
      purpose: { answer: "value_protect", explanation: "大尺寸取值 + 保護，BB 很難反擊" },
    },
    actionSummary: "幾乎 100% c-bet，大尺寸 (66-100%)",
  },
  // ③ 雙大牌+低牌（KQ5 / JT3）— BBx
  {
    textureHint: ["BBx", "ABx"],
    potType: "srp",
    position: "IP",
    heroRange: "BTN open",
    villainRange: "BB call",
    boardExample: "KQ5 / AJ3",
    layers: {
      initiative: { answer: "partial", explanation: "Range 優勢在但低牌給 BB 一些連接" },
      volatility: { answer: "high", explanation: "Turn 任何高牌或連接牌都可能改變局面" },
      purpose: { answer: "value_protect", explanation: "有牌才打，混合尺寸" },
    },
    actionSummary: "高頻混合尺寸 (33% range bet 或 66% 選擇性)",
  },
  // ④ 低牌不連接（952r / 742r）— Low_unconn / JTx
  {
    textureHint: ["Low_unconn", "JTx"],
    potType: "srp",
    position: "IP",
    heroRange: "BTN open",
    villainRange: "BB call",
    boardExample: "952r / J83r",
    layers: {
      initiative: { answer: "no", explanation: "低牌面對 BB 的 call range 更有利" },
      volatility: { answer: "medium", explanation: "變化中低，但 overcard 會影響" },
      purpose: { answer: "unclear", explanation: "下注目的模糊 = 不該下注" },
    },
    actionSummary: "高頻 check，只用 Overpair 或有後門的高張下注",
  },
  // ⑤ 連接低/中牌（987 / 865 / T87）— Low_conn / JT_conn
  {
    textureHint: ["JT_conn", "Low_conn"],
    potType: "srp",
    position: "IP",
    heroRange: "BTN open",
    villainRange: "BB call",
    boardExample: "987 / T87",
    layers: {
      initiative: { answer: "no", explanation: "Range 優勢在對手，他們有更多 set 和兩對" },
      volatility: { answer: "explosive", explanation: "Turn 爆炸快，很多牌完成順子或同花" },
      purpose: { answer: "rarely_bet", explanation: "幾乎只有 bluff，但風險大" },
    },
    actionSummary: "翻牌高頻 check，只用 strong made hand 或 combo draw 才打",
  },
  // ⑥ Paired 牌面（KK5 / 772）
  {
    textureHint: ["Paired"],
    potType: "srp",
    position: "IP",
    heroRange: "UTG open",
    villainRange: "BB call",
    boardExample: "KK5 / 772",
    layers: {
      initiative: { answer: "yes", explanation: "通常在翻前 aggressor，對手很難有三條" },
      volatility: { answer: "low", explanation: "牌面穩定，Turn 幾乎不會改變" },
      purpose: { answer: "thin_value", explanation: "薄 value + deny，Bluff 成本低" },
    },
    actionSummary: "小尺寸高頻，中等牌力可以三街慢慢榨",
  },
];

function generateThreeLayerScenario(): ThreeLayerScenario {
  const template = THREE_LAYER_SCENARIOS[Math.floor(Math.random() * THREE_LAYER_SCENARIOS.length)];
  const targetTexture = template.textureHint[Math.floor(Math.random() * template.textureHint.length)];
  const { ranks, suits } = generateFlopOfTexture(targetTexture);

  // Randomly pick which layer to ask about
  const layerTypes: ThreeLayerType[] = ["initiative", "volatility", "purpose"];
  const currentLayer = layerTypes[Math.floor(Math.random() * layerTypes.length)];

  const layerData = template.layers[currentLayer];

  return {
    flop: ranks,
    suits,
    texture: targetTexture,
    potType: template.potType,
    position: template.position,
    heroRange: template.heroRange,
    villainRange: template.villainRange,
    currentLayer,
    correctAnswer: layerData.answer,
    explanationZh: layerData.explanation,
    layerAnswers: {
      initiative: template.layers.initiative.answer,
      volatility: template.layers.volatility.answer,
      purpose: template.layers.purpose.answer,
    },
  };
}

// ============================================
// Must-Check Scenarios (10 種必 check 情況)
// ============================================

const MUST_CHECK_CATEGORIES = [
  { id: "mid_wet_air", name: "中張濕牌面空氣牌", description: "在 987/865 這類牌面，沒後門沒 blocking 的空氣牌" },
  { id: "low_board_no_overpair", name: "低牌面無 Overpair", description: "952r 這類牌面，沒有 Overpair 的高張" },
  { id: "connected_weak_made", name: "連接牌面弱成牌", description: "JT9 這類牌面，中小 pair 要 check-fold" },
  { id: "monotone_no_flush", name: "單花面無同花", description: "單花牌面沒有同花的牌" },
  { id: "broadway_no_backdoor", name: "大牌連接無後門", description: "AJT 這類牌面，沒後門聽牌的弱牌" },
  { id: "villain_range_advantage", name: "對手 Range 優勢", description: "牌面明顯對對手有利時" },
  { id: "oop_wet_board", name: "OOP 濕潤牌面", description: "無位置在濕潤牌面，很多牌要 check" },
  { id: "protect_check_range", name: "保護 Check Range", description: "有些強牌要 check 來保護你的 check range" },
  { id: "turn_will_change", name: "Turn 會翻天", description: "預期 Turn 會大幅改變局面時" },
  { id: "no_clear_purpose", name: "下注目的不明", description: "說不出為什麼下注 = 不該下注" },
];

const MUST_CHECK_SCENARIOS_DATA: Array<{
  textureHint: FlopTextureType[];
  position: "IP" | "OOP";
  heroHand: string;
  heroHandType: string;
  shouldCheck: boolean;
  categoryId: string;
  reason: string;
}> = [
  // 中張濕牌面空氣牌
  { textureHint: ["JT_conn", "Low_conn"], position: "IP", heroHand: "AhKc", heroHandType: "AK 高張空氣", shouldCheck: true, categoryId: "mid_wet_air", reason: "987 這類牌面，AK 沒有後門沒有 blocking，應該直接 check" },
  { textureHint: ["JT_conn", "Low_conn"], position: "IP", heroHand: "QcJc", heroHandType: "QJ 同花有後門", shouldCheck: false, categoryId: "mid_wet_air", reason: "有後門同花聽牌，可以作為 bluff 候選" },

  // 低牌面無 Overpair
  { textureHint: ["Low_unconn"], position: "IP", heroHand: "AhQc", heroHandType: "AQ 高張", shouldCheck: true, categoryId: "low_board_no_overpair", reason: "952r 牌面，AQ 沒有 pair，下注目的不明確" },
  { textureHint: ["Low_unconn"], position: "IP", heroHand: "TsTc", heroHandType: "TT Overpair", shouldCheck: false, categoryId: "low_board_no_overpair", reason: "TT 是 Overpair，可以下注獲取價值" },

  // 連接牌面弱成牌
  { textureHint: ["BBx", "JT_conn"], position: "IP", heroHand: "9h9c", heroHandType: "99 中對", shouldCheck: true, categoryId: "connected_weak_made", reason: "JT9 牌面 99 是中對，被 call 幾乎都是輸，應該 check" },
  { textureHint: ["BBx", "JT_conn"], position: "IP", heroHand: "JsJc", heroHandType: "JJ 頂對", shouldCheck: false, categoryId: "connected_weak_made", reason: "JJ 是頂 set，強牌可以下注" },

  // 單花面無同花（概念：全同花牌面你沒有同花時應 check）
  { textureHint: ["ABx", "BBx"], position: "IP", heroHand: "AhKh", heroHandType: "AK 無同花", shouldCheck: true, categoryId: "monotone_no_flush", reason: "單花牌面沒有同花，下注容易被有同花的牌 raise" },
  { textureHint: ["ABx", "BBx"], position: "IP", heroHand: "AsKs", heroHandType: "AK 帶堅果同花聽牌", shouldCheck: false, categoryId: "monotone_no_flush", reason: "有堅果同花聽牌，可以下注作為半詐唬" },

  // OOP 濕潤牌面
  { textureHint: ["JT_conn", "Low_conn"], position: "OOP", heroHand: "AhAc", heroHandType: "AA Overpair", shouldCheck: true, categoryId: "oop_wet_board", reason: "OOP 在動態牌面，即使是 AA 也要考慮 check 保護 range" },
  { textureHint: ["Axx"], position: "OOP", heroHand: "AhAc", heroHandType: "AA 頂 set", shouldCheck: false, categoryId: "oop_wet_board", reason: "乾燥 A 高牌面，AA 是頂 set，可以下注" },

  // 下注目的不明
  { textureHint: ["Low_unconn"], position: "IP", heroHand: "KhQc", heroHandType: "KQ 兩高張", shouldCheck: true, categoryId: "no_clear_purpose", reason: "說不出「我下注是因為___，被 call 後我打算___」= 不該下注" },
  { textureHint: ["ABx"], position: "IP", heroHand: "KhQc", heroHandType: "KQ 第二對", shouldCheck: false, categoryId: "no_clear_purpose", reason: "A-K-x 牌面 KQ 是第二對，可以薄價值" },
];

function generateMustCheckScenario(): MustCheckScenario {
  const template = MUST_CHECK_SCENARIOS_DATA[Math.floor(Math.random() * MUST_CHECK_SCENARIOS_DATA.length)];
  const targetTexture = template.textureHint[Math.floor(Math.random() * template.textureHint.length)];
  const { ranks, suits } = generateFlopOfTexture(targetTexture);

  const category = MUST_CHECK_CATEGORIES.find(c => c.id === template.categoryId);

  return {
    flop: ranks,
    suits,
    texture: targetTexture,
    position: template.position,
    heroHand: template.heroHand,
    heroHandType: template.heroHandType,
    shouldCheck: template.shouldCheck,
    reasonZh: template.reason,
    category: category?.name || "",
  };
}

// Check First Challenge: only scenarios where the correct answer is CHECK
const CHECK_FIRST_SCENARIOS = MUST_CHECK_SCENARIOS_DATA.filter(s => s.shouldCheck);

function generateCheckFirstScenario(): MustCheckScenario {
  const template = CHECK_FIRST_SCENARIOS[Math.floor(Math.random() * CHECK_FIRST_SCENARIOS.length)];
  const targetTexture = template.textureHint[Math.floor(Math.random() * template.textureHint.length)];
  const { ranks, suits } = generateFlopOfTexture(targetTexture);

  const category = MUST_CHECK_CATEGORIES.find(c => c.id === template.categoryId);

  return {
    flop: ranks,
    suits,
    texture: targetTexture,
    position: template.position,
    heroHand: template.heroHand,
    heroHandType: template.heroHandType,
    shouldCheck: true, // Always true in this mode
    reasonZh: template.reason,
    category: category?.name || "",
  };
}

// ============================================
// Components
// ============================================

function BoardCard({ rank, suit }: { rank: Rank; suit: Suit }) {
  return (
    <div className="w-14 h-20 sm:w-16 sm:h-24 bg-white rounded-lg shadow-lg flex flex-col items-center justify-center border-2 border-gray-200">
      <span className={cn("text-2xl sm:text-3xl font-bold", SUIT_CARD_COLORS[suit])}>
        {rank}
      </span>
      <span className={cn("text-xl sm:text-2xl", SUIT_CARD_COLORS[suit])}>
        {SUIT_SYMBOLS[suit]}
      </span>
    </div>
  );
}

function FlopDisplay({ flop, suits }: { flop: Rank[]; suits: Suit[] }) {
  return (
    <div className="flex gap-2 sm:gap-3 justify-center bg-green-800/30 py-4 sm:py-6 px-4 sm:px-8 rounded-xl">
      {flop.map((rank, i) => (
        <BoardCard key={i} rank={rank} suit={suits[i]} />
      ))}
    </div>
  );
}

// ============================================
// Classify Drill
// ============================================

function ClassifyDrill() {
  const [scenario, setScenario] = useState<ClassifyScenario | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<FlopTextureType | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const loadScenario = useCallback(() => {
    setScenario(generateClassifyScenario());
    setSelectedAnswer(null);
    setShowResult(false);
  }, []);

  useEffect(() => {
    loadScenario();
  }, [loadScenario]);

  const handleAnswer = (texture: FlopTextureType) => {
    if (showResult) return;
    setSelectedAnswer(texture);
    setShowResult(true);
    setScore((prev) => ({
      correct: prev.correct + (texture === scenario?.correctTexture ? 1 : 0),
      total: prev.total + 1,
    }));
  };

  const isCorrect = selectedAnswer === scenario?.correctTexture;
  const correctCategory = scenario ? FLOP_TEXTURE_CATEGORIES[scenario.correctTexture] : null;
  const allTextures = Object.values(FLOP_TEXTURE_CATEGORIES);

  return (
    <div className="space-y-6">
      {/* Score */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          正確率: {score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}%
          ({score.correct}/{score.total})
        </div>
        <Button variant="outline" size="sm" onClick={() => setScore({ correct: 0, total: 0 })}>
          <RotateCcw className="h-4 w-4 mr-1" />
          重置
        </Button>
      </div>

      {/* Board Display */}
      {scenario && (
        <div className="space-y-4">
          <FlopDisplay flop={scenario.flop} suits={scenario.suits} />

          {/* Question */}
          <div className="text-center text-lg font-medium">
            這個翻牌面的質地是？
          </div>

          {/* Options - 3 cols on mobile, 4 cols on tablet+ */}
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 sm:gap-2">
            {allTextures.map((cat) => {
              const isSelected = selectedAnswer === cat.id;
              const isCorrectAnswer = scenario.correctTexture === cat.id;

              return (
                <Button
                  key={cat.id}
                  variant="outline"
                  className={cn(
                    "h-11 sm:h-auto sm:py-3 text-left justify-start text-xs sm:text-sm px-2 sm:px-3",
                    showResult && isCorrectAnswer && "bg-green-600 hover:bg-green-600 text-white border-green-600",
                    showResult && isSelected && !isCorrectAnswer && "bg-red-600 hover:bg-red-600 text-white border-red-600",
                    !showResult && "hover:bg-gray-700 active:bg-gray-600"
                  )}
                  onClick={() => handleAnswer(cat.id)}
                  disabled={showResult}
                >
                  <span className="truncate">{cat.nameZh}</span>
                  {showResult && isCorrectAnswer && <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 ml-auto shrink-0" />}
                  {showResult && isSelected && !isCorrectAnswer && <XCircle className="h-3 w-3 sm:h-4 sm:w-4 ml-auto shrink-0" />}
                </Button>
              );
            })}
          </div>

          {/* Result */}
          {showResult && correctCategory && (
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="pt-4">
                <div className={cn(
                  "text-lg font-semibold mb-2",
                  isCorrect ? "text-green-400" : "text-red-400"
                )}>
                  {isCorrect ? "正確！" : "錯誤"}
                </div>
                <p className="text-gray-300 text-sm mb-2">
                  正確答案: <span className="font-semibold text-white">{correctCategory.nameZh}</span>
                </p>
                <p className="text-gray-400 text-sm">
                  {correctCategory.descriptionZh}
                </p>
                <div className="flex flex-wrap items-center gap-4 mt-3 text-sm">
                  <span className="text-gray-400">
                    IP C-bet: <span className="text-cyan-400">{correctCategory.ip.cbetFreqMin}-{correctCategory.ip.cbetFreqMax}%</span>
                  </span>
                  <span className="text-gray-400">
                    Sizing: <span className="text-yellow-400">{correctCategory.ip.sizing}</span>
                  </span>
                  <Badge className={getAdvantageColor(correctCategory.advantageTier)}>
                    {correctCategory.advantageTier}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Next Button */}
          {showResult && (
            <Button onClick={loadScenario} className="w-full">
              下一題 <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// C-bet Drill
// ============================================

function CbetDrill() {
  const [scenario, setScenario] = useState<CbetScenario | null>(null);
  const [selectedFreq, setSelectedFreq] = useState<string | null>(null);
  const [selectedSizing, setSelectedSizing] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const loadScenario = useCallback(() => {
    setScenario(generateCbetScenario());
    setSelectedFreq(null);
    setSelectedSizing(null);
    setShowResult(false);
  }, []);

  useEffect(() => {
    loadScenario();
  }, [loadScenario]);

  const handleSubmit = () => {
    if (!selectedFreq || !selectedSizing) return;
    setShowResult(true);
    const isFreqCorrect = selectedFreq === scenario?.correctFrequency;
    const isSizingCorrect = selectedSizing === scenario?.correctSizing;
    setScore((prev) => ({
      correct: prev.correct + (isFreqCorrect && isSizingCorrect ? 1 : 0),
      total: prev.total + 1,
    }));
  };

  const category = scenario ? FLOP_TEXTURE_CATEGORIES[scenario.texture] : null;
  const isFreqCorrect = selectedFreq === scenario?.correctFrequency;
  const isSizingCorrect = selectedSizing === scenario?.correctSizing;

  return (
    <div className="space-y-6">
      {/* Score */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          正確率: {score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}%
          ({score.correct}/{score.total})
        </div>
        <Button variant="outline" size="sm" onClick={() => setScore({ correct: 0, total: 0 })}>
          <RotateCcw className="h-4 w-4 mr-1" />
          重置
        </Button>
      </div>

      {scenario && category && (
        <div className="space-y-4">
          <FlopDisplay flop={scenario.flop} suits={scenario.suits} />

          {/* Context */}
          <div className="flex items-center justify-center gap-4 text-sm">
            <Badge variant="outline">{scenario.potType === "srp" ? "單次加注底池" : "3-Bet 底池"}</Badge>
            <Badge variant="outline" className={scenario.position === "IP" ? "bg-green-600/20 text-green-400" : "bg-orange-600/20 text-orange-400"}>
              {scenario.position === "IP" ? "有位置" : "無位置"}
            </Badge>
            <Badge variant="secondary">{category.nameZh}</Badge>
          </div>

          {/* Question */}
          <div className="text-center text-lg font-medium">
            應該用什麼頻率和尺寸 C-bet？
          </div>

          {/* Frequency Selection */}
          <div className="space-y-2">
            <p className="text-sm text-gray-400">C-bet 頻率:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {FREQUENCY_OPTIONS.map((opt) => (
                <Button
                  key={opt.key}
                  variant={selectedFreq === opt.key ? "default" : "outline"}
                  className={cn(
                    "h-auto py-2",
                    showResult && opt.key === scenario.correctFrequency && "ring-2 ring-green-400",
                    showResult && selectedFreq === opt.key && opt.key !== scenario.correctFrequency && "ring-2 ring-red-400"
                  )}
                  onClick={() => !showResult && setSelectedFreq(opt.key)}
                  disabled={showResult}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Sizing Selection */}
          <div className="space-y-2">
            <p className="text-sm text-gray-400">下注尺寸:</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SIZING_OPTIONS.map((opt) => (
                <Button
                  key={opt.key}
                  variant={selectedSizing === opt.key ? "default" : "outline"}
                  className={cn(
                    "h-auto py-2",
                    showResult && opt.key === scenario.correctSizing && "ring-2 ring-green-400",
                    showResult && selectedSizing === opt.key && opt.key !== scenario.correctSizing && "ring-2 ring-red-400"
                  )}
                  onClick={() => !showResult && setSelectedSizing(opt.key)}
                  disabled={showResult}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Submit Button */}
          {!showResult && (
            <Button
              onClick={handleSubmit}
              disabled={!selectedFreq || !selectedSizing}
              className="w-full"
            >
              確認答案
            </Button>
          )}

          {/* Result */}
          {showResult && (
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="pt-4">
                <div className={cn(
                  "text-lg font-semibold mb-2",
                  isFreqCorrect && isSizingCorrect ? "text-green-400" : "text-orange-400"
                )}>
                  {isFreqCorrect && isSizingCorrect ? "完全正確！" : isFreqCorrect || isSizingCorrect ? "部分正確" : "需要改進"}
                </div>
                <p className="text-gray-300 text-sm">
                  {category.nameZh} 牌面（{scenario.position}），建議 C-bet 頻率約{" "}
                  <span className="text-cyan-400">
                    {scenario.position === "IP"
                      ? `${category.ip.cbetFreqMin}-${category.ip.cbetFreqMax}%`
                      : `${category.oop.cbetFreqMin}-${category.oop.cbetFreqMax}%`}
                  </span>，
                  使用 <span className="text-yellow-400">
                    {scenario.position === "IP" ? category.ip.sizing : category.oop.sizing}
                  </span> 尺寸。
                </p>
                <p className="text-gray-400 text-sm mt-2">
                  {category.descriptionZh}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Next Button */}
          {showResult && (
            <Button onClick={loadScenario} className="w-full">
              下一題 <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Quick Drill
// ============================================

function QuickDrill() {
  const [scenario, setScenario] = useState<QuickScenario | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [timeLeft, setTimeLeft] = useState(10);
  const [isTimerActive, setIsTimerActive] = useState(false);

  const loadScenario = useCallback(() => {
    setScenario(generateQuickScenario());
    setSelectedAnswer(null);
    setShowResult(false);
    setTimeLeft(10);
    setIsTimerActive(true);
  }, []);

  useEffect(() => {
    loadScenario();
  }, [loadScenario]);

  // Timer
  useEffect(() => {
    if (!isTimerActive || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsTimerActive(false);
          setShowResult(true);
          setScore((s) => ({ correct: s.correct, total: s.total + 1 }));
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTimerActive, timeLeft]);

  const handleAnswer = (answer: string) => {
    if (showResult) return;
    setSelectedAnswer(answer);
    setShowResult(true);
    setIsTimerActive(false);
    const isCorrect = answer === scenario?.correctAnswer;
    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));
  };

  const getQuestionText = () => {
    switch (scenario?.questionType) {
      case "connectivity": return "這個牌面的連接性？";
      case "suit_distribution": return "這個牌面的花色分佈？";
      case "texture_category": return "這個牌面的質地類型？";
      case "advantage_tier": return "PFR 的 Range 優勢等級？";
      default: return "";
    }
  };

  const getOptions = () => {
    switch (scenario?.questionType) {
      case "connectivity":
        return [
          { key: "connected", label: "連接 (gapSum≤4)" },
          { key: "disconnected", label: "不連接" },
        ];
      case "suit_distribution":
        return [
          { key: "rainbow", label: "彩虹" },
          { key: "twotone", label: "雙花" },
          { key: "monotone", label: "單花" },
        ];
      case "texture_category": {
        const allTypes = Object.values(FLOP_TEXTURE_CATEGORIES);
        return allTypes.map((cat) => ({ key: cat.id, label: cat.nameZh }));
      }
      case "advantage_tier":
        return [
          { key: "high", label: "高 (PFR 大優勢)" },
          { key: "medium", label: "中 (部分優勢)" },
          { key: "low", label: "低 (對手有利)" },
          { key: "special", label: "特殊" },
        ];
      default:
        return [];
    }
  };

  const isCorrect = selectedAnswer === scenario?.correctAnswer;

  return (
    <div className="space-y-6">
      {/* Score & Timer */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          正確率: {score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}%
          ({score.correct}/{score.total})
        </div>
        <div className="flex items-center gap-4">
          <div className={cn(
            "flex items-center gap-1",
            timeLeft <= 3 ? "text-red-400" : "text-gray-400"
          )}>
            <Timer className="h-4 w-4" />
            <span className="font-mono">{timeLeft}s</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => setScore({ correct: 0, total: 0 })}>
            <RotateCcw className="h-4 w-4 mr-1" />
            重置
          </Button>
        </div>
      </div>

      {/* Timer Progress */}
      <Progress value={(timeLeft / 10) * 100} className={cn(timeLeft <= 3 && "[&>div]:bg-red-500")} />

      {scenario && (
        <div className="space-y-4">
          <FlopDisplay flop={scenario.flop} suits={scenario.suits} />

          {/* Question */}
          <div className="text-center text-lg font-medium">
            {getQuestionText()}
          </div>

          {/* Options */}
          <div className={cn(
            "grid gap-2",
            scenario.questionType === "texture_category"
              ? "grid-cols-2 sm:grid-cols-3"
              : scenario.questionType === "advantage_tier"
                ? "grid-cols-2"
                : "grid-cols-2 sm:grid-cols-3"
          )}>
            {getOptions().map((opt) => {
              const isSelected = selectedAnswer === opt.key;
              const isCorrectAnswer = scenario.correctAnswer === opt.key;

              return (
                <Button
                  key={opt.key}
                  variant="outline"
                  className={cn(
                    "h-auto py-3 text-sm sm:text-base",
                    showResult && isCorrectAnswer && "bg-green-600 hover:bg-green-600 text-white border-green-600",
                    showResult && isSelected && !isCorrectAnswer && "bg-red-600 hover:bg-red-600 text-white border-red-600",
                    !showResult && "hover:bg-gray-700"
                  )}
                  onClick={() => handleAnswer(opt.key)}
                  disabled={showResult}
                >
                  {opt.label}
                  {showResult && isCorrectAnswer && <CheckCircle2 className="h-4 w-4 ml-1" />}
                </Button>
              );
            })}
          </div>

          {/* Result */}
          {showResult && (
            <div className={cn(
              "text-center text-lg font-semibold",
              isCorrect ? "text-green-400" : timeLeft === 0 ? "text-orange-400" : "text-red-400"
            )}>
              {isCorrect ? "正確！" : timeLeft === 0 ? "時間到！" : "錯誤"}
            </div>
          )}

          {/* Next Button */}
          {showResult && (
            <Button onClick={loadScenario} className="w-full">
              下一題 <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Four Questions Framework Drill
// ============================================
// Three Layer Decision Drill
// ============================================

const THREE_LAYER_LABELS: Record<ThreeLayerType, { question: string; subtext: string; icon: string }> = {
  initiative: {
    question: "你有主動權嗎？",
    subtext: "這張翻牌，還能代表你翻前的故事嗎？",
    icon: "1",
  },
  volatility: {
    question: "牌面會變臉嗎？",
    subtext: "Turn 會不會一張牌就讓局勢翻掉？",
    icon: "2",
  },
  purpose: {
    question: "下注目的是什麼？",
    subtext: "Value / Deny equity / Bluff - 選一個",
    icon: "3",
  },
};

const THREE_LAYER_OPTIONS: Record<ThreeLayerType, Array<{ key: string; label: string; emoji: string }>> = {
  initiative: [
    { key: "yes", label: "有主動權", emoji: "✓" },
    { key: "partial", label: "部分/脆弱", emoji: "~" },
    { key: "no", label: "沒有主動權", emoji: "✗" },
    { key: "depends", label: "看手牌", emoji: "?" },
  ],
  volatility: [
    { key: "low", label: "低 (穩定)", emoji: "🟢" },
    { key: "medium", label: "中等", emoji: "🟡" },
    { key: "high", label: "高 (會翻天)", emoji: "🔴" },
    { key: "explosive", label: "爆炸快", emoji: "💥" },
  ],
  purpose: [
    { key: "deny", label: "Deny Equity", emoji: "🚫" },
    { key: "value_protect", label: "Value + 保護", emoji: "💰" },
    { key: "thin_value", label: "薄價值", emoji: "📉" },
    { key: "unclear", label: "不明 = Check", emoji: "❌" },
    { key: "rarely_bet", label: "很少下注", emoji: "⏸" },
    { key: "polarized", label: "極端化", emoji: "⚡" },
  ],
};

function ThreeLayerDrill() {
  const [scenario, setScenario] = useState<ThreeLayerScenario | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const loadScenario = useCallback(() => {
    setScenario(generateThreeLayerScenario());
    setSelectedAnswer(null);
    setShowResult(false);
  }, []);

  useEffect(() => {
    loadScenario();
  }, [loadScenario]);

  const handleAnswer = (answer: string) => {
    if (showResult) return;
    setSelectedAnswer(answer);
    setShowResult(true);
    const isCorrect = answer === scenario?.correctAnswer;
    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));
  };

  const isCorrect = selectedAnswer === scenario?.correctAnswer;
  const layerType = scenario?.currentLayer;
  const layerLabel = layerType ? THREE_LAYER_LABELS[layerType] : null;
  const options = layerType ? THREE_LAYER_OPTIONS[layerType] : [];
  const category = scenario ? FLOP_TEXTURE_CATEGORIES[scenario.texture] : null;

  return (
    <div className="space-y-6">
      {/* Header with 3-Layer Framework */}
      <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded-lg p-4 border border-cyan-700/50">
        <h3 className="text-sm font-semibold text-cyan-300 mb-2">三層判斷流程</h3>
        <div className="space-y-1 text-xs">
          <div className={cn(
            "flex items-center gap-2",
            layerType === "initiative" ? "text-cyan-300 font-semibold" : "text-gray-400"
          )}>
            <span className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-[10px]">1</span>
            Range 優勢還在不在？
          </div>
          <div className={cn(
            "flex items-center gap-2",
            layerType === "volatility" ? "text-cyan-300 font-semibold" : "text-gray-400"
          )}>
            <span className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-[10px]">2</span>
            牌面會不會「變臉」？
          </div>
          <div className={cn(
            "flex items-center gap-2",
            layerType === "purpose" ? "text-cyan-300 font-semibold" : "text-gray-400"
          )}>
            <span className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-[10px]">3</span>
            下注的目的是什麼？
          </div>
        </div>
      </div>

      {/* Score */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          正確率: {score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}%
          ({score.correct}/{score.total})
        </div>
        <Button variant="outline" size="sm" onClick={() => setScore({ correct: 0, total: 0 })}>
          <RotateCcw className="h-4 w-4 mr-1" />
          重置
        </Button>
      </div>

      {scenario && layerLabel && (
        <div className="space-y-4">
          <FlopDisplay flop={scenario.flop} suits={scenario.suits} />

          {/* Context Info */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
            <Badge variant="outline">{scenario.potType === "srp" ? "SRP" : "3BP"}</Badge>
            <Badge variant="outline" className={scenario.position === "IP" ? "bg-green-600/20 text-green-400" : "bg-orange-600/20 text-orange-400"}>
              {scenario.position}
            </Badge>
            <Badge variant="secondary">{category?.nameZh}</Badge>
          </div>

          {/* Ranges */}
          <div className="flex justify-center gap-6 text-sm text-gray-400">
            <div>Hero: <span className="text-cyan-400">{scenario.heroRange}</span></div>
            <div>Villain: <span className="text-orange-400">{scenario.villainRange}</span></div>
          </div>

          {/* Question */}
          <div className="text-center">
            <Badge className="bg-cyan-600 mb-2">Layer {layerLabel.icon}</Badge>
            <div className="text-lg font-medium">{layerLabel.question}</div>
            <div className="text-sm text-gray-400 mt-1">{layerLabel.subtext}</div>
          </div>

          {/* Options */}
          <div className={cn(
            "grid gap-2",
            options.length <= 4 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
          )}>
            {options.map((opt) => {
              const isSelected = selectedAnswer === opt.key;
              const isCorrectAnswer = scenario.correctAnswer === opt.key;

              return (
                <Button
                  key={opt.key}
                  variant="outline"
                  className={cn(
                    "h-auto py-3 text-sm",
                    showResult && isCorrectAnswer && "bg-green-600 hover:bg-green-600 text-white border-green-600",
                    showResult && isSelected && !isCorrectAnswer && "bg-red-600 hover:bg-red-600 text-white border-red-600",
                    !showResult && "hover:bg-gray-700"
                  )}
                  onClick={() => handleAnswer(opt.key)}
                  disabled={showResult}
                >
                  <span className="mr-1">{opt.emoji}</span> {opt.label}
                  {showResult && isCorrectAnswer && <CheckCircle2 className="h-4 w-4 ml-1" />}
                  {showResult && isSelected && !isCorrectAnswer && <XCircle className="h-4 w-4 ml-1" />}
                </Button>
              );
            })}
          </div>

          {/* Result */}
          {showResult && (
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="pt-4">
                <div className={cn(
                  "text-lg font-semibold mb-2",
                  isCorrect ? "text-green-400" : "text-red-400"
                )}>
                  {isCorrect ? "正確！" : "錯誤"}
                </div>
                <p className="text-gray-300 text-sm">
                  {scenario.explanationZh}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Next Button */}
          {showResult && (
            <Button onClick={loadScenario} className="w-full">
              下一題 <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Must-Check Drill
// ============================================

function MustCheckDrill() {
  const [scenario, setScenario] = useState<MustCheckScenario | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState({ correct: 0, total: 0 });

  const loadScenario = useCallback(() => {
    setScenario(generateMustCheckScenario());
    setSelectedAnswer(null);
    setShowResult(false);
  }, []);

  useEffect(() => {
    loadScenario();
  }, [loadScenario]);

  const handleAnswer = (answer: boolean) => {
    if (showResult) return;
    setSelectedAnswer(answer);
    setShowResult(true);
    const isCorrect = answer === scenario?.shouldCheck;
    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));
  };

  const isCorrect = selectedAnswer === scenario?.shouldCheck;
  const category = scenario ? FLOP_TEXTURE_CATEGORIES[scenario.texture] : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-900/30 to-red-900/30 rounded-lg p-4 border border-orange-700/50">
        <h3 className="text-sm font-semibold text-orange-300 mb-2">一句話自檢法</h3>
        <p className="text-xs text-gray-400">
          「我現在下注，是因為___，被跟注後我打算___。」
        </p>
        <p className="text-xs text-orange-400 mt-1">
          如果講不出來 → Check = 最接近 GTO 的選擇
        </p>
      </div>

      {/* Score */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          正確率: {score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}%
          ({score.correct}/{score.total})
        </div>
        <Button variant="outline" size="sm" onClick={() => setScore({ correct: 0, total: 0 })}>
          <RotateCcw className="h-4 w-4 mr-1" />
          重置
        </Button>
      </div>

      {scenario && (
        <div className="space-y-4">
          <FlopDisplay flop={scenario.flop} suits={scenario.suits} />

          {/* Context Info */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
            <Badge variant="outline" className={scenario.position === "IP" ? "bg-green-600/20 text-green-400" : "bg-orange-600/20 text-orange-400"}>
              {scenario.position}
            </Badge>
            <Badge variant="secondary">{category?.nameZh}</Badge>
          </div>

          {/* Hero Hand */}
          <div className="text-center">
            <div className="text-sm text-gray-400 mb-1">你的手牌</div>
            <div className="text-2xl font-bold text-white">{scenario.heroHand}</div>
            <div className="text-sm text-gray-400">({scenario.heroHandType})</div>
          </div>

          {/* Question */}
          <div className="text-center text-lg font-medium">
            這手牌應該 Check 嗎？
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              className={cn(
                "h-auto py-6 text-lg",
                showResult && scenario.shouldCheck && "bg-green-600 hover:bg-green-600 text-white border-green-600",
                showResult && selectedAnswer === true && !scenario.shouldCheck && "bg-red-600 hover:bg-red-600 text-white border-red-600",
                !showResult && "hover:bg-gray-700"
              )}
              onClick={() => handleAnswer(true)}
              disabled={showResult}
            >
              ✓ Check
            </Button>
            <Button
              variant="outline"
              className={cn(
                "h-auto py-6 text-lg",
                showResult && !scenario.shouldCheck && "bg-green-600 hover:bg-green-600 text-white border-green-600",
                showResult && selectedAnswer === false && scenario.shouldCheck && "bg-red-600 hover:bg-red-600 text-white border-red-600",
                !showResult && "hover:bg-gray-700"
              )}
              onClick={() => handleAnswer(false)}
              disabled={showResult}
            >
              ✗ 可以下注
            </Button>
          </div>

          {/* Result */}
          {showResult && (
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="pt-4">
                <div className={cn(
                  "text-lg font-semibold mb-2",
                  isCorrect ? "text-green-400" : "text-red-400"
                )}>
                  {isCorrect ? "正確！" : "錯誤"}
                </div>
                <Badge variant="outline" className="mb-2">{scenario.category}</Badge>
                <p className="text-gray-300 text-sm">
                  {scenario.reasonZh}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Next Button */}
          {showResult && (
            <Button onClick={loadScenario} className="w-full">
              下一題 <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Check First Challenge Drill
// ============================================

const CHECK_FIRST_TARGET = 10; // Need 10 consecutive correct to win

function CheckFirstDrill() {
  const [scenario, setScenario] = useState<MustCheckScenario | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<boolean | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [streak, setStreak] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [totalAttempts, setTotalAttempts] = useState(0);

  const loadScenario = useCallback(() => {
    setScenario(generateCheckFirstScenario());
    setSelectedAnswer(null);
    setShowResult(false);
  }, []);

  useEffect(() => {
    loadScenario();
  }, [loadScenario]);

  const handleAnswer = (answer: boolean) => {
    if (showResult || isComplete) return;
    setSelectedAnswer(answer);
    setShowResult(true);
    setTotalAttempts((prev) => prev + 1);

    // In this mode, the correct answer is always "Check" (true)
    const isCorrect = answer === true;

    if (isCorrect) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak >= CHECK_FIRST_TARGET) {
        setIsComplete(true);
      }
    } else {
      // Wrong answer resets streak
      setStreak(0);
    }
  };

  const handleReset = () => {
    setStreak(0);
    setIsComplete(false);
    setTotalAttempts(0);
    loadScenario();
  };

  const isCorrect = selectedAnswer === true;
  const category = scenario ? FLOP_TEXTURE_CATEGORIES[scenario.texture] : null;

  // Celebration screen
  if (isComplete) {
    return (
      <div className="space-y-6 text-center">
        <div className="py-8">
          <div className="text-6xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-green-400 mb-2">挑戰成功！</h2>
          <p className="text-gray-400">
            連續 {CHECK_FIRST_TARGET} 題全部正確辨識「應該 Check」的情況
          </p>
          <p className="text-sm text-gray-500 mt-2">
            總嘗試次數: {totalAttempts} 題
          </p>
        </div>
        <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-lg p-4 border border-green-700/50">
          <p className="text-sm text-green-300">
            你已經建立了「Check First」的肌肉記憶！<br />
            記住：說不出下注理由 = 不該下注
          </p>
        </div>
        <Button onClick={handleReset} className="w-full">
          <RotateCcw className="h-4 w-4 mr-2" />
          再挑戰一次
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-lg p-4 border border-purple-700/50">
        <h3 className="text-sm font-semibold text-purple-300 mb-2">Check First 挑戰</h3>
        <p className="text-xs text-gray-400">
          連續答對 <span className="text-purple-300 font-bold">{CHECK_FIRST_TARGET}</span> 題才算過關。
          答錯歸零重來！
        </p>
        <p className="text-xs text-purple-400 mt-1">
          提示：這裡的每一題，正確答案都是 Check
        </p>
      </div>

      {/* Streak Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">連勝進度</span>
          <span className={cn(
            "font-bold",
            streak >= 7 ? "text-green-400" : streak >= 4 ? "text-yellow-400" : "text-gray-300"
          )}>
            {streak} / {CHECK_FIRST_TARGET}
          </span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: CHECK_FIRST_TARGET }).map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-3 flex-1 rounded-sm transition-all",
                i < streak
                  ? "bg-gradient-to-r from-purple-500 to-pink-500"
                  : "bg-gray-700"
              )}
            />
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">
          總嘗試: {totalAttempts} 題
        </span>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-1" />
          重置
        </Button>
      </div>

      {scenario && (
        <div className="space-y-4">
          <FlopDisplay flop={scenario.flop} suits={scenario.suits} />

          {/* Context Info */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
            <Badge variant="outline" className={scenario.position === "IP" ? "bg-green-600/20 text-green-400" : "bg-orange-600/20 text-orange-400"}>
              {scenario.position}
            </Badge>
            <Badge variant="secondary">{category?.nameZh}</Badge>
          </div>

          {/* Hero Hand */}
          <div className="text-center">
            <div className="text-sm text-gray-400 mb-1">你的手牌</div>
            <div className="text-2xl font-bold text-white">{scenario.heroHand}</div>
            <div className="text-sm text-gray-400">({scenario.heroHandType})</div>
          </div>

          {/* Question */}
          <div className="text-center text-lg font-medium">
            這手牌應該？
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-4">
            <Button
              variant="outline"
              className={cn(
                "h-auto py-6 text-lg",
                showResult && isCorrect && "bg-green-600 hover:bg-green-600 text-white border-green-600",
                showResult && selectedAnswer === true && !isCorrect && "bg-red-600 hover:bg-red-600 text-white border-red-600",
                !showResult && "hover:bg-purple-900/50 border-purple-500/50"
              )}
              onClick={() => handleAnswer(true)}
              disabled={showResult}
            >
              ✓ Check
            </Button>
            <Button
              variant="outline"
              className={cn(
                "h-auto py-6 text-lg",
                showResult && !isCorrect && selectedAnswer === false && "bg-red-600 hover:bg-red-600 text-white border-red-600",
                !showResult && "hover:bg-gray-700"
              )}
              onClick={() => handleAnswer(false)}
              disabled={showResult}
            >
              ✗ 下注
            </Button>
          </div>

          {/* Result */}
          {showResult && (
            <Card className={cn(
              "border",
              isCorrect ? "bg-green-900/20 border-green-700" : "bg-red-900/20 border-red-700"
            )}>
              <CardContent className="pt-4">
                <div className={cn(
                  "text-lg font-semibold mb-2",
                  isCorrect ? "text-green-400" : "text-red-400"
                )}>
                  {isCorrect ? `正確！連勝 ${streak} 🔥` : "錯誤！連勝歸零 💔"}
                </div>
                <Badge variant="outline" className="mb-2">{scenario.category}</Badge>
                <p className="text-gray-300 text-sm">
                  {scenario.reasonZh}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Next Button */}
          {showResult && !isComplete && (
            <Button onClick={loadScenario} className="w-full">
              下一題 <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Live Exploit Drill
// ============================================

type LiveExploitSubMode = "notes" | "quiz";
type LiveQuizType = "adjustment" | "multiway" | "dangerSign" | "leakExploit";

// Helper to display frequency adjustment
function getFreqAdjustLabel(adj: FrequencyAdjust): { label: string; color: string } {
  switch (adj) {
    case "much_higher": return { label: "大幅提高", color: "text-green-400" };
    case "higher": return { label: "略提高", color: "text-green-300" };
    case "same": return { label: "維持", color: "text-gray-400" };
    case "lower": return { label: "略降低", color: "text-orange-300" };
    case "much_lower": return { label: "大幅降低", color: "text-red-400" };
  }
}

function getSizingAdjustLabel(adj: SizingAdjust): { label: string; color: string } {
  switch (adj) {
    case "much_larger": return { label: "大幅放大", color: "text-green-400" };
    case "larger": return { label: "略放大", color: "text-green-300" };
    case "same": return { label: "維持", color: "text-gray-400" };
    case "smaller": return { label: "縮小", color: "text-orange-300" };
  }
}

// Multiway decision scenarios
const MULTIWAY_SCENARIOS = [
  { texture: "ABB" as FlopTextureType, hand: "A♠K♥ (頂對頂踢)", correctAction: "bet_large", explanation: "強 Ax 多路仍可大注取值" },
  { texture: "ABB" as FlopTextureType, hand: "K♣Q♦ (空氣)", correctAction: "check", explanation: "多路無法詐唬，放棄空氣" },
  { texture: "Axx" as FlopTextureType, hand: "A♠9♥ (頂對弱踢)", correctAction: "bet_small", explanation: "頂對可小注試探，但不要膨脹底池" },
  { texture: "Axx" as FlopTextureType, hand: "K♣K♦ (第二對)", correctAction: "check", explanation: "多路中對太弱，check 控池" },
  { texture: "BBB" as FlopTextureType, hand: "Q♠Q♥ (暗三)", correctAction: "bet_large", explanation: "堅果多路可以大注建池" },
  { texture: "BBB" as FlopTextureType, hand: "A♣K♦ (聽牌)", correctAction: "check", explanation: "多路聽牌 check 是更好選擇" },
  { texture: "Low_conn" as FlopTextureType, hand: "A♠A♥ (Overpair)", correctAction: "bet_small", explanation: "連接低牌面 overpair 小注保護" },
  { texture: "Low_conn" as FlopTextureType, hand: "K♣Q♦ (空氣)", correctAction: "check", explanation: "多路不 bluff，直接放棄" },
  { texture: "JT_conn" as FlopTextureType, hand: "9♠8♥ (順子)", correctAction: "bet_large", explanation: "堅果慢打沒意義，直接取值" },
  { texture: "JT_conn" as FlopTextureType, hand: "A♣A♦ (Overpair)", correctAction: "check", explanation: "多路濕牌 AA 很危險，check 控池" },
  { texture: "Paired" as FlopTextureType, hand: "K♠K♥ (葫蘆)", correctAction: "bet_small", explanation: "Full house 小注引誘" },
  { texture: "Paired" as FlopTextureType, hand: "A♣Q♦ (高牌)", correctAction: "check", explanation: "配對牌面多路不碰" },
];

// Danger sign scenarios
const DANGER_SIGN_SCENARIOS = [
  { texture: "ABB" as FlopTextureType, action: "對手 Flop check-raise 你的 C-bet", correctMeaning: "strong", explanation: "ABB 牌面 check-raise = 兩對或 set，別硬拼" },
  { texture: "ABB" as FlopTextureType, action: "對手 River 對你的三條街 check-raise", correctMeaning: "nuts", explanation: "River 被 check-raise 幾乎都是真貨" },
  { texture: "Axx" as FlopTextureType, action: "緊凶玩家突然 donk bet", correctMeaning: "strong", explanation: "緊凶 donk = Ax 或更強" },
  { texture: "BBx" as FlopTextureType, action: "對手 Turn 突然加大下注尺寸", correctMeaning: "strong", explanation: "突然大注 = 有牌想取值" },
  { texture: "Low_conn" as FlopTextureType, action: "魚玩家 River 小注", correctMeaning: "weak_value", explanation: "小注 = 詐唬迷思或弱價值，可以 raise" },
  { texture: "Low_conn" as FlopTextureType, action: "對手全程 check-call 後 River bet pot", correctMeaning: "nuts", explanation: "這個 line 幾乎只有堅果" },
  { texture: "JTx" as FlopTextureType, action: "被動玩家突然 3-bet 你的 Turn bet", correctMeaning: "nuts", explanation: "被動玩家主動出擊 = 極強牌" },
  { texture: "Paired" as FlopTextureType, action: "對手 Flop check，Turn donk pot", correctMeaning: "strong", explanation: "配對牌面 delayed donk = 通常是三條" },
  { texture: "Trips" as FlopTextureType, action: "對手快速 call 你的 Flop bet", correctMeaning: "drawing", explanation: "快速 call = 聽牌或弱對子" },
  { texture: "BBB" as FlopTextureType, action: "對手長考後 all-in", correctMeaning: "polarized", explanation: "長考 all-in = 極化，堅果或詐唬" },
];

// Leak exploit scenarios
const LEAK_EXPLOIT_SCENARIOS = [
  { texture: "ABB" as FlopTextureType, leak: "對手用 1/3 pot 小注 C-bet", correctExploit: "raise", explanation: "小注 C-bet = 弱牌試探，raise 把他趕走" },
  { texture: "Axx" as FlopTextureType, leak: "對手 Turn check 後 River 大注", correctExploit: "fold_marginal", explanation: "這個 line 幾乎沒有詐唬，棄掉邊緣牌" },
  { texture: "Low_conn" as FlopTextureType, leak: "對手從不 check-raise", correctExploit: "bet_thin", explanation: "可以更薄價值下注，他不會 check-raise 你" },
  { texture: "BBx" as FlopTextureType, leak: "對手 River 總是 check 中等牌", correctExploit: "value_bet", explanation: "他 check = 邊緣牌，你可以薄價值下注" },
  { texture: "JT_conn" as FlopTextureType, leak: "對手過度保護聽牌，不願棄牌", correctExploit: "value_only", explanation: "對不棄牌的人只打價值，不詐唬" },
  { texture: "Paired" as FlopTextureType, leak: "對手配對牌面過度 bluff", correctExploit: "call_light", explanation: "他詐唬太多，用更寬範圍跟注" },
  { texture: "Trips" as FlopTextureType, leak: "對手有 Ax 不棄牌", correctExploit: "overbet_value", explanation: "他們 call 太多，用堅果 overbet 取值" },
  { texture: "ABx" as FlopTextureType, leak: "對手面對 check-raise 過度棄牌", correctExploit: "cr_bluff", explanation: "用更多聽牌 check-raise 詐唬" },
];

interface LiveQuizState {
  type: LiveQuizType;
  texture: FlopTextureType;
  flop: Rank[];
  suits: Suit[];
  // For adjustment quiz
  adjustmentAnswer?: { freq: FrequencyAdjust | null; sizing: SizingAdjust | null };
  // For multiway quiz
  multiwayScenario?: typeof MULTIWAY_SCENARIOS[0];
  multiwayAnswer?: string | null;
  // For danger sign quiz
  dangerScenario?: typeof DANGER_SIGN_SCENARIOS[0];
  dangerAnswer?: string | null;
  // For leak exploit quiz
  leakScenario?: typeof LEAK_EXPLOIT_SCENARIOS[0];
  leakAnswer?: string | null;
}

function LiveExploitDrill() {
  const [subMode, setSubMode] = useState<LiveExploitSubMode>("notes");
  const [selectedTexture, setSelectedTexture] = useState<FlopTextureType | null>(null);
  const [quiz, setQuiz] = useState<LiveQuizState | null>(null);
  const [showQuizResult, setShowQuizResult] = useState(false);
  const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });

  const allTextures = Object.values(FLOP_TEXTURE_CATEGORIES);

  const loadQuizScenario = useCallback(() => {
    // Randomly pick a quiz type
    const quizTypes: LiveQuizType[] = ["adjustment", "multiway", "dangerSign", "leakExploit"];
    const randomType = quizTypes[Math.floor(Math.random() * quizTypes.length)];

    if (randomType === "adjustment") {
      const textures = Object.keys(FLOP_TEXTURE_CATEGORIES) as FlopTextureType[];
      const randomTexture = textures[Math.floor(Math.random() * textures.length)];
      const { ranks, suits } = generateFlopOfTexture(randomTexture);
      setQuiz({
        type: "adjustment",
        texture: randomTexture,
        flop: ranks,
        suits,
        adjustmentAnswer: { freq: null, sizing: null },
      });
    } else if (randomType === "multiway") {
      const scenario = MULTIWAY_SCENARIOS[Math.floor(Math.random() * MULTIWAY_SCENARIOS.length)];
      const { ranks, suits } = generateFlopOfTexture(scenario.texture);
      setQuiz({
        type: "multiway",
        texture: scenario.texture,
        flop: ranks,
        suits,
        multiwayScenario: scenario,
        multiwayAnswer: null,
      });
    } else if (randomType === "dangerSign") {
      const scenario = DANGER_SIGN_SCENARIOS[Math.floor(Math.random() * DANGER_SIGN_SCENARIOS.length)];
      const { ranks, suits } = generateFlopOfTexture(scenario.texture);
      setQuiz({
        type: "dangerSign",
        texture: scenario.texture,
        flop: ranks,
        suits,
        dangerScenario: scenario,
        dangerAnswer: null,
      });
    } else {
      const scenario = LEAK_EXPLOIT_SCENARIOS[Math.floor(Math.random() * LEAK_EXPLOIT_SCENARIOS.length)];
      const { ranks, suits } = generateFlopOfTexture(scenario.texture);
      setQuiz({
        type: "leakExploit",
        texture: scenario.texture,
        flop: ranks,
        suits,
        leakScenario: scenario,
        leakAnswer: null,
      });
    }
    setShowQuizResult(false);
  }, []);

  useEffect(() => {
    if (subMode === "quiz" && !quiz) {
      loadQuizScenario();
    }
  }, [subMode, quiz, loadQuizScenario]);

  const handleQuizSubmit = () => {
    if (!quiz) return;

    let isCorrect = false;

    if (quiz.type === "adjustment" && quiz.adjustmentAnswer) {
      const category = FLOP_TEXTURE_CATEGORIES[quiz.texture];
      const isFreqCorrect = quiz.adjustmentAnswer.freq === category.liveExploit.frequencyAdjust;
      const isSizingCorrect = quiz.adjustmentAnswer.sizing === category.liveExploit.sizingAdjust;
      isCorrect = isFreqCorrect && isSizingCorrect;
    } else if (quiz.type === "multiway" && quiz.multiwayScenario) {
      isCorrect = quiz.multiwayAnswer === quiz.multiwayScenario.correctAction;
    } else if (quiz.type === "dangerSign" && quiz.dangerScenario) {
      isCorrect = quiz.dangerAnswer === quiz.dangerScenario.correctMeaning;
    } else if (quiz.type === "leakExploit" && quiz.leakScenario) {
      isCorrect = quiz.leakAnswer === quiz.leakScenario.correctExploit;
    }

    setShowQuizResult(true);
    setQuizScore(prev => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));
  };

  // Notes Mode
  if (subMode === "notes") {
    const selected = selectedTexture ? FLOP_TEXTURE_CATEGORIES[selectedTexture] : null;

    return (
      <div className="space-y-4">
        {/* Sub-mode toggle */}
        <div className="flex gap-2">
          <Button size="sm" variant="default" onClick={() => setSubMode("notes")}>
            📋 筆記速查
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSubMode("quiz")}>
            🎯 綜合測驗
          </Button>
        </div>

        {/* Texture selector */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {allTextures.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedTexture === cat.id ? "default" : "outline"}
              size="sm"
              className="text-xs h-auto py-2"
              onClick={() => setSelectedTexture(cat.id)}
            >
              {cat.nameZh}
            </Button>
          ))}
        </div>

        {/* Selected texture details */}
        {selected && (
          <Card className="bg-gray-900/50 border-amber-700/50">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-amber-400">{selected.nameZh}</CardTitle>
                <Badge className={getAdvantageColor(selected.advantageTier)}>{selected.advantageTier}</Badge>
              </div>
              <p className="text-xs text-gray-400">{selected.nameEn}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* GTO vs Live comparison */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-800/50 rounded p-3">
                  <div className="text-gray-500 text-xs mb-1">GTO 頻率</div>
                  <div className="text-cyan-400">{selected.ip.cbetFreqMin}-{selected.ip.cbetFreqMax}%</div>
                </div>
                <div className="bg-gray-800/50 rounded p-3">
                  <div className="text-gray-500 text-xs mb-1">線下調整</div>
                  <div className={getFreqAdjustLabel(selected.liveExploit.frequencyAdjust).color}>
                    {getFreqAdjustLabel(selected.liveExploit.frequencyAdjust).label}
                  </div>
                </div>
                <div className="bg-gray-800/50 rounded p-3">
                  <div className="text-gray-500 text-xs mb-1">GTO 尺寸</div>
                  <div className="text-yellow-400">{selected.ip.sizing}</div>
                </div>
                <div className="bg-gray-800/50 rounded p-3">
                  <div className="text-gray-500 text-xs mb-1">線下調整</div>
                  <div className={getSizingAdjustLabel(selected.liveExploit.sizingAdjust).color}>
                    {getSizingAdjustLabel(selected.liveExploit.sizingAdjust).label}
                  </div>
                </div>
              </div>

              {/* Multi-way note */}
              <div className="bg-orange-900/20 border border-orange-700/30 rounded p-3">
                <div className="text-orange-400 text-xs font-semibold mb-1">🎯 多路底池</div>
                <p className="text-sm text-gray-300">{selected.liveExploit.multiWayNote}</p>
              </div>

              {/* Exploit tip */}
              <div className="bg-green-900/20 border border-green-700/30 rounded p-3">
                <div className="text-green-400 text-xs font-semibold mb-1">💡 剝削重點</div>
                <p className="text-sm text-gray-300">{selected.liveExploit.exploitTip}</p>
              </div>

              {/* Common leaks */}
              <div>
                <div className="text-gray-500 text-xs mb-2">對手常見漏洞</div>
                <div className="flex flex-wrap gap-2">
                  {selected.liveExploit.commonLeaks.map((leak, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{leak}</Badge>
                  ))}
                </div>
              </div>

              {/* Danger signs */}
              <div className="bg-red-900/20 border border-red-700/30 rounded p-3">
                <div className="text-red-400 text-xs font-semibold mb-1">⚠️ 警告信號</div>
                <ul className="text-sm text-gray-300 space-y-1">
                  {selected.liveExploit.dangerSigns.map((sign, i) => (
                    <li key={i}>• {sign}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {!selected && (
          <div className="text-center text-gray-500 py-8">
            👆 選擇一種質地查看線下剝削筆記
          </div>
        )}
      </div>
    );
  }

  // Quiz Mode
  const quizCategory = quiz ? FLOP_TEXTURE_CATEGORIES[quiz.texture] : null;

  // Quiz type labels
  const quizTypeLabels: Record<LiveQuizType, { icon: string; title: string }> = {
    adjustment: { icon: "📊", title: "頻率/尺寸調整" },
    multiway: { icon: "👥", title: "多路底池決策" },
    dangerSign: { icon: "⚠️", title: "危險信號識別" },
    leakExploit: { icon: "🎯", title: "漏洞剝削" },
  };

  return (
    <div className="space-y-4">
      {/* Sub-mode toggle */}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setSubMode("notes")}>
          📋 筆記速查
        </Button>
        <Button size="sm" variant="default" onClick={() => setSubMode("quiz")}>
          🎯 綜合測驗
        </Button>
      </div>

      {/* Score */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">
          正確率: {quizScore.total > 0 ? Math.round((quizScore.correct / quizScore.total) * 100) : 0}%
          ({quizScore.correct}/{quizScore.total})
        </span>
        <Button variant="outline" size="sm" onClick={() => setQuizScore({ correct: 0, total: 0 })}>
          <RotateCcw className="h-4 w-4 mr-1" />
          重置
        </Button>
      </div>

      {quiz && quizCategory && (
        <div className="space-y-4">
          {/* Quiz type badge */}
          <div className="flex justify-center">
            <Badge variant="secondary" className="text-sm">
              {quizTypeLabels[quiz.type].icon} {quizTypeLabels[quiz.type].title}
            </Badge>
          </div>

          <FlopDisplay flop={quiz.flop} suits={quiz.suits} />

          {/* Texture info */}
          <div className="flex items-center justify-center gap-2">
            <Badge variant="outline">{quizCategory.nameZh}</Badge>
          </div>

          {/* ========== Adjustment Quiz ========== */}
          {quiz.type === "adjustment" && (
            <>
              <div className="bg-gray-800/50 rounded p-3 text-center text-sm">
                <span className="text-gray-400">GTO 基準: </span>
                <span className="text-cyan-400">{quizCategory.ip.cbetFreqMin}-{quizCategory.ip.cbetFreqMax}%</span>
                <span className="text-gray-400"> / </span>
                <span className="text-yellow-400">{quizCategory.ip.sizing}</span>
              </div>

              <div className="text-center text-lg font-medium">
                線下應該怎麼調整？
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-400">頻率調整:</p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {(["much_higher", "higher", "same", "lower", "much_lower"] as FrequencyAdjust[]).map((opt) => {
                    const { label } = getFreqAdjustLabel(opt);
                    return (
                      <Button
                        key={opt}
                        variant={quiz.adjustmentAnswer?.freq === opt ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "text-xs h-auto py-2",
                          showQuizResult && opt === quizCategory.liveExploit.frequencyAdjust && "ring-2 ring-green-400",
                          showQuizResult && quiz.adjustmentAnswer?.freq === opt && opt !== quizCategory.liveExploit.frequencyAdjust && "ring-2 ring-red-400"
                        )}
                        onClick={() => !showQuizResult && setQuiz(prev => prev ? { ...prev, adjustmentAnswer: { ...prev.adjustmentAnswer!, freq: opt } } : null)}
                        disabled={showQuizResult}
                      >
                        {label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-400">尺寸調整:</p>
                <div className="grid grid-cols-4 gap-2">
                  {(["much_larger", "larger", "same", "smaller"] as SizingAdjust[]).map((opt) => {
                    const { label } = getSizingAdjustLabel(opt);
                    return (
                      <Button
                        key={opt}
                        variant={quiz.adjustmentAnswer?.sizing === opt ? "default" : "outline"}
                        size="sm"
                        className={cn(
                          "text-xs h-auto py-2",
                          showQuizResult && opt === quizCategory.liveExploit.sizingAdjust && "ring-2 ring-green-400",
                          showQuizResult && quiz.adjustmentAnswer?.sizing === opt && opt !== quizCategory.liveExploit.sizingAdjust && "ring-2 ring-red-400"
                        )}
                        onClick={() => !showQuizResult && setQuiz(prev => prev ? { ...prev, adjustmentAnswer: { ...prev.adjustmentAnswer!, sizing: opt } } : null)}
                        disabled={showQuizResult}
                      >
                        {label}
                      </Button>
                    );
                  })}
                </div>
              </div>

              {!showQuizResult && (
                <Button
                  onClick={handleQuizSubmit}
                  disabled={!quiz.adjustmentAnswer?.freq || !quiz.adjustmentAnswer?.sizing}
                  className="w-full"
                >
                  確認答案
                </Button>
              )}

              {showQuizResult && (
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardContent className="pt-4">
                    <div className={cn(
                      "text-lg font-semibold mb-2",
                      quiz.adjustmentAnswer?.freq === quizCategory.liveExploit.frequencyAdjust &&
                      quiz.adjustmentAnswer?.sizing === quizCategory.liveExploit.sizingAdjust
                        ? "text-green-400" : "text-orange-400"
                    )}>
                      {quiz.adjustmentAnswer?.freq === quizCategory.liveExploit.frequencyAdjust &&
                       quiz.adjustmentAnswer?.sizing === quizCategory.liveExploit.sizingAdjust
                        ? "完全正確！" : "需要調整"}
                    </div>
                    <p className="text-sm text-gray-300 mb-2">
                      正確答案：頻率 <span className={getFreqAdjustLabel(quizCategory.liveExploit.frequencyAdjust).color}>
                        {getFreqAdjustLabel(quizCategory.liveExploit.frequencyAdjust).label}
                      </span>，尺寸 <span className={getSizingAdjustLabel(quizCategory.liveExploit.sizingAdjust).color}>
                        {getSizingAdjustLabel(quizCategory.liveExploit.sizingAdjust).label}
                      </span>
                    </p>
                    <p className="text-sm text-gray-400">{quizCategory.liveExploit.exploitTip}</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* ========== Multiway Quiz ========== */}
          {quiz.type === "multiway" && quiz.multiwayScenario && (
            <>
              <div className="bg-orange-900/20 border border-orange-700/30 rounded p-3 text-center">
                <p className="text-orange-400 text-sm font-medium mb-1">多路底池 (3+ 人)</p>
                <p className="text-white">你的手牌：{quiz.multiwayScenario.hand}</p>
              </div>

              <div className="text-center text-lg font-medium">
                你應該？
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "check", label: "Check", icon: "✋" },
                  { value: "bet_small", label: "小注 (1/3)", icon: "💰" },
                  { value: "bet_large", label: "大注 (2/3+)", icon: "💎" },
                  { value: "fold", label: "Fold", icon: "🏳️" },
                ].map((opt) => (
                  <Button
                    key={opt.value}
                    variant={quiz.multiwayAnswer === opt.value ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-auto py-3",
                      showQuizResult && opt.value === quiz.multiwayScenario?.correctAction && "ring-2 ring-green-400",
                      showQuizResult && quiz.multiwayAnswer === opt.value && opt.value !== quiz.multiwayScenario?.correctAction && "ring-2 ring-red-400"
                    )}
                    onClick={() => !showQuizResult && setQuiz(prev => prev ? { ...prev, multiwayAnswer: opt.value } : null)}
                    disabled={showQuizResult}
                  >
                    {opt.icon} {opt.label}
                  </Button>
                ))}
              </div>

              {!showQuizResult && (
                <Button onClick={handleQuizSubmit} disabled={!quiz.multiwayAnswer} className="w-full">
                  確認答案
                </Button>
              )}

              {showQuizResult && (
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardContent className="pt-4">
                    <div className={cn(
                      "text-lg font-semibold mb-2",
                      quiz.multiwayAnswer === quiz.multiwayScenario.correctAction ? "text-green-400" : "text-orange-400"
                    )}>
                      {quiz.multiwayAnswer === quiz.multiwayScenario.correctAction ? "正確！" : "不太對"}
                    </div>
                    <p className="text-sm text-gray-300">{quiz.multiwayScenario.explanation}</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* ========== Danger Sign Quiz ========== */}
          {quiz.type === "dangerSign" && quiz.dangerScenario && (
            <>
              <div className="bg-red-900/20 border border-red-700/30 rounded p-3 text-center">
                <p className="text-red-400 text-sm font-medium mb-1">對手動作</p>
                <p className="text-white text-sm">{quiz.dangerScenario.action}</p>
              </div>

              <div className="text-center text-lg font-medium">
                這代表什麼？
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "weak_value", label: "弱價值/試探", color: "text-yellow-400" },
                  { value: "drawing", label: "聽牌/弱對", color: "text-blue-400" },
                  { value: "strong", label: "強牌取值", color: "text-orange-400" },
                  { value: "nuts", label: "堅果/極強", color: "text-red-400" },
                  { value: "polarized", label: "極化 (堅果或詐唬)", color: "text-purple-400" },
                ].map((opt) => (
                  <Button
                    key={opt.value}
                    variant={quiz.dangerAnswer === opt.value ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-auto py-3 text-sm",
                      showQuizResult && opt.value === quiz.dangerScenario?.correctMeaning && "ring-2 ring-green-400",
                      showQuizResult && quiz.dangerAnswer === opt.value && opt.value !== quiz.dangerScenario?.correctMeaning && "ring-2 ring-red-400"
                    )}
                    onClick={() => !showQuizResult && setQuiz(prev => prev ? { ...prev, dangerAnswer: opt.value } : null)}
                    disabled={showQuizResult}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>

              {!showQuizResult && (
                <Button onClick={handleQuizSubmit} disabled={!quiz.dangerAnswer} className="w-full">
                  確認答案
                </Button>
              )}

              {showQuizResult && (
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardContent className="pt-4">
                    <div className={cn(
                      "text-lg font-semibold mb-2",
                      quiz.dangerAnswer === quiz.dangerScenario.correctMeaning ? "text-green-400" : "text-orange-400"
                    )}>
                      {quiz.dangerAnswer === quiz.dangerScenario.correctMeaning ? "正確！" : "需要調整"}
                    </div>
                    <p className="text-sm text-gray-300">{quiz.dangerScenario.explanation}</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* ========== Leak Exploit Quiz ========== */}
          {quiz.type === "leakExploit" && quiz.leakScenario && (
            <>
              <div className="bg-green-900/20 border border-green-700/30 rounded p-3 text-center">
                <p className="text-green-400 text-sm font-medium mb-1">對手漏洞</p>
                <p className="text-white text-sm">{quiz.leakScenario.leak}</p>
              </div>

              <div className="text-center text-lg font-medium">
                最佳剝削方式？
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "raise", label: "加注/Raise", icon: "⬆️" },
                  { value: "call_light", label: "輕鬆跟注", icon: "📞" },
                  { value: "value_bet", label: "薄價值下注", icon: "💵" },
                  { value: "value_only", label: "只打價值", icon: "✅" },
                  { value: "overbet_value", label: "超池取值", icon: "💰" },
                  { value: "cr_bluff", label: "Check-Raise 詐唬", icon: "🃏" },
                  { value: "fold_marginal", label: "棄掉邊緣牌", icon: "🏳️" },
                  { value: "bet_thin", label: "更薄下注", icon: "📉" },
                ].map((opt) => (
                  <Button
                    key={opt.value}
                    variant={quiz.leakAnswer === opt.value ? "default" : "outline"}
                    size="sm"
                    className={cn(
                      "h-auto py-2 text-xs",
                      showQuizResult && opt.value === quiz.leakScenario?.correctExploit && "ring-2 ring-green-400",
                      showQuizResult && quiz.leakAnswer === opt.value && opt.value !== quiz.leakScenario?.correctExploit && "ring-2 ring-red-400"
                    )}
                    onClick={() => !showQuizResult && setQuiz(prev => prev ? { ...prev, leakAnswer: opt.value } : null)}
                    disabled={showQuizResult}
                  >
                    {opt.icon} {opt.label}
                  </Button>
                ))}
              </div>

              {!showQuizResult && (
                <Button onClick={handleQuizSubmit} disabled={!quiz.leakAnswer} className="w-full">
                  確認答案
                </Button>
              )}

              {showQuizResult && (
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardContent className="pt-4">
                    <div className={cn(
                      "text-lg font-semibold mb-2",
                      quiz.leakAnswer === quiz.leakScenario.correctExploit ? "text-green-400" : "text-orange-400"
                    )}>
                      {quiz.leakAnswer === quiz.leakScenario.correctExploit ? "正確！" : "不太對"}
                    </div>
                    <p className="text-sm text-gray-300">{quiz.leakScenario.explanation}</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Next button */}
          {showQuizResult && (
            <Button onClick={loadQuizScenario} className="w-full">
              下一題 <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Main Page
// ============================================

export default function FlopTextureDrillPage() {
  const [mode, setMode] = useState<DrillMode>("threelayer");

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-white">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">翻牌質地訓練</h1>
          <p className="text-gray-400">
            學習辨識翻牌質地，掌握 C-bet 頻率與尺寸
          </p>
        </div>

        {/* Mode Tabs */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as DrillMode)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 sm:grid-cols-7 bg-gray-800 h-auto">
            <TabsTrigger value="checkfirst" className="text-[10px] sm:text-sm data-[state=active]:bg-purple-600">🔥挑戰</TabsTrigger>
            <TabsTrigger value="threelayer" className="text-[10px] sm:text-sm">三層判斷</TabsTrigger>
            <TabsTrigger value="mustcheck" className="text-[10px] sm:text-sm">必Check</TabsTrigger>
            <TabsTrigger value="liveexploit" className="text-[10px] sm:text-sm data-[state=active]:bg-amber-600">📍線下</TabsTrigger>
            <TabsTrigger value="classify" className="text-[10px] sm:text-sm">質地分類</TabsTrigger>
            <TabsTrigger value="cbet" className="text-[10px] sm:text-sm">C-bet</TabsTrigger>
            <TabsTrigger value="quick" className="text-[10px] sm:text-sm">快速辨識</TabsTrigger>
          </TabsList>

          <TabsContent value="checkfirst">
            <Card className="bg-gray-800/50 border-purple-700/50">
              <CardHeader>
                <CardTitle className="text-lg">🔥 Check First 挑戰</CardTitle>
                <p className="text-sm text-gray-400">連續答對 10 題「應該 Check」的場景，養成 Check First 習慣</p>
              </CardHeader>
              <CardContent>
                <CheckFirstDrill />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="liveexploit">
            <Card className="bg-gray-800/50 border-amber-700/50">
              <CardHeader>
                <CardTitle className="text-lg">📍 線下剝削筆記</CardTitle>
                <p className="text-sm text-gray-400">GTO vs 線下調整對照，多路底池策略</p>
              </CardHeader>
              <CardContent>
                <LiveExploitDrill />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="classify">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg">質地分類訓練</CardTitle>
                <p className="text-sm text-gray-400">辨識翻牌屬於 12 種質地類型中的哪一種</p>
              </CardHeader>
              <CardContent>
                <ClassifyDrill />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cbet">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg">C-bet 策略訓練</CardTitle>
                <p className="text-sm text-gray-400">學習不同質地的 C-bet 頻率與尺寸</p>
              </CardHeader>
              <CardContent>
                <CbetDrill />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quick">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg">快速辨識訓練</CardTitle>
                <p className="text-sm text-gray-400">10 秒內快速判斷牌面特徵</p>
              </CardHeader>
              <CardContent>
                <QuickDrill />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="threelayer">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg">三層判斷訓練</CardTitle>
                <p className="text-sm text-gray-400">翻牌後即時決策 OS：主動權 → 變臉 → 目的</p>
              </CardHeader>
              <CardContent>
                <ThreeLayerDrill />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mustcheck">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg">必 Check 情況訓練</CardTitle>
                <p className="text-sm text-gray-400">學習何時應該 Check 而非下注</p>
              </CardHeader>
              <CardContent>
                <MustCheckDrill />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Texture Reference */}
        <Card className="mt-8 bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg">質地參考表</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-2 text-sm">
              {Object.values(FLOP_TEXTURE_CATEGORIES).map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-2 bg-gray-900/50 rounded gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Badge className={cn("text-[10px] shrink-0", getAdvantageColor(cat.advantageTier))}>
                      {cat.advantageTier}
                    </Badge>
                    <span className="text-gray-300 truncate">{cat.nameZh}</span>
                  </div>
                  <div className="flex gap-3 shrink-0 text-xs">
                    <span className="text-gray-500">{cat.frequencyPct}%</span>
                    <span className="text-cyan-400">{cat.ip.cbetFreqMin}-{cat.ip.cbetFreqMax}%</span>
                    <span className="text-yellow-400">{cat.ip.sizing}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
