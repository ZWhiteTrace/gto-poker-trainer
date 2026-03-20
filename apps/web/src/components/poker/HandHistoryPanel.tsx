"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import type { HandHistory, Card } from "@/lib/poker/types";
import { SUIT_SYMBOLS, SUIT_COLORS } from "@/lib/poker/types";
import {
  getDisplayHandDescription,
  getDisplayPlayerNameByPosition,
  getHandHistoryStreetLabel,
  getPokerActionLabel,
  localizeCommonMistake,
  localizeImprovementArea,
} from "@/lib/poker/handHistoryDisplay";
import {
  getStoredHandHistories,
  clearHandHistories,
  exportToGGPokerFormat,
  exportHandsToGGPokerFormat,
} from "@/lib/poker/handHistory";
import {
  analyzeHandHistory,
  analyzeMultipleHands,
  type HandAnalysis,
} from "@/lib/poker/handAnalyzer";

interface HandHistoryPanelProps {
  className?: string;
}

const historyCopy = {
  "zh-TW": {
    deviationScore: "偏離分數",
    decisionAnalysis: "決策分析：",
    biggestMistake: "最大錯誤：",
    shouldHave: "應",
    insteadOf: "而非",
    sessionAnalysis: "Session 分析",
    average: "平均",
    totalHands: "總手數",
    averageDeviation: "平均偏離",
    commonMistake: "最常見錯誤：",
    improvementAreas: "改進建議：",
    analyzing: "分析中...",
    analyze: "GTO 分析",
    hero: "Hero",
    board: "公共牌",
    winner: "贏家",
    clearConfirm: "確定要清除所有手牌記錄嗎？",
    handHistory: "手牌歷史",
    session: "Session",
    noHands: "尚未有任何手牌記錄",
    copied: "已複製",
    copy: "複製",
    export: "匯出",
    exporting: "匯出中...",
    clear: "清除",
    hands: (count: number) => `${count} 手`,
    handNumber: (count: number) => `手牌 #${count}`,
  },
  en: {
    deviationScore: "Deviation Score",
    decisionAnalysis: "Decision Analysis:",
    biggestMistake: "Biggest Mistake:",
    shouldHave: "Should have",
    insteadOf: "instead of",
    sessionAnalysis: "Session Analysis",
    average: "Average",
    totalHands: "Total Hands",
    averageDeviation: "Average Deviation",
    commonMistake: "Most Common Mistake:",
    improvementAreas: "Improvement Areas:",
    analyzing: "Analyzing...",
    analyze: "GTO Analysis",
    hero: "Hero",
    board: "Board",
    winner: "Winner",
    clearConfirm: "Clear all hand history?",
    handHistory: "Hand History",
    session: "Session",
    noHands: "No hands played yet",
    copied: "Copied!",
    copy: "Copy",
    export: "Export",
    exporting: "Exporting...",
    clear: "Clear",
    hands: (count: number) => `${count} hands`,
    handNumber: (count: number) => `Hand #${count}`,
  },
} as const;

function formatActionSummary(history: HandHistory, locale: "en" | "zh-TW") {
  return (street: keyof HandHistory["actions"]) =>
    history.actions[street]
      .map(
        (action) =>
          `${action.position} ${getPokerActionLabel(action.action, locale)}${
            action.amount ? ` ${action.amount.toFixed(1)}` : ""
          }`
      )
      .join(" → ");
}

function formatCard(card: Card): ReactNode {
  return (
    <span className={cn("font-mono", SUIT_COLORS[card.suit])}>
      {card.rank}
      {SUIT_SYMBOLS[card.suit]}
    </span>
  );
}

function formatProfit(profit: number): ReactNode {
  const formatted = profit >= 0 ? `+${profit.toFixed(1)}` : profit.toFixed(1);
  return (
    <span
      className={cn(
        "font-semibold",
        profit > 0 ? "text-green-500" : profit < 0 ? "text-red-500" : "text-gray-400"
      )}
    >
      {formatted} BB
    </span>
  );
}

function HandHistoryRow({
  history,
  onSelect,
  isSelected,
}: {
  history: HandHistory;
  onSelect: () => void;
  isSelected: boolean;
}) {
  const heroPlayer = history.players.find((p) => p.isHero);
  const heroCards = heroPlayer?.holeCards;

  return (
    <div
      onClick={onSelect}
      className={cn(
        "flex cursor-pointer items-center justify-between rounded-lg p-2 transition-colors",
        isSelected ? "bg-blue-600/30" : "hover:bg-gray-700/50"
      )}
    >
      <div className="flex items-center gap-3">
        {/* Hand number */}
        <span className="w-8 text-xs text-gray-500">#{history.handNumber}</span>

        {/* Hero cards */}
        <div className="flex gap-0.5 font-mono text-sm">
          {heroCards ? (
            <>
              {formatCard(heroCards[0])}
              {formatCard(heroCards[1])}
            </>
          ) : (
            <span className="text-gray-500">--</span>
          )}
        </div>

        {/* Position */}
        <span className="rounded bg-gray-700 px-1.5 py-0.5 text-xs">{history.heroPosition}</span>
      </div>

      {/* Profit */}
      {formatProfit(history.heroProfit)}
    </div>
  );
}

// GTO Analysis Display Component
function GTOAnalysisDisplay({ analysis }: { analysis: HandAnalysis }) {
  const locale = useLocale() === "en" ? "en" : "zh-TW";
  const copy = historyCopy[locale];
  const gradeColors: Record<string, string> = {
    A: "bg-green-600",
    B: "bg-blue-600",
    C: "bg-yellow-600",
    D: "bg-orange-600",
    F: "bg-red-600",
  };

  const deviationColors: Record<string, string> = {
    correct: "text-green-400",
    minor: "text-yellow-400",
    significant: "text-orange-400",
    major: "text-red-400",
  };

  return (
    <div className="space-y-3 rounded-lg bg-gray-800/50 p-3 text-sm">
      {/* Grade */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn("rounded px-2 py-1 font-bold text-white", gradeColors[analysis.grade])}
          >
            {analysis.grade}
          </span>
          <span className="text-gray-300">
            {locale === "en" ? analysis.gradeDescription : analysis.gradeDescriptionZh}
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {copy.deviationScore}: {analysis.averageDeviationScore.toFixed(1)}
        </span>
      </div>

      {/* Decisions */}
      {analysis.decisions.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-gray-400">{copy.decisionAnalysis}</div>
          {analysis.decisions.map((d, i) => (
            <div key={i} className="flex items-start gap-2 rounded bg-gray-900/50 p-2">
              <span className="rounded bg-gray-700 px-1.5 py-0.5 text-xs capitalize">
                {getHandHistoryStreetLabel(d.decisionPoint.street, locale)}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span
                    className={cn("font-semibold capitalize", deviationColors[d.deviationType])}
                  >
                    {getPokerActionLabel(d.heroAction, locale)}
                    {d.heroAmount && ` ${d.heroAmount.toFixed(1)}`}
                  </span>
                  <span className="text-xs text-gray-500">
                    (GTO: {d.heroActionFrequency.toFixed(0)}%)
                  </span>
                </div>
                <div className="mt-1 text-xs text-gray-400">
                  {locale === "en" ? d.analysis : d.analysisZh}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Biggest Mistake */}
      {analysis.biggestMistake && analysis.biggestMistake.deviationType !== "correct" && (
        <div className="rounded border border-red-800/50 bg-red-900/30 p-2">
        <div className="mb-1 text-xs font-semibold text-red-400">{copy.biggestMistake}</div>
        <div className="text-sm text-gray-300">
            {getHandHistoryStreetLabel(analysis.biggestMistake.decisionPoint.street, locale)}:{" "}
            {copy.shouldHave} {getPokerActionLabel(analysis.biggestMistake.recommendedAction, locale)} (
            {analysis.biggestMistake.recommendedFrequency.toFixed(0)}%) {copy.insteadOf}{" "}
            {getPokerActionLabel(analysis.biggestMistake.heroAction, locale)} (
            {analysis.biggestMistake.heroActionFrequency.toFixed(0)}%)
          </div>
        </div>
      )}
    </div>
  );
}

// Session Analysis Summary
function SessionAnalysisSummary({
  summary,
}: {
  summary: {
    totalHands: number;
    averageGrade: string;
    averageDeviationScore: number;
    mostCommonMistake: string;
    improvementAreas: string[];
  };
}) {
  const locale = useLocale() === "en" ? "en" : "zh-TW";
  const copy = historyCopy[locale];
  const gradeColors: Record<string, string> = {
    A: "bg-green-600",
    B: "bg-blue-600",
    C: "bg-yellow-600",
    D: "bg-orange-600",
    F: "bg-red-600",
  };

  return (
    <div className="space-y-3 rounded-lg border border-gray-700/50 bg-gradient-to-br from-gray-800/80 to-gray-900/80 p-3 text-sm">
      <div className="flex items-center justify-between">
        <div className="font-semibold text-gray-300">{copy.sessionAnalysis}</div>
        <span
          className={cn(
            "rounded px-2 py-1 font-bold text-white",
            gradeColors[summary.averageGrade]
          )}
        >
          {copy.average} {summary.averageGrade}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded bg-gray-900/50 p-2">
          <div className="text-gray-500">{copy.totalHands}</div>
          <div className="text-lg font-bold text-gray-200">{summary.totalHands}</div>
        </div>
        <div className="rounded bg-gray-900/50 p-2">
          <div className="text-gray-500">{copy.averageDeviation}</div>
          <div className="text-lg font-bold text-gray-200">
            {summary.averageDeviationScore.toFixed(1)}
          </div>
        </div>
      </div>

      {summary.mostCommonMistake !== "None" && (
        <div className="rounded border border-orange-800/50 bg-orange-900/30 p-2">
          <div className="text-xs font-semibold text-orange-400">{copy.commonMistake}</div>
          <div className="text-gray-300">{localizeCommonMistake(summary.mostCommonMistake, locale)}</div>
        </div>
      )}

      {summary.improvementAreas.length > 0 && (
        <div className="rounded border border-blue-800/50 bg-blue-900/30 p-2">
          <div className="mb-1 text-xs font-semibold text-blue-400">{copy.improvementAreas}</div>
          <ul className="space-y-1 text-xs text-gray-300">
            {summary.improvementAreas.map((area, i) => (
              <li key={i}>• {localizeImprovementArea(area, locale)}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function HandHistoryDetail({ history }: { history: HandHistory }) {
  const locale = useLocale() === "en" ? "en" : "zh-TW";
  const copy = historyCopy[locale];
  const [copied, setCopied] = useState(false);
  const [analysis, setAnalysis] = useState<HandAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleCopy = async () => {
    const text = exportToGGPokerFormat(history);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeHandHistory(history);
      setAnalysis(result);
    } catch {
      // Analysis failed silently
    }
    setIsAnalyzing(false);
  };

  const heroPlayer = history.players.find((p) => p.isHero);
  const heroCards = heroPlayer?.holeCards;
  const summarizeStreet = formatActionSummary(history, locale);

  return (
    <div className="space-y-3 rounded-lg bg-gray-800/50 p-3 text-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold">{copy.handNumber(history.handNumber)}</span>
          <span className="text-xs text-gray-400">
            {new Date(history.timestamp).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className={cn(
              "rounded px-2 py-1 text-xs transition-colors",
              isAnalyzing
                ? "bg-gray-600 text-gray-400"
                : "bg-purple-600 text-white hover:bg-purple-500"
            )}
          >
            {isAnalyzing ? copy.analyzing : copy.analyze}
          </button>
          <button
            onClick={handleCopy}
            className={cn(
              "rounded px-2 py-1 text-xs transition-colors",
              copied ? "bg-green-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            )}
          >
            {copied ? copy.copied : copy.copy}
          </button>
        </div>
      </div>

      {/* Hero info */}
      <div className="flex items-center gap-3">
        <span className="text-gray-400">{copy.hero}:</span>
        <span className="rounded bg-yellow-600/30 px-1.5 py-0.5 text-xs font-semibold text-yellow-400">
          {history.heroPosition}
        </span>
        {heroCards && (
          <div className="flex gap-1 font-mono">
            {formatCard(heroCards[0])}
            {formatCard(heroCards[1])}
          </div>
        )}
        {formatProfit(history.heroProfit)}
      </div>

      {/* Board */}
      {history.board.flop && (
        <div className="flex items-center gap-2">
          <span className="text-gray-400">{copy.board}:</span>
          <div className="flex gap-1 font-mono">
            {history.board.flop.map((c, i) => (
              <span key={`flop-${i}`}>{formatCard(c)}</span>
            ))}
            {history.board.turn && formatCard(history.board.turn)}
            {history.board.river && formatCard(history.board.river)}
          </div>
        </div>
      )}

      {/* Winners */}
      <div className="flex items-center gap-2">
        <span className="text-gray-400">{copy.winner}:</span>
        {history.result.winners.map((w, i) => (
          <span key={i} className="text-green-400">
            {getDisplayPlayerNameByPosition(history.players, w.position, locale)} ({w.position},{" "}
            {w.amount.toFixed(1)} BB)
            {getDisplayHandDescription(w.handDescription, w.handDescriptionZh, locale) &&
              ` - ${getDisplayHandDescription(w.handDescription, w.handDescriptionZh, locale)}`}
          </span>
        ))}
      </div>

      {/* Action summary */}
      <div className="space-y-1 text-xs text-gray-500">
        {history.actions.preflop.length > 0 && (
          <div>
            {getHandHistoryStreetLabel("preflop", locale)}: {summarizeStreet("preflop")}
          </div>
        )}
        {history.actions.flop.length > 0 && (
          <div>
            {getHandHistoryStreetLabel("flop", locale)}: {summarizeStreet("flop")}
          </div>
        )}
        {history.actions.turn.length > 0 && (
          <div>
            {getHandHistoryStreetLabel("turn", locale)}: {summarizeStreet("turn")}
          </div>
        )}
        {history.actions.river.length > 0 && (
          <div>
            {getHandHistoryStreetLabel("river", locale)}: {summarizeStreet("river")}
          </div>
        )}
      </div>

      {/* GTO Analysis Result */}
      {analysis && (
        <div className="mt-3 border-t border-gray-700 pt-3">
          <GTOAnalysisDisplay analysis={analysis} />
        </div>
      )}
    </div>
  );
}

export function HandHistoryPanel({ className }: HandHistoryPanelProps) {
  const locale = useLocale() === "en" ? "en" : "zh-TW";
  const copy = historyCopy[locale];
  const [histories, setHistories] = useState<HandHistory[]>(() => getStoredHandHistories());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [sessionAnalysis, setSessionAnalysis] = useState<Awaited<
    ReturnType<typeof analyzeMultipleHands>
  > | null>(null);
  const [isAnalyzingSession, setIsAnalyzingSession] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setHistories(getStoredHandHistories());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const selectedHistory = histories.find((h) => h.id === selectedId);

  const handleExportAll = async () => {
    if (histories.length === 0) return;

    setIsExporting(true);
    const text = exportHandsToGGPokerFormat(histories);

    // Create download
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `gto-trainer-hands-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setIsExporting(false);
  };

  const handleClear = () => {
    if (confirm(copy.clearConfirm)) {
      clearHandHistories();
      setHistories([]);
      setSelectedId(null);
      setSessionAnalysis(null);
    }
  };

  const handleAnalyzeSession = async () => {
    if (histories.length === 0) return;
    setIsAnalyzingSession(true);
    try {
      const result = await analyzeMultipleHands(histories);
      setSessionAnalysis(result);
    } catch {
      // Analysis failed silently
    }
    setIsAnalyzingSession(false);
  };

  const totalProfit = histories.reduce((sum, h) => sum + h.heroProfit, 0);

  return (
    <div className={cn("flex flex-col rounded-xl bg-gray-900/90 p-4", className)}>
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-200">{copy.handHistory}</h3>
          <span className="text-xs text-gray-500">({copy.hands(histories.length)})</span>
        </div>
        <div className="flex items-center gap-2">
          {histories.length > 0 && (
            <>
              <button
                onClick={handleAnalyzeSession}
                disabled={isAnalyzingSession}
                className="rounded bg-purple-600 px-2 py-1 text-xs transition-colors hover:bg-purple-500 disabled:opacity-50"
              >
                {isAnalyzingSession ? copy.analyzing : copy.analyze}
              </button>
              <button
                onClick={handleExportAll}
                disabled={isExporting}
                className="rounded bg-blue-600 px-2 py-1 text-xs transition-colors hover:bg-blue-500 disabled:opacity-50"
              >
                {isExporting ? copy.exporting : copy.export}
              </button>
              <button
                onClick={handleClear}
                className="rounded bg-red-600/50 px-2 py-1 text-xs transition-colors hover:bg-red-600"
              >
                {copy.clear}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Total profit */}
      {histories.length > 0 && (
        <div className="mb-3 flex items-center gap-2 rounded bg-gray-800/50 px-2 py-1.5">
          <span className="text-xs text-gray-400">{copy.session}:</span>
          {formatProfit(totalProfit)}
        </div>
      )}

      {/* Session Analysis */}
      {sessionAnalysis && (
        <div className="mb-3">
          <SessionAnalysisSummary summary={sessionAnalysis.summary} />
        </div>
      )}

      {/* History list */}
      <div className="max-h-[300px] min-h-[100px] flex-1 space-y-1 overflow-y-auto">
        {histories.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">{copy.noHands}</div>
        ) : (
          histories.map((h) => (
            <HandHistoryRow
              key={h.id}
              history={h}
              onSelect={() => setSelectedId(selectedId === h.id ? null : h.id)}
              isSelected={selectedId === h.id}
            />
          ))
        )}
      </div>

      {/* Selected hand detail */}
      {selectedHistory && (
        <div className="mt-3 border-t border-gray-700 pt-3">
          <HandHistoryDetail history={selectedHistory} />
        </div>
      )}
    </div>
  );
}
