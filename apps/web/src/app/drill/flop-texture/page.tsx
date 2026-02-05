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
} from "@/lib/poker/flopTexture";
import type { Rank, Suit } from "@/lib/poker/types";
import { SUIT_SYMBOLS, SUIT_CARD_COLORS } from "@/lib/poker/types";

// ============================================
// Types
// ============================================

type DrillMode = "classify" | "cbet" | "quick" | "threelayer" | "mustcheck";

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

          {/* Options */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {allTextures.map((cat) => {
              const isSelected = selectedAnswer === cat.id;
              const isCorrectAnswer = scenario.correctTexture === cat.id;

              return (
                <Button
                  key={cat.id}
                  variant="outline"
                  className={cn(
                    "h-auto py-3 text-left justify-start",
                    showResult && isCorrectAnswer && "bg-green-600 hover:bg-green-600 text-white border-green-600",
                    showResult && isSelected && !isCorrectAnswer && "bg-red-600 hover:bg-red-600 text-white border-red-600",
                    !showResult && "hover:bg-gray-700"
                  )}
                  onClick={() => handleAnswer(cat.id)}
                  disabled={showResult}
                >
                  <span>{cat.nameZh}</span>
                  {showResult && isCorrectAnswer && <CheckCircle2 className="h-4 w-4 ml-auto" />}
                  {showResult && isSelected && !isCorrectAnswer && <XCircle className="h-4 w-4 ml-auto" />}
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
          <TabsList className="grid w-full grid-cols-5 bg-gray-800">
            <TabsTrigger value="threelayer" className="text-[10px] sm:text-sm">三層判斷</TabsTrigger>
            <TabsTrigger value="mustcheck" className="text-[10px] sm:text-sm">必Check</TabsTrigger>
            <TabsTrigger value="classify" className="text-[10px] sm:text-sm">質地分類</TabsTrigger>
            <TabsTrigger value="cbet" className="text-[10px] sm:text-sm">C-bet</TabsTrigger>
            <TabsTrigger value="quick" className="text-[10px] sm:text-sm">快速辨識</TabsTrigger>
          </TabsList>

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
