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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { RefreshCw, CheckCircle2, XCircle, Trophy } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://gto-poker-trainer-production.up.railway.app";

type Street = "flop" | "turn" | "river";

// Card display
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

interface BaseScenario {
  id: string;
  preflop: string;
  hero_position: string;
  villain_position: string;
  pot_type: string;
  texture: string;
  texture_zh: string;
  hero_hand: string;
  correct_action: string;
  correct_sizing: string | null;
  frequency: number;
  explanation_zh: string;
  explanation_en: string;
}

interface FlopScenario extends BaseScenario {
  flop: string[];
  flop_suits: string[];
}

interface TurnScenario extends BaseScenario {
  flop: string[];
  flop_suits: string[];
  turn: string;
  turn_suit: string;
  flop_action: string;
}

interface RiverScenario extends BaseScenario {
  board: string[];
  board_suits: string[];
  previous_action: string;
}

type Scenario = FlopScenario | TurnScenario | RiverScenario;

function BoardCard({ rank, suit }: { rank: string; suit: string }) {
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

const FLOP_ACTIONS = [
  { key: "bet_33", label: "Bet 33%", labelZh: "下注 33%" },
  { key: "bet_50", label: "Bet 50%", labelZh: "下注 50%" },
  { key: "bet_75", label: "Bet 75%", labelZh: "下注 75%" },
  { key: "check", label: "Check", labelZh: "過牌" },
];

const TURN_ACTIONS = [
  { key: "bet_33", label: "Bet 33%", labelZh: "下注 33%" },
  { key: "bet_50", label: "Bet 50%", labelZh: "下注 50%" },
  { key: "bet_66", label: "Bet 66%", labelZh: "下注 66%" },
  { key: "bet_75", label: "Bet 75%", labelZh: "下注 75%" },
  { key: "check", label: "Check", labelZh: "過牌" },
];

const RIVER_ACTIONS = [
  { key: "bet_25", label: "Bet 25%", labelZh: "下注 25%" },
  { key: "bet_50", label: "Bet 50%", labelZh: "下注 50%" },
  { key: "bet_75", label: "Bet 75%", labelZh: "下注 75%" },
  { key: "bet_100", label: "Bet 100%", labelZh: "下注 100%" },
  { key: "bet_150", label: "Overbet 150%", labelZh: "超池 150%" },
  { key: "check", label: "Check", labelZh: "過牌" },
  { key: "raise", label: "Raise", labelZh: "加注" },
];

function getActionsForStreet(street: Street) {
  switch (street) {
    case "flop":
      return FLOP_ACTIONS;
    case "turn":
      return TURN_ACTIONS;
    case "river":
      return RIVER_ACTIONS;
  }
}

function getStreetTitle(street: Street): string {
  switch (street) {
    case "flop":
      return "Flop C-Bet";
    case "turn":
      return "Turn Barrel";
    case "river":
      return "River Decision";
  }
}

export default function PostflopDrillPage() {
  const t = useTranslations();
  const [street, setStreet] = useState<Street>("flop");
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [result, setResult] = useState<{
    correct: boolean;
    explanation: string;
    correctAction: string;
    correctSizing: string | null;
    frequency: number;
  } | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [textureFilter, setTextureFilter] = useState<string | null>(null);
  const [textures, setTextures] = useState<Record<string, string>>({});

  // Load available textures for current street
  useEffect(() => {
    const endpoint =
      street === "flop"
        ? "cbet"
        : street === "turn"
        ? "turn"
        : "river";
    fetch(`${API_URL}/api/postflop/${endpoint}/textures`)
      .then((res) => res.json())
      .then((data) => setTextures(data.textures || {}))
      .catch(console.error);
  }, [street]);

  const loadScenario = useCallback(async () => {
    setLoading(true);
    setSelectedAction(null);
    setResult(null);

    try {
      const endpoint =
        street === "flop"
          ? "cbet"
          : street === "turn"
          ? "turn"
          : "river";
      const params = new URLSearchParams();
      if (textureFilter) params.set("texture", textureFilter);

      const res = await fetch(`${API_URL}/api/postflop/${endpoint}/random?${params}`);
      const data = await res.json();
      setScenario(data.scenario);
    } catch (err) {
      console.error("Failed to load scenario:", err);
    } finally {
      setLoading(false);
    }
  }, [street, textureFilter]);

  useEffect(() => {
    loadScenario();
  }, [loadScenario]);

  const handleStreetChange = (newStreet: Street) => {
    setStreet(newStreet);
    setTextureFilter(null);
    setScore({ correct: 0, total: 0 });
  };

  const handleAction = async (action: string) => {
    if (selectedAction || !scenario) return;

    setSelectedAction(action);

    try {
      const endpoint =
        street === "flop"
          ? "cbet"
          : street === "turn"
          ? "turn"
          : "river";
      const res = await fetch(`${API_URL}/api/postflop/${endpoint}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario_id: scenario.id,
          user_action: action,
          street: street,
        }),
      });
      const data = await res.json();

      setResult({
        correct: data.correct,
        explanation: data.explanation_zh,
        correctAction: data.correct_action,
        correctSizing: data.correct_sizing,
        frequency: data.frequency,
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

  const renderBoard = () => {
    if (!scenario) return null;

    if (street === "river") {
      const riverScenario = scenario as RiverScenario;
      return (
        <div className="mb-6">
          <div className="text-sm text-muted-foreground mb-2 text-center">Board</div>
          <div className="flex gap-2 justify-center bg-green-800/30 py-4 px-6 rounded-lg flex-wrap">
            {riverScenario.board.map((rank, i) => (
              <BoardCard key={i} rank={rank} suit={riverScenario.board_suits[i]} />
            ))}
          </div>
        </div>
      );
    }

    if (street === "turn") {
      const turnScenario = scenario as TurnScenario;
      return (
        <div className="mb-6">
          <div className="text-sm text-muted-foreground mb-2 text-center">Board</div>
          <div className="flex gap-2 justify-center bg-green-800/30 py-4 px-6 rounded-lg">
            {turnScenario.flop.map((rank, i) => (
              <BoardCard key={i} rank={rank} suit={turnScenario.flop_suits[i]} />
            ))}
            <div className="w-2" />
            <BoardCard rank={turnScenario.turn} suit={turnScenario.turn_suit} />
          </div>
        </div>
      );
    }

    // Flop
    const flopScenario = scenario as FlopScenario;
    return (
      <div className="mb-6">
        <div className="text-sm text-muted-foreground mb-2 text-center">Flop</div>
        <div className="flex gap-2 justify-center bg-green-800/30 py-4 px-6 rounded-lg">
          {flopScenario.flop.map((rank, i) => (
            <BoardCard key={i} rank={rank} suit={flopScenario.flop_suits[i]} />
          ))}
        </div>
      </div>
    );
  };

  const renderPreviousAction = () => {
    if (street === "turn") {
      const turnScenario = scenario as TurnScenario;
      return (
        <div className="text-sm text-muted-foreground mb-2 text-center">
          Flop Action: {turnScenario.flop_action}
        </div>
      );
    }
    if (street === "river") {
      const riverScenario = scenario as RiverScenario;
      return (
        <div className="text-sm text-muted-foreground mb-2 text-center">
          {riverScenario.previous_action}
        </div>
      );
    }
    return null;
  };

  const getCorrectActionDisplay = () => {
    if (!result) return "";
    if (result.correctAction === "check") return "Check";
    if (result.correctAction === "raise") return `Raise ${result.correctSizing}%`;
    return `Bet ${result.correctSizing}%`;
  };

  const isExactCorrect = (optionKey: string) => {
    if (!result) return false;
    if (result.correctAction === "check") return optionKey === "check";
    if (result.correctAction === "raise") return optionKey === "raise";
    return optionKey === `bet_${result.correctSizing}`;
  };

  if (loading && !scenario) {
    return (
      <div className="container max-w-2xl py-8">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const actionOptions = getActionsForStreet(street);

  return (
    <div className="container max-w-2xl py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("postflop.title")}</h1>
        <p className="text-muted-foreground">{t("postflop.description")}</p>
      </div>

      {/* Street Tabs */}
      <Tabs value={street} onValueChange={(v) => handleStreetChange(v as Street)} className="mb-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="flop">Flop C-Bet</TabsTrigger>
          <TabsTrigger value="turn">Turn Barrel</TabsTrigger>
          <TabsTrigger value="river">River Decision</TabsTrigger>
        </TabsList>
      </Tabs>

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
            <CardTitle className="text-lg mt-2">{getStreetTitle(street)}</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Preflop Action */}
            <div className="text-sm text-muted-foreground mb-2 text-center">
              {scenario.preflop}
            </div>

            {/* Previous Action (for turn/river) */}
            {renderPreviousAction()}

            {/* Board Display */}
            {renderBoard()}

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
            <div className={cn(
              "grid gap-3",
              actionOptions.length <= 4 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"
            )}>
              {actionOptions.map((option) => {
                const isSelected = selectedAction === option.key;
                const showResult = selectedAction !== null;
                const isCorrect = isExactCorrect(option.key);

                return (
                  <Button
                    key={option.key}
                    variant={
                      showResult
                        ? isCorrect
                          ? "default"
                          : isSelected
                          ? "destructive"
                          : "outline"
                        : "outline"
                    }
                    className={cn(
                      "h-auto py-3",
                      showResult && isCorrect && "bg-green-600 hover:bg-green-600",
                      showResult && isSelected && !isCorrect && "bg-red-600"
                    )}
                    onClick={() => handleAction(option.key)}
                    disabled={showResult}
                  >
                    <span className="text-sm font-medium">{option.labelZh}</span>
                    {showResult && isCorrect && <CheckCircle2 className="h-4 w-4 ml-2" />}
                    {showResult && isSelected && !isCorrect && (
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
                    {t("drill.result.incorrect")} - {getCorrectActionDisplay()} ({result.frequency}%)
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
          <CardTitle className="text-base">{t("postflop.tipsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          {street === "flop" && (
            <>
              <p>{t("postflop.cbet.tip1")}</p>
              <p>{t("postflop.cbet.tip2")}</p>
              <p>{t("postflop.cbet.tip3")}</p>
            </>
          )}
          {street === "turn" && (
            <>
              <p>轉牌持續下注需要考慮翻牌動作帶來的範圍變化</p>
              <p>「好」的轉牌通常是高張或完成你的聽牌</p>
              <p>控池過牌有時候比強行 barrel 更好</p>
            </>
          )}
          {street === "river" && (
            <>
              <p>河牌是最後的決策點，沒有後續改進機會</p>
              <p>考慮對手的範圍：什麼牌會跟注？什麼牌會棄牌？</p>
              <p>Blocker 效應在河牌 bluff 決策中非常重要</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
