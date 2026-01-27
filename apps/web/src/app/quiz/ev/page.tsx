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
import { RefreshCw, CheckCircle2, XCircle, Trophy, Coins } from "lucide-react";

// Question types
type QuestionType = "pot_odds" | "call_decision" | "ev_calculation" | "implied_odds";

interface BaseQuestion {
  type: QuestionType;
  difficulty: "easy" | "medium" | "hard";
}

interface PotOddsQuestion extends BaseQuestion {
  type: "pot_odds";
  potSize: number;
  betSize: number;
  correctAnswer: number; // Required equity percentage
}

interface CallDecisionQuestion extends BaseQuestion {
  type: "call_decision";
  potSize: number;
  betSize: number;
  yourEquity: number;
  correctAnswer: "call" | "fold";
}

interface EVCalculationQuestion extends BaseQuestion {
  type: "ev_calculation";
  potSize: number;
  betSize: number;
  yourEquity: number;
  correctAnswer: number; // EV in BB
}

interface ImpliedOddsQuestion extends BaseQuestion {
  type: "implied_odds";
  potSize: number;
  betSize: number;
  yourEquity: number;
  stacksRemaining: number;
  correctAnswer: "call" | "fold";
}

type Question = PotOddsQuestion | CallDecisionQuestion | EVCalculationQuestion | ImpliedOddsQuestion;

const QUESTION_CONFIGS = {
  pot_odds: {
    name: "Pot Odds",
    nameZh: "底池賠率",
    description: "Calculate required equity to call",
    descriptionZh: "計算跟注所需的最低勝率",
  },
  call_decision: {
    name: "Call or Fold",
    nameZh: "跟注或棄牌",
    description: "Decide based on pot odds vs equity",
    descriptionZh: "根據底池賠率和勝率做決定",
  },
  ev_calculation: {
    name: "EV Calculation",
    nameZh: "EV 計算",
    description: "Calculate expected value of calling",
    descriptionZh: "計算跟注的期望值",
  },
  implied_odds: {
    name: "Implied Odds",
    nameZh: "隱含賠率",
    description: "Consider future betting potential",
    descriptionZh: "考慮未來下注潛力",
  },
};

// Generate random pot odds question
function generatePotOddsQuestion(): PotOddsQuestion {
  const scenarios = [
    { potSize: 100, betSize: 50 },  // 25% equity needed
    { potSize: 100, betSize: 100 }, // 33% equity needed
    { potSize: 100, betSize: 75 },  // 30% equity needed
    { potSize: 200, betSize: 100 }, // 25% equity needed
    { potSize: 150, betSize: 50 },  // 20% equity needed
    { potSize: 80, betSize: 40 },   // 25% equity needed
    { potSize: 120, betSize: 60 },  // 25% equity needed
    { potSize: 100, betSize: 33 },  // 20% equity needed
    { potSize: 200, betSize: 200 }, // 33% equity needed
    { potSize: 50, betSize: 50 },   // 33% equity needed
  ];

  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  // Required equity = bet / (pot + bet + bet) = bet / (pot + 2*bet)
  const requiredEquity = Math.round((scenario.betSize / (scenario.potSize + 2 * scenario.betSize)) * 100);

  return {
    type: "pot_odds",
    difficulty: requiredEquity <= 25 ? "easy" : requiredEquity <= 30 ? "medium" : "hard",
    potSize: scenario.potSize,
    betSize: scenario.betSize,
    correctAnswer: requiredEquity,
  };
}

// Generate call decision question
function generateCallDecisionQuestion(): CallDecisionQuestion {
  const potSize = [50, 80, 100, 120, 150, 200][Math.floor(Math.random() * 6)];
  const betSize = [25, 33, 50, 75, 100][Math.floor(Math.random() * 5)];
  const requiredEquity = (betSize / (potSize + 2 * betSize)) * 100;

  // Generate equity that's either clearly above or below required
  const margin = Math.random() > 0.5 ? 5 + Math.random() * 10 : -(5 + Math.random() * 10);
  const yourEquity = Math.round(Math.max(10, Math.min(60, requiredEquity + margin)));

  return {
    type: "call_decision",
    difficulty: Math.abs(yourEquity - requiredEquity) > 8 ? "easy" : "medium",
    potSize,
    betSize,
    yourEquity,
    correctAnswer: yourEquity >= requiredEquity ? "call" : "fold",
  };
}

// Generate EV calculation question
function generateEVCalculationQuestion(): EVCalculationQuestion {
  const potSize = [100, 150, 200][Math.floor(Math.random() * 3)];
  const betSize = [50, 75, 100][Math.floor(Math.random() * 3)];
  const yourEquity = [20, 25, 30, 35, 40, 45][Math.floor(Math.random() * 6)];

  // EV = (equity * winnings) - ((1-equity) * cost)
  // When calling: win = pot + villain bet, lose = our call
  const winAmount = potSize + betSize;
  const loseAmount = betSize;
  const ev = Math.round((yourEquity / 100) * winAmount - ((100 - yourEquity) / 100) * loseAmount);

  return {
    type: "ev_calculation",
    difficulty: "hard",
    potSize,
    betSize,
    yourEquity,
    correctAnswer: ev,
  };
}

// Generate implied odds question
function generateImpliedOddsQuestion(): ImpliedOddsQuestion {
  const potSize = [60, 80, 100][Math.floor(Math.random() * 3)];
  const betSize = [40, 50, 60][Math.floor(Math.random() * 3)];
  const yourEquity = [15, 18, 20, 22][Math.floor(Math.random() * 4)]; // Drawing hands
  const stacksRemaining = [200, 300, 400, 500][Math.floor(Math.random() * 4)];

  // Direct pot odds required
  const directRequired = (betSize / (potSize + 2 * betSize)) * 100;

  // With implied odds, if we can win extra from remaining stacks
  // Simplified: if stacks > 3x pot and equity > 15%, usually profitable
  const hasImpliedOdds = stacksRemaining > 2.5 * (potSize + betSize) && yourEquity >= 18;

  return {
    type: "implied_odds",
    difficulty: "hard",
    potSize,
    betSize,
    yourEquity,
    stacksRemaining,
    correctAnswer: hasImpliedOdds || yourEquity >= directRequired ? "call" : "fold",
  };
}

function generateQuestion(type?: QuestionType): Question {
  const types: QuestionType[] = type ? [type] : ["pot_odds", "call_decision", "ev_calculation", "implied_odds"];
  const selectedType = types[Math.floor(Math.random() * types.length)];

  switch (selectedType) {
    case "pot_odds":
      return generatePotOddsQuestion();
    case "call_decision":
      return generateCallDecisionQuestion();
    case "ev_calculation":
      return generateEVCalculationQuestion();
    case "implied_odds":
      return generateImpliedOddsQuestion();
  }
}

function generatePotOddsChoices(correct: number): number[] {
  const choices = new Set<number>([correct]);
  const variations = [-8, -5, -3, 3, 5, 8];

  while (choices.size < 4) {
    const variation = variations[Math.floor(Math.random() * variations.length)];
    const newChoice = correct + variation;
    if (newChoice > 5 && newChoice < 60 && !choices.has(newChoice)) {
      choices.add(newChoice);
    }
  }

  return Array.from(choices).sort(() => Math.random() - 0.5);
}

function generateEVChoices(correct: number): number[] {
  const choices = new Set<number>([correct]);
  const variations = [-30, -20, -15, -10, 10, 15, 20, 30];

  while (choices.size < 4) {
    const variation = variations[Math.floor(Math.random() * variations.length)];
    const newChoice = correct + variation;
    if (!choices.has(newChoice)) {
      choices.add(newChoice);
    }
  }

  return Array.from(choices).sort(() => Math.random() - 0.5);
}

// Chip stack visual
function ChipStack({ amount, label }: { amount: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-xs text-muted-foreground mb-1">{label}</div>
      <div className="flex items-center gap-1.5 bg-muted/50 px-3 py-2 rounded-lg">
        <Coins className="h-4 w-4 text-yellow-500" />
        <span className="font-bold text-lg">{amount}</span>
        <span className="text-sm text-muted-foreground">BB</span>
      </div>
    </div>
  );
}

export default function EVQuizPage() {
  const t = useTranslations();
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | number | null>(null);
  const [choices, setChoices] = useState<(string | number)[]>([]);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [category, setCategory] = useState<QuestionType | "all">("all");

  const generateNewQuestion = useCallback(() => {
    const newQuestion = generateQuestion(category === "all" ? undefined : category);
    setQuestion(newQuestion);

    // Generate choices based on question type
    if (newQuestion.type === "pot_odds") {
      setChoices(generatePotOddsChoices(newQuestion.correctAnswer));
    } else if (newQuestion.type === "call_decision" || newQuestion.type === "implied_odds") {
      setChoices(["call", "fold"]);
    } else if (newQuestion.type === "ev_calculation") {
      setChoices(generateEVChoices(newQuestion.correctAnswer));
    }

    setSelectedAnswer(null);
  }, [category]);

  useEffect(() => {
    generateNewQuestion();
  }, [generateNewQuestion]);

  const handleChoice = (answer: string | number) => {
    if (selectedAnswer !== null) return;

    setSelectedAnswer(answer);
    const isCorrect = answer === question?.correctAnswer;
    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));
  };

  const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  if (!question) {
    return (
      <div className="container max-w-2xl py-8">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  const questionConfig = QUESTION_CONFIGS[question.type];

  return (
    <div className="container max-w-2xl py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("quiz.ev.title")}</h1>
        <p className="text-muted-foreground">{t("quiz.ev.description")}</p>
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
          value={category}
          onChange={(e) => {
            setCategory(e.target.value as QuestionType | "all");
            setScore({ correct: 0, total: 0 });
          }}
        >
          <option value="all">{t("quiz.allCategories")}</option>
          {Object.entries(QUESTION_CONFIGS).map(([key, data]) => (
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
                question.difficulty === "easy"
                  ? "default"
                  : question.difficulty === "medium"
                  ? "secondary"
                  : "destructive"
              }
            >
              {questionConfig.nameZh}
            </Badge>
          </CardDescription>
          <CardTitle className="text-lg">
            {question.type === "pot_odds" && t("quiz.ev.questionPotOdds")}
            {question.type === "call_decision" && t("quiz.ev.questionDecision")}
            {question.type === "ev_calculation" && t("quiz.ev.questionEV")}
            {question.type === "implied_odds" && t("quiz.ev.questionImplied")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Scenario Display */}
          <div className="bg-green-900/20 rounded-lg p-4 mb-6">
            <div className="flex justify-center gap-6 mb-4">
              <ChipStack amount={question.potSize} label={t("quiz.ev.pot")} />
              <ChipStack amount={question.betSize} label={t("quiz.ev.villainBet")} />
            </div>

            {(question.type === "call_decision" || question.type === "ev_calculation") && (
              <div className="text-center">
                <span className="text-sm text-muted-foreground">{t("quiz.ev.yourEquity")}: </span>
                <span className="font-bold text-lg text-primary">{question.yourEquity}%</span>
              </div>
            )}

            {question.type === "implied_odds" && (
              <div className="text-center space-y-1">
                <div>
                  <span className="text-sm text-muted-foreground">{t("quiz.ev.yourEquity")}: </span>
                  <span className="font-bold text-primary">{question.yourEquity}%</span>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">{t("quiz.ev.effectiveStack")}: </span>
                  <span className="font-bold">{question.stacksRemaining} BB</span>
                </div>
              </div>
            )}
          </div>

          {/* Choices */}
          <div className={cn(
            "grid gap-3",
            question.type === "call_decision" || question.type === "implied_odds"
              ? "grid-cols-2"
              : "grid-cols-2 sm:grid-cols-4"
          )}>
            {choices.map((choice) => {
              const isSelected = selectedAnswer === choice;
              const showResult = selectedAnswer !== null;
              const isCorrect = choice === question.correctAnswer;

              return (
                <Button
                  key={String(choice)}
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
                    showResult && isSelected && !isCorrect && "bg-red-600",
                    (question.type === "call_decision" || question.type === "implied_odds") && "py-6"
                  )}
                  onClick={() => handleChoice(choice)}
                  disabled={showResult}
                >
                  {typeof choice === "number" ? (
                    <>
                      <span className="text-2xl font-bold">
                        {question.type === "ev_calculation" ? (choice >= 0 ? `+${choice}` : choice) : choice}
                      </span>
                      <span className="text-xs">
                        {question.type === "pot_odds" ? "%" : "BB"}
                      </span>
                    </>
                  ) : (
                    <span className="text-xl font-bold">
                      {choice === "call" ? t("quiz.ev.call") : t("quiz.ev.fold")}
                    </span>
                  )}
                  {showResult && isCorrect && <CheckCircle2 className="h-4 w-4" />}
                  {showResult && isSelected && !isCorrect && <XCircle className="h-4 w-4" />}
                </Button>
              );
            })}
          </div>

          {/* Result */}
          {selectedAnswer !== null && (
            <div className="mt-6 text-center">
              {selectedAnswer === question.correctAnswer ? (
                <p className="text-green-500 font-medium">{t("drill.result.correct")}</p>
              ) : (
                <p className="text-red-500 font-medium">
                  {t("drill.result.incorrect")} - {t("quiz.correctAnswer")}:{" "}
                  {question.type === "pot_odds" && `${question.correctAnswer}%`}
                  {question.type === "call_decision" && (question.correctAnswer === "call" ? t("quiz.ev.call") : t("quiz.ev.fold"))}
                  {question.type === "ev_calculation" && `${question.correctAnswer >= 0 ? "+" : ""}${question.correctAnswer} BB`}
                  {question.type === "implied_odds" && (question.correctAnswer === "call" ? t("quiz.ev.call") : t("quiz.ev.fold"))}
                </p>
              )}

              {/* Explanation */}
              <div className="mt-3 text-sm text-muted-foreground bg-muted/30 p-3 rounded-lg text-left">
                {question.type === "pot_odds" && (
                  <p>
                    {t("quiz.ev.explainPotOdds", {
                      bet: question.betSize,
                      total: question.potSize + 2 * question.betSize,
                      result: question.correctAnswer,
                    })}
                  </p>
                )}
                {question.type === "call_decision" && (
                  <p>
                    {t("quiz.ev.explainDecision", {
                      required: Math.round((question.betSize / (question.potSize + 2 * question.betSize)) * 100),
                      yours: question.yourEquity,
                    })}
                  </p>
                )}
                {question.type === "ev_calculation" && (
                  <p>
                    EV = ({question.yourEquity}% × {question.potSize + question.betSize}) - ({100 - question.yourEquity}% × {question.betSize}) = {question.correctAnswer} BB
                  </p>
                )}
                {question.type === "implied_odds" && (
                  <p>{t("quiz.ev.explainImplied")}</p>
                )}
              </div>

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
          <CardTitle className="text-base">{t("quiz.ev.tipsTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>{t("quiz.ev.tipPotOdds")}</p>
          <p>{t("quiz.ev.tipEV")}</p>
          <p>{t("quiz.ev.tipImplied")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
