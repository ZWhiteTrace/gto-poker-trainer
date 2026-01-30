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
  type FlopTextureType,
  type FlopTextureCategory,
} from "@/lib/poker/flopTexture";
import type { Rank, Suit } from "@/lib/poker/types";

// ============================================
// Types
// ============================================

type DrillMode = "classify" | "cbet" | "quick";

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
  questionType: "connectivity" | "suit_distribution" | "wetness" | "high_card";
  correctAnswer: string;
}

// ============================================
// Constants
// ============================================

const SUIT_SYMBOLS: Record<Suit, string> = {
  s: "♠", h: "♥", d: "♦", c: "♣",
};

const SUIT_COLORS: Record<Suit, string> = {
  s: "text-slate-900",
  h: "text-red-500",
  d: "text-blue-500",
  c: "text-green-700",
};

const FREQUENCY_OPTIONS = [
  { key: "very_high", label: "很高 (70%+)" },
  { key: "medium_high", label: "中高 (55-70%)" },
  { key: "medium", label: "中等 (40-55%)" },
  { key: "low", label: "低 (25-40%)" },
  { key: "very_low", label: "很低 (<25%)" },
];

const SIZING_OPTIONS = [
  { key: "small", label: "小 (25-35%)" },
  { key: "medium", label: "中 (40-60%)" },
  { key: "large", label: "大 (66-80%)" },
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

  // Determine correct answers based on texture
  let correctFrequency: string;
  let correctSizing: string;

  if (category.cbet >= 70) correctFrequency = "very_high";
  else if (category.cbet >= 55) correctFrequency = "medium_high";
  else if (category.cbet >= 40) correctFrequency = "medium";
  else if (category.cbet >= 25) correctFrequency = "low";
  else correctFrequency = "very_low";

  if (category.sizing <= 35) correctSizing = "small";
  else if (category.sizing <= 60) correctSizing = "medium";
  else correctSizing = "large";

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
    "connectivity", "suit_distribution", "wetness", "high_card",
  ];
  const questionType = questionTypes[Math.floor(Math.random() * questionTypes.length)];

  const analysis = analyzeFlop(ranks, suits);
  let correctAnswer: string;

  switch (questionType) {
    case "connectivity":
      correctAnswer = analysis.connectivity;
      break;
    case "suit_distribution":
      correctAnswer = analysis.suitDistribution;
      break;
    case "wetness":
      correctAnswer = analysis.wetness;
      break;
    case "high_card":
      correctAnswer = analysis.highCard;
      break;
  }

  return {
    flop: ranks,
    suits,
    questionType,
    correctAnswer,
  };
}

// ============================================
// Components
// ============================================

function BoardCard({ rank, suit }: { rank: Rank; suit: Suit }) {
  return (
    <div className="w-14 h-20 sm:w-16 sm:h-24 bg-white rounded-lg shadow-lg flex flex-col items-center justify-center border-2 border-gray-200">
      <span className={cn("text-2xl sm:text-3xl font-bold", SUIT_COLORS[suit])}>
        {rank}
      </span>
      <span className={cn("text-xl sm:text-2xl", SUIT_COLORS[suit])}>
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
                <div className="flex items-center gap-4 mt-3 text-sm">
                  <span className="text-gray-400">
                    建議 C-bet: <span className="text-cyan-400">{correctCategory.cbet}%</span>
                  </span>
                  <span className="text-gray-400">
                    建議尺寸: <span className="text-yellow-400">{correctCategory.sizing}% pot</span>
                  </span>
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
            <div className="grid grid-cols-3 gap-2">
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
                  {category.nameZh} 牌面，建議 C-bet 頻率約 <span className="text-cyan-400">{category.cbet}%</span>，
                  使用 <span className="text-yellow-400">{category.sizing}% pot</span> 尺寸。
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
      case "wetness": return "這個牌面的濕潤度？";
      case "high_card": return "這個牌面的最高牌？";
      default: return "";
    }
  };

  const getOptions = () => {
    switch (scenario?.questionType) {
      case "connectivity":
        return [
          { key: "connected", label: "高度連接" },
          { key: "semi_connected", label: "半連接" },
          { key: "disconnected", label: "斷開" },
        ];
      case "suit_distribution":
        return [
          { key: "rainbow", label: "彩虹" },
          { key: "twotone", label: "雙花" },
          { key: "monotone", label: "單花" },
        ];
      case "wetness":
        return [
          { key: "dry", label: "乾燥" },
          { key: "medium", label: "中等" },
          { key: "wet", label: "濕潤" },
        ];
      case "high_card":
        return [
          { key: "ace", label: "A" },
          { key: "king", label: "K" },
          { key: "queen", label: "Q" },
          { key: "low", label: "J以下" },
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
          <div className="grid grid-cols-3 gap-2">
            {getOptions().map((opt) => {
              const isSelected = selectedAnswer === opt.key;
              const isCorrectAnswer = scenario.correctAnswer === opt.key;

              return (
                <Button
                  key={opt.key}
                  variant="outline"
                  className={cn(
                    "h-auto py-4 text-lg",
                    showResult && isCorrectAnswer && "bg-green-600 hover:bg-green-600 text-white border-green-600",
                    showResult && isSelected && !isCorrectAnswer && "bg-red-600 hover:bg-red-600 text-white border-red-600",
                    !showResult && "hover:bg-gray-700"
                  )}
                  onClick={() => handleAnswer(opt.key)}
                  disabled={showResult}
                >
                  {opt.label}
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
// Main Page
// ============================================

export default function FlopTextureDrillPage() {
  const [mode, setMode] = useState<DrillMode>("classify");

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
          <TabsList className="grid w-full grid-cols-3 bg-gray-800">
            <TabsTrigger value="classify">質地分類</TabsTrigger>
            <TabsTrigger value="cbet">C-bet 策略</TabsTrigger>
            <TabsTrigger value="quick">快速辨識</TabsTrigger>
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
        </Tabs>

        {/* Texture Reference */}
        <Card className="mt-8 bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-lg">質地參考表</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
              {Object.values(FLOP_TEXTURE_CATEGORIES).map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-2 bg-gray-900/50 rounded">
                  <span className="text-gray-300">{cat.nameZh}</span>
                  <div className="flex gap-2">
                    <span className="text-cyan-400">{cat.cbet}%</span>
                    <span className="text-yellow-400">{cat.sizing}%</span>
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
