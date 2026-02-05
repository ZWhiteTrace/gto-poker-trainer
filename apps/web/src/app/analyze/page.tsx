"use client";

import { useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  AlertCircle,
  TrendingDown,
  Target,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Brain,
  Lightbulb,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import Link from "next/link";
import { api, AIReviewResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

interface PositionStat {
  total: number;
  mistakes: number;
  mistake_rate: number;
  ev_loss: number;
}

interface LeakInfo {
  type: string;
  description: string;
  total_hands: number;
  mistakes: number;
  mistake_rate: number;
  ev_loss: number;
  common_mistakes?: Record<string, number>;
}

interface DecisionInfo {
  hand_id: string;
  hero_position: string;
  hero_hand: string;
  scenario: string;
  villain_position: string | null;
  hero_action: string;
  gto_frequencies: Record<string, number>;
  is_mistake: boolean;
  ev_loss: number;
}

interface AnalysisResult {
  success: boolean;
  total_hands: number;
  analyzed_hands: number;
  mistakes: number;
  mistake_rate: number;
  total_ev_loss: number;
  position_stats: Record<string, PositionStat>;
  top_leaks: LeakInfo[];
  decisions?: DecisionInfo[];
}

const POSITIONS = ["UTG", "HJ", "CO", "BTN", "SB", "BB"];

export default function AnalyzePage() {
  const t = useTranslations();
  const locale = useLocale();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [showDetailed, setShowDetailed] = useState(false);
  const [expandedLeaks, setExpandedLeaks] = useState<Set<number>>(new Set());
  const [aiReview, setAiReview] = useState<AIReviewResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        if (!selectedFile.name.endsWith(".txt")) {
          setError(t("analyze.errorFormat"));
          return;
        }
        setFile(selectedFile);
        setError(null);
        setResult(null);
      }
    },
    [t]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files?.[0];
      if (droppedFile) {
        if (!droppedFile.name.endsWith(".txt")) {
          setError(t("analyze.errorFormat"));
          return;
        }
        setFile(droppedFile);
        setError(null);
        setResult(null);
      }
    },
    [t]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const analyzeFile = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "https://api.grindgto.com"}/api/analyze/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || t("analyze.errorAnalysis"));
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("analyze.errorAnalysis"));
    } finally {
      setLoading(false);
    }
  };

  const loadDemo = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "https://api.grindgto.com"}/api/analyze/demo`
      );

      if (!response.ok) {
        throw new Error(t("analyze.errorDemo"));
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("analyze.errorDemo"));
    } finally {
      setLoading(false);
    }
  };

  const toggleLeak = (index: number) => {
    const newExpanded = new Set(expandedLeaks);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedLeaks(newExpanded);
  };

  const fetchAiReview = async () => {
    if (!result) return;

    setAiLoading(true);
    try {
      const review = await api.getAIReview({
        position_stats: result.position_stats,
        top_leaks: result.top_leaks,
        total_hands: result.total_hands,
        analyzed_hands: result.analyzed_hands,
        mistakes: result.mistakes,
        mistake_rate: result.mistake_rate,
        total_ev_loss: result.total_ev_loss,
      });
      setAiReview(review);
    } catch (err) {
      console.error("AI Review error:", err);
    } finally {
      setAiLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "weakness":
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case "strength":
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case "recommendation":
        return <Lightbulb className="h-5 w-5 text-yellow-500" />;
      case "drill":
        return <Target className="h-5 w-5 text-primary" />;
      default:
        return <Brain className="h-5 w-5" />;
    }
  };

  const getSkillLevelBadge = (level: string) => {
    const styles: Record<string, string> = {
      expert: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      advanced: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      intermediate: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      beginner: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      insufficient_data: "bg-gray-500/20 text-gray-400 border-gray-500/30",
    };
    const labels: Record<string, string> = {
      expert: t("analyze.ai.levelExpert"),
      advanced: t("analyze.ai.levelAdvanced"),
      intermediate: t("analyze.ai.levelIntermediate"),
      beginner: t("analyze.ai.levelBeginner"),
      insufficient_data: t("analyze.ai.levelInsufficient"),
    };
    return (
      <span className={cn("px-3 py-1 rounded-full text-sm border", styles[level] || styles.intermediate)}>
        {labels[level] || level}
      </span>
    );
  };

  return (
    <div className="container max-w-4xl py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t("analyze.title")}</h1>
        <p className="text-muted-foreground">{t("analyze.description")}</p>
      </div>

      {/* File Upload */}
      {!result && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              {t("analyze.uploadTitle")}
            </CardTitle>
            <CardDescription>{t("analyze.uploadDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className={cn(
                "border-2 border-dashed rounded-lg p-8 text-center transition-colors",
                "hover:border-primary hover:bg-primary/5",
                file ? "border-primary bg-primary/5" : "border-muted"
              )}
            >
              <input
                type="file"
                accept=".txt"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="h-12 w-12 text-primary" />
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("analyze.clickToChange")}
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-12 w-12 text-muted-foreground" />
                    <p className="font-medium">{t("analyze.dropOrClick")}</p>
                    <p className="text-sm text-muted-foreground">
                      {t("analyze.supportedFormat")}
                    </p>
                  </div>
                )}
              </label>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-destructive/10 text-destructive rounded-lg flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <Button
                onClick={analyzeFile}
                disabled={!file || loading}
                className="flex-1"
              >
                {loading ? t("common.loading") : t("analyze.analyzeButton")}
              </Button>
              <Button variant="outline" onClick={loadDemo} disabled={loading}>
                {t("analyze.demoButton")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {!result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("analyze.instructionsTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>{t("analyze.instruction1")}</p>
            <p>{t("analyze.instruction2")}</p>
            <p>{t("analyze.instruction3")}</p>
            <p className="pt-2 font-medium text-foreground">
              {t("analyze.analysisIncludes")}
            </p>
            <ul className="list-disc list-inside space-y-1">
              <li>{t("analyze.analysis1")}</li>
              <li>{t("analyze.analysis2")}</li>
              <li>{t("analyze.analysis3")}</li>
              <li>{t("analyze.analysis4")}</li>
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {result && (
        <>
          {/* Summary */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t("analyze.summaryTitle")}</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setResult(null);
                    setFile(null);
                  }}
                >
                  {t("analyze.newAnalysis")}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{result.total_hands}</div>
                  <div className="text-sm text-muted-foreground">
                    {t("analyze.totalHands")}
                  </div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold">{result.analyzed_hands}</div>
                  <div className="text-sm text-muted-foreground">
                    {t("analyze.analyzedHands")}
                  </div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-destructive">
                    {result.mistakes} ({result.mistake_rate}%)
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("analyze.mistakes")}
                  </div>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="text-2xl font-bold text-destructive">
                    {result.total_ev_loss} bb
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {t("analyze.evLoss")}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Position Stats */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                {t("analyze.positionTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-3">{t("analyze.position")}</th>
                      <th className="text-right py-2 px-3">{t("analyze.hands")}</th>
                      <th className="text-right py-2 px-3">{t("analyze.mistakesCol")}</th>
                      <th className="text-right py-2 px-3">{t("analyze.rate")}</th>
                      <th className="text-right py-2 px-3">{t("analyze.evLossCol")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {POSITIONS.map((pos) => {
                      const stat = result.position_stats[pos];
                      if (!stat) return null;
                      return (
                        <tr key={pos} className="border-b last:border-0">
                          <td className="py-2 px-3 font-medium">{pos}</td>
                          <td className="text-right py-2 px-3">{stat.total}</td>
                          <td className="text-right py-2 px-3">{stat.mistakes}</td>
                          <td className="text-right py-2 px-3">
                            <Badge
                              variant={
                                stat.mistake_rate > 15
                                  ? "destructive"
                                  : stat.mistake_rate > 8
                                  ? "secondary"
                                  : "default"
                              }
                            >
                              {stat.mistake_rate}%
                            </Badge>
                          </td>
                          <td className="text-right py-2 px-3 text-destructive">
                            -{stat.ev_loss} bb
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Top Leaks */}
          {result.top_leaks.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                  {t("analyze.topLeaksTitle")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {result.top_leaks.map((leak, index) => (
                  <div
                    key={index}
                    className="border rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => toggleLeak(index)}
                      className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {expandedLeaks.has(index) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <span className="font-medium">
                          {index + 1}. {leak.description}
                        </span>
                      </div>
                      <Badge variant="destructive">-{leak.ev_loss} bb</Badge>
                    </button>
                    {expandedLeaks.has(index) && (
                      <div className="px-4 pb-4 pt-0 border-t bg-muted/30">
                        <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">{t("analyze.sampleSize")}:</span>
                            <span className="ml-2 font-medium">{leak.total_hands}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">{t("analyze.mistakesCol")}:</span>
                            <span className="ml-2 font-medium">
                              {leak.mistakes} ({leak.mistake_rate}%)
                            </span>
                          </div>
                        </div>
                        {leak.common_mistakes && (
                          <div className="mt-3">
                            <span className="text-sm text-muted-foreground">
                              {t("analyze.commonMistakes")}:
                            </span>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {Object.entries(leak.common_mistakes).map(
                                ([action, count]) => (
                                  <Badge key={action} variant="outline">
                                    {action}: {count}
                                  </Badge>
                                )
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* AI Review Section */}
          <Card className="mb-6">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  {t("analyze.ai.title")}
                </CardTitle>
                {!aiReview && (
                  <Button
                    onClick={fetchAiReview}
                    disabled={aiLoading}
                    size="sm"
                  >
                    {aiLoading ? t("common.loading") : t("analyze.ai.generate")}
                  </Button>
                )}
              </div>
              <CardDescription>{t("analyze.ai.description")}</CardDescription>
            </CardHeader>

            {aiReview && (
              <CardContent className="space-y-6">
                {/* Overall Assessment */}
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">
                      {t("analyze.ai.skillLevel")}
                    </span>
                    {getSkillLevelBadge(aiReview.skill_level)}
                  </div>
                  <p className="text-sm leading-relaxed">
                    {locale === "zh-TW"
                      ? aiReview.overall_assessment_zh
                      : aiReview.overall_assessment}
                  </p>
                </div>

                {/* Insights */}
                <div className="space-y-3">
                  <h4 className="font-medium">{t("analyze.ai.insights")}</h4>
                  {aiReview.insights.map((insight, index) => (
                    <div
                      key={index}
                      className="border rounded-lg p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">{getCategoryIcon(insight.category)}</div>
                        <div className="flex-1 min-w-0">
                          <h5 className="font-medium mb-1">
                            {locale === "zh-TW" ? insight.title_zh : insight.title}
                          </h5>
                          <p className="text-sm text-muted-foreground">
                            {locale === "zh-TW"
                              ? insight.description_zh
                              : insight.description}
                          </p>
                          {insight.drill_link && (
                            <Link
                              href={insight.drill_link}
                              className="inline-flex items-center gap-1 mt-2 text-sm text-primary hover:underline"
                            >
                              {t("analyze.ai.practiceNow")}
                              <ArrowRight className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Focus Areas */}
                {aiReview.focus_areas.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-3">{t("analyze.ai.focusAreas")}</h4>
                    <div className="flex flex-wrap gap-2">
                      {aiReview.focus_areas.map((area, index) => (
                        <Link key={index} href={area}>
                          <Badge variant="outline" className="cursor-pointer hover:bg-primary/10">
                            {area.replace("/drill/", "").replace("/quiz/", "").toUpperCase()}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>

          {/* Detailed Mistakes Toggle */}
          {result.decisions && result.decisions.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{t("analyze.detailedTitle")}</CardTitle>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDetailed(!showDetailed)}
                  >
                    {showDetailed ? t("analyze.hide") : t("analyze.show")}
                  </Button>
                </div>
              </CardHeader>
              {showDetailed && (
                <CardContent>
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {result.decisions
                      .filter((d) => d.is_mistake)
                      .slice(0, 50)
                      .map((decision, index) => (
                        <div
                          key={index}
                          className="p-3 border rounded-lg text-sm"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium">
                              #{decision.hand_id} | {decision.hero_position}{" "}
                              {decision.hero_hand}
                            </span>
                            <Badge variant="destructive">
                              -{decision.ev_loss} bb
                            </Badge>
                          </div>
                          <div className="text-muted-foreground">
                            <span>{decision.scenario}</span>
                            {decision.villain_position && (
                              <span> vs {decision.villain_position}</span>
                            )}
                            <span className="mx-2">|</span>
                            <span>
                              {t("analyze.yourAction")}: {decision.hero_action}
                            </span>
                          </div>
                          <div className="mt-1 text-xs">
                            <span className="text-muted-foreground">GTO: </span>
                            {Object.entries(decision.gto_frequencies)
                              .filter(([, freq]) => freq > 0)
                              .map(([action, freq]) => `${action} ${freq}%`)
                              .join(", ")}
                          </div>
                        </div>
                      ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </>
      )}
    </div>
  );
}
