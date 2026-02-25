"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
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
  explanationKey: string;
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
  heroHandTypeKey: string; // i18n key for hand type
  shouldCheck: boolean;
  reasonKey: string; // i18n key for reason
  categoryNameKey: string; // i18n key for category name
}

// ============================================
// Constants
// ============================================

const FREQUENCY_OPTIONS = [
  { key: "very_high", labelKey: "flopTexture.frequency.veryHigh" },
  { key: "medium_high", labelKey: "flopTexture.frequency.mediumHigh" },
  { key: "medium", labelKey: "flopTexture.frequency.medium" },
  { key: "low", labelKey: "flopTexture.frequency.low" },
  { key: "very_low", labelKey: "flopTexture.frequency.veryLow" },
];

const SIZING_OPTIONS = [
  { key: "small", labelKey: "flopTexture.sizing.small" },
  { key: "mixed", labelKey: "flopTexture.sizing.mixed" },
  { key: "large", labelKey: "flopTexture.sizing.large" },
  { key: "polarized", labelKey: "flopTexture.sizing.polarized" },
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
    initiative: { answer: string; explanationKey: string };
    volatility: { answer: string; explanationKey: string };
    purpose: { answer: string; explanationKey: string };
  };
  actionSummaryKey: string;
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
      initiative: { answer: "yes", explanationKey: "flopTexture.threeLayer.s0.initiative" },
      volatility: { answer: "low", explanationKey: "flopTexture.threeLayer.s0.volatility" },
      purpose: { answer: "deny", explanationKey: "flopTexture.threeLayer.s0.purpose" },
    },
    actionSummaryKey: "flopTexture.threeLayer.s0.action",
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
      initiative: { answer: "yes", explanationKey: "flopTexture.threeLayer.s1.initiative" },
      volatility: { answer: "medium", explanationKey: "flopTexture.threeLayer.s1.volatility" },
      purpose: { answer: "value_protect", explanationKey: "flopTexture.threeLayer.s1.purpose" },
    },
    actionSummaryKey: "flopTexture.threeLayer.s1.action",
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
      initiative: { answer: "partial", explanationKey: "flopTexture.threeLayer.s2.initiative" },
      volatility: { answer: "high", explanationKey: "flopTexture.threeLayer.s2.volatility" },
      purpose: { answer: "value_protect", explanationKey: "flopTexture.threeLayer.s2.purpose" },
    },
    actionSummaryKey: "flopTexture.threeLayer.s2.action",
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
      initiative: { answer: "no", explanationKey: "flopTexture.threeLayer.s3.initiative" },
      volatility: { answer: "medium", explanationKey: "flopTexture.threeLayer.s3.volatility" },
      purpose: { answer: "unclear", explanationKey: "flopTexture.threeLayer.s3.purpose" },
    },
    actionSummaryKey: "flopTexture.threeLayer.s3.action",
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
      initiative: { answer: "no", explanationKey: "flopTexture.threeLayer.s4.initiative" },
      volatility: { answer: "explosive", explanationKey: "flopTexture.threeLayer.s4.volatility" },
      purpose: { answer: "rarely_bet", explanationKey: "flopTexture.threeLayer.s4.purpose" },
    },
    actionSummaryKey: "flopTexture.threeLayer.s4.action",
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
      initiative: { answer: "yes", explanationKey: "flopTexture.threeLayer.s5.initiative" },
      volatility: { answer: "low", explanationKey: "flopTexture.threeLayer.s5.volatility" },
      purpose: { answer: "thin_value", explanationKey: "flopTexture.threeLayer.s5.purpose" },
    },
    actionSummaryKey: "flopTexture.threeLayer.s5.action",
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
    explanationKey: layerData.explanationKey,
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
  { id: "mid_wet_air", nameKey: "flopTexture.mustCheck.cat.midWetAir", descKey: "flopTexture.mustCheck.cat.midWetAirDesc" },
  { id: "low_board_no_overpair", nameKey: "flopTexture.mustCheck.cat.lowBoardNoOverpair", descKey: "flopTexture.mustCheck.cat.lowBoardNoOverpairDesc" },
  { id: "connected_weak_made", nameKey: "flopTexture.mustCheck.cat.connectedWeakMade", descKey: "flopTexture.mustCheck.cat.connectedWeakMadeDesc" },
  { id: "monotone_no_flush", nameKey: "flopTexture.mustCheck.cat.monotoneNoFlush", descKey: "flopTexture.mustCheck.cat.monotoneNoFlushDesc" },
  { id: "broadway_no_backdoor", nameKey: "flopTexture.mustCheck.cat.broadwayNoBackdoor", descKey: "flopTexture.mustCheck.cat.broadwayNoBackdoorDesc" },
  { id: "villain_range_advantage", nameKey: "flopTexture.mustCheck.cat.villainRangeAdv", descKey: "flopTexture.mustCheck.cat.villainRangeAdvDesc" },
  { id: "oop_wet_board", nameKey: "flopTexture.mustCheck.cat.oopWetBoard", descKey: "flopTexture.mustCheck.cat.oopWetBoardDesc" },
  { id: "protect_check_range", nameKey: "flopTexture.mustCheck.cat.protectCheckRange", descKey: "flopTexture.mustCheck.cat.protectCheckRangeDesc" },
  { id: "turn_will_change", nameKey: "flopTexture.mustCheck.cat.turnWillChange", descKey: "flopTexture.mustCheck.cat.turnWillChangeDesc" },
  { id: "no_clear_purpose", nameKey: "flopTexture.mustCheck.cat.noClearPurpose", descKey: "flopTexture.mustCheck.cat.noClearPurposeDesc" },
];

const MUST_CHECK_SCENARIOS_DATA: Array<{
  textureHint: FlopTextureType[];
  position: "IP" | "OOP";
  heroHand: string;
  heroHandTypeKey: string;
  shouldCheck: boolean;
  categoryId: string;
  reasonKey: string;
}> = [
  // 中張濕牌面空氣牌
  { textureHint: ["JT_conn", "Low_conn"], position: "IP", heroHand: "AhKc", heroHandTypeKey: "flopTexture.mustCheck.sc.0.handType", shouldCheck: true, categoryId: "mid_wet_air", reasonKey: "flopTexture.mustCheck.sc.0.reason" },
  { textureHint: ["JT_conn", "Low_conn"], position: "IP", heroHand: "QcJc", heroHandTypeKey: "flopTexture.mustCheck.sc.1.handType", shouldCheck: false, categoryId: "mid_wet_air", reasonKey: "flopTexture.mustCheck.sc.1.reason" },

  // 低牌面無 Overpair
  { textureHint: ["Low_unconn"], position: "IP", heroHand: "AhQc", heroHandTypeKey: "flopTexture.mustCheck.sc.2.handType", shouldCheck: true, categoryId: "low_board_no_overpair", reasonKey: "flopTexture.mustCheck.sc.2.reason" },
  { textureHint: ["Low_unconn"], position: "IP", heroHand: "TsTc", heroHandTypeKey: "flopTexture.mustCheck.sc.3.handType", shouldCheck: false, categoryId: "low_board_no_overpair", reasonKey: "flopTexture.mustCheck.sc.3.reason" },

  // 連接牌面弱成牌
  { textureHint: ["BBx", "JT_conn"], position: "IP", heroHand: "9h9c", heroHandTypeKey: "flopTexture.mustCheck.sc.4.handType", shouldCheck: true, categoryId: "connected_weak_made", reasonKey: "flopTexture.mustCheck.sc.4.reason" },
  { textureHint: ["BBx", "JT_conn"], position: "IP", heroHand: "JsJc", heroHandTypeKey: "flopTexture.mustCheck.sc.5.handType", shouldCheck: false, categoryId: "connected_weak_made", reasonKey: "flopTexture.mustCheck.sc.5.reason" },

  // 單花面無同花
  { textureHint: ["ABx", "BBx"], position: "IP", heroHand: "AhKh", heroHandTypeKey: "flopTexture.mustCheck.sc.6.handType", shouldCheck: true, categoryId: "monotone_no_flush", reasonKey: "flopTexture.mustCheck.sc.6.reason" },
  { textureHint: ["ABx", "BBx"], position: "IP", heroHand: "AsKs", heroHandTypeKey: "flopTexture.mustCheck.sc.7.handType", shouldCheck: false, categoryId: "monotone_no_flush", reasonKey: "flopTexture.mustCheck.sc.7.reason" },

  // OOP 濕潤牌面
  { textureHint: ["JT_conn", "Low_conn"], position: "OOP", heroHand: "AhAc", heroHandTypeKey: "flopTexture.mustCheck.sc.8.handType", shouldCheck: true, categoryId: "oop_wet_board", reasonKey: "flopTexture.mustCheck.sc.8.reason" },
  { textureHint: ["Axx"], position: "OOP", heroHand: "AhAc", heroHandTypeKey: "flopTexture.mustCheck.sc.9.handType", shouldCheck: false, categoryId: "oop_wet_board", reasonKey: "flopTexture.mustCheck.sc.9.reason" },

  // 下注目的不明
  { textureHint: ["Low_unconn"], position: "IP", heroHand: "KhQc", heroHandTypeKey: "flopTexture.mustCheck.sc.10.handType", shouldCheck: true, categoryId: "no_clear_purpose", reasonKey: "flopTexture.mustCheck.sc.10.reason" },
  { textureHint: ["ABx"], position: "IP", heroHand: "KhQc", heroHandTypeKey: "flopTexture.mustCheck.sc.11.handType", shouldCheck: false, categoryId: "no_clear_purpose", reasonKey: "flopTexture.mustCheck.sc.11.reason" },
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
    heroHandTypeKey: template.heroHandTypeKey,
    shouldCheck: template.shouldCheck,
    reasonKey: template.reasonKey,
    categoryNameKey: category?.nameKey || "",
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
    heroHandTypeKey: template.heroHandTypeKey,
    shouldCheck: true, // Always true in this mode
    reasonKey: template.reasonKey,
    categoryNameKey: category?.nameKey || "",
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
  const t = useTranslations("drill");
  const tCommon = useTranslations("common");
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
          {tCommon("accuracy")}: {score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}%
          ({score.correct}/{score.total})
        </div>
        <Button variant="outline" size="sm" onClick={() => setScore({ correct: 0, total: 0 })}>
          <RotateCcw className="h-4 w-4 mr-1" />
          {tCommon("reset")}
        </Button>
      </div>

      {/* Board Display */}
      {scenario && (
        <div className="space-y-4">
          <FlopDisplay flop={scenario.flop} suits={scenario.suits} />

          {/* Question */}
          <div className="text-center text-lg font-medium">
            {t("flopTexture.classify.question")}
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
                  {isCorrect ? t("result.correct") : t("result.incorrect")}
                </div>
                <p className="text-gray-300 text-sm mb-2">
                  {tCommon("correct")}: <span className="font-semibold text-white">{correctCategory.nameZh}</span>
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
              {t("flopTexture.next")} <ArrowRight className="h-4 w-4 ml-2" />
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
  const t = useTranslations("drill");
  const tCommon = useTranslations("common");
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
          {tCommon("accuracy")}: {score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}%
          ({score.correct}/{score.total})
        </div>
        <Button variant="outline" size="sm" onClick={() => setScore({ correct: 0, total: 0 })}>
          <RotateCcw className="h-4 w-4 mr-1" />
          {tCommon("reset")}
        </Button>
      </div>

      {scenario && category && (
        <div className="space-y-4">
          <FlopDisplay flop={scenario.flop} suits={scenario.suits} />

          {/* Context */}
          <div className="flex items-center justify-center gap-4 text-sm">
            <Badge variant="outline">{scenario.potType === "srp" ? t("flopTexture.srpBadge") : t("flopTexture.threeBpBadge")}</Badge>
            <Badge variant="outline" className={scenario.position === "IP" ? "bg-green-600/20 text-green-400" : "bg-orange-600/20 text-orange-400"}>
              {scenario.position === "IP" ? t("flopTexture.ipBadge") : t("flopTexture.oopBadge")}
            </Badge>
            <Badge variant="secondary">{category.nameZh}</Badge>
          </div>

          {/* Question */}
          <div className="text-center text-lg font-medium">
            {t("flopTexture.cbet.question")}
          </div>

          {/* Frequency Selection */}
          <div className="space-y-2">
            <p className="text-sm text-gray-400">{t("flopTexture.cbet.freqLabel")}</p>
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
                  {t(opt.labelKey)}
                </Button>
              ))}
            </div>
          </div>

          {/* Sizing Selection */}
          <div className="space-y-2">
            <p className="text-sm text-gray-400">{t("flopTexture.cbet.sizingLabel")}</p>
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
                  {t(opt.labelKey)}
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
              {t("flopTexture.confirmAnswer")}
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
                  {isFreqCorrect && isSizingCorrect ? t("flopTexture.cbet.allCorrect") : isFreqCorrect || isSizingCorrect ? t("flopTexture.cbet.partialCorrect") : t("flopTexture.cbet.needsImprovement")}
                </div>
                <p className="text-gray-300 text-sm">
                  {t("flopTexture.cbet.explanation", {
                    texture: category.nameZh,
                    position: scenario.position,
                    freqRange: scenario.position === "IP"
                      ? `${category.ip.cbetFreqMin}-${category.ip.cbetFreqMax}%`
                      : `${category.oop.cbetFreqMin}-${category.oop.cbetFreqMax}%`,
                    sizing: scenario.position === "IP" ? category.ip.sizing : category.oop.sizing,
                  })}
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
              {t("flopTexture.next")} <ArrowRight className="h-4 w-4 ml-2" />
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
  const t = useTranslations("drill");
  const tCommon = useTranslations("common");
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
      case "connectivity": return t("flopTexture.quick.connectivity");
      case "suit_distribution": return t("flopTexture.quick.suitDistribution");
      case "texture_category": return t("flopTexture.quick.textureCategory");
      case "advantage_tier": return t("flopTexture.quick.advantageTier");
      default: return "";
    }
  };

  const getOptions = () => {
    switch (scenario?.questionType) {
      case "connectivity":
        return [
          { key: "connected", label: t("flopTexture.quick.connected") },
          { key: "disconnected", label: t("flopTexture.quick.disconnected") },
        ];
      case "suit_distribution":
        return [
          { key: "rainbow", label: t("flopTexture.quick.rainbow") },
          { key: "twotone", label: t("flopTexture.quick.twotone") },
          { key: "monotone", label: t("flopTexture.quick.monotone") },
        ];
      case "texture_category": {
        const allTypes = Object.values(FLOP_TEXTURE_CATEGORIES);
        return allTypes.map((cat) => ({ key: cat.id, label: cat.nameZh }));
      }
      case "advantage_tier":
        return [
          { key: "high", label: t("flopTexture.quick.highAdv") },
          { key: "medium", label: t("flopTexture.quick.mediumAdv") },
          { key: "low", label: t("flopTexture.quick.lowAdv") },
          { key: "special", label: t("flopTexture.quick.specialAdv") },
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
          {tCommon("accuracy")}: {score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}%
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
            {tCommon("reset")}
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
              {isCorrect ? t("result.correct") : timeLeft === 0 ? t("flopTexture.quick.timeUp") : t("result.incorrect")}
            </div>
          )}

          {/* Next Button */}
          {showResult && (
            <Button onClick={loadScenario} className="w-full">
              {t("flopTexture.next")} <ArrowRight className="h-4 w-4 ml-2" />
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

const THREE_LAYER_LABELS: Record<ThreeLayerType, { questionKey: string; subtextKey: string; icon: string }> = {
  initiative: {
    questionKey: "flopTexture.threeLayer.initiative.question",
    subtextKey: "flopTexture.threeLayer.initiative.subtext",
    icon: "1",
  },
  volatility: {
    questionKey: "flopTexture.threeLayer.volatility.question",
    subtextKey: "flopTexture.threeLayer.volatility.subtext",
    icon: "2",
  },
  purpose: {
    questionKey: "flopTexture.threeLayer.purpose.question",
    subtextKey: "flopTexture.threeLayer.purpose.subtext",
    icon: "3",
  },
};

const THREE_LAYER_OPTIONS: Record<ThreeLayerType, Array<{ key: string; labelKey: string; emoji: string }>> = {
  initiative: [
    { key: "yes", labelKey: "flopTexture.threeLayer.initiative.yes", emoji: "✓" },
    { key: "partial", labelKey: "flopTexture.threeLayer.initiative.partial", emoji: "~" },
    { key: "no", labelKey: "flopTexture.threeLayer.initiative.no", emoji: "?" },
    { key: "depends", labelKey: "flopTexture.threeLayer.initiative.depends", emoji: "?" },
  ],
  volatility: [
    { key: "low", labelKey: "flopTexture.threeLayer.volatility.low", emoji: "🟢" },
    { key: "medium", labelKey: "flopTexture.threeLayer.volatility.medium", emoji: "🟡" },
    { key: "high", labelKey: "flopTexture.threeLayer.volatility.high", emoji: "🔴" },
    { key: "explosive", labelKey: "flopTexture.threeLayer.volatility.explosive", emoji: "💥" },
  ],
  purpose: [
    { key: "deny", labelKey: "flopTexture.threeLayer.purpose.deny", emoji: "🚫" },
    { key: "value_protect", labelKey: "flopTexture.threeLayer.purpose.valueProtect", emoji: "💰" },
    { key: "thin_value", labelKey: "flopTexture.threeLayer.purpose.thinValue", emoji: "📉" },
    { key: "unclear", labelKey: "flopTexture.threeLayer.purpose.unclear", emoji: "❌" },
    { key: "rarely_bet", labelKey: "flopTexture.threeLayer.purpose.rarelyBet", emoji: "⏸" },
    { key: "polarized", labelKey: "flopTexture.threeLayer.purpose.polarized", emoji: "⚡" },
  ],
};

function ThreeLayerDrill() {
  const t = useTranslations("drill");
  const tCommon = useTranslations("common");
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
        <h3 className="text-sm font-semibold text-cyan-300 mb-2">{t("flopTexture.threeLayer.frameworkTitle")}</h3>
        <div className="space-y-1 text-xs">
          <div className={cn(
            "flex items-center gap-2",
            layerType === "initiative" ? "text-cyan-300 font-semibold" : "text-gray-400"
          )}>
            <span className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-[10px]">1</span>
            {t("flopTexture.threeLayer.layer1")}
          </div>
          <div className={cn(
            "flex items-center gap-2",
            layerType === "volatility" ? "text-cyan-300 font-semibold" : "text-gray-400"
          )}>
            <span className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-[10px]">2</span>
            {t("flopTexture.threeLayer.layer2")}
          </div>
          <div className={cn(
            "flex items-center gap-2",
            layerType === "purpose" ? "text-cyan-300 font-semibold" : "text-gray-400"
          )}>
            <span className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center text-[10px]">3</span>
            {t("flopTexture.threeLayer.layer3")}
          </div>
        </div>
      </div>

      {/* Score */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          {tCommon("accuracy")}: {score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}%
          ({score.correct}/{score.total})
        </div>
        <Button variant="outline" size="sm" onClick={() => setScore({ correct: 0, total: 0 })}>
          <RotateCcw className="h-4 w-4 mr-1" />
          {tCommon("reset")}
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
            <div className="text-lg font-medium">{t(layerLabel.questionKey)}</div>
            <div className="text-sm text-gray-400 mt-1">{t(layerLabel.subtextKey)}</div>
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
                  <span className="mr-1">{opt.emoji}</span> {t(opt.labelKey)}
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
                  {isCorrect ? t("result.correct") : t("result.incorrect")}
                </div>
                <p className="text-gray-300 text-sm">
                  {t(scenario.explanationKey)}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Next Button */}
          {showResult && (
            <Button onClick={loadScenario} className="w-full">
              {t("flopTexture.next")} <ArrowRight className="h-4 w-4 ml-2" />
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
  const t = useTranslations("drill");
  const tCommon = useTranslations("common");
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
        <h3 className="text-sm font-semibold text-orange-300 mb-2">{t("flopTexture.mustCheck.selfCheckTitle")}</h3>
        <p className="text-xs text-gray-400">
          {t("flopTexture.mustCheck.selfCheck")}
        </p>
        <p className="text-xs text-orange-400 mt-1">
          {t("flopTexture.mustCheck.selfCheckTip")}
        </p>
      </div>

      {/* Score */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-400">
          {tCommon("accuracy")}: {score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0}%
          ({score.correct}/{score.total})
        </div>
        <Button variant="outline" size="sm" onClick={() => setScore({ correct: 0, total: 0 })}>
          <RotateCcw className="h-4 w-4 mr-1" />
          {tCommon("reset")}
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
            <div className="text-sm text-gray-400 mb-1">{t("flopTexture.yourHand")}</div>
            <div className="text-2xl font-bold text-white">{scenario.heroHand}</div>
            <div className="text-sm text-gray-400">({t(scenario.heroHandTypeKey)})</div>
          </div>

          {/* Question */}
          <div className="text-center text-lg font-medium">
            {t("flopTexture.mustCheck.question")}
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
              ✓ {t("flopTexture.mustCheck.checkBtn")}
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
              ✗ {t("flopTexture.mustCheck.betBtn")}
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
                  {isCorrect ? t("result.correct") : t("result.incorrect")}
                </div>
                <Badge variant="outline" className="mb-2">{t(scenario.categoryNameKey)}</Badge>
                <p className="text-gray-300 text-sm">
                  {t(scenario.reasonKey)}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Next Button */}
          {showResult && (
            <Button onClick={loadScenario} className="w-full">
              {t("flopTexture.next")} <ArrowRight className="h-4 w-4 ml-2" />
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
  const t = useTranslations("drill");
  const tCommon = useTranslations("common");
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
          <h2 className="text-2xl font-bold text-green-400 mb-2">{t("flopTexture.checkFirst.challengeSuccess")}</h2>
          <p className="text-gray-400">
            {t("flopTexture.checkFirst.consecutiveCorrect", { count: CHECK_FIRST_TARGET })}
          </p>
          <p className="text-sm text-gray-500 mt-2">
            {t("flopTexture.checkFirst.totalAttempts", { count: totalAttempts })}
          </p>
        </div>
        <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 rounded-lg p-4 border border-green-700/50">
          <p className="text-sm text-green-300">
            {t("flopTexture.checkFirst.muscleMemory")}<br />
            {t("flopTexture.checkFirst.rememberRule")}
          </p>
        </div>
        <Button onClick={handleReset} className="w-full">
          <RotateCcw className="h-4 w-4 mr-2" />
          {t("flopTexture.checkFirst.tryAgain")}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded-lg p-4 border border-purple-700/50">
        <h3 className="text-sm font-semibold text-purple-300 mb-2">{t("flopTexture.checkFirst.title")}</h3>
        <p className="text-xs text-gray-400">
          {t("flopTexture.checkFirst.desc", { target: CHECK_FIRST_TARGET })}
        </p>
        <p className="text-xs text-purple-400 mt-1">
          {t("flopTexture.checkFirst.hintAllCheck")}
        </p>
      </div>

      {/* Streak Progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-400">{t("flopTexture.checkFirst.streakProgress")}</span>
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
          {t("flopTexture.checkFirst.totalAttempts", { count: totalAttempts })}
        </span>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="h-4 w-4 mr-1" />
          {tCommon("reset")}
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
            <div className="text-sm text-gray-400 mb-1">{t("flopTexture.yourHand")}</div>
            <div className="text-2xl font-bold text-white">{scenario.heroHand}</div>
            <div className="text-sm text-gray-400">({t(scenario.heroHandTypeKey)})</div>
          </div>

          {/* Question */}
          <div className="text-center text-lg font-medium">
            {t("flopTexture.checkFirst.question")}
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
              ✗ {t("flopTexture.checkFirst.betBtn")}
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
                  {isCorrect ? t("flopTexture.checkFirst.correctStreak", { count: streak }) : t("flopTexture.checkFirst.wrongReset")}
                </div>
                <Badge variant="outline" className="mb-2">{t(scenario.categoryNameKey)}</Badge>
                <p className="text-gray-300 text-sm">
                  {t(scenario.reasonKey)}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Next Button */}
          {showResult && !isComplete && (
            <Button onClick={loadScenario} className="w-full">
              {t("flopTexture.next")} <ArrowRight className="h-4 w-4 ml-2" />
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

// Helper to display frequency adjustment - now returns labelKey for i18n
function getFreqAdjustLabelKey(adj: FrequencyAdjust): { labelKey: string; color: string } {
  switch (adj) {
    case "much_higher": return { labelKey: "flopTexture.liveExploit.freqAdj.muchHigher", color: "text-green-400" };
    case "higher": return { labelKey: "flopTexture.liveExploit.freqAdj.higher", color: "text-green-300" };
    case "same": return { labelKey: "flopTexture.liveExploit.freqAdj.same", color: "text-gray-400" };
    case "lower": return { labelKey: "flopTexture.liveExploit.freqAdj.lower", color: "text-orange-300" };
    case "much_lower": return { labelKey: "flopTexture.liveExploit.freqAdj.muchLower", color: "text-red-400" };
  }
}

function getSizingAdjustLabelKey(adj: SizingAdjust): { labelKey: string; color: string } {
  switch (adj) {
    case "much_larger": return { labelKey: "flopTexture.liveExploit.sizingAdj.muchLarger", color: "text-green-400" };
    case "larger": return { labelKey: "flopTexture.liveExploit.sizingAdj.larger", color: "text-green-300" };
    case "same": return { labelKey: "flopTexture.liveExploit.sizingAdj.same", color: "text-gray-400" };
    case "smaller": return { labelKey: "flopTexture.liveExploit.sizingAdj.smaller", color: "text-orange-300" };
  }
}

// Multiway decision scenarios
const MULTIWAY_SCENARIOS = [
  { texture: "ABB" as FlopTextureType, handKey: "flopTexture.liveExploit.mwSc.0.hand", correctAction: "bet_large", explanationKey: "flopTexture.liveExploit.mwSc.0.explanation" },
  { texture: "ABB" as FlopTextureType, handKey: "flopTexture.liveExploit.mwSc.1.hand", correctAction: "check", explanationKey: "flopTexture.liveExploit.mwSc.1.explanation" },
  { texture: "Axx" as FlopTextureType, handKey: "flopTexture.liveExploit.mwSc.2.hand", correctAction: "bet_small", explanationKey: "flopTexture.liveExploit.mwSc.2.explanation" },
  { texture: "Axx" as FlopTextureType, handKey: "flopTexture.liveExploit.mwSc.3.hand", correctAction: "check", explanationKey: "flopTexture.liveExploit.mwSc.3.explanation" },
  { texture: "BBB" as FlopTextureType, handKey: "flopTexture.liveExploit.mwSc.4.hand", correctAction: "bet_large", explanationKey: "flopTexture.liveExploit.mwSc.4.explanation" },
  { texture: "BBB" as FlopTextureType, handKey: "flopTexture.liveExploit.mwSc.5.hand", correctAction: "check", explanationKey: "flopTexture.liveExploit.mwSc.5.explanation" },
  { texture: "Low_conn" as FlopTextureType, handKey: "flopTexture.liveExploit.mwSc.6.hand", correctAction: "bet_small", explanationKey: "flopTexture.liveExploit.mwSc.6.explanation" },
  { texture: "Low_conn" as FlopTextureType, handKey: "flopTexture.liveExploit.mwSc.7.hand", correctAction: "check", explanationKey: "flopTexture.liveExploit.mwSc.7.explanation" },
  { texture: "JT_conn" as FlopTextureType, handKey: "flopTexture.liveExploit.mwSc.8.hand", correctAction: "bet_large", explanationKey: "flopTexture.liveExploit.mwSc.8.explanation" },
  { texture: "JT_conn" as FlopTextureType, handKey: "flopTexture.liveExploit.mwSc.9.hand", correctAction: "check", explanationKey: "flopTexture.liveExploit.mwSc.9.explanation" },
  { texture: "Paired" as FlopTextureType, handKey: "flopTexture.liveExploit.mwSc.10.hand", correctAction: "bet_small", explanationKey: "flopTexture.liveExploit.mwSc.10.explanation" },
  { texture: "Paired" as FlopTextureType, handKey: "flopTexture.liveExploit.mwSc.11.hand", correctAction: "check", explanationKey: "flopTexture.liveExploit.mwSc.11.explanation" },
];

// Danger sign scenarios
const DANGER_SIGN_SCENARIOS = [
  { texture: "ABB" as FlopTextureType, actionKey: "flopTexture.liveExploit.dsSc.0.action", correctMeaning: "strong", explanationKey: "flopTexture.liveExploit.dsSc.0.explanation" },
  { texture: "ABB" as FlopTextureType, actionKey: "flopTexture.liveExploit.dsSc.1.action", correctMeaning: "nuts", explanationKey: "flopTexture.liveExploit.dsSc.1.explanation" },
  { texture: "Axx" as FlopTextureType, actionKey: "flopTexture.liveExploit.dsSc.2.action", correctMeaning: "strong", explanationKey: "flopTexture.liveExploit.dsSc.2.explanation" },
  { texture: "BBx" as FlopTextureType, actionKey: "flopTexture.liveExploit.dsSc.3.action", correctMeaning: "strong", explanationKey: "flopTexture.liveExploit.dsSc.3.explanation" },
  { texture: "Low_conn" as FlopTextureType, actionKey: "flopTexture.liveExploit.dsSc.4.action", correctMeaning: "weak_value", explanationKey: "flopTexture.liveExploit.dsSc.4.explanation" },
  { texture: "Low_conn" as FlopTextureType, actionKey: "flopTexture.liveExploit.dsSc.5.action", correctMeaning: "nuts", explanationKey: "flopTexture.liveExploit.dsSc.5.explanation" },
  { texture: "JTx" as FlopTextureType, actionKey: "flopTexture.liveExploit.dsSc.6.action", correctMeaning: "nuts", explanationKey: "flopTexture.liveExploit.dsSc.6.explanation" },
  { texture: "Paired" as FlopTextureType, actionKey: "flopTexture.liveExploit.dsSc.7.action", correctMeaning: "strong", explanationKey: "flopTexture.liveExploit.dsSc.7.explanation" },
  { texture: "Trips" as FlopTextureType, actionKey: "flopTexture.liveExploit.dsSc.8.action", correctMeaning: "drawing", explanationKey: "flopTexture.liveExploit.dsSc.8.explanation" },
  { texture: "BBB" as FlopTextureType, actionKey: "flopTexture.liveExploit.dsSc.9.action", correctMeaning: "polarized", explanationKey: "flopTexture.liveExploit.dsSc.9.explanation" },
];

// Leak exploit scenarios
const LEAK_EXPLOIT_SCENARIOS = [
  { texture: "ABB" as FlopTextureType, leakKey: "flopTexture.liveExploit.leSc.0.leak", correctExploit: "raise", explanationKey: "flopTexture.liveExploit.leSc.0.explanation" },
  { texture: "Axx" as FlopTextureType, leakKey: "flopTexture.liveExploit.leSc.1.leak", correctExploit: "fold_marginal", explanationKey: "flopTexture.liveExploit.leSc.1.explanation" },
  { texture: "Low_conn" as FlopTextureType, leakKey: "flopTexture.liveExploit.leSc.2.leak", correctExploit: "bet_thin", explanationKey: "flopTexture.liveExploit.leSc.2.explanation" },
  { texture: "BBx" as FlopTextureType, leakKey: "flopTexture.liveExploit.leSc.3.leak", correctExploit: "value_bet", explanationKey: "flopTexture.liveExploit.leSc.3.explanation" },
  { texture: "JT_conn" as FlopTextureType, leakKey: "flopTexture.liveExploit.leSc.4.leak", correctExploit: "value_only", explanationKey: "flopTexture.liveExploit.leSc.4.explanation" },
  { texture: "Paired" as FlopTextureType, leakKey: "flopTexture.liveExploit.leSc.5.leak", correctExploit: "call_light", explanationKey: "flopTexture.liveExploit.leSc.5.explanation" },
  { texture: "Trips" as FlopTextureType, leakKey: "flopTexture.liveExploit.leSc.6.leak", correctExploit: "overbet_value", explanationKey: "flopTexture.liveExploit.leSc.6.explanation" },
  { texture: "ABx" as FlopTextureType, leakKey: "flopTexture.liveExploit.leSc.7.leak", correctExploit: "cr_bluff", explanationKey: "flopTexture.liveExploit.leSc.7.explanation" },
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
  const t = useTranslations("drill");
  const tCommon = useTranslations("common");
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
            📋 {t("flopTexture.liveExploit.notesTab")}
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSubMode("quiz")}>
            🎯 {t("flopTexture.liveExploit.quizTab")}
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
                  <div className="text-gray-500 text-xs mb-1">{t("flopTexture.liveExploit.gtoFreq")}</div>
                  <div className="text-cyan-400">{selected.ip.cbetFreqMin}-{selected.ip.cbetFreqMax}%</div>
                </div>
                <div className="bg-gray-800/50 rounded p-3">
                  <div className="text-gray-500 text-xs mb-1">{t("flopTexture.liveExploit.liveAdjust")}</div>
                  <div className={getFreqAdjustLabelKey(selected.liveExploit.frequencyAdjust).color}>
                    {t(getFreqAdjustLabelKey(selected.liveExploit.frequencyAdjust).labelKey)}
                  </div>
                </div>
                <div className="bg-gray-800/50 rounded p-3">
                  <div className="text-gray-500 text-xs mb-1">{t("flopTexture.liveExploit.gtoSizing")}</div>
                  <div className="text-yellow-400">{selected.ip.sizing}</div>
                </div>
                <div className="bg-gray-800/50 rounded p-3">
                  <div className="text-gray-500 text-xs mb-1">{t("flopTexture.liveExploit.liveAdjust")}</div>
                  <div className={getSizingAdjustLabelKey(selected.liveExploit.sizingAdjust).color}>
                    {t(getSizingAdjustLabelKey(selected.liveExploit.sizingAdjust).labelKey)}
                  </div>
                </div>
              </div>

              {/* Multi-way note */}
              <div className="bg-orange-900/20 border border-orange-700/30 rounded p-3">
                <div className="text-orange-400 text-xs font-semibold mb-1">🎯 {t("flopTexture.liveExploit.multiwayNote")}</div>
                <p className="text-sm text-gray-300">{selected.liveExploit.multiWayNote}</p>
              </div>

              {/* Exploit tip */}
              <div className="bg-green-900/20 border border-green-700/30 rounded p-3">
                <div className="text-green-400 text-xs font-semibold mb-1">💡 {t("flopTexture.liveExploit.exploitTip")}</div>
                <p className="text-sm text-gray-300">{selected.liveExploit.exploitTip}</p>
              </div>

              {/* Common leaks */}
              <div>
                <div className="text-gray-500 text-xs mb-2">{t("flopTexture.liveExploit.opponentLeaks")}</div>
                <div className="flex flex-wrap gap-2">
                  {selected.liveExploit.commonLeaks.map((leak, i) => (
                    <Badge key={i} variant="outline" className="text-xs">{leak}</Badge>
                  ))}
                </div>
              </div>

              {/* Danger signs */}
              <div className="bg-red-900/20 border border-red-700/30 rounded p-3">
                <div className="text-red-400 text-xs font-semibold mb-1">⚠️ {t("flopTexture.liveExploit.dangerSigns")}</div>
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
            👆 {t("flopTexture.liveExploit.selectTexture")}
          </div>
        )}
      </div>
    );
  }

  // Quiz Mode
  const quizCategory = quiz ? FLOP_TEXTURE_CATEGORIES[quiz.texture] : null;

  // Quiz type labels
  const quizTypeLabels: Record<LiveQuizType, { icon: string; titleKey: string }> = {
    adjustment: { icon: "📊", titleKey: "flopTexture.liveExploit.quizType.adjustment" },
    multiway: { icon: "👥", titleKey: "flopTexture.liveExploit.quizType.multiway" },
    dangerSign: { icon: "⚠️", titleKey: "flopTexture.liveExploit.quizType.dangerSign" },
    leakExploit: { icon: "🎯", titleKey: "flopTexture.liveExploit.quizType.leakExploit" },
  };

  return (
    <div className="space-y-4">
      {/* Sub-mode toggle */}
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => setSubMode("notes")}>
          📋 {t("flopTexture.liveExploit.notesTab")}
        </Button>
        <Button size="sm" variant="default" onClick={() => setSubMode("quiz")}>
          🎯 {t("flopTexture.liveExploit.quizTab")}
        </Button>
      </div>

      {/* Score */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-400">
          {tCommon("accuracy")}: {quizScore.total > 0 ? Math.round((quizScore.correct / quizScore.total) * 100) : 0}%
          ({quizScore.correct}/{quizScore.total})
        </span>
        <Button variant="outline" size="sm" onClick={() => setQuizScore({ correct: 0, total: 0 })}>
          <RotateCcw className="h-4 w-4 mr-1" />
          {tCommon("reset")}
        </Button>
      </div>

      {quiz && quizCategory && (
        <div className="space-y-4">
          {/* Quiz type badge */}
          <div className="flex justify-center">
            <Badge variant="secondary" className="text-sm">
              {quizTypeLabels[quiz.type].icon} {t(quizTypeLabels[quiz.type].titleKey)}
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
                <span className="text-gray-400">{t("flopTexture.liveExploit.gtoBasis")}</span>
                <span className="text-cyan-400">{quizCategory.ip.cbetFreqMin}-{quizCategory.ip.cbetFreqMax}%</span>
                <span className="text-gray-400"> / </span>
                <span className="text-yellow-400">{quizCategory.ip.sizing}</span>
              </div>

              <div className="text-center text-lg font-medium">
                {t("flopTexture.liveExploit.liveAdjustQ")}
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-400">{t("flopTexture.liveExploit.freqAdjLabel")}</p>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {(["much_higher", "higher", "same", "lower", "much_lower"] as FrequencyAdjust[]).map((opt) => {
                    const { labelKey } = getFreqAdjustLabelKey(opt);
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
                        {t(labelKey)}
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm text-gray-400">{t("flopTexture.liveExploit.sizingAdjLabel")}</p>
                <div className="grid grid-cols-4 gap-2">
                  {(["much_larger", "larger", "same", "smaller"] as SizingAdjust[]).map((opt) => {
                    const { labelKey } = getSizingAdjustLabelKey(opt);
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
                        {t(labelKey)}
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
                  {t("flopTexture.confirmAnswer")}
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
                        ? t("flopTexture.cbet.allCorrect") : t("flopTexture.liveExploit.needsAdjust")}
                    </div>
                    <p className="text-sm text-gray-300 mb-2">
                      {t("flopTexture.liveExploit.correctAns", {
                        freq: t(getFreqAdjustLabelKey(quizCategory.liveExploit.frequencyAdjust).labelKey),
                        sizing: t(getSizingAdjustLabelKey(quizCategory.liveExploit.sizingAdjust).labelKey),
                      })}
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
                <p className="text-orange-400 text-sm font-medium mb-1">{t("flopTexture.liveExploit.multiway.title")}</p>
                <p className="text-white">{t("flopTexture.liveExploit.multiway.yourHand", { hand: t(quiz.multiwayScenario.handKey) })}</p>
              </div>

              <div className="text-center text-lg font-medium">
                {t("flopTexture.liveExploit.multiway.question")}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "check", labelKey: "flopTexture.liveExploit.multiway.check", icon: "✋" },
                  { value: "bet_small", labelKey: "flopTexture.liveExploit.multiway.betSmall", icon: "💰" },
                  { value: "bet_large", labelKey: "flopTexture.liveExploit.multiway.betLarge", icon: "💎" },
                  { value: "fold", labelKey: "flopTexture.liveExploit.multiway.fold", icon: "🏳️" },
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
                    {opt.icon} {t(opt.labelKey)}
                  </Button>
                ))}
              </div>

              {!showQuizResult && (
                <Button onClick={handleQuizSubmit} disabled={!quiz.multiwayAnswer} className="w-full">
                  {t("flopTexture.confirmAnswer")}
                </Button>
              )}

              {showQuizResult && (
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardContent className="pt-4">
                    <div className={cn(
                      "text-lg font-semibold mb-2",
                      quiz.multiwayAnswer === quiz.multiwayScenario.correctAction ? "text-green-400" : "text-orange-400"
                    )}>
                      {quiz.multiwayAnswer === quiz.multiwayScenario.correctAction ? t("result.correct") : t("flopTexture.liveExploit.notCorrect")}
                    </div>
                    <p className="text-sm text-gray-300">{t(quiz.multiwayScenario.explanationKey)}</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* ========== Danger Sign Quiz ========== */}
          {quiz.type === "dangerSign" && quiz.dangerScenario && (
            <>
              <div className="bg-red-900/20 border border-red-700/30 rounded p-3 text-center">
                <p className="text-red-400 text-sm font-medium mb-1">{t("flopTexture.liveExploit.dangerSign.opponentAction")}</p>
                <p className="text-white text-sm">{t(quiz.dangerScenario.actionKey)}</p>
              </div>

              <div className="text-center text-lg font-medium">
                {t("flopTexture.liveExploit.dangerSign.question")}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "weak_value", labelKey: "flopTexture.liveExploit.dangerSign.weakValue", color: "text-yellow-400" },
                  { value: "drawing", labelKey: "flopTexture.liveExploit.dangerSign.drawing", color: "text-blue-400" },
                  { value: "strong", labelKey: "flopTexture.liveExploit.dangerSign.strong", color: "text-orange-400" },
                  { value: "nuts", labelKey: "flopTexture.liveExploit.dangerSign.nuts", color: "text-red-400" },
                  { value: "polarized", labelKey: "flopTexture.liveExploit.dangerSign.polarized", color: "text-purple-400" },
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
                    {t(opt.labelKey)}
                  </Button>
                ))}
              </div>

              {!showQuizResult && (
                <Button onClick={handleQuizSubmit} disabled={!quiz.dangerAnswer} className="w-full">
                  {t("flopTexture.confirmAnswer")}
                </Button>
              )}

              {showQuizResult && (
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardContent className="pt-4">
                    <div className={cn(
                      "text-lg font-semibold mb-2",
                      quiz.dangerAnswer === quiz.dangerScenario.correctMeaning ? "text-green-400" : "text-orange-400"
                    )}>
                      {quiz.dangerAnswer === quiz.dangerScenario.correctMeaning ? t("result.correct") : t("flopTexture.liveExploit.needsAdjust")}
                    </div>
                    <p className="text-sm text-gray-300">{t(quiz.dangerScenario.explanationKey)}</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* ========== Leak Exploit Quiz ========== */}
          {quiz.type === "leakExploit" && quiz.leakScenario && (
            <>
              <div className="bg-green-900/20 border border-green-700/30 rounded p-3 text-center">
                <p className="text-green-400 text-sm font-medium mb-1">{t("flopTexture.liveExploit.leakExploitQ.opponentLeak")}</p>
                <p className="text-white text-sm">{t(quiz.leakScenario.leakKey)}</p>
              </div>

              <div className="text-center text-lg font-medium">
                {t("flopTexture.liveExploit.leakExploitQ.question")}
              </div>

              <div className="grid grid-cols-2 gap-2">
                {[
                  { value: "raise", labelKey: "flopTexture.liveExploit.leakExploitQ.raise", icon: "⬆️" },
                  { value: "call_light", labelKey: "flopTexture.liveExploit.leakExploitQ.callLight", icon: "📞" },
                  { value: "value_bet", labelKey: "flopTexture.liveExploit.leakExploitQ.valueBet", icon: "💵" },
                  { value: "value_only", labelKey: "flopTexture.liveExploit.leakExploitQ.valueOnly", icon: "✅" },
                  { value: "overbet_value", labelKey: "flopTexture.liveExploit.leakExploitQ.overbetValue", icon: "💰" },
                  { value: "cr_bluff", labelKey: "flopTexture.liveExploit.leakExploitQ.crBluff", icon: "🃏" },
                  { value: "fold_marginal", labelKey: "flopTexture.liveExploit.leakExploitQ.foldMarginal", icon: "🏳️" },
                  { value: "bet_thin", labelKey: "flopTexture.liveExploit.leakExploitQ.betThin", icon: "📉" },
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
                    {opt.icon} {t(opt.labelKey)}
                  </Button>
                ))}
              </div>

              {!showQuizResult && (
                <Button onClick={handleQuizSubmit} disabled={!quiz.leakAnswer} className="w-full">
                  {t("flopTexture.confirmAnswer")}
                </Button>
              )}

              {showQuizResult && (
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardContent className="pt-4">
                    <div className={cn(
                      "text-lg font-semibold mb-2",
                      quiz.leakAnswer === quiz.leakScenario.correctExploit ? "text-green-400" : "text-orange-400"
                    )}>
                      {quiz.leakAnswer === quiz.leakScenario.correctExploit ? t("result.correct") : t("flopTexture.liveExploit.notCorrect")}
                    </div>
                    <p className="text-sm text-gray-300">{t(quiz.leakScenario.explanationKey)}</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Next button */}
          {showQuizResult && (
            <Button onClick={loadQuizScenario} className="w-full">
              {t("flopTexture.next")} <ArrowRight className="h-4 w-4 ml-2" />
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
  const t = useTranslations("drill");
  const [mode, setMode] = useState<DrillMode>("threelayer");

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-950 text-white">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">{t("flopTexture.title")}</h1>
          <p className="text-gray-400">
            {t("flopTexture.description")}
          </p>
        </div>

        {/* Mode Tabs */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as DrillMode)} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 sm:grid-cols-7 bg-gray-800 h-auto">
            <TabsTrigger value="checkfirst" className="text-[10px] sm:text-sm data-[state=active]:bg-purple-600">🔥{t("flopTexture.tabs.checkFirst")}</TabsTrigger>
            <TabsTrigger value="threelayer" className="text-[10px] sm:text-sm">{t("flopTexture.tabs.threeLayer")}</TabsTrigger>
            <TabsTrigger value="mustcheck" className="text-[10px] sm:text-sm">{t("flopTexture.tabs.mustCheck")}</TabsTrigger>
            <TabsTrigger value="liveexploit" className="text-[10px] sm:text-sm data-[state=active]:bg-amber-600">📍{t("flopTexture.tabs.liveExploit")}</TabsTrigger>
            <TabsTrigger value="classify" className="text-[10px] sm:text-sm">{t("flopTexture.tabs.classify")}</TabsTrigger>
            <TabsTrigger value="cbet" className="text-[10px] sm:text-sm">{t("flopTexture.tabs.cbet")}</TabsTrigger>
            <TabsTrigger value="quick" className="text-[10px] sm:text-sm">{t("flopTexture.tabs.quick")}</TabsTrigger>
          </TabsList>

          <TabsContent value="checkfirst">
            <Card className="bg-gray-800/50 border-purple-700/50">
              <CardHeader>
                <CardTitle className="text-lg">🔥 {t("flopTexture.checkFirst.cardTitle")}</CardTitle>
                <p className="text-sm text-gray-400">{t("flopTexture.checkFirst.cardDesc")}</p>
              </CardHeader>
              <CardContent>
                <CheckFirstDrill />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="liveexploit">
            <Card className="bg-gray-800/50 border-amber-700/50">
              <CardHeader>
                <CardTitle className="text-lg">📍 {t("flopTexture.liveExploit.cardTitle")}</CardTitle>
                <p className="text-sm text-gray-400">{t("flopTexture.liveExploit.cardDesc")}</p>
              </CardHeader>
              <CardContent>
                <LiveExploitDrill />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="classify">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg">{t("flopTexture.classify.cardTitle")}</CardTitle>
                <p className="text-sm text-gray-400">{t("flopTexture.classify.cardDesc")}</p>
              </CardHeader>
              <CardContent>
                <ClassifyDrill />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="cbet">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg">{t("flopTexture.cbet.cardTitle")}</CardTitle>
                <p className="text-sm text-gray-400">{t("flopTexture.cbet.cardDesc")}</p>
              </CardHeader>
              <CardContent>
                <CbetDrill />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quick">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg">{t("flopTexture.quick.cardTitle")}</CardTitle>
                <p className="text-sm text-gray-400">{t("flopTexture.quick.cardDesc")}</p>
              </CardHeader>
              <CardContent>
                <QuickDrill />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="threelayer">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg">{t("flopTexture.threeLayer.cardTitle")}</CardTitle>
                <p className="text-sm text-gray-400">{t("flopTexture.threeLayer.cardDesc")}</p>
              </CardHeader>
              <CardContent>
                <ThreeLayerDrill />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mustcheck">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="text-lg">{t("flopTexture.mustCheck.cardTitle")}</CardTitle>
                <p className="text-sm text-gray-400">{t("flopTexture.mustCheck.cardDesc")}</p>
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
            <CardTitle className="text-lg">{t("flopTexture.referenceTable")}</CardTitle>
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
