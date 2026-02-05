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
import { useQuizProgressStore } from "@/stores/quizProgressStore";
import { useAuthStore } from "@/stores/authStore";

// Card suits and ranks
const SUITS = ["h", "d", "c", "s"] as const;
const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"] as const;

type Suit = (typeof SUITS)[number];
type Rank = (typeof RANKS)[number];

interface CardType {
  rank: Rank;
  suit: Suit;
}

// Draw types with their standard outs
const DRAW_TYPES = {
  flush_draw: {
    name: "Flush Draw",
    nameZh: "同花聽牌",
    outs: 9,
    difficulty: "easy",
    description: "9 remaining cards of same suit",
    descriptionZh: "剩餘 9 張同花色牌",
  },
  oesd: {
    name: "Open-Ended Straight Draw",
    nameZh: "兩頭順子聽牌",
    outs: 8,
    difficulty: "easy",
    description: "8 cards complete the straight",
    descriptionZh: "8 張牌可完成順子",
  },
  gutshot: {
    name: "Gutshot Straight Draw",
    nameZh: "內順子聽牌",
    outs: 4,
    difficulty: "medium",
    description: "4 cards complete the straight",
    descriptionZh: "4 張牌可完成順子",
  },
  flush_gutshot: {
    name: "Flush + Gutshot",
    nameZh: "同花 + 內順",
    outs: 12,
    difficulty: "medium",
    description: "9 flush + 4 gutshot - 1 overlap = 12",
    descriptionZh: "9 同花 + 4 順子 - 1 重疊 = 12",
  },
  flush_oesd: {
    name: "Flush + OESD (Combo Draw)",
    nameZh: "同花 + 兩頭順 (組合聽牌)",
    outs: 15,
    difficulty: "hard",
    description: "9 flush + 8 straight - 2 overlap = 15",
    descriptionZh: "9 同花 + 8 順子 - 2 重疊 = 15",
  },
  overcards: {
    name: "Two Overcards",
    nameZh: "兩張高牌",
    outs: 6,
    difficulty: "easy",
    description: "6 cards to make top pair",
    descriptionZh: "6 張牌可做頂對",
  },
  pair_trips: {
    name: "Pair to Trips",
    nameZh: "對子變三條",
    outs: 2,
    difficulty: "easy",
    description: "2 cards to make trips",
    descriptionZh: "2 張牌可變三條",
  },
  set: {
    name: "Pocket Pair to Set",
    nameZh: "口袋對變暗三條",
    outs: 2,
    difficulty: "easy",
    description: "2 cards to flop a set",
    descriptionZh: "2 張牌可中暗三",
  },
} as const;

type DrawType = keyof typeof DRAW_TYPES;

interface Question {
  heroHand: [CardType, CardType];
  board: CardType[];
  drawType: DrawType;
  outs: number;
}

// Generate a specific draw scenario
function generateScenario(drawType: DrawType): Question {
  const usedCards = new Set<string>();

  const getCard = (rank: Rank, suit: Suit): CardType => {
    usedCards.add(`${rank}${suit}`);
    return { rank, suit };
  };

  const getRandomUnusedCard = (constraints?: { suit?: Suit; notSuit?: Suit; ranks?: Rank[] }): CardType => {
    const availableRanks = constraints?.ranks || [...RANKS];
    const availableSuits = constraints?.suit
      ? [constraints.suit]
      : constraints?.notSuit
      ? SUITS.filter((s) => s !== constraints.notSuit)
      : [...SUITS];

    let attempts = 0;
    while (attempts < 100) {
      const rank = availableRanks[Math.floor(Math.random() * availableRanks.length)];
      const suit = availableSuits[Math.floor(Math.random() * availableSuits.length)];
      const key = `${rank}${suit}`;
      if (!usedCards.has(key)) {
        usedCards.add(key);
        return { rank, suit };
      }
      attempts++;
    }
    throw new Error("Could not find unused card");
  };

  let heroHand: [CardType, CardType];
  let board: CardType[];

  switch (drawType) {
    case "flush_draw": {
      // Hero has two suited cards, board has 2 of same suit
      const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
      // Use non-overlapping rank ranges to prevent duplicate cards
      const highRanks: Rank[] = ["A", "K", "Q", "J", "T", "9", "8"];
      const lowRanks: Rank[] = ["7", "6", "5", "4", "3", "2"];
      heroHand = [
        getCard(highRanks[Math.floor(Math.random() * highRanks.length)], suit),
        getCard(lowRanks[Math.floor(Math.random() * lowRanks.length)], suit),
      ];
      board = [
        getRandomUnusedCard({ suit }),
        getRandomUnusedCard({ suit }),
        getRandomUnusedCard({ notSuit: suit }),
      ];
      break;
    }

    case "oesd": {
      // Open-ended straight draw: e.g., 89 on 67x board
      const startIdx = Math.floor(Math.random() * 7) + 2; // 2-8 (so we have room on both sides)
      heroHand = [
        getCard(RANKS[startIdx], SUITS[Math.floor(Math.random() * 4)]),
        getCard(RANKS[startIdx + 1], SUITS[Math.floor(Math.random() * 4)]),
      ];
      // Exclude the two completing ranks that would make a straight
      const oesdExclude = new Set<Rank>();
      if (startIdx - 1 >= 0) oesdExclude.add(RANKS[startIdx - 1]);
      if (startIdx + 4 < RANKS.length) oesdExclude.add(RANKS[startIdx + 4]);
      const oesdSafeRanks = ([...RANKS] as Rank[]).filter(r => !oesdExclude.has(r));
      board = [
        getCard(RANKS[startIdx + 2], SUITS[Math.floor(Math.random() * 4)]),
        getCard(RANKS[startIdx + 3], SUITS[Math.floor(Math.random() * 4)]),
        getRandomUnusedCard({ ranks: oesdSafeRanks }),
      ];
      break;
    }

    case "gutshot": {
      // Gutshot: e.g., 79 on 68x board (need T)
      const startIdx = Math.floor(Math.random() * 6) + 2;
      heroHand = [
        getCard(RANKS[startIdx], SUITS[Math.floor(Math.random() * 4)]),
        getCard(RANKS[startIdx + 2], SUITS[Math.floor(Math.random() * 4)]),
      ];
      // Exclude: completing rank (+1), and ranks that create extra straight outs (+5, +6)
      const gsExclude = new Set<Rank>();
      gsExclude.add(RANKS[startIdx + 1]);
      if (startIdx + 5 < RANKS.length) gsExclude.add(RANKS[startIdx + 5]);
      if (startIdx + 6 < RANKS.length) gsExclude.add(RANKS[startIdx + 6]);
      const gsSafeRanks = ([...RANKS] as Rank[]).filter(r => !gsExclude.has(r));
      board = [
        getCard(RANKS[startIdx + 3], SUITS[Math.floor(Math.random() * 4)]),
        getCard(RANKS[startIdx + 4], SUITS[Math.floor(Math.random() * 4)]),
        getRandomUnusedCard({ ranks: gsSafeRanks }),
      ];
      break;
    }

    case "flush_gutshot": {
      // Flush draw + gutshot
      const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
      const startIdx = Math.floor(Math.random() * 6) + 2;
      heroHand = [
        getCard(RANKS[startIdx], suit),
        getCard(RANKS[startIdx + 2], suit),
      ];
      // Exclude: completing rank (+1) and ranks creating extra straight outs (+5, +6)
      const fgExclude = new Set<Rank>();
      fgExclude.add(RANKS[startIdx + 1]);
      if (startIdx + 5 < RANKS.length) fgExclude.add(RANKS[startIdx + 5]);
      if (startIdx + 6 < RANKS.length) fgExclude.add(RANKS[startIdx + 6]);
      const fgSafeRanks = ([...RANKS] as Rank[]).filter(r => !fgExclude.has(r));
      board = [
        getCard(RANKS[startIdx + 3], suit),
        getCard(RANKS[startIdx + 4], SUITS.filter((s) => s !== suit)[0]),
        getRandomUnusedCard({ suit, ranks: fgSafeRanks }),
      ];
      break;
    }

    case "flush_oesd": {
      // Flush draw + open-ended straight draw (combo draw)
      const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
      const startIdx = Math.floor(Math.random() * 6) + 2;
      heroHand = [
        getCard(RANKS[startIdx], suit),
        getCard(RANKS[startIdx + 1], suit),
      ];
      // Exclude the two completing ranks that would make a straight
      const foExclude = new Set<Rank>();
      if (startIdx - 1 >= 0) foExclude.add(RANKS[startIdx - 1]);
      if (startIdx + 4 < RANKS.length) foExclude.add(RANKS[startIdx + 4]);
      const foSafeRanks = ([...RANKS] as Rank[]).filter(r => !foExclude.has(r));
      board = [
        getCard(RANKS[startIdx + 2], suit),
        getCard(RANKS[startIdx + 3], SUITS.filter((s) => s !== suit)[0]),
        getRandomUnusedCard({ suit, ranks: foSafeRanks }),
      ];
      break;
    }

    case "overcards": {
      // Two overcards to the board
      heroHand = [
        getCard("A", SUITS[Math.floor(Math.random() * 4)]),
        getCard("K", SUITS[Math.floor(Math.random() * 4)]),
      ];
      const lowRanks: Rank[] = ["9", "8", "7", "6", "5", "4", "3", "2"];
      board = [
        getRandomUnusedCard({ ranks: lowRanks }),
        getRandomUnusedCard({ ranks: lowRanks }),
        getRandomUnusedCard({ ranks: lowRanks }),
      ];
      break;
    }

    case "pair_trips": {
      // Flopped a pair, looking to hit trips
      const pairRank = RANKS[Math.floor(Math.random() * 10) + 2];
      // Kicker must not be the same rank as the pair (would make trips already)
      const kickerRanks = (["A", "K", "Q", "J", "T"] as Rank[]).filter(r => r !== pairRank);
      heroHand = [
        getCard(pairRank, SUITS[0]),
        getCard(kickerRanks[Math.floor(Math.random() * kickerRanks.length)], SUITS[1]),
      ];
      board = [
        getCard(pairRank, SUITS[2]),
        getRandomUnusedCard(),
        getRandomUnusedCard(),
      ];
      break;
    }

    case "set": {
      // Pocket pair looking for set — board must not contain the pair rank
      const pairRank = RANKS[Math.floor(Math.random() * 10) + 2];
      heroHand = [getCard(pairRank, SUITS[0]), getCard(pairRank, SUITS[1])];
      const nonPairRanks = ([...RANKS] as Rank[]).filter(r => r !== pairRank);
      board = [
        getRandomUnusedCard({ ranks: nonPairRanks }),
        getRandomUnusedCard({ ranks: nonPairRanks }),
        getRandomUnusedCard({ ranks: nonPairRanks }),
      ];
      break;
    }

    default:
      throw new Error(`Unknown draw type: ${drawType}`);
  }

  return {
    heroHand,
    board,
    drawType,
    outs: DRAW_TYPES[drawType].outs,
  };
}

function generateChoices(correctOuts: number): number[] {
  const choices = new Set<number>([correctOuts]);

  // Add nearby wrong answers
  const variations = [-3, -2, -1, 1, 2, 3, 4, 5];
  while (choices.size < 4) {
    const variation = variations[Math.floor(Math.random() * variations.length)];
    const newChoice = correctOuts + variation;
    if (newChoice > 0 && newChoice <= 20 && !choices.has(newChoice)) {
      choices.add(newChoice);
    }
  }

  return Array.from(choices).sort(() => Math.random() - 0.5);
}

// Card display component
function PlayingCard({ card, size = "normal" }: { card: CardType; size?: "normal" | "large" }) {
  const suitSymbols: Record<Suit, string> = {
    h: "♥",
    d: "♦",
    c: "♣",
    s: "♠",
  };

  const suitColors: Record<Suit, string> = {
    s: "text-slate-900 dark:text-slate-100",  // 黑桃：黑色
    h: "text-red-600 dark:text-red-400",      // 紅心：紅色
    d: "text-blue-600 dark:text-blue-400",    // 方塊：藍色（四色牌）
    c: "text-green-600 dark:text-green-400",  // 梅花：綠色（四色牌）
  };

  return (
    <div
      className={cn(
        "bg-white dark:bg-gray-100 rounded-lg shadow-md flex flex-col items-center justify-center border-2 border-gray-200",
        size === "large" ? "w-14 h-20 sm:w-16 sm:h-24" : "w-10 h-14 sm:w-12 sm:h-16"
      )}
    >
      <span
        className={cn(
          "font-bold",
          suitColors[card.suit],
          size === "large" ? "text-xl sm:text-2xl" : "text-lg sm:text-xl"
        )}
      >
        {card.rank}
      </span>
      <span
        className={cn(
          suitColors[card.suit],
          size === "large" ? "text-lg sm:text-xl" : "text-base sm:text-lg"
        )}
      >
        {suitSymbols[card.suit]}
      </span>
    </div>
  );
}

export default function OutsQuizPage() {
  const t = useTranslations();
  const [question, setQuestion] = useState<Question | null>(null);
  const [choices, setChoices] = useState<number[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [category, setCategory] = useState<DrawType | "all">("all");

  const { quizStats, recordQuizResult } = useQuizProgressStore();
  const { user } = useAuthStore();
  const cumulativeStats = quizStats.outs;

  const generateNewQuestion = useCallback(() => {
    const drawTypes = Object.keys(DRAW_TYPES) as DrawType[];
    const selectedType =
      category === "all"
        ? drawTypes[Math.floor(Math.random() * drawTypes.length)]
        : category;

    const newQuestion = generateScenario(selectedType);
    setQuestion(newQuestion);
    setChoices(generateChoices(newQuestion.outs));
    setSelectedAnswer(null);
  }, [category]);

  useEffect(() => {
    generateNewQuestion();
  }, [generateNewQuestion]);

  const handleChoice = async (outs: number) => {
    if (selectedAnswer !== null) return;

    setSelectedAnswer(outs);
    const isCorrect = outs === question?.outs;
    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    // Record to progress store
    if (question) {
      await recordQuizResult("outs", question.drawType, isCorrect, user?.id);
    }
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

  const drawInfo = DRAW_TYPES[question.drawType];

  return (
    <div className="container max-w-2xl py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("quiz.outs.title")}</h1>
        <p className="text-muted-foreground">{t("quiz.outs.description")}</p>
      </div>

      {/* Score */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-lg px-3 py-1">
            <Trophy className="h-4 w-4 mr-1" />
            {score.correct}/{score.total}
          </Badge>
          <span className="text-muted-foreground">{accuracy}%</span>
          {cumulativeStats.total > 0 && (
            <span className="text-xs text-muted-foreground">
              ({t("drill.allTime")}: {cumulativeStats.correct}/{cumulativeStats.total})
            </span>
          )}
        </div>
        <select
          className="bg-muted px-3 py-1.5 rounded-md text-sm"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value as DrawType | "all");
            setScore({ correct: 0, total: 0 });
          }}
        >
          <option value="all">{t("quiz.allCategories")}</option>
          {Object.entries(DRAW_TYPES).map(([key, data]) => (
            <option key={key} value={key}>
              {data.nameZh}
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
                drawInfo.difficulty === "easy"
                  ? "default"
                  : drawInfo.difficulty === "medium"
                  ? "secondary"
                  : "destructive"
              }
            >
              {drawInfo.nameZh}
            </Badge>
          </CardDescription>
          <CardTitle className="text-lg">{t("quiz.outs.question")}</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Hero Hand */}
          <div className="mb-6">
            <div className="text-sm text-muted-foreground mb-2">{t("quiz.outs.yourHand")}</div>
            <div className="flex gap-2 justify-center">
              {question.heroHand.map((card, i) => (
                <PlayingCard key={i} card={card} size="large" />
              ))}
            </div>
          </div>

          {/* Board */}
          <div className="mb-6">
            <div className="text-sm text-muted-foreground mb-2">{t("quiz.outs.board")}</div>
            <div className="flex gap-2 justify-center bg-green-800/30 py-4 px-6 rounded-lg">
              {question.board.map((card, i) => (
                <PlayingCard key={i} card={card} />
              ))}
            </div>
          </div>

          {/* Choices */}
          <div className="grid grid-cols-4 gap-3">
            {choices.map((outs) => {
              const isSelected = selectedAnswer === outs;
              const showResult = selectedAnswer !== null;
              const isCorrect = outs === question.outs;

              return (
                <Button
                  key={outs}
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
                  onClick={() => handleChoice(outs)}
                  disabled={showResult}
                >
                  <span className="text-2xl font-bold">{outs}</span>
                  <span className="text-xs">outs</span>
                  {showResult && isCorrect && <CheckCircle2 className="h-4 w-4" />}
                  {showResult && isSelected && !isCorrect && <XCircle className="h-4 w-4" />}
                </Button>
              );
            })}
          </div>

          {/* Result */}
          {selectedAnswer !== null && (
            <div className="mt-6 text-center">
              {selectedAnswer === question.outs ? (
                <p className="text-green-500 font-medium">{t("drill.result.correct")}</p>
              ) : (
                <p className="text-red-500 font-medium">
                  {t("drill.result.incorrect")} - {t("quiz.correctAnswer")}: {question.outs} outs
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-2">{drawInfo.descriptionZh}</p>
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
          <CardTitle className="text-base">{t("quiz.outs.tipsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>{t("quiz.outs.tipFlush")}</p>
          <p>{t("quiz.outs.tipOesd")}</p>
          <p>{t("quiz.outs.tipGutshot")}</p>
          <p>{t("quiz.outs.tipCombo")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
