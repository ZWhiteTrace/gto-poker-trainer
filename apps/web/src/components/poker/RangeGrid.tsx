"use client";

import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];

// Premium hands for highlighting
const PREMIUM_T1 = ["AA", "KK", "QQ", "AKs", "AKo"]; // Gold border
const PREMIUM_T2 = ["JJ", "TT", "AQs", "AQo", "AJs", "KQs"]; // White border
const PREMIUM_T3 = ["99", "88", "KJs", "QJs", "ATs", "AJo", "KQo"]; // Light border

interface HandData {
  raise?: number;
  call?: number;
  fold?: number;
  allin?: number;
  "3bet"?: number;
  "4bet"?: number;
  [key: string]: number | undefined;
}

type ActionFilter = "all" | "raise" | "call" | "fold" | "mixed";

interface RangeGridProps {
  hands: Record<string, HandData>;
  drillableHands?: string[];
  selectedHand?: string | null;
  onHandClick?: (hand: string) => void;
  className?: string;
  compact?: boolean;
  showFilters?: boolean;
  showStats?: boolean;
}

function getHandKey(row: number, col: number): string {
  const rank1 = RANKS[row];
  const rank2 = RANKS[col];

  if (row === col) {
    return `${rank1}${rank2}`;
  } else if (row < col) {
    return `${rank1}${rank2}s`;
  } else {
    return `${rank2}${rank1}o`;
  }
}

// Color constants matching GTOWizard style
const COLOR_RAISE = "#ef4444";
const COLOR_CALL = "#22c55e";
const COLOR_FOLD = "#1e293b";

function getHandFrequencies(handData: HandData | undefined) {
  if (!handData) return { raise: 0, call: 0, fold: 100, allin: 0 };

  const raise = (handData.raise || 0) + (handData["3bet"] || 0) + (handData["4bet"] || 0) + (handData["5bet"] || 0);
  const call = handData.call || 0;
  const allin = handData.allin || 0;
  const fold = handData.fold || Math.max(0, 100 - raise - call - allin);

  return { raise: raise + allin, call, fold, allin };
}

function getActionColorStyle(handData: HandData | undefined, filter: ActionFilter): React.CSSProperties {
  const { raise, call, fold } = getHandFrequencies(handData);

  // Apply filter opacity
  if (filter !== "all") {
    const matchesFilter =
      (filter === "raise" && raise > 0) ||
      (filter === "call" && call > 0) ||
      (filter === "fold" && raise === 0 && call === 0) ||
      (filter === "mixed" && raise > 0 && raise < 100 && (call > 0 || fold > 0));

    if (!matchesFilter) {
      return { backgroundColor: COLOR_FOLD, opacity: 0.3 };
    }
  }

  if (raise === 0 && call === 0) {
    return { backgroundColor: COLOR_FOLD };
  }

  if (raise >= 100) {
    return { backgroundColor: COLOR_RAISE };
  }
  if (call >= 100) {
    return { backgroundColor: COLOR_CALL };
  }

  // Mixed strategy gradient
  const stops: string[] = [];
  let currentPos = 0;

  if (raise > 0) {
    stops.push(`${COLOR_RAISE} ${currentPos}%`);
    currentPos += raise;
    stops.push(`${COLOR_RAISE} ${currentPos}%`);
  }

  if (call > 0) {
    stops.push(`${COLOR_CALL} ${currentPos}%`);
    currentPos += call;
    stops.push(`${COLOR_CALL} ${currentPos}%`);
  }

  if (currentPos < 100) {
    stops.push(`${COLOR_FOLD} ${currentPos}%`);
    stops.push(`${COLOR_FOLD} 100%`);
  }

  return {
    background: `linear-gradient(to right, ${stops.join(", ")})`,
  };
}

function getPremiumClass(hand: string): string {
  if (PREMIUM_T1.includes(hand)) return "ring-2 ring-yellow-400";
  if (PREMIUM_T2.includes(hand)) return "ring-1 ring-white/60";
  if (PREMIUM_T3.includes(hand)) return "ring-1 ring-white/30";
  return "";
}

export function RangeGrid({
  hands,
  drillableHands,
  selectedHand,
  onHandClick,
  className,
  compact = false,
  showFilters = true,
  showStats = true,
}: RangeGridProps) {
  const t = useTranslations();
  const [hoveredHand, setHoveredHand] = useState<string | null>(null);
  const [filter, setFilter] = useState<ActionFilter>("all");

  // Calculate statistics
  const stats = useMemo(() => {
    let raiseCount = 0;
    let callCount = 0;
    let foldCount = 0;
    let mixedCount = 0;

    Object.values(hands).forEach((handData) => {
      const { raise, call } = getHandFrequencies(handData);
      if (raise >= 100) raiseCount++;
      else if (call >= 100) callCount++;
      else if (raise === 0 && call === 0) foldCount++;
      else {
        mixedCount++;
        // Count partial contributions
        if (raise > 0) raiseCount += raise / 100;
        if (call > 0) callCount += call / 100;
      }
    });

    const total = Object.keys(hands).length || 169;
    const vpip = raiseCount + callCount;

    return {
      raise: { count: Math.round(raiseCount), pct: Math.round((raiseCount / 169) * 100) },
      call: { count: Math.round(callCount), pct: Math.round((callCount / 169) * 100) },
      fold: { count: 169 - Math.round(vpip), pct: Math.round(((169 - vpip) / 169) * 100) },
      vpip: { count: Math.round(vpip), pct: Math.round((vpip / 169) * 100) },
      mixed: mixedCount,
    };
  }, [hands]);

  const filterButtons: { key: ActionFilter; label: string; color: string }[] = [
    { key: "all", label: t("range.filter.all"), color: "bg-muted" },
    { key: "raise", label: t("range.filter.raise"), color: "bg-red-500" },
    { key: "call", label: t("range.filter.call"), color: "bg-green-500" },
    { key: "mixed", label: t("range.filter.mixed"), color: "bg-purple-500" },
    { key: "fold", label: t("range.filter.fold"), color: "bg-slate-600" },
  ];

  return (
    <div className={cn("w-full max-w-2xl mx-auto", className)}>
      {/* Filter Buttons */}
      {showFilters && !compact && (
        <div className="flex flex-wrap justify-center gap-2 mb-4">
          {filterButtons.map((btn) => (
            <Button
              key={btn.key}
              variant={filter === btn.key ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(btn.key)}
              className={cn(
                "gap-1.5",
                filter === btn.key && btn.key !== "all" && btn.color
              )}
            >
              {btn.key !== "all" && (
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{
                    backgroundColor:
                      btn.key === "raise" ? COLOR_RAISE :
                      btn.key === "call" ? COLOR_CALL :
                      btn.key === "mixed" ? "#a855f7" :
                      COLOR_FOLD
                  }}
                />
              )}
              {btn.label}
            </Button>
          ))}
        </div>
      )}

      {/* Range Grid */}
      <div
        className={cn(
          "grid gap-[1px] bg-border rounded-lg overflow-hidden",
          "grid-cols-13"
        )}
        style={{ gridTemplateColumns: "repeat(13, 1fr)" }}
      >
        {RANKS.map((_, rowIndex) =>
          RANKS.map((_, colIndex) => {
            const hand = getHandKey(rowIndex, colIndex);
            const handData = hands[hand];
            const isSelected = selectedHand === hand;
            const isHovered = hoveredHand === hand;
            const isPair = rowIndex === colIndex;
            const isDrillable = drillableHands?.includes(hand);
            const premiumClass = getPremiumClass(hand);

            return (
              <button
                key={hand}
                className={cn(
                  "aspect-square flex items-center justify-center relative",
                  "text-[10px] sm:text-xs md:text-sm font-medium transition-all",
                  "hover:scale-110 hover:z-20",
                  isSelected && "ring-2 ring-primary z-10",
                  isHovered && "ring-2 ring-primary/50 z-10",
                  isPair && "font-bold",
                  premiumClass,
                  isDrillable && "after:absolute after:bottom-0.5 after:right-0.5 after:w-1.5 after:h-1.5 after:bg-yellow-400 after:rounded-full"
                )}
                style={getActionColorStyle(handData, filter)}
                onClick={() => onHandClick?.(hand)}
                onMouseEnter={() => setHoveredHand(hand)}
                onMouseLeave={() => setHoveredHand(null)}
              >
                <span className="text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                  {hand}
                </span>
              </button>
            );
          })
        )}
      </div>

      {/* Legend */}
      {!compact && (
        <div className="flex flex-wrap justify-center gap-4 mt-4 text-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: COLOR_RAISE }} />
            <span>{t("range.legend.raise")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: COLOR_CALL }} />
            <span>{t("range.legend.call")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded" style={{ backgroundColor: COLOR_FOLD }} />
            <span>{t("range.legend.fold")}</span>
          </div>
          {drillableHands && drillableHands.length > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <span>{t("range.legend.drillable")}</span>
            </div>
          )}
        </div>
      )}

      {/* Statistics */}
      {showStats && !compact && (
        <div className="grid grid-cols-4 gap-2 mt-4">
          <StatBox
            label="RAISE"
            count={stats.raise.count}
            pct={stats.raise.pct}
            color="text-red-400"
          />
          <StatBox
            label="CALL"
            count={stats.call.count}
            pct={stats.call.pct}
            color="text-green-400"
          />
          <StatBox
            label="FOLD"
            count={stats.fold.count}
            pct={stats.fold.pct}
            color="text-slate-400"
          />
          <StatBox
            label="VPIP"
            count={stats.vpip.count}
            pct={stats.vpip.pct}
            color="text-amber-400"
          />
        </div>
      )}

      {/* Hover/Selected Hand Details */}
      {(hoveredHand || selectedHand) && (
        <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="font-bold text-lg">{hoveredHand || selectedHand}</span>
            {PREMIUM_T1.includes(hoveredHand || selectedHand || "") && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">Premium</span>
            )}
            {drillableHands?.includes(hoveredHand || selectedHand || "") && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/20 text-yellow-400">Drillable</span>
            )}
          </div>
          <HandDetails handData={hands[hoveredHand || selectedHand || ""] || {}} />
        </div>
      )}
    </div>
  );
}

function StatBox({ label, count, pct, color }: { label: string; count: number; pct: number; color: string }) {
  return (
    <div className="text-center p-2 rounded-lg bg-muted/30">
      <div className={cn("text-xl font-bold", color)}>{count}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xs text-muted-foreground">{pct}%</div>
    </div>
  );
}

function HandDetails({ handData }: { handData: HandData }) {
  const t = useTranslations();
  const actions = Object.entries(handData).filter(
    ([_, val]) => val !== undefined && val > 0
  );

  if (actions.length === 0) {
    return <span className="text-muted-foreground">{t("range.noData")}</span>;
  }

  const getActionLabel = (action: string) => {
    const map: Record<string, string> = {
      raise: t("range.legend.raise"),
      "3bet": "3-Bet",
      "4bet": "4-Bet",
      "5bet": "5-Bet",
      call: t("range.legend.call"),
      fold: t("range.legend.fold"),
      allin: t("range.legend.allin"),
    };
    return map[action] || action;
  };

  const getActionColor = (action: string): string => {
    if (action === "raise" || action === "3bet" || action === "4bet" || action === "5bet" || action === "allin") {
      return COLOR_RAISE;
    }
    if (action === "call") return COLOR_CALL;
    return COLOR_FOLD;
  };

  return (
    <div className="flex flex-wrap gap-3">
      {actions.map(([action, freq]) => (
        <div key={action} className="flex items-center gap-1.5">
          <div
            className="w-3 h-3 rounded"
            style={{ backgroundColor: getActionColor(action) }}
          />
          <span>{getActionLabel(action)}:</span>
          <span className="font-medium">{freq}%</span>
        </div>
      ))}
    </div>
  );
}

export default RangeGrid;
