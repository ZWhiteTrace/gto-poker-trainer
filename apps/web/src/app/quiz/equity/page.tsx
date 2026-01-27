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
import { RefreshCw, CheckCircle2, XCircle, Trophy } from "lucide-react";

// Equity matchup data (subset for MVP)
const EQUITY_DATA = {
  overpair_vs_underpair: {
    description: "Overpair vs Underpair",
    descriptionZh: "高對子 vs 低對子",
    difficulty: "easy",
    examples: [
      { hand1: "AA", hand2: "KK", equity1: 82, equity2: 18 },
      { hand1: "AA", hand2: "QQ", equity1: 82, equity2: 18 },
      { hand1: "KK", hand2: "QQ", equity1: 82, equity2: 18 },
      { hand1: "KK", hand2: "JJ", equity1: 82, equity2: 18 },
      { hand1: "QQ", hand2: "JJ", equity1: 82, equity2: 18 },
      { hand1: "JJ", hand2: "TT", equity1: 82, equity2: 18 },
      { hand1: "TT", hand2: "99", equity1: 82, equity2: 18 },
    ],
  },
  pair_vs_overcards: {
    description: "Pair vs Two Overcards",
    descriptionZh: "對子 vs 兩高張 (經典翻硬幣)",
    difficulty: "medium",
    examples: [
      { hand1: "QQ", hand2: "AKs", equity1: 54, equity2: 46 },
      { hand1: "QQ", hand2: "AKo", equity1: 57, equity2: 43 },
      { hand1: "JJ", hand2: "AKs", equity1: 54, equity2: 46 },
      { hand1: "JJ", hand2: "AKo", equity1: 57, equity2: 43 },
      { hand1: "TT", hand2: "AKs", equity1: 54, equity2: 46 },
      { hand1: "99", hand2: "AKs", equity1: 54, equity2: 46 },
      { hand1: "88", hand2: "AKs", equity1: 54, equity2: 46 },
      { hand1: "77", hand2: "AKs", equity1: 53, equity2: 47 },
      { hand1: "22", hand2: "AKs", equity1: 50, equity2: 50 },
    ],
  },
  pair_vs_one_overcard: {
    description: "Pair vs One Overcard",
    descriptionZh: "對子 vs 一高張一低張",
    difficulty: "medium",
    examples: [
      { hand1: "QQ", hand2: "AJs", equity1: 67, equity2: 33 },
      { hand1: "JJ", hand2: "ATs", equity1: 68, equity2: 32 },
      { hand1: "TT", hand2: "AJs", equity1: 67, equity2: 33 },
      { hand1: "99", hand2: "ATs", equity1: 67, equity2: 33 },
      { hand1: "88", hand2: "A9s", equity1: 68, equity2: 32 },
    ],
  },
  dominated_hands: {
    description: "Domination",
    descriptionZh: "壓制手牌",
    difficulty: "easy",
    examples: [
      { hand1: "AKs", hand2: "AQs", equity1: 70, equity2: 30 },
      { hand1: "AKo", hand2: "AQo", equity1: 74, equity2: 26 },
      { hand1: "AKs", hand2: "AJs", equity1: 70, equity2: 30 },
      { hand1: "AQs", hand2: "AJs", equity1: 70, equity2: 30 },
      { hand1: "KQs", hand2: "KJs", equity1: 70, equity2: 30 },
      { hand1: "AKs", hand2: "KQs", equity1: 70, equity2: 30 },
    ],
  },
  high_card_vs_high_card: {
    description: "High Card Battles",
    descriptionZh: "高牌對決",
    difficulty: "hard",
    examples: [
      { hand1: "AKs", hand2: "QJs", equity1: 63, equity2: 37 },
      { hand1: "AKo", hand2: "QJo", equity1: 65, equity2: 35 },
      { hand1: "AQs", hand2: "KJs", equity1: 62, equity2: 38 },
      { hand1: "AJs", hand2: "KTs", equity1: 61, equity2: 39 },
      { hand1: "KQs", hand2: "JTs", equity1: 62, equity2: 38 },
    ],
  },
};

type Category = keyof typeof EQUITY_DATA;

interface Question {
  hand1: string;
  hand2: string;
  equity1: number;
  equity2: number;
  category: Category;
}

interface Choice {
  equity1: number;
  equity2: number;
  isCorrect: boolean;
}

function generateChoices(correct: Question): Choice[] {
  const choices: Choice[] = [
    { equity1: correct.equity1, equity2: correct.equity2, isCorrect: true },
  ];

  // Generate 3 wrong answers with variance
  const variances = [-10, -5, 5, 10];
  const usedEquities = new Set([correct.equity1]);

  while (choices.length < 4) {
    const variance = variances[Math.floor(Math.random() * variances.length)];
    let newEquity1 = correct.equity1 + variance;
    newEquity1 = Math.max(20, Math.min(80, newEquity1)); // Clamp to reasonable range

    if (!usedEquities.has(newEquity1)) {
      usedEquities.add(newEquity1);
      choices.push({
        equity1: newEquity1,
        equity2: 100 - newEquity1,
        isCorrect: false,
      });
    }
  }

  // Shuffle choices
  return choices.sort(() => Math.random() - 0.5);
}

function getRandomQuestion(category?: Category): Question {
  const categories = category
    ? [category]
    : (Object.keys(EQUITY_DATA) as Category[]);
  const randomCategory =
    categories[Math.floor(Math.random() * categories.length)];
  const examples = EQUITY_DATA[randomCategory].examples;
  const example = examples[Math.floor(Math.random() * examples.length)];

  return {
    ...example,
    category: randomCategory,
  };
}

// Hand display component
function HandDisplay({ hand, label }: { hand: string; label: string }) {
  const getSuitColor = (suit: string) => {
    if (suit === "s") return "text-blue-400";
    if (suit === "o") return "text-orange-400";
    return "text-white";
  };

  const hasSuit = hand.endsWith("s") || hand.endsWith("o");
  const ranks = hasSuit ? hand.slice(0, -1) : hand;
  const suit = hasSuit ? hand.slice(-1) : "";

  return (
    <div className="text-center">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="text-4xl font-bold">
        {ranks}
        {suit && <span className={getSuitColor(suit)}>{suit}</span>}
      </div>
    </div>
  );
}

export default function EquityQuizPage() {
  const t = useTranslations();
  const [question, setQuestion] = useState<Question | null>(null);
  const [choices, setChoices] = useState<Choice[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [category, setCategory] = useState<Category | undefined>(undefined);

  const generateNewQuestion = useCallback(() => {
    const newQuestion = getRandomQuestion(category);
    setQuestion(newQuestion);
    setChoices(generateChoices(newQuestion));
    setSelectedIndex(null);
  }, [category]);

  useEffect(() => {
    generateNewQuestion();
  }, [generateNewQuestion]);

  const handleChoice = (index: number) => {
    if (selectedIndex !== null) return; // Already answered

    setSelectedIndex(index);
    const isCorrect = choices[index].isCorrect;
    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));
  };

  const accuracy =
    score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  if (!question) {
    return (
      <div className="container max-w-2xl py-8">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const categoryData = EQUITY_DATA[question.category];

  return (
    <div className="container max-w-2xl py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("quiz.equity.title")}</h1>
        <p className="text-muted-foreground">{t("quiz.equity.description")}</p>
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
          value={category || "all"}
          onChange={(e) => {
            const val = e.target.value;
            setCategory(val === "all" ? undefined : (val as Category));
            setScore({ correct: 0, total: 0 });
          }}
        >
          <option value="all">{t("quiz.allCategories")}</option>
          {Object.entries(EQUITY_DATA).map(([key, data]) => (
            <option key={key} value={key}>
              {data.descriptionZh}
            </option>
          ))}
        </select>
      </div>

      {/* Question Card */}
      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardDescription>
            <Badge
              variant={
                categoryData.difficulty === "easy"
                  ? "default"
                  : categoryData.difficulty === "medium"
                  ? "secondary"
                  : "destructive"
              }
            >
              {categoryData.descriptionZh}
            </Badge>
          </CardDescription>
          <CardTitle className="text-lg">{t("quiz.equity.question")}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Hands Display */}
          <div className="flex items-center justify-center gap-8 py-6 bg-muted/30 rounded-lg mb-6">
            <HandDisplay hand={question.hand1} label="Hand 1" />
            <div className="text-2xl font-bold text-muted-foreground">vs</div>
            <HandDisplay hand={question.hand2} label="Hand 2" />
          </div>

          {/* Choices */}
          <div className="grid grid-cols-2 gap-3">
            {choices.map((choice, index) => {
              const isSelected = selectedIndex === index;
              const showResult = selectedIndex !== null;
              const isCorrect = choice.isCorrect;

              return (
                <Button
                  key={index}
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
                    "h-auto py-4 flex flex-col gap-1",
                    showResult && isCorrect && "bg-green-600 hover:bg-green-600",
                    showResult && isSelected && !isCorrect && "bg-red-600"
                  )}
                  onClick={() => handleChoice(index)}
                  disabled={showResult}
                >
                  <span className="text-lg font-bold">
                    {choice.equity1}% vs {choice.equity2}%
                  </span>
                  {showResult && isCorrect && (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  {showResult && isSelected && !isCorrect && (
                    <XCircle className="h-4 w-4" />
                  )}
                </Button>
              );
            })}
          </div>

          {/* Result */}
          {selectedIndex !== null && (
            <div className="mt-6 text-center">
              {choices[selectedIndex].isCorrect ? (
                <p className="text-green-500 font-medium">
                  {t("drill.result.correct")}
                </p>
              ) : (
                <p className="text-red-500 font-medium">
                  {t("drill.result.incorrect")} - {t("quiz.correctAnswer")}:{" "}
                  {question.equity1}% vs {question.equity2}%
                </p>
              )}
              <Button onClick={generateNewQuestion} className="mt-4">
                {t("drill.nextHand")}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tips */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("quiz.tips.title")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>{t("quiz.tips.overpair")}</p>
          <p>{t("quiz.tips.coinflip")}</p>
          <p>{t("quiz.tips.domination")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
