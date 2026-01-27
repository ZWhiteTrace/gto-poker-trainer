"use client";

import { useState, useEffect, useCallback, useRef } from "react";
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
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Clock,
  CheckCircle2,
  XCircle,
  Trophy,
  Play,
  ArrowLeft,
  ArrowRight,
  Flag,
  RefreshCw,
} from "lucide-react";
import { useAuthStore } from "@/stores/authStore";
import { createClient } from "@/lib/supabase/client";

// Question types for the exam
type QuestionType = "logic" | "equity" | "position" | "push_fold";

interface ExamQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options: { key: string; text: string }[];
  correctAnswer: string;
  explanation: string;
}

// Sample questions from different categories
const EXAM_QUESTIONS: ExamQuestion[] = [
  // Logic Questions
  {
    id: "l1",
    type: "logic",
    question: "為什麼 BTN 的開牌範圍比 UTG 寬？",
    options: [
      { key: "a", text: "BTN 後面只有兩個位置要行動，被 3bet 的機率較低" },
      { key: "b", text: "BTN 可以看到更多牌" },
      { key: "c", text: "BTN 的籌碼更多" },
      { key: "d", text: "BTN 是最後一個行動" },
    ],
    correctAnswer: "a",
    explanation: "位置越靠後，後面要行動的人越少，被加注的機率越低。",
  },
  {
    id: "l2",
    type: "logic",
    question: "什麼是 Minimum Defense Frequency (MDF)？",
    options: [
      { key: "a", text: "面對下注時需要繼續的最低頻率，防止對手有利可圖地詐唬" },
      { key: "b", text: "最少的防守手牌數量" },
      { key: "c", text: "防守盲注的頻率" },
      { key: "d", text: "棄牌的頻率" },
    ],
    correctAnswer: "a",
    explanation: "MDF = 1 - (Bet / (Pot + Bet))。面對底池大小的下注，MDF = 50%。",
  },
  {
    id: "l3",
    type: "logic",
    question: "為什麼在乾燥 A 高牌面適合使用小注高頻 C-bet？",
    options: [
      { key: "a", text: "因為你有範圍優勢，小注即可達成目標" },
      { key: "b", text: "因為對手會棄牌" },
      { key: "c", text: "因為籌碼不夠" },
      { key: "d", text: "因為想要詐唬" },
    ],
    correctAnswer: "a",
    explanation: "乾燥 A 高牌面對開牌者非常有利，小注可以有效施壓。",
  },
  // Equity Questions
  {
    id: "e1",
    type: "equity",
    question: "AA vs KK 全押時，AA 的勝率大約是多少？",
    options: [
      { key: "a", text: "65%" },
      { key: "b", text: "72%" },
      { key: "c", text: "82%" },
      { key: "d", text: "90%" },
    ],
    correctAnswer: "c",
    explanation: "高對子 vs 低對子約 82% vs 18%，這是經典的 cooler 場景。",
  },
  {
    id: "e2",
    type: "equity",
    question: "AKs vs QQ 全押時，大約是多少比例？",
    options: [
      { key: "a", text: "45% vs 55%" },
      { key: "b", text: "50% vs 50%" },
      { key: "c", text: "55% vs 45%" },
      { key: "d", text: "40% vs 60%" },
    ],
    correctAnswer: "a",
    explanation: "AK vs 對子是經典翻硬幣，對子略佔優勢約 55%。",
  },
  {
    id: "e3",
    type: "equity",
    question: "同花聽牌在翻牌時大約有多少 outs？",
    options: [
      { key: "a", text: "4 outs" },
      { key: "b", text: "8 outs" },
      { key: "c", text: "9 outs" },
      { key: "d", text: "12 outs" },
    ],
    correctAnswer: "c",
    explanation: "同花聽牌 = 13張同花 - 4張已見 = 9 outs。",
  },
  // Position Questions
  {
    id: "p1",
    type: "position",
    question: "在 6-max 中，哪個位置的 RFI 範圍最寬？",
    options: [
      { key: "a", text: "UTG" },
      { key: "b", text: "HJ" },
      { key: "c", text: "BTN" },
      { key: "d", text: "SB" },
    ],
    correctAnswer: "c",
    explanation: "BTN 位置最好，只需要通過 SB 和 BB，所以範圍最寬。",
  },
  {
    id: "p2",
    type: "position",
    question: "為什麼 BB 面對 BTN 的開牌應該寬防守？",
    options: [
      { key: "a", text: "因為 BB 已經投入盲注，底池賠率有利" },
      { key: "b", text: "因為 BB 的牌力更強" },
      { key: "c", text: "因為 BTN 一定在詐唬" },
      { key: "d", text: "因為 BB 想看翻牌" },
    ],
    correctAnswer: "a",
    explanation: "BB 已投入 1BB，面對 2.5BB 加注只需再投 1.5BB，底池賠率使寬防守有利可圖。",
  },
  {
    id: "p3",
    type: "position",
    question: "UTG 的標準 RFI 範圍大約是多少？",
    options: [
      { key: "a", text: "約 8-10%" },
      { key: "b", text: "約 12-15%" },
      { key: "c", text: "約 20-25%" },
      { key: "d", text: "約 30-35%" },
    ],
    correctAnswer: "b",
    explanation: "UTG 是最早位置，範圍最緊，通常約 12-15%。",
  },
  // Push/Fold Questions
  {
    id: "pf1",
    type: "push_fold",
    question: "在 10bb 時，BTN 面對前面全部棄牌，A2o 應該？",
    options: [
      { key: "a", text: "棄牌" },
      { key: "b", text: "加注" },
      { key: "c", text: "全下" },
      { key: "d", text: "跛入" },
    ],
    correctAnswer: "c",
    explanation: "10bb BTN 的 push 範圍很寬，A2o 有阻擋效應且能贏翻牌，應該全下。",
  },
  {
    id: "pf2",
    type: "push_fold",
    question: "BB 面對 SB 在 8bb 有效籌碼時全下，87s 應該？",
    options: [
      { key: "a", text: "棄牌 - 勝率不夠" },
      { key: "b", text: "跟注 - 底池賠率有利且有 playability" },
      { key: "c", text: "取決於對手" },
      { key: "d", text: "加注" },
    ],
    correctAnswer: "b",
    explanation: "BB vs SB 全下，底池賠率約 2:1，87s 有足夠 equity 跟注。",
  },
  {
    id: "pf3",
    type: "push_fold",
    question: "5bb 時，SB 面對前面全部棄牌，什麼範圍應該全下？",
    options: [
      { key: "a", text: "只有超強牌 (TT+/AQ+)" },
      { key: "b", text: "約 40% 手牌" },
      { key: "c", text: "約 60-70% 手牌" },
      { key: "d", text: "任何兩張牌" },
    ],
    correctAnswer: "c",
    explanation: "5bb 很短，SB 對 BB 有位置優勢，應該用很寬的範圍（約 60-70%）全下。",
  },
  // More Logic
  {
    id: "l4",
    type: "logic",
    question: "為什麼在泡沫期應該收緊範圍？",
    options: [
      { key: "a", text: "因為出局的代價大於加倍籌碼的收益 (ICM 壓力)" },
      { key: "b", text: "因為對手會更激進" },
      { key: "c", text: "因為牌會變差" },
      { key: "d", text: "因為想要生存" },
    ],
    correctAnswer: "a",
    explanation: "ICM 的核心是籌碼價值非線性，泡沫期出局意味著失去所有已累積的獎金期望值。",
  },
  {
    id: "l5",
    type: "logic",
    question: "為什麼 GTO 需要在河牌有一定的詐唬頻率？",
    options: [
      { key: "a", text: "為了讓對手的 bluff-catch 手牌變成零 EV" },
      { key: "b", text: "因為詐唬很刺激" },
      { key: "c", text: "因為有時候沒有好牌" },
      { key: "d", text: "為了贏更多" },
    ],
    correctAnswer: "a",
    explanation: "GTO 要求足夠的詐唬頻率使對手無法有利可圖地過度跟注或過度棄牌。",
  },
];

const EXAM_CONFIG = {
  totalQuestions: 15,
  timeLimit: 15 * 60, // 15 minutes in seconds
};

type ExamState = "intro" | "active" | "review";

interface ExamResult {
  questionId: string;
  selectedAnswer: string | null;
  isCorrect: boolean;
}

export default function MockExamPage() {
  const t = useTranslations();
  const { user } = useAuthStore();
  const [examState, setExamState] = useState<ExamState>("intro");
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<Map<string, ExamResult>>(new Map());
  const [timeLeft, setTimeLeft] = useState(EXAM_CONFIG.timeLimit);
  const [isSaving, setIsSaving] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Save exam results to Supabase
  const saveExamResults = async (finalScore: number, totalQuestions: number, timeTaken: number) => {
    if (!user) return;

    setIsSaving(true);
    try {
      const supabase = createClient();
      const wrongAnswers = Array.from(results.entries())
        .filter(([_, r]) => !r.isCorrect)
        .map(([id, r]) => ({
          questionId: id,
          userAnswer: r.selectedAnswer,
        }));

      await supabase.from("mock_exam_history").insert({
        user_id: user.id,
        score: finalScore,
        total: totalQuestions,
        time_taken: timeTaken,
        wrong_answers: wrongAnswers,
      });
    } catch (error) {
      console.error("Failed to save exam results:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Shuffle and select questions
  const initializeExam = useCallback(() => {
    const shuffled = [...EXAM_QUESTIONS].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, EXAM_CONFIG.totalQuestions);
    setQuestions(selected);
    setCurrentIndex(0);
    setResults(new Map());
    setTimeLeft(EXAM_CONFIG.timeLimit);
  }, []);

  // Start the exam
  const startExam = () => {
    initializeExam();
    setExamState("active");
  };

  // Timer effect
  useEffect(() => {
    if (examState === "active" && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setExamState("review");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [examState, timeLeft]);

  // Handle answer selection
  const selectAnswer = (questionId: string, answer: string) => {
    const question = questions.find((q) => q.id === questionId);
    if (!question) return;

    setResults((prev) => {
      const newResults = new Map(prev);
      newResults.set(questionId, {
        questionId,
        selectedAnswer: answer,
        isCorrect: answer === question.correctAnswer,
      });
      return newResults;
    });
  };

  // Navigate questions
  const goToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentIndex(index);
    }
  };

  // Submit exam
  const submitExam = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Calculate and save results
    const finalScore = Array.from(results.values()).filter((r) => r.isCorrect).length;
    const timeTaken = EXAM_CONFIG.timeLimit - timeLeft;
    saveExamResults(finalScore, questions.length, timeTaken);

    setExamState("review");
  };

  // Reset exam
  const resetExam = () => {
    setExamState("intro");
    setQuestions([]);
    setResults(new Map());
    setTimeLeft(EXAM_CONFIG.timeLimit);
  };

  // Calculate score
  const score = Array.from(results.values()).filter((r) => r.isCorrect).length;
  const answered = results.size;
  const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const currentQuestion = questions[currentIndex];
  const currentResult = currentQuestion ? results.get(currentQuestion.id) : null;

  if (examState === "intro") {
    return (
      <div className="container max-w-2xl py-8">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-3xl">{t("exam.title") || "GTO Mock Exam"}</CardTitle>
            <CardDescription>
              {t("exam.description") || "Test your GTO knowledge with a comprehensive timed exam"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-3xl font-bold">{EXAM_CONFIG.totalQuestions}</div>
                <div className="text-sm text-muted-foreground">{t("exam.questions") || "Questions"}</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-3xl font-bold">{Math.floor(EXAM_CONFIG.timeLimit / 60)}</div>
                <div className="text-sm text-muted-foreground">{t("exam.minutes") || "Minutes"}</div>
              </div>
            </div>

            <div className="text-sm text-muted-foreground space-y-2">
              <p>{t("exam.instruction1") || "This exam covers:"}</p>
              <ul className="list-disc list-inside space-y-1">
                <li>{t("exam.topic1") || "GTO Logic and Theory"}</li>
                <li>{t("exam.topic2") || "Hand Equity"}</li>
                <li>{t("exam.topic3") || "Position Strategy"}</li>
                <li>{t("exam.topic4") || "Push/Fold Decisions"}</li>
              </ul>
            </div>

            <Button onClick={startExam} className="w-full h-12 text-lg">
              <Play className="mr-2 h-5 w-5" />
              {t("exam.startExam") || "Start Exam"}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (examState === "review") {
    return (
      <div className="container max-w-3xl py-8">
        <Card className="mb-6">
          <CardHeader className="text-center">
            <Trophy className={cn("h-16 w-16 mx-auto mb-4", percentage >= 70 ? "text-yellow-500" : "text-muted-foreground")} />
            <CardTitle className="text-3xl">
              {percentage >= 80
                ? t("exam.resultExcellent") || "Excellent!"
                : percentage >= 70
                ? t("exam.resultGood") || "Good Job!"
                : t("exam.resultKeepPracticing") || "Keep Practicing!"}
            </CardTitle>
            <CardDescription>
              {t("exam.yourScore") || "Your Score"}: {score}/{questions.length} ({percentage}%)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center mb-6">
              <div className="p-4 bg-green-500/10 rounded-lg">
                <div className="text-2xl font-bold text-green-500">{score}</div>
                <div className="text-sm text-muted-foreground">{t("common.correct")}</div>
              </div>
              <div className="p-4 bg-red-500/10 rounded-lg">
                <div className="text-2xl font-bold text-red-500">{questions.length - score}</div>
                <div className="text-sm text-muted-foreground">{t("exam.incorrect") || "Incorrect"}</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{formatTime(EXAM_CONFIG.timeLimit - timeLeft)}</div>
                <div className="text-sm text-muted-foreground">{t("exam.timeTaken") || "Time Taken"}</div>
              </div>
            </div>

            <Button onClick={resetExam} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("exam.tryAgain") || "Try Again"}
            </Button>
          </CardContent>
        </Card>

        {/* Review Questions */}
        <h2 className="text-xl font-bold mb-4">{t("exam.reviewAnswers") || "Review Your Answers"}</h2>
        <div className="space-y-4">
          {questions.map((q, idx) => {
            const result = results.get(q.id);
            return (
              <Card key={q.id} className={cn(result?.isCorrect ? "border-green-500/50" : "border-red-500/50")}>
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Q{idx + 1}</Badge>
                    {result?.isCorrect ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <CardTitle className="text-base">{q.question}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <p className="mb-2">
                    <span className="text-muted-foreground">{t("exam.yourAnswer") || "Your answer"}:</span>{" "}
                    {result?.selectedAnswer
                      ? q.options.find((o) => o.key === result.selectedAnswer)?.text
                      : t("exam.noAnswer") || "No answer"}
                  </p>
                  {!result?.isCorrect && (
                    <p className="text-green-600">
                      <span className="text-muted-foreground">{t("quiz.correctAnswer")}:</span>{" "}
                      {q.options.find((o) => o.key === q.correctAnswer)?.text}
                    </p>
                  )}
                  <p className="mt-2 text-muted-foreground">{q.explanation}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Active exam
  return (
    <div className="container max-w-3xl py-4">
      {/* Header */}
      <div className="sticky top-14 bg-background/95 backdrop-blur z-10 pb-4 mb-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-lg px-3 py-1">
              <Clock className={cn("h-4 w-4 mr-1", timeLeft < 60 && "text-red-500 animate-pulse")} />
              {formatTime(timeLeft)}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {answered}/{questions.length} {t("exam.answered") || "answered"}
            </span>
            <Button variant="destructive" size="sm" onClick={submitExam}>
              <Flag className="h-4 w-4 mr-1" />
              {t("exam.submit") || "Submit"}
            </Button>
          </div>
        </div>

        {/* Progress */}
        <Progress value={(answered / questions.length) * 100} className="h-2" />

        {/* Question Navigation */}
        <div className="flex flex-wrap gap-1 mt-3">
          {questions.map((q, idx) => {
            const result = results.get(q.id);
            return (
              <Button
                key={q.id}
                variant={currentIndex === idx ? "default" : result ? "secondary" : "outline"}
                size="sm"
                className="w-8 h-8 p-0"
                onClick={() => goToQuestion(idx)}
              >
                {idx + 1}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Question */}
      {currentQuestion && (
        <Card className="mb-4">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary">Q{currentIndex + 1}</Badge>
              <Badge variant="outline">{currentQuestion.type}</Badge>
            </div>
            <CardTitle className="text-lg">{currentQuestion.question}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {currentQuestion.options.map((option) => (
                <Button
                  key={option.key}
                  variant={currentResult?.selectedAnswer === option.key ? "default" : "outline"}
                  className="w-full h-auto py-4 px-4 text-left justify-start whitespace-normal"
                  onClick={() => selectAnswer(currentQuestion.id, option.key)}
                >
                  <span className="font-bold mr-2">{option.key.toUpperCase()}.</span>
                  <span className="flex-1">{option.text}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => goToQuestion(currentIndex - 1)}
          disabled={currentIndex === 0}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          {t("common.previous")}
        </Button>
        <Button
          variant="outline"
          onClick={() => goToQuestion(currentIndex + 1)}
          disabled={currentIndex === questions.length - 1}
        >
          {t("common.next")}
          <ArrowRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
