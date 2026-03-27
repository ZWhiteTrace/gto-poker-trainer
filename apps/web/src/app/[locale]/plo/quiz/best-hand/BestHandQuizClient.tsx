"use client";

import { useCallback, useState } from "react";
import { useLocale } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  generateBestHandQuestion,
  type BestHandScenario,
  type PLO4QuizQuestion,
} from "@/lib/plo4/quizGenerator";
import type { Card as PokerCard } from "@/lib/plo4/types";
import { cn } from "@/lib/utils";
import { CheckCircle2, HelpCircle, RefreshCw, XCircle } from "lucide-react";

const SUIT_SYMBOLS: Record<string, string> = { s: "♠", h: "♥", d: "♦", c: "♣" };
const SUIT_COLORS: Record<string, string> = {
  s: "text-gray-300",
  h: "text-red-500",
  d: "text-blue-400",
  c: "text-green-500",
};

type Copy = {
  title: string;
  subtitle: string;
  yourHand: string;
  board: string;
  question: string;
  correct: string;
  incorrect: string;
  bestHand: string;
  youUsed: string;
  fromBoard: string;
  next: string;
  score: string;
  streak: string;
  best: string;
  rule: string;
};

const COPY: Record<string, Copy> = {
  en: {
    title: "PLO4 Best Hand Quiz",
    subtitle: "What is your best hand? Must use exactly 2 hole cards + 3 board cards.",
    yourHand: "Your Hand",
    board: "Board",
    question: "What is your best hand?",
    correct: "Correct!",
    incorrect: "Incorrect",
    bestHand: "Best hand",
    youUsed: "Hole cards used",
    fromBoard: "Board cards used",
    next: "Next Question",
    score: "Score",
    streak: "Streak",
    best: "Best",
    rule: "Remember: In PLO you must use exactly 2 of your 4 hole cards.",
  },
  "zh-TW": {
    title: "PLO4 最佳牌型測驗",
    subtitle: "你的最佳牌型是什麼？必須使用剛好 2 張手牌 + 3 張公牌。",
    yourHand: "你的手牌",
    board: "公牌",
    question: "你的最佳牌型是什麼？",
    correct: "正確！",
    incorrect: "錯誤",
    bestHand: "最佳牌型",
    youUsed: "使用的手牌",
    fromBoard: "使用的公牌",
    next: "下一題",
    score: "得分",
    streak: "連續",
    best: "最佳",
    rule: "記住：PLO 必須使用剛好 2 張手牌。",
  },
};

type BestHandQuestion = Omit<PLO4QuizQuestion, "type" | "scenario"> & {
  type: "best-hand";
  scenario: BestHandScenario;
};

function CardDisplay({ card, highlighted }: { card: PokerCard; highlighted?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-lg border px-2 py-1 font-mono text-lg font-bold",
        highlighted
          ? "border-yellow-500 bg-yellow-500/20 ring-2 ring-yellow-500/50"
          : "border-gray-600 bg-gray-800",
        SUIT_COLORS[card.suit]
      )}
    >
      {card.rank}
      {SUIT_SYMBOLS[card.suit]}
    </span>
  );
}

function CardRow({
  cards,
  label,
  highlightCards,
}: {
  cards: PokerCard[];
  label: string;
  highlightCards?: Set<string>;
}) {
  return (
    <div className="space-y-1">
      <div className="text-muted-foreground text-xs font-medium uppercase tracking-wide">{label}</div>
      <div className="flex gap-1.5">
        {cards.map((card, index) => (
          <CardDisplay
            key={`${card.rank}${card.suit}-${index}`}
            card={card}
            highlighted={highlightCards?.has(`${card.rank}${card.suit}`)}
          />
        ))}
      </div>
    </div>
  );
}

export function BestHandQuizClient({ initialQuestion }: { initialQuestion: BestHandQuestion }) {
  const locale = useLocale();
  const copy = COPY[locale] ?? COPY["zh-TW"];
  const [question, setQuestion] = useState<BestHandQuestion>(initialQuestion);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0, streak: 0, bestStreak: 0 });

  const isAnswered = selectedId !== null;
  const isCorrect = selectedId === question.correctOptionId;

  const handleSelect = useCallback(
    (optionId: string) => {
      if (isAnswered) return;

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
    [isAnswered, question.correctOptionId]
  );

  const handleNext = useCallback(() => {
    setQuestion(generateBestHandQuestion() as BestHandQuestion);
    setSelectedId(null);
  }, []);

  const { correctResult } = question.scenario;
  const highlightHole = isAnswered
    ? new Set(correctResult.holeCardsUsed.map((card) => `${card.rank}${card.suit}`))
    : undefined;
  const highlightBoard = isAnswered
    ? new Set(correctResult.boardCardsUsed.map((card) => `${card.rank}${card.suit}`))
    : undefined;

  return (
    <div className="container max-w-2xl py-8">
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
          {score.total > 0 && (
            <span className="text-muted-foreground ml-1">
              ({Math.round((score.correct / score.total) * 100)}%)
            </span>
          )}
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
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{copy.question}</CardTitle>
            <Badge variant="outline" className="text-xs">
              {question.difficulty}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3 rounded-lg bg-gray-800/50 p-4">
            <CardRow
              cards={[...question.scenario.holeCards]}
              label={copy.yourHand}
              highlightCards={highlightHole}
            />
            <CardRow
              cards={question.scenario.board}
              label={copy.board}
              highlightCards={highlightBoard}
            />
          </div>

          <div className="text-muted-foreground flex items-center gap-2 text-xs">
            <HelpCircle className="h-3 w-3 shrink-0" />
            {copy.rule}
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
                  className={cn("h-auto min-h-[3rem] whitespace-normal py-2 text-sm", extraClasses)}
                  onClick={() => handleSelect(option.id)}
                  disabled={isAnswered}
                >
                  <span>{locale === "en" ? option.text : option.textZh}</span>
                  {isAnswered && isCorrectOption && (
                    <CheckCircle2 className="ml-1 h-4 w-4 text-green-500" />
                  )}
                  {isAnswered && isSelected && !isCorrectOption && (
                    <XCircle className="ml-1 h-4 w-4 text-red-500" />
                  )}
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
              <div className="space-y-1 text-xs">
                <div>
                  <span className="font-medium">{copy.bestHand}:</span> {correctResult.description}
                </div>
                <div>
                  <span className="font-medium">{copy.youUsed}:</span>{" "}
                  {correctResult.holeCardsUsed
                    .map((card) => `${card.rank}${SUIT_SYMBOLS[card.suit]}`)
                    .join(", ")}
                </div>
                <div>
                  <span className="font-medium">{copy.fromBoard}:</span>{" "}
                  {correctResult.boardCardsUsed
                    .map((card) => `${card.rank}${SUIT_SYMBOLS[card.suit]}`)
                    .join(", ")}
                </div>
              </div>
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
