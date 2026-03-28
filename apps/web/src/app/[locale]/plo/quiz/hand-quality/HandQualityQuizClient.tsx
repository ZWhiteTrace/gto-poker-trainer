"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  generateHandQualityQuestion,
  type HandQualityScenario,
  type PLO4QuizQuestion,
} from "@/lib/plo4/quizGenerator";
import type { Card as PokerCard } from "@/lib/plo4/types";
import { cn } from "@/lib/utils";
import { CheckCircle2, RefreshCw, Scale, XCircle } from "lucide-react";

const SUIT_SYMBOLS: Record<string, string> = { s: "♠", h: "♥", d: "♦", c: "♣" };
const SUIT_COLORS: Record<string, string> = {
  s: "text-gray-300",
  h: "text-red-500",
  d: "text-blue-400",
  c: "text-green-500",
};

const COPY = {
  en: {
    title: "PLO4 Hand Quality Quiz",
    subtitle:
      "Compare starting-hand structure only. This is a quality heuristic, not a solver-backed preflop chart.",
    prompt: "Which starting hand is structurally stronger?",
    handA: "Hand A",
    handB: "Hand B",
    correct: "Correct!",
    incorrect: "Incorrect",
    next: "Next Question",
    score: "Score",
    streak: "Streak",
    best: "Best",
    note: "Ignore positions and stack depth. Focus on suitedness, connectivity, pairs, and danglers.",
  },
  "zh-TW": {
    title: "PLO4 起手牌品質測驗",
    subtitle: "這裡只比較起手牌結構，不是假裝自己已經有 solver preflop chart。",
    prompt: "哪一手起手牌在結構上更強？",
    handA: "手牌 A",
    handB: "手牌 B",
    correct: "正確！",
    incorrect: "錯誤",
    next: "下一題",
    score: "得分",
    streak: "連續",
    best: "最佳",
    note: "先忽略位置與籌碼深度，只看花色、連接性、對子與孤牌結構。",
  },
} as const;

type HandQualityQuestion = Omit<PLO4QuizQuestion, "type" | "scenario"> & {
  type: "hand-quality";
  scenario: HandQualityScenario;
};

function CardStrip({ cards }: { cards: PokerCard[] }) {
  return (
    <div className="flex gap-1.5">
      {cards.map((card, index) => (
        <span
          key={`${card.rank}${card.suit}-${index}`}
          className={cn(
            "inline-flex items-center justify-center rounded-lg border border-gray-600 bg-gray-800 px-2 py-1 font-mono text-lg font-bold",
            SUIT_COLORS[card.suit]
          )}
        >
          {card.rank}
          {SUIT_SYMBOLS[card.suit]}
        </span>
      ))}
    </div>
  );
}

export function HandQualityQuizClient() {
  const locale = useLocale();
  const copy = locale === "en" ? COPY.en : COPY["zh-TW"];
  const [question, setQuestion] = useState<HandQualityQuestion | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0, streak: 0, bestStreak: 0 });

  useEffect(() => {
    setQuestion(generateHandQualityQuestion() as HandQualityQuestion);
  }, []);

  const isAnswered = selectedId !== null;
  const isCorrect = question ? selectedId === question.correctOptionId : false;

  const handleSelect = useCallback(
    (optionId: string) => {
      if (isAnswered || !question) return;

      setSelectedId(optionId);
      setScore((previous) => {
        const correct = previous.correct + (optionId === question.correctOptionId ? 1 : 0);
        const streak = optionId === question.correctOptionId ? previous.streak + 1 : 0;

        return {
          correct,
          total: previous.total + 1,
          streak,
          bestStreak: Math.max(previous.bestStreak, streak),
        };
      });
    },
    [isAnswered, question]
  );

  const handleNext = useCallback(() => {
    setQuestion(generateHandQualityQuestion() as HandQualityQuestion);
    setSelectedId(null);
  }, []);

  if (!question) {
    return (
      <div className="container max-w-3xl py-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold">{copy.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{copy.subtitle}</p>
        </div>
        <Card className="border-gray-700 bg-gray-900">
          <CardHeader className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scale className="text-primary h-5 w-5" />
                <CardTitle className="text-lg">{copy.prompt}</CardTitle>
              </div>
              <Badge variant="outline">...</Badge>
            </div>
            <CardDescription>{copy.note}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="bg-muted h-28 animate-pulse rounded-lg" />
              <div className="bg-muted h-28 animate-pulse rounded-lg" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-muted h-12 animate-pulse rounded" />
              <div className="bg-muted h-12 animate-pulse rounded" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-3xl py-8">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold">{copy.title}</h1>
        <p className="text-muted-foreground mt-1 text-sm">{copy.subtitle}</p>
      </div>

      <div className="mb-4 flex items-center justify-center gap-6 text-sm">
        <div>
          <span className="text-muted-foreground">{copy.score}:</span>{" "}
          <span className="font-bold">
            {score.correct}/{score.total}
          </span>
        </div>
        <div>
          <span className="text-muted-foreground">{copy.streak}:</span>{" "}
          <span className="font-bold">{score.streak}</span>
        </div>
        <div>
          <span className="text-muted-foreground">{copy.best}:</span>{" "}
          <span className="font-bold">{score.bestStreak}</span>
        </div>
      </div>

      <Card className="border-gray-700 bg-gray-900">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Scale className="text-primary h-5 w-5" />
              <CardTitle className="text-lg">{copy.prompt}</CardTitle>
            </div>
            <Badge variant="outline">{question.difficulty}</Badge>
          </div>
          <CardDescription>{copy.note}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-gray-800/50 p-4">
              <div className="mb-2 text-sm font-medium">{copy.handA}</div>
              <CardStrip cards={[...question.scenario.handA]} />
              <div className="text-muted-foreground mt-3 text-xs">
                {locale === "en"
                  ? question.scenario.handACategory.label
                  : question.scenario.handACategory.labelZh}
              </div>
            </div>
            <div className="rounded-lg bg-gray-800/50 p-4">
              <div className="mb-2 text-sm font-medium">{copy.handB}</div>
              <CardStrip cards={[...question.scenario.handB]} />
              <div className="text-muted-foreground mt-3 text-xs">
                {locale === "en"
                  ? question.scenario.handBCategory.label
                  : question.scenario.handBCategory.labelZh}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {question.options.map((option) => {
              const isSelected = selectedId === option.id;
              const isCorrectOption = option.id === question.correctOptionId;
              let extraClasses = "border-gray-600 hover:border-gray-400";

              if (isAnswered) {
                if (isCorrectOption) {
                  extraClasses = "border-green-500 bg-green-500/10 text-green-400";
                } else if (isSelected) {
                  extraClasses = "border-red-500 bg-red-500/10 text-red-400";
                } else {
                  extraClasses = "border-gray-700 opacity-50";
                }
              }

              return (
                <Button
                  key={option.id}
                  variant="outline"
                  className={cn("h-auto min-h-[3rem] py-2 text-sm", extraClasses)}
                  onClick={() => handleSelect(option.id)}
                  disabled={isAnswered}
                >
                  {locale === "en" ? option.text : option.textZh}
                </Button>
              );
            })}
          </div>

          {isAnswered && (
            <div
              className={cn(
                "rounded-lg p-4 text-sm",
                isCorrect ? "bg-green-500/10 text-green-300" : "bg-red-500/10 text-red-300"
              )}
            >
              <div className="mb-2 flex items-center gap-2 font-bold">
                {isCorrect ? (
                  <>
                    <CheckCircle2 className="h-5 w-5" /> {copy.correct}
                  </>
                ) : (
                  <>
                    <XCircle className="h-5 w-5" /> {copy.incorrect}
                  </>
                )}
              </div>
              <p className="text-xs">{locale === "en" ? question.explanation : question.explanationZh}</p>
            </div>
          )}

          {isAnswered && (
            <Button onClick={handleNext} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              {copy.next}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
