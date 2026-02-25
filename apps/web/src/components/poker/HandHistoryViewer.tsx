"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  History,
  Download,
  Trash2,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Copy,
  Check,
} from "lucide-react";
import {
  getStoredHandHistories,
  clearHandHistories,
  exportToGGPokerFormat,
  exportHandsToGGPokerFormat,
  type HandHistory,
} from "@/lib/poker/handHistory";
import { SUIT_SYMBOLS, SUIT_CARD_COLORS } from "@/lib/poker/types";

interface HandHistoryViewerProps {
  className?: string;
}

function formatCard(card: { rank: string; suit: string }) {
  return (
    <span className={cn("font-mono", SUIT_CARD_COLORS[card.suit])}>
      {card.rank}
      {SUIT_SYMBOLS[card.suit]}
    </span>
  );
}

function HandSummaryCard({ hand, onClick }: { hand: HandHistory; onClick: () => void }) {
  const isWin = hand.heroProfit > 0;
  const isLoss = hand.heroProfit < 0;

  // Get hero's hole cards
  const hero = hand.players.find((p) => p.isHero);
  const holeCards = hero?.holeCards;

  return (
    <button
      onClick={onClick}
      className={cn(
        "hover:bg-muted/50 w-full rounded-lg border p-3 text-left transition-all",
        isWin && "border-green-500/30 bg-green-500/5",
        isLoss && "border-red-500/30 bg-red-500/5",
        !isWin && !isLoss && "border-muted"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {holeCards && (
              <>
                {formatCard(holeCards[0])}
                {formatCard(holeCards[1])}
              </>
            )}
          </div>
          <Badge variant="outline" className="text-xs">
            {hand.heroPosition}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "font-mono font-bold",
              isWin && "text-green-500",
              isLoss && "text-red-500"
            )}
          >
            {isWin && "+"}
            {hand.heroProfit.toFixed(1)} BB
          </span>
          {isWin && <TrendingUp className="h-4 w-4 text-green-500" />}
          {isLoss && <TrendingDown className="h-4 w-4 text-red-500" />}
          <ChevronRight className="text-muted-foreground h-4 w-4" />
        </div>
      </div>
      <div className="text-muted-foreground mt-2 flex items-center gap-2 text-xs">
        <span>Hand #{hand.handNumber}</span>
        <span>•</span>
        <span>
          {new Date(hand.timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
        {hand.board.flop && (
          <>
            <span>•</span>
            <span className="flex gap-0.5">
              {hand.board.flop.map((c, i) => (
                <span key={i}>{formatCard(c)}</span>
              ))}
              {hand.board.turn && formatCard(hand.board.turn)}
              {hand.board.river && formatCard(hand.board.river)}
            </span>
          </>
        )}
      </div>
    </button>
  );
}

function HandDetailView({ hand, onBack }: { hand: HandHistory; onBack: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = exportToGGPokerFormat(hand);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = exportToGGPokerFormat(hand);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hand-${hand.handNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const hero = hand.players.find((p) => p.isHero);
  const isWin = hand.heroProfit > 0;

  return (
    <div className="space-y-4">
      <Button variant="ghost" size="sm" onClick={onBack}>
        ← 返回列表
      </Button>

      {/* Summary */}
      <div
        className={cn(
          "rounded-lg p-4",
          isWin ? "bg-green-500/10" : hand.heroProfit < 0 ? "bg-red-500/10" : "bg-muted/30"
        )}
      >
        <div className="mb-2 flex items-center justify-between">
          <span className="text-muted-foreground text-sm">Hand #{hand.handNumber}</span>
          <span
            className={cn(
              "text-lg font-bold",
              isWin ? "text-green-500" : hand.heroProfit < 0 ? "text-red-500" : ""
            )}
          >
            {isWin && "+"}
            {hand.heroProfit.toFixed(1)} BB
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span>Hero ({hand.heroPosition}):</span>
          {hero?.holeCards && (
            <span className="text-lg">
              {formatCard(hero.holeCards[0])} {formatCard(hero.holeCards[1])}
            </span>
          )}
        </div>
      </div>

      {/* Board */}
      {hand.board.flop && (
        <div className="bg-muted/30 rounded-lg p-4">
          <div className="text-muted-foreground mb-2 text-sm">Board</div>
          <div className="flex gap-2 text-lg">
            {hand.board.flop.map((c, i) => (
              <span key={`flop-${i}`} className="bg-background rounded px-2 py-1">
                {formatCard(c)}
              </span>
            ))}
            {hand.board.turn && (
              <span className="bg-background rounded border-l-2 border-amber-500 px-2 py-1">
                {formatCard(hand.board.turn)}
              </span>
            )}
            {hand.board.river && (
              <span className="bg-background rounded border-l-2 border-blue-500 px-2 py-1">
                {formatCard(hand.board.river)}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-3">
        {hand.actions.preflop.length > 0 && (
          <div>
            <div className="mb-1 text-sm font-medium">Preflop</div>
            <div className="text-muted-foreground text-sm">
              {hand.actions.preflop.map((a, i) => (
                <span key={i}>
                  {i > 0 && " → "}
                  <span
                    className={a.position === hand.heroPosition ? "text-primary font-medium" : ""}
                  >
                    {a.position}: {a.action}
                    {a.amount ? ` ${a.amount.toFixed(1)}` : ""}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
        {hand.actions.flop.length > 0 && (
          <div>
            <div className="mb-1 text-sm font-medium">Flop</div>
            <div className="text-muted-foreground text-sm">
              {hand.actions.flop.map((a, i) => (
                <span key={i}>
                  {i > 0 && " → "}
                  <span
                    className={a.position === hand.heroPosition ? "text-primary font-medium" : ""}
                  >
                    {a.position}: {a.action}
                    {a.amount ? ` ${a.amount.toFixed(1)}` : ""}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
        {hand.actions.turn.length > 0 && (
          <div>
            <div className="mb-1 text-sm font-medium">Turn</div>
            <div className="text-muted-foreground text-sm">
              {hand.actions.turn.map((a, i) => (
                <span key={i}>
                  {i > 0 && " → "}
                  <span
                    className={a.position === hand.heroPosition ? "text-primary font-medium" : ""}
                  >
                    {a.position}: {a.action}
                    {a.amount ? ` ${a.amount.toFixed(1)}` : ""}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
        {hand.actions.river.length > 0 && (
          <div>
            <div className="mb-1 text-sm font-medium">River</div>
            <div className="text-muted-foreground text-sm">
              {hand.actions.river.map((a, i) => (
                <span key={i}>
                  {i > 0 && " → "}
                  <span
                    className={a.position === hand.heroPosition ? "text-primary font-medium" : ""}
                  >
                    {a.position}: {a.action}
                    {a.amount ? ` ${a.amount.toFixed(1)}` : ""}
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Result */}
      {hand.result.showdownHands && hand.result.showdownHands.length > 0 && (
        <div className="bg-muted/30 rounded-lg p-4">
          <div className="mb-2 text-sm font-medium">Showdown</div>
          <div className="space-y-1 text-sm">
            {hand.result.showdownHands.map((sh, i) => (
              <div key={i} className="flex items-center justify-between">
                <span>
                  {sh.position}: {formatCard(sh.cards[0])} {formatCard(sh.cards[1])}
                </span>
                <span className="text-muted-foreground">{sh.handDescription}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Buttons */}
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={handleCopy}>
          {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
          {copied ? "已複製" : "複製"}
        </Button>
        <Button variant="outline" size="sm" onClick={handleDownload}>
          <Download className="mr-2 h-4 w-4" />
          下載
        </Button>
      </div>
    </div>
  );
}

export function HandHistoryViewer({ className }: HandHistoryViewerProps) {
  const [histories, setHistories] = useState<HandHistory[]>([]);
  const [selectedHand, setSelectedHand] = useState<HandHistory | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setHistories(getStoredHandHistories());
    }
  }, [isOpen]);

  const handleClear = () => {
    if (confirm("確定要清除所有手牌記錄嗎？")) {
      clearHandHistories();
      setHistories([]);
      setSelectedHand(null);
    }
  };

  const handleExportAll = () => {
    if (histories.length === 0) return;
    const text = exportHandsToGGPokerFormat(histories);
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hand-history-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Calculate session stats
  const totalHands = histories.length;
  const totalProfit = histories.reduce((sum, h) => sum + h.heroProfit, 0);
  const wins = histories.filter((h) => h.heroProfit > 0).length;
  const winRate = totalHands > 0 ? ((wins / totalHands) * 100).toFixed(0) : 0;

  const content = (
    <div className="flex h-full flex-col">
      {/* Stats Summary */}
      {totalHands > 0 && (
        <div className="bg-muted/30 mb-4 grid grid-cols-3 gap-2 rounded-lg p-3">
          <div className="text-center">
            <div className="text-lg font-bold">{totalHands}</div>
            <div className="text-muted-foreground text-xs">Hands</div>
          </div>
          <div className="text-center">
            <div
              className={cn(
                "text-lg font-bold",
                totalProfit > 0 ? "text-green-500" : totalProfit < 0 ? "text-red-500" : ""
              )}
            >
              {totalProfit > 0 && "+"}
              {totalProfit.toFixed(1)}
            </div>
            <div className="text-muted-foreground text-xs">BB P/L</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold">{winRate}%</div>
            <div className="text-muted-foreground text-xs">Win Rate</div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mb-4 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportAll}
          disabled={histories.length === 0}
          className="flex-1"
        >
          <Download className="mr-2 h-4 w-4" />
          匯出全部
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={histories.length === 0}
          className="text-red-500 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Hand List or Detail */}
      <div className="flex-1 overflow-y-auto">
        {selectedHand ? (
          <HandDetailView hand={selectedHand} onBack={() => setSelectedHand(null)} />
        ) : histories.length > 0 ? (
          <div className="space-y-2">
            {histories.map((hand) => (
              <HandSummaryCard key={hand.id} hand={hand} onClick={() => setSelectedHand(hand)} />
            ))}
          </div>
        ) : (
          <div className="text-muted-foreground py-8 text-center">
            <History className="mx-auto mb-2 h-12 w-12 opacity-50" />
            <p>尚無手牌記錄</p>
            <p className="text-sm">開始練習後會自動記錄</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <History className="mr-2 h-4 w-4" />
          手牌回顧
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>手牌歷史</SheetTitle>
          <SheetDescription>查看並匯出你的練習記錄</SheetDescription>
        </SheetHeader>
        <div className="mt-4 h-[calc(100vh-120px)]">{content}</div>
      </SheetContent>
    </Sheet>
  );
}
