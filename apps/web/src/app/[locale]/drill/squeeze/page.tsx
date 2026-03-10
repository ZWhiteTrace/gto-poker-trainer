"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  BB_vs_CO_BTN: generateSqueezeRange({
    // Premium: Always squeeze
    squeezeAlways: ["AA", "KK", "QQ", "JJ", "TT", "AKs", "AKo", "AQs"],
    // Strong: Mostly squeeze
    squeezeMostly: ["99", "88", "AQo", "AJs", "ATs", "KQs", "KJs"],
    // Mixed: Sometimes squeeze
    squeezeMixed: [
      "77",
      "66",
      "AJo",
      "ATo",
      "KQo",
      "KTs",
      "QJs",
      "QTs",
      "JTs",
      "A5s",
      "A4s",
      "A3s",
      "A2s",
    ],
    // Call: Prefer calling
    callMostly: [
      "55",
      "44",
      "33",
      "22",
      "A9s",
      "A8s",
      "A7s",
      "A6s",
      "K9s",
      "Q9s",
      "J9s",
      "T9s",
      "98s",
      "87s",
      "76s",
      "65s",
    ],
  }),
  // BB vs HJ open + CO call
  BB_vs_HJ_CO: generateSqueezeRange({
    squeezeAlways: ["AA", "KK", "QQ", "JJ", "AKs", "AKo"],
    squeezeMostly: ["TT", "99", "AQs", "AQo", "AJs", "KQs"],
    squeezeMixed: ["88", "ATs", "AJo", "KJs", "QJs"],
    callMostly: ["77", "66", "55", "A9s", "A8s", "KTs", "QTs", "JTs", "T9s", "98s", "87s"],
  }),
  // BB vs UTG open + HJ call (tighter)
  BB_vs_UTG_HJ: generateSqueezeRange({
    squeezeAlways: ["AA", "KK", "QQ", "AKs"],
    squeezeMostly: ["JJ", "TT", "AKo", "AQs"],
    squeezeMixed: ["99", "AQo", "AJs", "KQs"],
    callMostly: ["88", "77", "ATs", "KJs", "QJs", "JTs"],
  }),
  // SB vs CO open + BTN call
  SB_vs_CO_BTN: generateSqueezeRange({
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
  {
    heroPosition: "BB",
    openPosition: "CO",
    callerPosition: "BTN",
    description: "CO opens, BTN calls",
  },
  {
    heroPosition: "BB",
    openPosition: "HJ",
    callerPosition: "CO",
    description: "HJ opens, CO calls",
  },
  {
    heroPosition: "BB",
    openPosition: "UTG",
    callerPosition: "HJ",
    description: "UTG opens, HJ calls",
  },
  {
    heroPosition: "SB",
    openPosition: "CO",
    callerPosition: "BTN",
    description: "CO opens, BTN calls",
  },
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
  const t = useTranslations("drill");
  const tCommon = useTranslations("common");
  const [currentScenario, setCurrentScenario] = useState<SqueezeScenario | null>(null);
  const [currentHand, setCurrentHand] = useState<{ hand: string; data: HandAction } | null>(null);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [stats, setStats] = useState<SessionStats>({
    total: 0,
    correct: 0,
    acceptable: 0,
    streak: 0,
  });
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
    const frequencies: Record<Action, number> = {
      squeeze: data.squeeze,
      call: data.call,
      fold: data.fold,
    };
    const correctAction = (["squeeze", "call", "fold"] as const).reduce((best, act) =>
      frequencies[act] > frequencies[best] ? act : best
    );

    const isCorrect = action === correctAction;
    const isAcceptable = frequencies[action] >= 20; // 20%+ frequency is acceptable

    setStats((prev) => ({
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
    return <div className="container py-8">{tCommon("loading")}</div>;
  }

  const data = currentHand.data;
  const frequencies: Record<Action, number> = {
    squeeze: data.squeeze,
    call: data.call,
    fold: data.fold,
  };
  const correctAction = (["squeeze", "call", "fold"] as const).reduce((best, action) =>
    frequencies[action] > frequencies[best] ? action : best
  );

  const isCorrect = selectedAction === correctAction;
  const isAcceptable = selectedAction ? frequencies[selectedAction] >= 20 : false;

  const accuracy =
    stats.total > 0 ? Math.round(((stats.correct + stats.acceptable) / stats.total) * 100) : 0;

  return (
    <div className="has-mobile-action-bar sm:has-mobile-action-bar-[none] container max-w-4xl py-4 sm:py-8">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between sm:mb-8">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">{t("squeeze.title")}</h1>
          <p className="text-muted-foreground text-sm">{t("squeeze.description")}</p>
        </div>
        <Button variant="outline" size="sm" onClick={resetSession} className="hidden sm:flex">
          <RotateCcw className="mr-2 h-4 w-4" />
          {tCommon("reset")}
        </Button>
      </div>

      {/* Stats Bar - compact on mobile */}
      <div className="mb-4 grid grid-cols-4 gap-1 sm:mb-6 sm:gap-2">
        <Card>
          <CardContent className="p-2 text-center sm:p-3">
            <div className="text-lg font-bold sm:text-xl">{stats.total}</div>
            <div className="text-muted-foreground text-[10px] sm:text-xs">
              {t("squeeze.totalQuestions")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 text-center sm:p-3">
            <div className="text-lg font-bold text-green-500 sm:text-xl">{stats.correct}</div>
            <div className="text-muted-foreground text-[10px] sm:text-xs">{tCommon("correct")}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 text-center sm:p-3">
            <div className="text-lg font-bold sm:text-xl">{accuracy}%</div>
            <div className="text-muted-foreground text-[10px] sm:text-xs">
              {tCommon("accuracy")}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-2 text-center sm:p-3">
            <div className="text-primary text-lg font-bold sm:text-xl">{stats.streak}</div>
            <div className="text-muted-foreground text-[10px] sm:text-xs">{tCommon("streak")}</div>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("squeeze.yourDecision")}</CardTitle>
              <CardDescription>
                {t("squeeze.scenarioYouAt", {
                  desc: currentScenario.description,
                  position: currentScenario.heroPosition,
                })}
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setShowTip(!showTip)}>
              <Lightbulb className="mr-1 h-4 w-4" />
              {t("squeeze.hint")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Scenario Display */}
          <div className="bg-muted/30 flex items-center justify-center gap-4 rounded-lg py-4">
            <div className="text-center">
              <Badge variant="outline" className="mb-1">
                {currentScenario.openPosition}
              </Badge>
              <div className="text-muted-foreground text-xs">Opens</div>
            </div>
            <ChevronRight className="text-muted-foreground h-4 w-4" />
            <div className="text-center">
              <Badge variant="outline" className="mb-1">
                {currentScenario.callerPosition}
              </Badge>
              <div className="text-muted-foreground text-xs">Calls</div>
            </div>
            <ChevronRight className="text-muted-foreground h-4 w-4" />
            <div className="text-center">
              <Badge variant="secondary" className="mb-1">
                {currentScenario.heroPosition}
              </Badge>
              <div className="text-muted-foreground text-xs">You</div>
            </div>
          </div>

          {/* Hand Display */}
          <div className="flex justify-center">
            <div className="text-center">
              <HoleCards cards={handNotationToCards(currentHand.hand)} size="lg" />
              <div className="mt-2 font-mono text-lg">{currentHand.hand}</div>
            </div>
          </div>

          {/* Tip */}
          {showTip && (
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-sm">
              <p className="mb-1 font-medium text-amber-600 dark:text-amber-400">
                {t("squeeze.factors")}
              </p>
              <ul className="text-muted-foreground list-inside list-disc space-y-1">
                <li>{t("squeeze.tip1")}</li>
                <li>{t("squeeze.tip2")}</li>
                <li>{t("squeeze.tip3")}</li>
                <li>{t("squeeze.tip4")}</li>
              </ul>
            </div>
          )}

          {/* Result Display */}
          {showResult && (
            <div
              className={cn(
                "rounded-lg p-4",
                isCorrect
                  ? "border border-green-500/20 bg-green-500/10"
                  : isAcceptable
                    ? "border border-yellow-500/20 bg-yellow-500/10"
                    : "border border-red-500/20 bg-red-500/10"
              )}
            >
              <div className="mb-3 flex items-center gap-2">
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    <span className="font-semibold text-green-500">{t("result.correct")}</span>
                  </>
                ) : isAcceptable ? (
                  <>
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                    <span className="font-semibold text-yellow-500">{t("result.acceptable")}</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5 text-red-500" />
                    <span className="font-semibold text-red-500">{t("result.incorrect")}</span>
                  </>
                )}
              </div>

              {/* Frequency Bars */}
              <div className="space-y-2">
                {(["squeeze", "call", "fold"] as const).map((action) => (
                  <div key={action} className="flex items-center gap-2">
                    <span
                      className={cn(
                        "w-16 text-sm",
                        action === correctAction && "font-bold",
                        selectedAction === action && action !== correctAction && "text-red-500"
                      )}
                    >
                      {action === "squeeze" ? "Squeeze" : action === "call" ? "Call" : "Fold"}
                    </span>
                    <Progress
                      value={frequencies[action]}
                      className={cn(
                        "h-4 flex-1",
                        action === correctAction && "[&>div]:bg-green-500"
                      )}
                    />
                    <span className="w-12 text-right text-sm">{frequencies[action]}%</span>
                  </div>
                ))}
              </div>

              <p className="text-muted-foreground mt-3 text-sm">
                {t("squeeze.gtoOptimal", {
                  action:
                    correctAction === "squeeze"
                      ? "Squeeze"
                      : correctAction === "call"
                        ? "Call"
                        : "Fold",
                  frequency: String(frequencies[correctAction]),
                })}
              </p>
            </div>
          )}

          {/* Action Buttons - Desktop inline, Mobile fixed bottom */}
          <div className="hidden sm:block">
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
                    <kbd className="ml-2 text-xs opacity-50">S</kbd>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => handleAction("call")}
                    className="h-14"
                  >
                    Call
                    <kbd className="ml-2 text-xs opacity-50">C</kbd>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => handleAction("fold")}
                    className="h-14"
                  >
                    Fold
                    <kbd className="ml-2 text-xs opacity-50">F</kbd>
                  </Button>
                </div>
                <p className="text-muted-foreground text-center text-xs">
                  {t("squeeze.shortcuts")}
                </p>
              </div>
            ) : (
              <Button size="lg" onClick={generateNewSpot} className="h-14 w-full">
                {t("squeeze.nextQuestion")}
                <kbd className="ml-2 text-xs opacity-50">Space</kbd>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reference Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("squeeze.reference.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <p className="font-medium">{t("squeeze.reference.whatIs")}</p>
            <p className="text-muted-foreground">{t("squeeze.reference.explanation")}</p>
          </div>
          <div>
            <p className="font-medium">{t("squeeze.reference.suitableHands")}</p>
            <ul className="text-muted-foreground list-inside list-disc">
              <li>{t("squeeze.reference.hand1")}</li>
              <li>{t("squeeze.reference.hand2")}</li>
              <li>{t("squeeze.reference.hand3")}</li>
            </ul>
          </div>
          <div>
            <p className="font-medium">{t("squeeze.reference.sizingTitle")}</p>
            <p className="text-muted-foreground">{t("squeeze.reference.sizingDesc")}</p>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Fixed Action Bar */}
      <div className="mobile-action-bar sm:hidden">
        {!showResult ? (
          <div className="grid grid-cols-3 gap-2">
            <Button
              size="lg"
              variant="default"
              onClick={() => handleAction("squeeze")}
              className="h-12 text-sm font-semibold"
            >
              Squeeze
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => handleAction("call")}
              className="h-12 text-sm font-semibold"
            >
              Call
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => handleAction("fold")}
              className="h-12 text-sm font-semibold"
            >
              Fold
            </Button>
          </div>
        ) : (
          <Button size="lg" onClick={generateNewSpot} className="h-12 w-full font-semibold">
            {t("squeeze.nextQuestion")} →
          </Button>
        )}
      </div>
    </div>
  );
}
