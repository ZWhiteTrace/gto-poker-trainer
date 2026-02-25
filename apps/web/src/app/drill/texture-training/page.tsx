"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { SUIT_SYMBOLS, SUIT_CARD_COLORS } from "@/lib/poker/types";
import {
  CheckCircle2,
  XCircle,
  ArrowRight,
  BookOpen,
  Target,
  Trophy,
  ChevronRight,
  Lightbulb,
  AlertTriangle,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/api";

// ============================================
// Types
// ============================================

interface TextureConcept {
  title: string;
  summary: string;
  key_points: string[];
  common_mistakes: string[];
}

interface TextureData {
  texture_id: string;
  texture_zh: string;
  category: string;
  difficulty: number;
  representative_board: string[];
  concept?: TextureConcept;
  hand_count: number;
}

interface DrillQuestion {
  texture_id: string;
  texture_zh: string;
  category: string;
  difficulty: number;
  board: string[];
  hand: string;
  options: string[];
  concept_hint: string;
}

interface EvaluationResult {
  correct: boolean;
  user_action: string;
  user_frequency: number;
  best_action: string;
  best_frequency: number;
  full_strategy: Record<string, number>;
  note: string | null;
  concept_summary: string;
  key_points: string[];
}

interface TextureProgress {
  texture_id: string;
  attempts: number;
  correct: number;
  mastered: boolean;
}

// ============================================
// Constants
// ============================================

const API_BASE = API_BASE_URL;

const CATEGORY_COLORS: Record<string, string> = {
  dry: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900 dark:text-amber-200 dark:border-amber-700",
  paired:
    "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-200 dark:border-purple-700",
  wet: "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700",
  connected:
    "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700",
  broadway:
    "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900 dark:text-rose-200 dark:border-rose-700",
};

const DIFFICULTY_COLORS: Record<number, string> = {
  1: "bg-green-500",
  2: "bg-yellow-500",
  3: "bg-red-500",
};

const ACTION_LABELS: Record<string, string> = {
  bet_33: "Bet 33%",
  bet_50: "Bet 50%",
  bet_66: "Bet 66%",
  bet_75: "Bet 75%",
  bet_100: "Bet 100%",
  check: "Check",
};

// ============================================
// Helpers
// ============================================

function renderCard(card: string): React.ReactElement {
  const rank = card[0];
  const suit = card[1];

  return (
    <span
      key={card}
      className={cn(
        "inline-flex h-14 w-10 items-center justify-center rounded-lg border-2 border-slate-300 bg-white text-lg font-bold shadow-sm",
        SUIT_CARD_COLORS[suit]
      )}
    >
      {rank}
      {SUIT_SYMBOLS[suit]}
    </span>
  );
}

function renderBoard(board: string[]): React.ReactElement {
  return (
    <div className="flex justify-center gap-2">
      {board.map((card, i) => (
        <span key={i}>{renderCard(card)}</span>
      ))}
    </div>
  );
}

// ============================================
// Components
// ============================================

function TextureCard({
  texture,
  progress,
  onClick,
}: {
  texture: TextureData;
  progress?: TextureProgress;
  onClick: () => void;
}) {
  const t = useTranslations("drill");
  const accuracy =
    progress && progress.attempts > 0
      ? Math.round((progress.correct / progress.attempts) * 100)
      : 0;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg",
        progress?.mastered && "ring-2 ring-green-500"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Badge className={cn("border", CATEGORY_COLORS[texture.category])}>
            {t("textureTraining.categoryNames." + texture.category)}
          </Badge>
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((d) => (
              <div
                key={d}
                className={cn(
                  "h-2 w-2 rounded-full",
                  d <= texture.difficulty ? DIFFICULTY_COLORS[texture.difficulty] : "bg-slate-200"
                )}
              />
            ))}
          </div>
        </div>
        <CardTitle className="mt-2 text-lg">{texture.texture_zh}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3">{renderBoard(texture.representative_board)}</div>
        {texture.concept?.summary && (
          <p className="text-muted-foreground mb-3 line-clamp-2 text-sm">
            {texture.concept.summary}
          </p>
        )}
        {progress && progress.attempts > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>{t("textureTraining.accuracy", { pct: String(accuracy) })}</span>
              <span>
                {progress.correct}/{progress.attempts}
              </span>
            </div>
            <Progress value={accuracy} className="h-1" />
          </div>
        )}
        {progress?.mastered && (
          <div className="mt-2 flex items-center gap-1 text-sm text-green-600">
            <Trophy className="h-4 w-4" />
            <span>{t("textureTraining.mastered")}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TextureDetail({
  texture,
  onStartDrill,
  onBack,
}: {
  texture: TextureData;
  onStartDrill: () => void;
  onBack: () => void;
}) {
  const t = useTranslations("drill");
  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        {t("textureTraining.backToList")}
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Badge className={cn("border", CATEGORY_COLORS[texture.category])}>
              {t("textureTraining.categoryNames." + texture.category)}
            </Badge>
            <Badge variant="outline">{t("textureTraining.difficulty." + texture.difficulty)}</Badge>
          </div>
          <CardTitle className="text-2xl">{texture.texture_zh}</CardTitle>
          {texture.concept?.title && <CardDescription>{texture.concept.title}</CardDescription>}
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center py-4">
            {renderBoard(texture.representative_board)}
          </div>

          {texture.concept?.summary && (
            <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
              <p className="text-lg">{texture.concept.summary}</p>
            </div>
          )}

          {texture.concept?.key_points && texture.concept.key_points.length > 0 && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 font-semibold">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                {t("textureTraining.keyPoints")}
              </h3>
              <ul className="space-y-2">
                {texture.concept.key_points.map((point, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {texture.concept?.common_mistakes && texture.concept.common_mistakes.length > 0 && (
            <div>
              <h3 className="mb-3 flex items-center gap-2 font-semibold">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                {t("textureTraining.commonMistakes")}
              </h3>
              <ul className="space-y-2">
                {texture.concept.common_mistakes.map((mistake, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
                    <span>{mistake}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button onClick={onStartDrill} className="w-full" size="lg">
            <Target className="mr-2 h-5 w-5" />
            {t("textureTraining.startDrill")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function DrillMode({
  textureId,
  onComplete,
  onBack,
}: {
  textureId?: string;
  onComplete: (results: { correct: number; total: number }) => void;
  onBack: () => void;
}) {
  const t = useTranslations("drill");
  const [question, setQuestion] = useState<DrillQuestion | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ correct: 0, total: 0 });
  const [questionCount, setQuestionCount] = useState(0);
  const maxQuestions = 10;

  const fetchQuestion = useCallback(async () => {
    setLoading(true);
    setSelectedAction(null);
    setResult(null);

    try {
      const url = textureId
        ? `${API_BASE}/api/solver/level1/drill?texture_id=${textureId}`
        : `${API_BASE}/api/solver/level1/drill`;
      const res = await fetch(url);
      const data = await res.json();
      setQuestion(data);
    } catch (error) {
      console.error("Failed to fetch question:", error);
    } finally {
      setLoading(false);
    }
  }, [textureId]);

  useEffect(() => {
    fetchQuestion();
  }, [fetchQuestion]);

  const handleSubmit = async () => {
    if (!question || !selectedAction) return;

    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE}/api/solver/level1/evaluate?texture_id=${question.texture_id}&hand=${question.hand}&user_action=${selectedAction}`,
        { method: "POST" }
      );
      const data = await res.json();
      setResult(data);

      const newStats = {
        correct: stats.correct + (data.correct ? 1 : 0),
        total: stats.total + 1,
      };
      setStats(newStats);
      setQuestionCount((c) => c + 1);

      if (questionCount + 1 >= maxQuestions) {
        setTimeout(() => onComplete(newStats), 2000);
      }
    } catch (error) {
      console.error("Failed to evaluate:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (questionCount >= maxQuestions) {
      onComplete(stats);
    } else {
      fetchQuestion();
    }
  };

  if (loading && !question) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          {t("textureTraining.back")}
        </Button>
        <div className="flex items-center gap-4">
          <Badge variant="outline">
            {questionCount}/{maxQuestions}
          </Badge>
          <Badge
            className={cn(
              stats.total > 0 && stats.correct / stats.total >= 0.8
                ? "bg-green-500"
                : stats.total > 0 && stats.correct / stats.total >= 0.5
                  ? "bg-yellow-500"
                  : "bg-slate-500"
            )}
          >
            {t("textureTraining.correctCount", { count: `${stats.correct}/${stats.total}` })}
          </Badge>
        </div>
      </div>

      {question && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Badge className={cn("border", CATEGORY_COLORS[question.category])}>
                {question.texture_zh}
              </Badge>
              <Badge variant="outline">
                {t("textureTraining.difficulty." + question.difficulty)}
              </Badge>
            </div>
            <CardDescription className="mt-2">{question.concept_hint}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4 text-center">
              <div className="text-muted-foreground text-sm">Board</div>
              {renderBoard(question.board)}
            </div>

            <div className="text-center">
              <div className="text-muted-foreground mb-2 text-sm">Your Hand</div>
              <div className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-6 py-3 dark:bg-slate-800">
                <span className="text-2xl font-bold">{question.hand}</span>
              </div>
            </div>

            <div className="text-center text-lg font-medium">
              {t("textureTraining.srpQuestion")}
            </div>

            {!result ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {question.options
                    .sort((a, b) => {
                      const order = ["check", "bet_33", "bet_50", "bet_66", "bet_75"];
                      return order.indexOf(a) - order.indexOf(b);
                    })
                    .map((action) => (
                      <Button
                        key={action}
                        variant={selectedAction === action ? "default" : "outline"}
                        className="h-12"
                        onClick={() => setSelectedAction(action)}
                      >
                        {ACTION_LABELS[action] || action}
                      </Button>
                    ))}
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  disabled={!selectedAction || loading}
                  onClick={handleSubmit}
                >
                  {loading ? t("textureTraining.evaluating") : t("textureTraining.confirmAnswer")}
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-lg p-4",
                    result.correct
                      ? "border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950"
                      : "border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"
                  )}
                >
                  {result.correct ? (
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  ) : (
                    <XCircle className="h-8 w-8 text-red-500" />
                  )}
                  <div>
                    <div className="font-semibold">
                      {result.correct ? t("result.correct") : t("result.incorrect")}
                    </div>
                    <div className="text-muted-foreground text-sm">
                      {t("textureTraining.bestChoice", {
                        action: ACTION_LABELS[result.best_action],
                        frequency: String(result.best_frequency),
                      })}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
                  <div className="mb-2 text-sm font-medium">
                    {t("textureTraining.fullStrategy")}
                  </div>
                  <div className="space-y-2">
                    {Object.entries(result.full_strategy)
                      .sort(([, a], [, b]) => b - a)
                      .map(([action, freq]) => (
                        <div key={action} className="flex items-center gap-2">
                          <div className="w-24 text-sm">{ACTION_LABELS[action] || action}</div>
                          <div className="flex-1">
                            <Progress value={freq} className="h-2" />
                          </div>
                          <div className="w-12 text-right text-sm">{freq}%</div>
                        </div>
                      ))}
                  </div>
                </div>

                {result.note && (
                  <div className="text-muted-foreground text-sm italic">{result.note}</div>
                )}

                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950">
                  <div className="mb-2 font-medium">{t("textureTraining.conceptReminder")}</div>
                  <p className="text-sm">{result.concept_summary}</p>
                </div>

                <Button className="w-full" size="lg" onClick={handleNext}>
                  {questionCount >= maxQuestions
                    ? t("textureTraining.finishDrill")
                    : t("textureTraining.nextQuestion")}
                  <ChevronRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Progress value={(questionCount / maxQuestions) * 100} className="h-2" />
    </div>
  );
}

function ResultsSummary({
  results,
  textureId,
  onRetry,
  onBack,
}: {
  results: { correct: number; total: number };
  textureId?: string;
  onRetry: () => void;
  onBack: () => void;
}) {
  const t = useTranslations("drill");
  const accuracy = Math.round((results.correct / results.total) * 100);
  const passed = accuracy >= 80;

  return (
    <Card className="text-center">
      <CardHeader>
        <CardTitle className="text-2xl">
          {passed ? t("textureTraining.congratsPassed") : t("textureTraining.keepGoing")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          className={cn(
            "mx-auto flex h-32 w-32 items-center justify-center rounded-full",
            passed ? "bg-green-100 dark:bg-green-900" : "bg-yellow-100 dark:bg-yellow-900"
          )}
        >
          {passed ? (
            <Trophy className="h-16 w-16 text-green-500" />
          ) : (
            <Target className="h-16 w-16 text-yellow-500" />
          )}
        </div>

        <div className="text-4xl font-bold">{accuracy}%</div>
        <div className="text-muted-foreground">
          {t("textureTraining.correctCount", { count: `${results.correct} / ${results.total}` })}
        </div>

        {passed ? (
          <p className="text-green-600">{t("textureTraining.masteredText")}</p>
        ) : (
          <p className="text-muted-foreground">{t("textureTraining.need80")}</p>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1">
            {t("textureTraining.backToListBtn")}
          </Button>
          <Button onClick={onRetry} className="flex-1">
            {passed ? t("textureTraining.continuePractice") : t("textureTraining.tryAgain")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Main Page
// ============================================

export default function TextureTrainingPage() {
  const t = useTranslations("drill");
  const [textures, setTextures] = useState<TextureData[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "detail" | "drill" | "results">("list");
  const [selectedTexture, setSelectedTexture] = useState<TextureData | null>(null);
  const [drillResults, setDrillResults] = useState<{ correct: number; total: number } | null>(null);
  const [progress, setProgress] = useState<Record<string, TextureProgress>>({});
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    const fetchTextures = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/solver/level1/textures`);
        const data = await res.json();
        setTextures(data.textures || []);
      } catch (error) {
        console.error("Failed to fetch textures:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTextures();

    // Load progress from localStorage
    try {
      const savedProgress = localStorage.getItem("texture-training-progress");
      if (savedProgress) {
        setProgress(JSON.parse(savedProgress));
      }
    } catch {
      /* ignore corrupted data */
    }
  }, []);

  const saveProgress = (textureId: string, correct: number, total: number) => {
    const existing = progress[textureId] || {
      texture_id: textureId,
      attempts: 0,
      correct: 0,
      mastered: false,
    };
    const newProgress = {
      ...existing,
      attempts: existing.attempts + total,
      correct: existing.correct + correct,
      mastered: existing.mastered || correct / total >= 0.8,
    };

    const updated = { ...progress, [textureId]: newProgress };
    setProgress(updated);
    localStorage.setItem("texture-training-progress", JSON.stringify(updated));
  };

  const handleTextureClick = (texture: TextureData) => {
    setSelectedTexture(texture);
    setView("detail");
  };

  const handleStartDrill = () => {
    setView("drill");
  };

  const handleDrillComplete = (results: { correct: number; total: number }) => {
    setDrillResults(results);
    if (selectedTexture) {
      saveProgress(selectedTexture.texture_id, results.correct, results.total);
    }
    setView("results");
  };

  const handleRetry = () => {
    setDrillResults(null);
    setView("drill");
  };

  const handleBack = () => {
    setView("list");
    setSelectedTexture(null);
    setDrillResults(null);
  };

  const filteredTextures =
    activeTab === "all" ? textures : textures.filter((tex) => tex.category === activeTab);

  const masteredCount = Object.values(progress).filter((p) => p.mastered).length;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex h-64 items-center justify-center">
          <div className="border-primary h-8 w-8 animate-spin rounded-full border-b-2" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl px-4 py-8">
      {view === "list" && (
        <>
          <div className="mb-8">
            <h1 className="mb-2 text-3xl font-bold">{t("textureTraining.title")}</h1>
            <p className="text-muted-foreground">{t("textureTraining.description")}</p>

            <div className="mt-4 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <span>
                  {t("textureTraining.masteredCount", {
                    mastered: String(masteredCount),
                    total: String(textures.length),
                  })}
                </span>
              </div>
              <Progress
                value={(masteredCount / textures.length) * 100}
                className="h-2 max-w-xs flex-1"
              />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList>
              <TabsTrigger value="all">{t("textureTraining.tabs.all")}</TabsTrigger>
              <TabsTrigger value="dry">{t("textureTraining.tabs.dry")}</TabsTrigger>
              <TabsTrigger value="paired">{t("textureTraining.tabs.paired")}</TabsTrigger>
              <TabsTrigger value="wet">{t("textureTraining.tabs.wet")}</TabsTrigger>
              <TabsTrigger value="connected">{t("textureTraining.tabs.connected")}</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTextures.map((texture) => (
              <TextureCard
                key={texture.texture_id}
                texture={texture}
                progress={progress[texture.texture_id]}
                onClick={() => handleTextureClick(texture)}
              />
            ))}
          </div>

          <div className="mt-8 text-center">
            <Button
              size="lg"
              onClick={() => {
                setSelectedTexture(null);
                setView("drill");
              }}
            >
              <Target className="mr-2 h-5 w-5" />
              {t("textureTraining.randomDrill")}
            </Button>
          </div>
        </>
      )}

      {view === "detail" && selectedTexture && (
        <TextureDetail
          texture={selectedTexture}
          onStartDrill={handleStartDrill}
          onBack={handleBack}
        />
      )}

      {view === "drill" && (
        <DrillMode
          textureId={selectedTexture?.texture_id}
          onComplete={handleDrillComplete}
          onBack={handleBack}
        />
      )}

      {view === "results" && drillResults && (
        <ResultsSummary
          results={drillResults}
          textureId={selectedTexture?.texture_id}
          onRetry={handleRetry}
          onBack={handleBack}
        />
      )}
    </div>
  );
}
