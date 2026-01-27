"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RefreshCw, CheckCircle2, XCircle, Trophy, Target } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://gto-poker-trainer-production.up.railway.app";

// Card display for flop
const SUIT_SYMBOLS: Record<string, string> = {
  s: "♠",
  h: "♥",
  d: "♦",
  c: "♣",
};

const SUIT_COLORS: Record<string, string> = {
  s: "text-gray-800 dark:text-gray-200",
  h: "text-red-500",
  d: "text-blue-500",
  c: "text-green-600",
};

interface CbetScenario {
  id: string;
  preflop: string;
  hero_position: string;
  villain_position: string;
  pot_type: string;
  flop: string[];
  flop_suits: string[];
  texture: string;
  texture_zh: string;
  hero_hand: string;
  correct_action: string;
  correct_sizing: string | null;
  frequency: number;
  explanation_zh: string;
  explanation_en: string;
}

function FlopCard({ rank, suit }: { rank: string; suit: string }) {
  return (
    <div className="bg-white dark:bg-gray-100 rounded-lg shadow-md w-14 h-20 sm:w-16 sm:h-24 flex flex-col items-center justify-center border-2 border-gray-200">
      <span className={cn("text-2xl sm:text-3xl font-bold", SUIT_COLORS[suit])}>
        {rank}
      </span>
      <span className={cn("text-xl sm:text-2xl", SUIT_COLORS[suit])}>
        {SUIT_SYMBOLS[suit]}
      </span>
    </div>
  );
}

function HeroHand({ hand }: { hand: string }) {
  // Parse hand like "AKo" or "JTs"
  const rank1 = hand[0];
  const rank2 = hand[1];
  const suited = hand.endsWith("s");

  return (
    <div className="flex gap-2">
      <div className="bg-white dark:bg-gray-100 rounded-lg shadow-md w-12 h-16 sm:w-14 sm:h-20 flex flex-col items-center justify-center border-2 border-primary">
        <span className="text-xl sm:text-2xl font-bold text-gray-800">{rank1}</span>
        <span className={cn("text-lg", suited ? "text-red-500" : "text-gray-800")}>
          {suited ? "♥" : "♠"}
        </span>
      </div>
      <div className="bg-white dark:bg-gray-100 rounded-lg shadow-md w-12 h-16 sm:w-14 sm:h-20 flex flex-col items-center justify-center border-2 border-primary">
        <span className="text-xl sm:text-2xl font-bold text-gray-800">{rank2}</span>
        <span className={cn("text-lg", suited ? "text-red-500" : "text-gray-600")}>
          {suited ? "♥" : "♣"}
        </span>
      </div>
    </div>
  );
}

const ACTION_OPTIONS = [
  { key: "bet_33", label: "Bet 33%", labelZh: "下注 33%" },
  { key: "bet_50", label: "Bet 50%", labelZh: "下注 50%" },
  { key: "bet_75", label: "Bet 75%", labelZh: "下注 75%" },
  { key: "check", label: "Check", labelZh: "過牌" },
];

export default function PostflopDrillPage() {
  const t = useTranslations();
  const [scenario, setScenario] = useState<CbetScenario | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [result, setResult] = useState<{
    correct: boolean;
    explanation: string;
  } | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [textureFilter, setTextureFilter] = useState<string | null>(null);
  const [textures, setTextures] = useState<Record<string, string>>({});

  // Load available textures
  useEffect(() => {
    fetch(`${API_URL}/api/postflop/cbet/textures`)
      .then((res) => res.json())
      .then((data) => setTextures(data.textures || {}))
      .catch(console.error);
  }, []);

  const loadScenario = useCallback(async () => {
    setLoading(true);
    setSelectedAction(null);
    setResult(null);

    try {
      const params = new URLSearchParams();
      if (textureFilter) params.set("texture", textureFilter);

      const res = await fetch(`${API_URL}/api/postflop/cbet/random?${params}`);
      const data = await res.json();
      setScenario(data.scenario);
    } catch (err) {
      console.error("Failed to load scenario:", err);
    } finally {
      setLoading(false);
    }
  }, [textureFilter]);

  useEffect(() => {
    loadScenario();
  }, [loadScenario]);

  const handleAction = async (action: string) => {
    if (selectedAction || !scenario) return;

    setSelectedAction(action);

    try {
      const res = await fetch(`${API_URL}/api/postflop/cbet/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario_id: scenario.id,
          user_action: action,
        }),
      });
      const data = await res.json();

      setResult({
        correct: data.correct,
        explanation: data.explanation_zh,
      });

      setScore((prev) => ({
        correct: prev.correct + (data.correct ? 1 : 0),
        total: prev.total + 1,
      }));
    } catch (err) {
      console.error("Failed to evaluate:", err);
    }
  };

  const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  if (loading && !scenario) {
    return (
      <div className="container max-w-2xl py-8">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("postflop.cbet.title")}</h1>
        <p className="text-muted-foreground">{t("postflop.cbet.description")}</p>
      </div>

      {/* Score */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-lg px-3 py-1">
            <Trophy className="h-4 w-4 mr-1" />
            {score.correct}/{score.total}
          </Badge>
          <span className="text-muted-foreground">{accuracy}%</span>
        </div>
        <select
          className="bg-muted px-3 py-1.5 rounded-md text-sm"
          value={textureFilter || "all"}
          onChange={(e) => {
            setTextureFilter(e.target.value === "all" ? null : e.target.value);
            setScore({ correct: 0, total: 0 });
          }}
        >
          <option value="all">{t("quiz.allCategories")}</option>
          {Object.entries(textures).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {scenario && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription>
                <Badge variant="secondary">{scenario.texture_zh}</Badge>
              </CardDescription>
              <Badge variant="outline">
                {scenario.hero_position} vs {scenario.villain_position}
              </Badge>
            </div>
            <CardTitle className="text-lg mt-2">{t("postflop.cbet.question")}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Preflop Action */}
            <div className="text-sm text-muted-foreground mb-4 text-center">
              {scenario.preflop}
            </div>

            {/* Flop Display */}
            <div className="mb-6">
              <div className="text-sm text-muted-foreground mb-2 text-center">Flop</div>
              <div className="flex gap-2 justify-center bg-green-800/30 py-4 px-6 rounded-lg">
                {scenario.flop.map((rank, i) => (
                  <FlopCard key={i} rank={rank} suit={scenario.flop_suits[i]} />
                ))}
              </div>
            </div>

            {/* Hero Hand */}
            <div className="mb-6">
              <div className="text-sm text-muted-foreground mb-2 text-center">
                {t("postflop.cbet.yourHand")}
              </div>
              <div className="flex justify-center">
                <HeroHand hand={scenario.hero_hand} />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-3">
              {ACTION_OPTIONS.map((option) => {
                const isSelected = selectedAction === option.key;
                const showResult = selectedAction !== null;
                const isCorrect =
                  option.key.startsWith(scenario.correct_action) ||
                  (scenario.correct_action === "bet" &&
                    option.key.startsWith("bet") &&
                    option.key.includes(scenario.correct_sizing || ""));

                // For bet actions, check if the sizing matches
                const isExactCorrect =
                  scenario.correct_action === "check"
                    ? option.key === "check"
                    : option.key === `bet_${scenario.correct_sizing}`;

                return (
                  <Button
                    key={option.key}
                    variant={
                      showResult
                        ? isExactCorrect
                          ? "default"
                          : isSelected
                          ? "destructive"
                          : "outline"
                        : "outline"
                    }
                    className={cn(
                      "h-auto py-4",
                      showResult && isExactCorrect && "bg-green-600 hover:bg-green-600",
                      showResult && isSelected && !isExactCorrect && "bg-red-600"
                    )}
                    onClick={() => handleAction(option.key)}
                    disabled={showResult}
                  >
                    <span className="text-lg font-medium">{option.labelZh}</span>
                    {showResult && isExactCorrect && <CheckCircle2 className="h-4 w-4 ml-2" />}
                    {showResult && isSelected && !isExactCorrect && (
                      <XCircle className="h-4 w-4 ml-2" />
                    )}
                  </Button>
                );
              })}
            </div>

            {/* Result */}
            {result && (
              <div className="mt-6 text-center">
                {result.correct ? (
                  <p className="text-green-500 font-medium">{t("drill.result.correct")}</p>
                ) : (
                  <p className="text-red-500 font-medium">
                    {t("drill.result.incorrect")} -{" "}
                    {scenario.correct_action === "check"
                      ? "Check"
                      : `Bet ${scenario.correct_sizing}%`}{" "}
                    ({scenario.frequency}%)
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-2 bg-muted/30 p-3 rounded-lg">
                  {result.explanation}
                </p>
                <Button onClick={loadScenario} className="mt-4">
                  {t("drill.nextHand")}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("postflop.cbet.tipsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>{t("postflop.cbet.tip1")}</p>
          <p>{t("postflop.cbet.tip2")}</p>
          <p>{t("postflop.cbet.tip3")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
