"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
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
  concept: TextureConcept;
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const CATEGORY_COLORS: Record<string, string> = {
  dry: "bg-amber-100 text-amber-800 border-amber-200",
  paired: "bg-purple-100 text-purple-800 border-purple-200",
  wet: "bg-blue-100 text-blue-800 border-blue-200",
  connected: "bg-green-100 text-green-800 border-green-200",
};

const CATEGORY_NAMES: Record<string, string> = {
  dry: "乾燥牌面",
  paired: "對子牌面",
  wet: "濕潤牌面",
  connected: "連接牌面",
};

const DIFFICULTY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "入門", color: "bg-green-500" },
  2: { label: "進階", color: "bg-yellow-500" },
  3: { label: "困難", color: "bg-red-500" },
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
  const suitSymbols: Record<string, string> = { h: "♥", d: "♦", c: "♣", s: "♠" };
  const suitColors: Record<string, string> = {
    h: "text-red-500",
    d: "text-blue-500",
    c: "text-green-700",
    s: "text-slate-900",
  };

  return (
    <span
      key={card}
      className={cn(
        "inline-flex items-center justify-center w-10 h-14 rounded-lg border-2 border-slate-300 bg-white shadow-sm font-bold text-lg",
        suitColors[suit]
      )}
    >
      {rank}
      {suitSymbols[suit]}
    </span>
  );
}

function renderBoard(board: string[]): React.ReactElement {
  return (
    <div className="flex gap-2 justify-center">
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
  const accuracy = progress && progress.attempts > 0
    ? Math.round((progress.correct / progress.attempts) * 100)
    : 0;

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02]",
        progress?.mastered && "ring-2 ring-green-500"
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Badge className={cn("border", CATEGORY_COLORS[texture.category])}>
            {CATEGORY_NAMES[texture.category]}
          </Badge>
          <div className="flex items-center gap-1">
            {[1, 2, 3].map((d) => (
              <div
                key={d}
                className={cn(
                  "w-2 h-2 rounded-full",
                  d <= texture.difficulty
                    ? DIFFICULTY_LABELS[texture.difficulty].color
                    : "bg-slate-200"
                )}
              />
            ))}
          </div>
        </div>
        <CardTitle className="text-lg mt-2">{texture.texture_zh}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-3">{renderBoard(texture.representative_board)}</div>
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {texture.concept.summary}
        </p>
        {progress && progress.attempts > 0 && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>正確率: {accuracy}%</span>
              <span>{progress.correct}/{progress.attempts}</span>
            </div>
            <Progress value={accuracy} className="h-1" />
          </div>
        )}
        {progress?.mastered && (
          <div className="flex items-center gap-1 text-green-600 text-sm mt-2">
            <Trophy className="w-4 h-4" />
            <span>已掌握</span>
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
  return (
    <div className="space-y-6">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        ← 返回列表
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Badge className={cn("border", CATEGORY_COLORS[texture.category])}>
              {CATEGORY_NAMES[texture.category]}
            </Badge>
            <Badge variant="outline">
              {DIFFICULTY_LABELS[texture.difficulty].label}
            </Badge>
          </div>
          <CardTitle className="text-2xl">{texture.texture_zh}</CardTitle>
          <CardDescription>{texture.concept.title}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex justify-center py-4">
            {renderBoard(texture.representative_board)}
          </div>

          <div className="bg-slate-50 rounded-lg p-4">
            <p className="text-lg">{texture.concept.summary}</p>
          </div>

          <div>
            <h3 className="flex items-center gap-2 font-semibold mb-3">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              關鍵要點
            </h3>
            <ul className="space-y-2">
              {texture.concept.key_points.map((point, i) => (
                <li key={i} className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="flex items-center gap-2 font-semibold mb-3">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              常見錯誤
            </h3>
            <ul className="space-y-2">
              {texture.concept.common_mistakes.map((mistake, i) => (
                <li key={i} className="flex items-start gap-2">
                  <XCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <span>{mistake}</span>
                </li>
              ))}
            </ul>
          </div>

          <Button onClick={onStartDrill} className="w-full" size="lg">
            <Target className="w-5 h-5 mr-2" />
            開始練習此質地
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          ← 返回
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
            {stats.correct}/{stats.total} 正確
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
                {DIFFICULTY_LABELS[question.difficulty]?.label}
              </Badge>
            </div>
            <CardDescription className="mt-2">
              {question.concept_hint}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center space-y-4">
              <div className="text-sm text-muted-foreground">Board</div>
              {renderBoard(question.board)}
            </div>

            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-2">Your Hand</div>
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-slate-100 rounded-lg">
                <span className="text-2xl font-bold">{question.hand}</span>
              </div>
            </div>

            <div className="text-center text-lg font-medium">
              BTN vs BB (SRP) - 你應該怎麼做？
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
                  {loading ? "評估中..." : "確認答案"}
                </Button>
              </>
            ) : (
              <div className="space-y-4">
                <div
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-lg",
                    result.correct
                      ? "bg-green-50 border border-green-200"
                      : "bg-red-50 border border-red-200"
                  )}
                >
                  {result.correct ? (
                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                  ) : (
                    <XCircle className="w-8 h-8 text-red-500" />
                  )}
                  <div>
                    <div className="font-semibold">
                      {result.correct ? "正確！" : "錯誤"}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      最佳選擇: {ACTION_LABELS[result.best_action]} ({result.best_frequency}%)
                    </div>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-lg p-4">
                  <div className="text-sm font-medium mb-2">完整策略分布</div>
                  <div className="space-y-2">
                    {Object.entries(result.full_strategy)
                      .sort(([, a], [, b]) => b - a)
                      .map(([action, freq]) => (
                        <div key={action} className="flex items-center gap-2">
                          <div className="w-24 text-sm">
                            {ACTION_LABELS[action] || action}
                          </div>
                          <div className="flex-1">
                            <Progress value={freq} className="h-2" />
                          </div>
                          <div className="w-12 text-sm text-right">{freq}%</div>
                        </div>
                      ))}
                  </div>
                </div>

                {result.note && (
                  <div className="text-sm text-muted-foreground italic">
                    {result.note}
                  </div>
                )}

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="font-medium mb-2">概念提醒</div>
                  <p className="text-sm">{result.concept_summary}</p>
                </div>

                <Button className="w-full" size="lg" onClick={handleNext}>
                  {questionCount >= maxQuestions ? "完成練習" : "下一題"}
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Progress
        value={(questionCount / maxQuestions) * 100}
        className="h-2"
      />
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
  const accuracy = Math.round((results.correct / results.total) * 100);
  const passed = accuracy >= 80;

  return (
    <Card className="text-center">
      <CardHeader>
        <CardTitle className="text-2xl">
          {passed ? "恭喜通過！" : "繼續加油！"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div
          className={cn(
            "w-32 h-32 rounded-full mx-auto flex items-center justify-center",
            passed ? "bg-green-100" : "bg-yellow-100"
          )}
        >
          {passed ? (
            <Trophy className="w-16 h-16 text-green-500" />
          ) : (
            <Target className="w-16 h-16 text-yellow-500" />
          )}
        </div>

        <div className="text-4xl font-bold">{accuracy}%</div>
        <div className="text-muted-foreground">
          {results.correct} / {results.total} 正確
        </div>

        {passed ? (
          <p className="text-green-600">
            你已經掌握了這個質地的基本概念！
          </p>
        ) : (
          <p className="text-muted-foreground">
            需要達到 80% 正確率才能解鎖下一階段
          </p>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={onBack} className="flex-1">
            返回列表
          </Button>
          <Button onClick={onRetry} className="flex-1">
            {passed ? "繼續練習" : "再試一次"}
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
    const savedProgress = localStorage.getItem("texture-training-progress");
    if (savedProgress) {
      setProgress(JSON.parse(savedProgress));
    }
  }, []);

  const saveProgress = (textureId: string, correct: number, total: number) => {
    const existing = progress[textureId] || { texture_id: textureId, attempts: 0, correct: 0, mastered: false };
    const newProgress = {
      ...existing,
      attempts: existing.attempts + total,
      correct: existing.correct + correct,
      mastered: existing.mastered || (correct / total >= 0.8),
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

  const filteredTextures = activeTab === "all"
    ? textures
    : textures.filter((t) => t.category === activeTab);

  const masteredCount = Object.values(progress).filter((p) => p.mastered).length;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {view === "list" && (
        <>
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">牌面質地訓練</h1>
            <p className="text-muted-foreground">
              學習 12 種牌面質地的 GTO C-bet 策略
            </p>

            <div className="mt-4 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <span>
                  已掌握: {masteredCount} / {textures.length}
                </span>
              </div>
              <Progress
                value={(masteredCount / textures.length) * 100}
                className="flex-1 max-w-xs h-2"
              />
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList>
              <TabsTrigger value="all">全部</TabsTrigger>
              <TabsTrigger value="dry">乾燥</TabsTrigger>
              <TabsTrigger value="paired">對子</TabsTrigger>
              <TabsTrigger value="wet">濕潤</TabsTrigger>
              <TabsTrigger value="connected">連接</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              <Target className="w-5 h-5 mr-2" />
              隨機練習所有質地
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
