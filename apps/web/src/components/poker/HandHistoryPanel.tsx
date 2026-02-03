"use client";

import { useState, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { HandHistory, Card, Position } from "@/lib/poker/types";
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
  type GTOComparison,
} from "@/lib/poker/handAnalyzer";

interface HandHistoryPanelProps {
  className?: string;
}

const SUIT_SYMBOLS: Record<string, string> = {
  s: "♠",
  h: "♥",
  d: "♦",
  c: "♣",
};

const SUIT_COLORS: Record<string, string> = {
  s: "text-slate-800",
  h: "text-red-500",
  d: "text-blue-500",
  c: "text-green-600",
};

function formatCard(card: Card): ReactNode {
  return (
    <span className={cn("font-mono", SUIT_COLORS[card.suit])}>
      {card.rank}{SUIT_SYMBOLS[card.suit]}
    </span>
  );
}

function formatProfit(profit: number): ReactNode {
  const formatted = profit >= 0 ? `+${profit.toFixed(1)}` : profit.toFixed(1);
  return (
    <span className={cn(
      "font-semibold",
      profit > 0 ? "text-green-500" : profit < 0 ? "text-red-500" : "text-gray-400"
    )}>
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
  const heroPlayer = history.players.find(p => p.isHero);
  const heroCards = heroPlayer?.holeCards;

  return (
    <div
      onClick={onSelect}
      className={cn(
        "flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors",
        isSelected ? "bg-blue-600/30" : "hover:bg-gray-700/50"
      )}
    >
      <div className="flex items-center gap-3">
        {/* Hand number */}
        <span className="text-xs text-gray-500 w-8">#{history.handNumber}</span>

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
        <span className="text-xs px-1.5 py-0.5 bg-gray-700 rounded">
          {history.heroPosition}
        </span>
      </div>

      {/* Profit */}
      {formatProfit(history.heroProfit)}
    </div>
  );
}

// GTO Analysis Display Component
function GTOAnalysisDisplay({ analysis }: { analysis: HandAnalysis }) {
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
    <div className="space-y-3 p-3 bg-gray-800/50 rounded-lg text-sm">
      {/* Grade */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={cn("px-2 py-1 rounded font-bold text-white", gradeColors[analysis.grade])}>
            {analysis.grade}
          </span>
          <span className="text-gray-300">{analysis.gradeDescriptionZh}</span>
        </div>
        <span className="text-xs text-gray-500">
          偏離分數: {analysis.averageDeviationScore.toFixed(1)}
        </span>
      </div>

      {/* Decisions */}
      {analysis.decisions.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-gray-400 font-semibold">決策分析：</div>
          {analysis.decisions.map((d, i) => (
            <div key={i} className="flex items-start gap-2 p-2 bg-gray-900/50 rounded">
              <span className="text-xs px-1.5 py-0.5 bg-gray-700 rounded capitalize">
                {d.decisionPoint.street}
              </span>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn("font-semibold capitalize", deviationColors[d.deviationType])}>
                    {d.heroAction}
                    {d.heroAmount && ` ${d.heroAmount.toFixed(1)}`}
                  </span>
                  <span className="text-xs text-gray-500">
                    (GTO: {d.heroActionFrequency.toFixed(0)}%)
                  </span>
                </div>
                <div className="text-xs text-gray-400 mt-1">
                  {d.analysisZh}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Biggest Mistake */}
      {analysis.biggestMistake && analysis.biggestMistake.deviationType !== "correct" && (
        <div className="p-2 bg-red-900/30 border border-red-800/50 rounded">
          <div className="text-xs text-red-400 font-semibold mb-1">最大錯誤：</div>
          <div className="text-sm text-gray-300">
            {analysis.biggestMistake.decisionPoint.street} 街：
            應 {analysis.biggestMistake.recommendedAction} ({analysis.biggestMistake.recommendedFrequency.toFixed(0)}%)
            而非 {analysis.biggestMistake.heroAction} ({analysis.biggestMistake.heroActionFrequency.toFixed(0)}%)
          </div>
        </div>
      )}
    </div>
  );
}

// Session Analysis Summary
function SessionAnalysisSummary({ summary }: {
  summary: {
    totalHands: number;
    averageGrade: string;
    averageDeviationScore: number;
    mostCommonMistake: string;
    improvementAreas: string[];
  }
}) {
  const gradeColors: Record<string, string> = {
    A: "bg-green-600",
    B: "bg-blue-600",
    C: "bg-yellow-600",
    D: "bg-orange-600",
    F: "bg-red-600",
  };

  return (
    <div className="space-y-3 p-3 bg-gradient-to-br from-gray-800/80 to-gray-900/80 rounded-lg text-sm border border-gray-700/50">
      <div className="flex items-center justify-between">
        <div className="text-gray-300 font-semibold">Session 分析</div>
        <span className={cn("px-2 py-1 rounded font-bold text-white", gradeColors[summary.averageGrade])}>
          平均 {summary.averageGrade}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2 bg-gray-900/50 rounded">
          <div className="text-gray-500">總手數</div>
          <div className="text-lg font-bold text-gray-200">{summary.totalHands}</div>
        </div>
        <div className="p-2 bg-gray-900/50 rounded">
          <div className="text-gray-500">平均偏離</div>
          <div className="text-lg font-bold text-gray-200">{summary.averageDeviationScore.toFixed(1)}</div>
        </div>
      </div>

      {summary.mostCommonMistake !== "None" && (
        <div className="p-2 bg-orange-900/30 border border-orange-800/50 rounded">
          <div className="text-xs text-orange-400 font-semibold">最常見錯誤：</div>
          <div className="text-gray-300">{summary.mostCommonMistake}</div>
        </div>
      )}

      {summary.improvementAreas.length > 0 && (
        <div className="p-2 bg-blue-900/30 border border-blue-800/50 rounded">
          <div className="text-xs text-blue-400 font-semibold mb-1">改進建議：</div>
          <ul className="text-xs text-gray-300 space-y-1">
            {summary.improvementAreas.map((area, i) => (
              <li key={i}>• {area}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function HandHistoryDetail({ history }: { history: HandHistory }) {
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
    } catch (error) {
      // Analysis failed silently
    }
    setIsAnalyzing(false);
  };

  const heroPlayer = history.players.find(p => p.isHero);
  const heroCards = heroPlayer?.holeCards;

  return (
    <div className="space-y-3 p-3 bg-gray-800/50 rounded-lg text-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Hand #{history.handNumber}</span>
          <span className="text-xs text-gray-400">
            {new Date(history.timestamp).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className={cn(
              "px-2 py-1 text-xs rounded transition-colors",
              isAnalyzing
                ? "bg-gray-600 text-gray-400"
                : "bg-purple-600 hover:bg-purple-500 text-white"
            )}
          >
            {isAnalyzing ? "分析中..." : "GTO 分析"}
          </button>
          <button
            onClick={handleCopy}
            className={cn(
              "px-2 py-1 text-xs rounded transition-colors",
              copied
                ? "bg-green-600 text-white"
                : "bg-gray-700 hover:bg-gray-600 text-gray-300"
            )}
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </div>

      {/* Hero info */}
      <div className="flex items-center gap-3">
        <span className="text-gray-400">Hero:</span>
        <span className="px-1.5 py-0.5 bg-yellow-600/30 text-yellow-400 rounded text-xs font-semibold">
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
          <span className="text-gray-400">Board:</span>
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
        <span className="text-gray-400">Winner:</span>
        {history.result.winners.map((w, i) => (
          <span key={i} className="text-green-400">
            {w.position} ({w.amount.toFixed(1)} BB)
            {w.handDescription && ` - ${w.handDescription}`}
          </span>
        ))}
      </div>

      {/* Action summary */}
      <div className="text-xs text-gray-500 space-y-1">
        {history.actions.preflop.length > 0 && (
          <div>
            Preflop: {history.actions.preflop.map(a =>
              `${a.position} ${a.action}${a.amount ? ` ${a.amount.toFixed(1)}` : ""}`
            ).join(" → ")}
          </div>
        )}
        {history.actions.flop.length > 0 && (
          <div>
            Flop: {history.actions.flop.map(a =>
              `${a.position} ${a.action}${a.amount ? ` ${a.amount.toFixed(1)}` : ""}`
            ).join(" → ")}
          </div>
        )}
        {history.actions.turn.length > 0 && (
          <div>
            Turn: {history.actions.turn.map(a =>
              `${a.position} ${a.action}${a.amount ? ` ${a.amount.toFixed(1)}` : ""}`
            ).join(" → ")}
          </div>
        )}
        {history.actions.river.length > 0 && (
          <div>
            River: {history.actions.river.map(a =>
              `${a.position} ${a.action}${a.amount ? ` ${a.amount.toFixed(1)}` : ""}`
            ).join(" → ")}
          </div>
        )}
      </div>

      {/* GTO Analysis Result */}
      {analysis && (
        <div className="mt-3 pt-3 border-t border-gray-700">
          <GTOAnalysisDisplay analysis={analysis} />
        </div>
      )}
    </div>
  );
}

export function HandHistoryPanel({ className }: HandHistoryPanelProps) {
  const [histories, setHistories] = useState<HandHistory[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [sessionAnalysis, setSessionAnalysis] = useState<Awaited<ReturnType<typeof analyzeMultipleHands>> | null>(null);
  const [isAnalyzingSession, setIsAnalyzingSession] = useState(false);

  useEffect(() => {
    setHistories(getStoredHandHistories());
  }, []);

  // Refresh histories periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setHistories(getStoredHandHistories());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const selectedHistory = histories.find(h => h.id === selectedId);

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
    if (confirm("Clear all hand history?")) {
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
    } catch (error) {
      // Analysis failed silently
    }
    setIsAnalyzingSession(false);
  };

  const totalProfit = histories.reduce((sum, h) => sum + h.heroProfit, 0);

  return (
    <div className={cn("flex flex-col bg-gray-900/90 rounded-xl p-4", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-200">Hand History</h3>
          <span className="text-xs text-gray-500">({histories.length} hands)</span>
        </div>
        <div className="flex items-center gap-2">
          {histories.length > 0 && (
            <>
              <button
                onClick={handleAnalyzeSession}
                disabled={isAnalyzingSession}
                className="px-2 py-1 text-xs bg-purple-600 hover:bg-purple-500 rounded transition-colors disabled:opacity-50"
              >
                {isAnalyzingSession ? "分析中..." : "GTO 分析"}
              </button>
              <button
                onClick={handleExportAll}
                disabled={isExporting}
                className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 rounded transition-colors disabled:opacity-50"
              >
                {isExporting ? "Exporting..." : "Export"}
              </button>
              <button
                onClick={handleClear}
                className="px-2 py-1 text-xs bg-red-600/50 hover:bg-red-600 rounded transition-colors"
              >
                Clear
              </button>
            </>
          )}
        </div>
      </div>

      {/* Total profit */}
      {histories.length > 0 && (
        <div className="flex items-center gap-2 mb-3 px-2 py-1.5 bg-gray-800/50 rounded">
          <span className="text-xs text-gray-400">Session:</span>
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
      <div className="flex-1 overflow-y-auto space-y-1 max-h-[300px] min-h-[100px]">
        {histories.length === 0 ? (
          <div className="text-center text-gray-500 text-sm py-8">
            No hands played yet
          </div>
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
