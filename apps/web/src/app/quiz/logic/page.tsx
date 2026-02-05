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
import { RefreshCw, CheckCircle2, XCircle, Trophy, Lightbulb } from "lucide-react";
import { useQuizProgressStore } from "@/stores/quizProgressStore";
import { useAuthStore } from "@/stores/authStore";

// GTO Logic Questions
const LOGIC_QUESTIONS = [
  // Range Construction
  {
    id: "range_1",
    category: "range_construction",
    categoryZh: "範圍構建",
    difficulty: "easy",
    question: "為什麼 BTN 的開牌範圍比 UTG 寬？",
    questionEn: "Why is BTN's opening range wider than UTG's?",
    options: [
      { key: "a", text: "BTN 後面只有兩個位置要行動，被 3bet 的機率較低", textEn: "Only 2 positions left to act, lower 3bet probability" },
      { key: "b", text: "BTN 可以看到更多牌", textEn: "BTN can see more cards" },
      { key: "c", text: "BTN 的籌碼更多", textEn: "BTN has more chips" },
      { key: "d", text: "BTN 是最後一個行動", textEn: "BTN acts last" },
    ],
    correctAnswer: "a",
    explanation: "位置越靠後，後面要行動的人越少，被加注的機率越低。BTN 只需要通過 SB 和 BB 兩個位置，而 UTG 後面有 5 個位置可能加注。",
    explanationEn: "The later the position, fewer players left to act means lower chance of facing a raise. BTN only needs to get through SB and BB, while UTG has 5 positions that could raise.",
  },
  {
    id: "range_2",
    category: "range_construction",
    categoryZh: "範圍構建",
    difficulty: "medium",
    question: "為什麼 GTO 策略中某些手牌需要以混合頻率遊戲？",
    questionEn: "Why do some hands need to be played with mixed frequencies in GTO?",
    options: [
      { key: "a", text: "讓對手更難讀懂你的範圍", textEn: "To make your range harder to read" },
      { key: "b", text: "因為這些手牌處於 EV 接近的邊界", textEn: "Because these hands are at the EV indifference boundary" },
      { key: "c", text: "為了節省籌碼", textEn: "To save chips" },
      { key: "d", text: "因為隨機數學上更有利", textEn: "Because random is mathematically better" },
    ],
    correctAnswer: "b",
    explanation: "處於邊界的手牌（如某些 Axs），加注和跟注的 EV 非常接近。為了保持範圍平衡且不可被剝削，這些手牌需要以一定頻率分配到不同行動。",
    explanationEn: "Borderline hands (like certain Axs) have very similar EV for raising and calling. To maintain balanced, unexploitable ranges, these hands must be distributed across actions at certain frequencies.",
  },
  // Position Advantage
  {
    id: "position_1",
    category: "position_advantage",
    categoryZh: "位置優勢",
    difficulty: "easy",
    question: "為什麼有位置比沒位置更有優勢？",
    questionEn: "Why is being in position better than out of position?",
    options: [
      { key: "a", text: "可以看到對手先行動再做決定", textEn: "Can see opponent's action before deciding" },
      { key: "b", text: "可以下更大的注", textEn: "Can bet larger" },
      { key: "c", text: "對手會害怕", textEn: "Opponent will be scared" },
      { key: "d", text: "牌會更好", textEn: "Cards will be better" },
    ],
    correctAnswer: "a",
    explanation: "有位置意味著你在每條街都最後行動，可以根據對手的行動獲得額外信息後再做決定。這讓你可以更精準地控制底池大小、更有效地榨取價值或詐唬。",
    explanationEn: "Being in position means acting last on every street, gaining information from opponent's actions before deciding. This allows better pot control, more efficient value extraction, and effective bluffing.",
  },
  {
    id: "position_2",
    category: "position_advantage",
    categoryZh: "位置優勢",
    difficulty: "medium",
    question: "為什麼 BB vs BTN 的防守範圍這麼寬？",
    questionEn: "Why is BB's defense range so wide vs BTN?",
    options: [
      { key: "a", text: "因為 BB 已經投入盲注，需要更寬地防守來保護盲注", textEn: "BB already has chips invested and needs to defend wider" },
      { key: "b", text: "因為 BB 的牌力更強", textEn: "Because BB has stronger cards" },
      { key: "c", text: "因為 BTN 一定在詐唬", textEn: "Because BTN is always bluffing" },
      { key: "d", text: "因為 BB 想看翻牌", textEn: "Because BB wants to see the flop" },
    ],
    correctAnswer: "a",
    explanation: "BB 已經投入 1BB，面對 2.5BB 加注只需要再投入 1.5BB。底池賠率使得 BB 可以有利可圖地跟注更多邊緣手牌，否則會被 BTN 過度剝削。",
    explanationEn: "BB already invested 1BB, facing 2.5BB raise only needs to add 1.5BB. Pot odds make it profitable for BB to call with more marginal hands, otherwise BTN would over-exploit.",
  },
  // Bet Sizing
  {
    id: "sizing_1",
    category: "bet_sizing",
    categoryZh: "下注尺寸",
    difficulty: "medium",
    question: "為什麼在乾燥 A 高牌面適合使用小注高頻 C-bet？",
    questionEn: "Why use small-sizing high-frequency c-bet on dry ace-high boards?",
    options: [
      { key: "a", text: "因為你有範圍優勢，小注即可達成目標", textEn: "You have range advantage, small bet achieves goals" },
      { key: "b", text: "因為對手會棄牌", textEn: "Because opponent will fold" },
      { key: "c", text: "因為籌碼不夠", textEn: "Because not enough chips" },
      { key: "d", text: "因為想要詐唬", textEn: "To bluff" },
    ],
    correctAnswer: "a",
    explanation: "乾燥 A 高牌面（如 A72r）對開牌者非常有利：你範圍中的 Ax 比例高於 BB。BB 的很多手牌在這種牌面很難繼續。小注可以有效施壓，同時保護你的弱牌範圍。",
    explanationEn: "Dry ace-high boards (like A72r) heavily favor the raiser: higher Ax proportion than BB. Many BB hands struggle to continue. Small bets apply pressure while protecting weaker hands in your range.",
  },
  {
    id: "sizing_2",
    category: "bet_sizing",
    categoryZh: "下注尺寸",
    difficulty: "hard",
    question: "為什麼翻牌超池下注（overbets）通常出現在極化範圍中？",
    questionEn: "Why do flop overbets typically appear with polarized ranges?",
    options: [
      { key: "a", text: "因為極化範圍的價值牌需要更大保護，詐唬牌需要更大 fold equity", textEn: "Value hands need protection, bluffs need more fold equity" },
      { key: "b", text: "因為想嚇唬對手", textEn: "To scare the opponent" },
      { key: "c", text: "因為底池大", textEn: "Because the pot is big" },
      { key: "d", text: "因為牌很強", textEn: "Because cards are strong" },
    ],
    correctAnswer: "a",
    explanation: "極化策略意味著你的範圍只有超強牌和詐唬。大注讓堅果牌獲得最大價值，同時給詐唬足夠的 fold equity。中等牌力的手牌會選擇較小的尺寸。",
    explanationEn: "Polarized strategy means your range only contains nuts and bluffs. Large bets maximize value from nut hands while giving bluffs sufficient fold equity. Medium strength hands prefer smaller sizes.",
  },
  // Frequency Balance
  {
    id: "frequency_1",
    category: "frequency_balance",
    categoryZh: "頻率平衡",
    difficulty: "medium",
    question: "為什麼 GTO 需要在河牌有一定的詐唬頻率？",
    questionEn: "Why does GTO require bluffing frequency on the river?",
    options: [
      { key: "a", text: "為了讓對手的 bluff-catch 手牌變成零 EV", textEn: "To make opponent's bluff-catchers zero EV" },
      { key: "b", text: "因為詐唬很刺激", textEn: "Because bluffing is exciting" },
      { key: "c", text: "因為有時候沒有好牌", textEn: "Because sometimes you don't have good cards" },
      { key: "d", text: "為了贏更多", textEn: "To win more" },
    ],
    correctAnswer: "a",
    explanation: "如果你河牌從不詐唬，對手可以輕鬆棄掉所有非堅果牌。GTO 要求足夠的詐唬頻率使對手的 bluff-catch 變成零 EV，讓他們無法有利可圖地過度跟注或過度棄牌。",
    explanationEn: "If you never bluff the river, opponents can easily fold all non-nut hands. GTO requires sufficient bluff frequency to make opponent's bluff-catches zero EV, preventing profitable over-calling or over-folding.",
  },
  {
    id: "frequency_2",
    category: "frequency_balance",
    categoryZh: "頻率平衡",
    difficulty: "hard",
    question: "什麼是 Minimum Defense Frequency (MDF)？",
    questionEn: "What is Minimum Defense Frequency (MDF)?",
    options: [
      { key: "a", text: "面對下注時需要繼續的最低頻率，防止對手有利可圖地詐唬", textEn: "Minimum continue frequency vs bet to prevent profitable bluffing" },
      { key: "b", text: "最少的防守手牌數量", textEn: "Minimum number of defending hands" },
      { key: "c", text: "防守盲注的頻率", textEn: "Frequency of defending blinds" },
      { key: "d", text: "棄牌的頻率", textEn: "Folding frequency" },
    ],
    correctAnswer: "a",
    explanation: "MDF = 1 - (Bet / (Pot + Bet))。例如面對底池大小的下注，MDF = 50%。如果你棄牌頻率高於 50%，對手可以有利可圖地用任何兩張牌詐唬。",
    explanationEn: "MDF = 1 - (Bet / (Pot + Bet)). For example, vs pot-sized bet, MDF = 50%. If you fold more than 50%, opponent can profitably bluff any two cards.",
  },
  // ICM Concepts
  {
    id: "icm_1",
    category: "icm",
    categoryZh: "ICM 概念",
    difficulty: "medium",
    question: "為什麼在錦標賽泡沫期應該收緊範圍？",
    questionEn: "Why should you tighten ranges on the tournament bubble?",
    options: [
      { key: "a", text: "因為出局的代價（失去所有籌碼價值）大於加倍籌碼的收益", textEn: "Cost of busting (losing all chip value) > benefit of doubling" },
      { key: "b", text: "因為對手會更激進", textEn: "Because opponents are more aggressive" },
      { key: "c", text: "因為牌會變差", textEn: "Because cards get worse" },
      { key: "d", text: "因為想要生存", textEn: "To survive" },
    ],
    correctAnswer: "a",
    explanation: "ICM 的核心是籌碼價值非線性。在泡沫期，即將進錢圈，出局意味著失去所有已累積的獎金期望值。而贏得籌碼的邊際價值遞減，使得風險回報比不利於冒險。",
    explanationEn: "ICM's core is non-linear chip value. On the bubble, about to cash, busting means losing all accumulated prize expectation. Diminishing marginal value of winning chips makes risk-reward unfavorable.",
  },
];

type Category = "range_construction" | "position_advantage" | "bet_sizing" | "frequency_balance" | "icm";

interface Question {
  id: string;
  category: Category;
  categoryZh: string;
  difficulty: string;
  question: string;
  questionEn: string;
  options: { key: string; text: string; textEn: string }[];
  correctAnswer: string;
  explanation: string;
  explanationEn: string;
}

export default function LogicQuizPage() {
  const t = useTranslations();
  const [question, setQuestion] = useState<Question | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [category, setCategory] = useState<Category | "all">("all");
  const [usedQuestions, setUsedQuestions] = useState<Set<string>>(new Set());

  const { quizStats, recordQuizResult } = useQuizProgressStore();
  const { user } = useAuthStore();
  const cumulativeStats = quizStats.logic;

  const getRandomQuestion = useCallback(() => {
    let available = LOGIC_QUESTIONS.filter((q) => !usedQuestions.has(q.id));

    if (category !== "all") {
      available = available.filter((q) => q.category === category);
    }

    // Reset if we've used all questions
    if (available.length === 0) {
      setUsedQuestions(new Set());
      available = category === "all"
        ? LOGIC_QUESTIONS
        : LOGIC_QUESTIONS.filter((q) => q.category === category);
    }

    const randomQ = available[Math.floor(Math.random() * available.length)];
    setUsedQuestions((prev) => new Set([...prev, randomQ.id]));
    return randomQ as Question;
  }, [category, usedQuestions]);

  const loadQuestion = useCallback(() => {
    const q = getRandomQuestion();
    setQuestion(q);
    setSelectedAnswer(null);
  }, [getRandomQuestion]);

  useEffect(() => {
    loadQuestion();
  }, []);

  // Reset when category changes
  useEffect(() => {
    setUsedQuestions(new Set());
    setScore({ correct: 0, total: 0 });
    const q = getRandomQuestion();
    setQuestion(q);
    setSelectedAnswer(null);
  }, [category]);

  const handleAnswer = async (key: string) => {
    if (selectedAnswer) return;

    setSelectedAnswer(key);
    const isCorrect = key === question?.correctAnswer;
    setScore((prev) => ({
      correct: prev.correct + (isCorrect ? 1 : 0),
      total: prev.total + 1,
    }));

    // Record to progress store
    if (question) {
      await recordQuizResult("logic", question.category, isCorrect, user?.id);
    }
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

  return (
    <div className="container max-w-2xl py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("quiz.logic.title")}</h1>
        <p className="text-muted-foreground">{t("quiz.logic.description")}</p>
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
          onChange={(e) => setCategory(e.target.value as Category | "all")}
        >
          <option value="all">{t("quiz.allCategories")}</option>
          <option value="range_construction">範圍構建</option>
          <option value="position_advantage">位置優勢</option>
          <option value="bet_sizing">下注尺寸</option>
          <option value="frequency_balance">頻率平衡</option>
          <option value="icm">ICM 概念</option>
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
              {question.categoryZh}
            </Badge>
          </CardDescription>
          <CardTitle className="text-lg flex items-start gap-2">
            <Lightbulb className="h-5 w-5 mt-0.5 flex-shrink-0 text-yellow-500" />
            {question.question}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Options */}
          <div className="space-y-3">
            {question.options.map((option) => {
              const isSelected = selectedAnswer === option.key;
              const showResult = selectedAnswer !== null;
              const isCorrect = option.key === question.correctAnswer;

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
                    "w-full h-auto py-4 px-4 text-left justify-start",
                    showResult && isCorrect && "bg-green-600 hover:bg-green-600",
                    showResult && isSelected && !isCorrect && "bg-red-600"
                  )}
                  onClick={() => handleAnswer(option.key)}
                  disabled={showResult}
                >
                  <span className="font-bold mr-2">{option.key.toUpperCase()}.</span>
                  <span className="flex-1">{option.text}</span>
                  {showResult && isCorrect && <CheckCircle2 className="h-5 w-5 ml-2 flex-shrink-0" />}
                  {showResult && isSelected && !isCorrect && (
                    <XCircle className="h-5 w-5 ml-2 flex-shrink-0" />
                  )}
                </Button>
              );
            })}
          </div>

          {/* Result */}
          {selectedAnswer && (
            <div className="mt-6">
              {selectedAnswer === question.correctAnswer ? (
                <p className="text-green-500 font-medium text-center">{t("drill.result.correct")}</p>
              ) : (
                <p className="text-red-500 font-medium text-center">{t("drill.result.incorrect")}</p>
              )}
              <div className="mt-3 p-4 bg-muted/30 rounded-lg">
                <p className="text-sm">{question.explanation}</p>
              </div>
              <div className="text-center mt-4">
                <Button onClick={loadQuestion}>{t("drill.nextHand")}</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress Indicator */}
      <div className="text-center text-sm text-muted-foreground">
        {t("quiz.logic.progress", { used: usedQuestions.size, total: LOGIC_QUESTIONS.length })}
      </div>
    </div>
  );
}
