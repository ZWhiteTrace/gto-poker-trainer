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

function HandHistoryDetail({ history }: { history: HandHistory }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = exportToGGPokerFormat(history);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
    </div>
  );
}

export function HandHistoryPanel({ className }: HandHistoryPanelProps) {
  const [histories, setHistories] = useState<HandHistory[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

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
    }
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
                onClick={handleExportAll}
                disabled={isExporting}
                className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 rounded transition-colors disabled:opacity-50"
              >
                {isExporting ? "Exporting..." : "Export All"}
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
