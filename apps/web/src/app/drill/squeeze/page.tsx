"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  RotateCcw,
  ChevronRight,
  Lightbulb,
} from "lucide-react";
import { HoleCards } from "@/components/poker/cards/PlayingCard";
import type { Card as PokerCard, Rank } from "@/lib/poker/types";

// Squeeze scenario types
interface SqueezeScenario {
  heroPosition: "SB" | "BB";
  openPosition: "UTG" | "HJ" | "CO" | "BTN";
  callerPosition: "HJ" | "CO" | "BTN" | "SB";
  description: string;
}

// Hand action data
interface HandAction {
  hand: string;
  squeeze: number; // frequency 0-100
  call: number;
  fold: number;
}

// GTO Squeeze ranges (simplified) - based on common solver outputs
// Format: hand -> {squeeze%, call%, fold%}
const SQUEEZE_RANGES: Record<string, Record<string, HandAction>> = {
  // BB vs CO open + BTN call (most common)
  "BB_vs_CO_BTN": generateSqueezeRange({
    // Premium: Always squeeze
    squeezeAlways: ["AA", "KK", "QQ", "JJ", "TT", "AKs", "AKo", "AQs"],
    // Strong: Mostly squeeze
    squeezeMostly: ["99", "88", "AQo", "AJs", "ATs", "KQs", "KJs"],
    // Mixed: Sometimes squeeze
    squeezeMixed: ["77", "66", "AJo", "ATo", "KQo", "KTs", "QJs", "QTs", "JTs", "A5s", "A4s", "A3s", "A2s"],
    // Call: Prefer calling
    callMostly: ["55", "44", "33", "22", "A9s", "A8s", "A7s", "A6s", "K9s", "Q9s", "J9s", "T9s", "98s", "87s", "76s", "65s"],
  }),
  // BB vs HJ open + CO call
  "BB_vs_HJ_CO": generateSqueezeRange({
    squeezeAlways: ["AA", "KK", "QQ", "JJ", "AKs", "AKo"],
    squeezeMostly: ["TT", "99", "AQs", "AQo", "AJs", "KQs"],
    squeezeMixed: ["88", "ATs", "AJo", "KJs", "QJs"],
    callMostly: ["77", "66", "55", "A9s", "A8s", "KTs", "QTs", "JTs", "T9s", "98s", "87s"],
  }),
  // BB vs UTG open + HJ call (tighter)
  "BB_vs_UTG_HJ": generateSqueezeRange({
    squeezeAlways: ["AA", "KK", "QQ", "AKs"],
    squeezeMostly: ["JJ", "TT", "AKo", "AQs"],
    squeezeMixed: ["99", "AQo", "AJs", "KQs"],
    callMostly: ["88", "77", "ATs", "KJs", "QJs", "JTs"],
  }),
  // SB vs CO open + BTN call
  "SB_vs_CO_BTN": generateSqueezeRange({
    squeezeAlways: ["AA", "KK", "QQ", "JJ", "TT", "AKs", "AKo", "AQs"],
    squeezeMostly: ["99", "AQo", "AJs", "ATs", "KQs", "KJs"],
    squeezeMixed: ["88", "77", "AJo", "KQo", "QJs", "JTs", "A5s", "A4s"],
    callMostly: [], // SB should rarely flat in squeeze spots
  }),
};

function generateSqueezeRange(config: {
  squeezeAlways: string[];
  squeezeMostly: string[];
  squeezeMixed: string[];
  callMostly: string[];
}): Record<string, HandAction> {
  const range: Record<string, HandAction> = {};

  // Default: all hands fold
  const allHands = generateAllHands();
  for (const hand of allHands) {
    range[hand] = { hand, squeeze: 0, call: 0, fold: 100 };
  }

  // Squeeze always (95-100%)
  for (const h of config.squeezeAlways) {
    if (range[h]) range[h] = { hand: h, squeeze: 97, call: 0, fold: 3 };
  }

  // Squeeze mostly (70-90%)
  for (const h of config.squeezeMostly) {
    if (range[h]) range[h] = { hand: h, squeeze: 80, call: 10, fold: 10 };
  }

  // Mixed (30-60%)
  for (const h of config.squeezeMixed) {
    if (range[h]) range[h] = { hand: h, squeeze: 45, call: 25, fold: 30 };
  }

  // Call mostly
  for (const h of config.callMostly) {
    if (range[h]) range[h] = { hand: h, squeeze: 10, call: 60, fold: 30 };
  }

  return range;
}

function generateAllHands(): string[] {
  const ranks = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];
  const hands: string[] = [];

  for (let i = 0; i < ranks.length; i++) {
    // Pairs
    hands.push(ranks[i] + ranks[i]);

    for (let j = i + 1; j < ranks.length; j++) {
      // Suited
      hands.push(ranks[i] + ranks[j] + "s");
      // Offsuit
      hands.push(ranks[i] + ranks[j] + "o");
    }
  }

  return hands;
}

const SCENARIOS: SqueezeScenario[] = [
  { heroPosition: "BB", openPosition: "CO", callerPosition: "BTN", description: "CO opens, BTN calls" },
  { heroPosition: "BB", openPosition: "HJ", callerPosition: "CO", description: "HJ opens, CO calls" },
  { heroPosition: "BB", openPosition: "UTG", callerPosition: "HJ", description: "UTG opens, HJ calls" },
  { heroPosition: "SB", openPosition: "CO", callerPosition: "BTN", description: "CO opens, BTN calls" },
];

function getScenarioKey(scenario: SqueezeScenario): string {
  return `${scenario.heroPosition}_vs_${scenario.openPosition}_${scenario.callerPosition}`;
}

function handNotationToCards(hand: string): [PokerCard, PokerCard] | null {
  if (!hand || hand.length < 2) return null;
  const rank1 = hand[0] as Rank;
  const rank2 = hand[1] as Rank;
  const suffix = hand[2] as "s" | "o" | undefined;

  if (rank1 === rank2) {
    return [
      { rank: rank1, suit: "s" },
      { rank: rank2, suit: "h" },
    ];
  } else if (suffix === "s") {
    return [
      { rank: rank1, suit: "s" },
      { rank: rank2, suit: "s" },
    ];
  } else {
    return [
      { rank: rank1, suit: "s" },
      { rank: rank2, suit: "h" },
    ];
  }
}

function getRandomHand(scenario: SqueezeScenario): { hand: string; data: HandAction } {
  const key = getScenarioKey(scenario);
  const range = SQUEEZE_RANGES[key] || SQUEEZE_RANGES["BB_vs_CO_BTN"];

  // Weight selection towards interesting hands (not pure folds)
  const interestingHands = Object.entries(range).filter(
    ([_, data]) => data.squeeze > 5 || data.call > 5
  );

  // 70% chance to get an interesting hand
  if (Math.random() < 0.7 && interestingHands.length > 0) {
    const [hand, data] = interestingHands[Math.floor(Math.random() * interestingHands.length)];
    return { hand, data };
  }

  // Otherwise random from all hands
  const allHands = Object.entries(range);
  const [hand, data] = allHands[Math.floor(Math.random() * allHands.length)];
  return { hand, data };
}

type Action = "squeeze" | "call" | "fold";

interface SessionStats {
  total: number;
  correct: number;
  acceptable: number;
  streak: number;
}

export default function SqueezeDrillPage() {
  const [currentScenario, setCurrentScenario] = useState<SqueezeScenario | null>(null);
  const [currentHand, setCurrentHand] = useState<{ hand: string; data: HandAction } | null>(null);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [stats, setStats] = useState<SessionStats>({ total: 0, correct: 0, acceptable: 0, streak: 0 });
  const [showTip, setShowTip] = useState(false);

  const generateNewSpot = useCallback(() => {
    const scenario = SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
    const handData = getRandomHand(scenario);
    setCurrentScenario(scenario);
    setCurrentHand(handData);
    setSelectedAction(null);
    setShowResult(false);
    setShowTip(false);
  }, []);

  useEffect(() => {
    generateNewSpot();
  }, [generateNewSpot]);

  const handleAction = (action: Action) => {
    if (!currentHand || showResult) return;
    setSelectedAction(action);
    setShowResult(true);

    const data = currentHand.data;
    const frequencies: Record<Action, number> = { squeeze: data.squeeze, call: data.call, fold: data.fold };
    const correctAction = (["squeeze", "call", "fold"] as const).reduce((best, act) =>
      frequencies[act] > frequencies[best] ? act : best
    );

    const isCorrect = action === correctAction;
    const isAcceptable = frequencies[action] >= 20; // 20%+ frequency is acceptable

    setStats(prev => ({
      total: prev.total + 1,
      correct: prev.correct + (isCorrect ? 1 : 0),
      acceptable: prev.acceptable + (isAcceptable && !isCorrect ? 1 : 0),
      streak: isCorrect || isAcceptable ? prev.streak + 1 : 0,
    }));
  };

  const resetSession = () => {
    setStats({ total: 0, correct: 0, acceptable: 0, streak: 0 });
    generateNewSpot();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;

      if (showResult) {
        if (e.key === " " || e.key === "Enter") {
          e.preventDefault();
          generateNewSpot();
        }
        return;
      }

      switch (e.key.toLowerCase()) {
        case "s":
        case "3":
          handleAction("squeeze");
          break;
        case "c":
          handleAction("call");
          break;
        case "f":
          handleAction("fold");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showResult, currentHand]);

  if (!currentScenario || !currentHand) {
    return <div className="container py-8">Loading...</div>;
  }

  const data = currentHand.data;
  const frequencies: Record<Action, number> = { squeeze: data.squeeze, call: data.call, fold: data.fold };
  const correctAction = (["squeeze", "call", "fold"] as const).reduce((best, action) =>
    frequencies[action] > frequencies[best] ? action : best
  );

  const isCorrect = selectedAction === correctAction;
  const isAcceptable = selectedAction ? frequencies[selectedAction] >= 20 : false;

  const accuracy = stats.total > 0
    ? Math.round(((stats.correct + stats.acceptable) / stats.total) * 100)
    : 0;

  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Squeeze 訓練</h1>
          <p className="text-muted-foreground">練習多人底池的 3-Bet 決策</p>
        </div>
        <Button variant="outline" onClick={resetSession}>
          <RotateCcw className="mr-2 h-4 w-4" />
          重置
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="mb-6 grid grid-cols-4 gap-2">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">總題數</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-green-500">{stats.correct}</div>
            <div className="text-xs text-muted-foreground">正確</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold">{accuracy}%</div>
            <div className="text-xs text-muted-foreground">準確率</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-xl font-bold text-primary">{stats.streak}</div>
            <div className="text-xs text-muted-foreground">連續</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>你的決定？</CardTitle>
              <CardDescription>
                {currentScenario.description}，你在 {currentScenario.heroPosition}
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowTip(!showTip)}
            >
              <Lightbulb className="h-4 w-4 mr-1" />
              提示
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Scenario Display */}
          <div className="flex items-center justify-center gap-4 py-4 bg-muted/30 rounded-lg">
            <div className="text-center">
              <Badge variant="outline" className="mb-1">{currentScenario.openPosition}</Badge>
              <div className="text-xs text-muted-foreground">Opens</div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <div className="text-center">
              <Badge variant="outline" className="mb-1">{currentScenario.callerPosition}</Badge>
              <div className="text-xs text-muted-foreground">Calls</div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <div className="text-center">
              <Badge variant="secondary" className="mb-1">{currentScenario.heroPosition}</Badge>
              <div className="text-xs text-muted-foreground">You</div>
            </div>
          </div>

          {/* Hand Display */}
          <div className="flex justify-center">
            <div className="text-center">
              <HoleCards cards={handNotationToCards(currentHand.hand)} size="lg" />
              <div className="mt-2 text-lg font-mono">{currentHand.hand}</div>
            </div>
          </div>

          {/* Tip */}
          {showTip && (
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm">
              <p className="font-medium text-amber-600 dark:text-amber-400 mb-1">Squeeze 考量因素：</p>
              <ul className="list-disc list-inside text-muted-foreground space-y-1">
                <li>開牌者位置越早 → 他的範圍越強 → squeeze 需更緊</li>
                <li>跟注者的存在 = 更多 fold equity（死錢）</li>
                <li>你的位置：SB 比 BB 更需要拿下底池（OOP 翻後劣勢大）</li>
                <li>有 A blocker 的牌更適合 squeeze（阻擋 AA/AK）</li>
              </ul>
            </div>
          )}

          {/* Result Display */}
          {showResult && (
            <div className={cn(
              "p-4 rounded-lg",
              isCorrect
                ? "bg-green-500/10 border border-green-500/20"
                : isAcceptable
                ? "bg-yellow-500/10 border border-yellow-500/20"
                : "bg-red-500/10 border border-red-500/20"
            )}>
              <div className="flex items-center gap-2 mb-3">
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="font-semibold text-green-500">正確！</span>
                  </>
                ) : isAcceptable ? (
                  <>
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                    <span className="font-semibold text-yellow-500">可接受</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="font-semibold text-red-500">錯誤</span>
                  </>
                )}
              </div>

              {/* Frequency Bars */}
              <div className="space-y-2">
                {(["squeeze", "call", "fold"] as const).map((action) => (
                  <div key={action} className="flex items-center gap-2">
                    <span className={cn(
                      "w-16 text-sm",
                      action === correctAction && "font-bold",
                      selectedAction === action && action !== correctAction && "text-red-500"
                    )}>
                      {action === "squeeze" ? "Squeeze" : action === "call" ? "Call" : "Fold"}
                    </span>
                    <Progress
                      value={frequencies[action]}
                      className={cn(
                        "h-4 flex-1",
                        action === correctAction && "[&>div]:bg-green-500"
                      )}
                    />
                    <span className="w-12 text-sm text-right">{frequencies[action]}%</span>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-sm text-muted-foreground">
                GTO 最佳行動：<strong>{correctAction === "squeeze" ? "Squeeze" : correctAction === "call" ? "Call" : "Fold"}</strong>（{frequencies[correctAction]}%）
              </p>
            </div>
          )}

          {/* Action Buttons */}
          {!showResult ? (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <Button
                  size="lg"
                  variant="default"
                  onClick={() => handleAction("squeeze")}
                  className="h-14"
                >
                  Squeeze
                  <kbd className="ml-2 hidden sm:inline text-xs opacity-50">S</kbd>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => handleAction("call")}
                  className="h-14"
                >
                  Call
                  <kbd className="ml-2 hidden sm:inline text-xs opacity-50">C</kbd>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => handleAction("fold")}
                  className="h-14"
                >
                  Fold
                  <kbd className="ml-2 hidden sm:inline text-xs opacity-50">F</kbd>
                </Button>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                快捷鍵：S = Squeeze, C = Call, F = Fold
              </p>
            </div>
          ) : (
            <Button size="lg" onClick={generateNewSpot} className="w-full h-14">
              下一題
              <kbd className="ml-2 hidden sm:inline text-xs opacity-50">Space</kbd>
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Reference Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Squeeze 策略參考</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <div>
            <p className="font-medium">什麼是 Squeeze？</p>
            <p className="text-muted-foreground">
              當有玩家開牌且有人跟注後，你用 3-bet 施壓，迫使雙方棄牌。這利用了「死錢」（跟注者的籌碼）增加 fold equity。
            </p>
          </div>
          <div>
            <p className="font-medium">適合 Squeeze 的手牌：</p>
            <ul className="list-disc list-inside text-muted-foreground">
              <li>Premium 手牌（AA-TT, AK, AQ）— 總是 squeeze</li>
              <li>A-blocker hands（A5s-A2s）— 阻擋對手強牌組合</li>
              <li>強同花連張（KQs, QJs, JTs）— 有後路可退</li>
            </ul>
          </div>
          <div>
            <p className="font-medium">Sizing 建議：</p>
            <p className="text-muted-foreground">
              標準 Squeeze size = 開牌 × 3 + 1 × 每位跟注者。例如：CO 開 2.5BB，BTN call → Squeeze 到 10-11BB。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
