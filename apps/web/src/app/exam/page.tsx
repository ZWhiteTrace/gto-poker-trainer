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
  BookOpen,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useAuthStore } from "@/stores/authStore";
import { useQuizProgressStore } from "@/stores/quizProgressStore";
import { createClient } from "@/lib/supabase/client";
import {
  getArticleRecommendations,
  analyzeWeakAreas,
  type ArticleRecommendation,
} from "@/lib/quiz/articleRecommendations";
import {
  EXAM_QUESTIONS,
  EXAM_CONFIG,
  type ExamQuestion,
  type QuestionType,
} from "@/lib/exam/questions";

// Question type for categorization
type QuestionCategory = "preflop" | "postflop" | "math" | "exploit";

type ExamState = "intro" | "active" | "review";

interface ExamResult {
  questionId: string;
  selectedAnswer: string | null;
  isCorrect: boolean;
}

export default function MockExamPage() {
  const t = useTranslations();
  const { user } = useAuthStore();
  const {
    recordQuestionAttempt,
    getQuizCompletionStats,
    getMasteredQuestionIds,
    getNeedsReviewQuestionIds,
    getUnansweredQuestionIds,
    setTotalQuestionsInBank,
  } = useQuizProgressStore();
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

  // Shuffle and select questions - prioritize unanswered, then needs-review
  const initializeExam = useCallback(() => {
    const allQuestionIds = EXAM_QUESTIONS.map((q) => q.id);
    const unansweredIds = new Set(getUnansweredQuestionIds(allQuestionIds));
    const needsReviewIds = new Set(getNeedsReviewQuestionIds());
    const masteredIds = new Set(getMasteredQuestionIds());

    // Priority: 1. Unanswered, 2. Needs Review, 3. Mastered (if nothing else)
    const unansweredQuestions = EXAM_QUESTIONS.filter((q) => unansweredIds.has(q.id));
    const needsReviewQuestions = EXAM_QUESTIONS.filter((q) => needsReviewIds.has(q.id) && !unansweredIds.has(q.id));
    const masteredQuestions = EXAM_QUESTIONS.filter((q) => masteredIds.has(q.id));

    let selected: ExamQuestion[] = [];

    // First fill with unanswered questions (shuffled)
    const shuffledUnanswered = [...unansweredQuestions].sort(() => Math.random() - 0.5);
    selected = [...shuffledUnanswered];

    // If not enough, add needs-review questions
    if (selected.length < EXAM_CONFIG.totalQuestions) {
      const shuffledNeedsReview = [...needsReviewQuestions].sort(() => Math.random() - 0.5);
      const remaining = EXAM_CONFIG.totalQuestions - selected.length;
      selected = [...selected, ...shuffledNeedsReview.slice(0, remaining)];
    }

    // If still not enough (all questions mastered), add mastered questions for review
    if (selected.length < EXAM_CONFIG.totalQuestions) {
      const shuffledMastered = [...masteredQuestions].sort(() => Math.random() - 0.5);
      const remaining = EXAM_CONFIG.totalQuestions - selected.length;
      selected = [...selected, ...shuffledMastered.slice(0, remaining)];
    }

    // Final shuffle of selected questions
    selected = selected.sort(() => Math.random() - 0.5);

    setQuestions(selected);
    setCurrentIndex(0);
    setResults(new Map());
    setTimeLeft(EXAM_CONFIG.timeLimit);
  }, [getUnansweredQuestionIds, getNeedsReviewQuestionIds, getMasteredQuestionIds]);

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

    // Record question attempts for progress tracking
    results.forEach((result, questionId) => {
      recordQuestionAttempt(questionId, result.isCorrect);
    });

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

  // Set total questions in bank on mount
  useEffect(() => {
    setTotalQuestionsInBank(EXAM_QUESTIONS.length);
  }, [setTotalQuestionsInBank]);

  const currentQuestion = questions[currentIndex];
  const currentResult = currentQuestion ? results.get(currentQuestion.id) : null;

  if (examState === "intro") {
    const quizStats = getQuizCompletionStats();
    const allQuestionIds = EXAM_QUESTIONS.map((q) => q.id);
    const unansweredCount = getUnansweredQuestionIds(allQuestionIds).length;
    const needsReviewCount = getNeedsReviewQuestionIds().length;

    // Circular progress component
    const CircularProgress = ({ value, size = 120 }: { value: number; size?: number }) => {
      const strokeWidth = 8;
      const radius = (size - strokeWidth) / 2;
      const circumference = radius * 2 * Math.PI;
      const offset = circumference - (value / 100) * circumference;

      return (
        <div className="relative inline-flex items-center justify-center">
          <svg width={size} height={size} className="-rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-muted"
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              className="text-primary transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold">{value}%</span>
            <span className="text-xs text-muted-foreground">{t("exam.completed") || "完成"}</span>
          </div>
        </div>
      );
    };

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
            {/* Circular Progress */}
            <div className="flex justify-center">
              <CircularProgress value={quizStats.completionRate} />
            </div>

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

            {/* Question Status Summary */}
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <TrendingUp className="h-4 w-4" />
                {t("exam.questionBank") || "題庫狀態"}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 bg-background rounded">
                  <div className="text-lg font-bold text-blue-500">{unansweredCount}</div>
                  <div className="text-xs text-muted-foreground">{t("exam.unanswered") || "未作答"}</div>
                </div>
                <div className="p-2 bg-background rounded">
                  <div className="text-lg font-bold text-amber-500">{needsReviewCount}</div>
                  <div className="text-xs text-muted-foreground">{t("exam.needsReview") || "需複習"}</div>
                </div>
                <div className="p-2 bg-background rounded">
                  <div className="text-lg font-bold text-green-500">{quizStats.mastered}</div>
                  <div className="text-xs text-muted-foreground">{t("exam.mastered") || "已掌握"}</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground text-center">
                {unansweredCount > 0
                  ? t("exam.priorityUnanswered") || "本次考試將優先出未作答的題目"
                  : needsReviewCount > 0
                  ? t("exam.priorityReview") || "所有題目已作答，本次將複習錯題"
                  : t("exam.allMastered") || "恭喜！所有題目都已掌握"}
              </div>
            </div>

            <div className="text-sm text-muted-foreground space-y-2">
              <p>{t("exam.instruction1") || "This exam covers:"}</p>
              <ul className="list-disc list-inside space-y-1">
                <li>{t("exam.topic1") || "GTO Logic and Theory"}</li>
                <li>{t("exam.topic2") || "Hand Equity"}</li>
                <li>{t("exam.topic3") || "Position Strategy"}</li>
                <li>{t("exam.topic4") || "Push/Fold Decisions"}</li>
                <li>Postflop Strategy（翻後策略）</li>
                <li>Bet Sizing（下注尺寸）</li>
                <li>Range Construction（範圍建構）</li>
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
    // Calculate score in points (each question = 100/totalQuestions points)
    const pointsPerQuestion = Math.round(100 / questions.length * 10) / 10;
    const totalPoints = Math.round(score * pointsPerQuestion * 10) / 10;

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
            <CardDescription className="text-xl mt-2">
              {t("exam.yourScore") || "Your Score"}: <span className="font-bold text-primary">{totalPoints} {t("exam.points") || "分"}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 text-center mb-6">
              <div className="p-4 bg-green-500/10 rounded-lg">
                <div className="text-2xl font-bold text-green-500">{score}</div>
                <div className="text-sm text-muted-foreground">{t("common.correct") || "正確"}</div>
              </div>
              <div className="p-4 bg-red-500/10 rounded-lg">
                <div className="text-2xl font-bold text-red-500">{questions.length - score}</div>
                <div className="text-sm text-muted-foreground">{t("exam.incorrect") || "錯誤"}</div>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{formatTime(EXAM_CONFIG.timeLimit - timeLeft)}</div>
                <div className="text-sm text-muted-foreground">{t("exam.timeTaken") || "用時"}</div>
              </div>
            </div>

            <Button onClick={resetExam} className="w-full">
              <RefreshCw className="mr-2 h-4 w-4" />
              {t("exam.tryAgain") || "Try Again"}
            </Button>
          </CardContent>
        </Card>

        {/* Article Recommendations */}
        {(() => {
          const wrongIds = Array.from(results.entries())
            .filter(([_, r]) => !r.isCorrect)
            .map(([id]) => id);
          const questionTypes = Object.fromEntries(
            questions.map((q) => [q.id, q.type])
          );
          const recommendations = getArticleRecommendations(wrongIds, questionTypes);
          const weakAreas = analyzeWeakAreas(wrongIds, questionTypes);

          if (wrongIds.length === 0) return null;

          return (
            <>
              {/* Weak Areas Summary */}
              {weakAreas.length > 0 && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <TrendingUp className="h-5 w-5" />
                      {t("exam.improvementAreas") || "Areas to Improve"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {weakAreas.map((area) => (
                        <div key={area.type} className="flex items-center justify-between">
                          <span className="capitalize">{area.type.replace("_", " ")}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {area.count} {t("exam.mistakes") || "mistakes"}
                            </span>
                            <Progress value={area.percentage} className="w-20 h-2" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recommended Articles */}
              {recommendations.length > 0 && (
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BookOpen className="h-5 w-5" />
                      {t("exam.recommendedReading") || "Recommended Reading"}
                    </CardTitle>
                    <CardDescription>
                      {t("exam.recommendedReadingDesc") || "Based on your mistakes, we recommend reviewing these articles:"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recommendations.map((article) => (
                        <Link
                          key={article.path}
                          href={article.path}
                          className="block p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                        >
                          <div className="font-medium">{article.titleZh}</div>
                          <div className="text-sm text-muted-foreground">{article.description}</div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          );
        })()}

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
              {answered}/{questions.length} {t("exam.answered") || "已答"}
            </span>
            <span className="text-sm font-medium text-green-500">
              {score} {t("exam.points") || "分"}
            </span>
            <Button variant="destructive" size="sm" onClick={submitExam}>
              <Flag className="h-4 w-4 mr-1" />
              {t("exam.submit") || "提交"}
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

      <Card className="mb-4">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">名詞提示</CardTitle>
          <CardDescription className="text-sm">
            題目中的 BB 指大盲，「10BB」代表有效籌碼（你與對手較小者）。
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>若涉及底池大小，題目會標示「底池 = X BB」。</p>
          <p>Pot Odds = 底池賠率。</p>
          <p>RFI = Raise First In（首次加注）；C-bet = Continuation Bet（持續下注）。</p>
          <p>MDF = Minimum Defense Frequency（最小防禦頻率）；ICM = Independent Chip Model（獨立籌碼模型）。</p>
          <p>IP / OOP = In Position / Out of Position（有位置 / 沒位置）。</p>
          <p>r = rainbow（彩虹面，無同花）。</p>
        </CardContent>
      </Card>

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
