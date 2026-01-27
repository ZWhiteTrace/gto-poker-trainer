"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import { useTranslations } from "next-intl";

const RANKS = ["A", "K", "Q", "J", "T", "9", "8", "7", "6", "5", "4", "3", "2"];

interface HandData {
  raise?: number;
  call?: number;
  fold?: number;
  allin?: number;
  [key: string]: number | undefined;
}

interface RangeGridProps {
  hands: Record<string, HandData>;
  selectedHand?: string | null;
  onHandClick?: (hand: string) => void;
  highlightAction?: "raise" | "call" | "fold" | "allin";
  className?: string;
  compact?: boolean;
}

function getHandKey(row: number, col: number): string {
  const rank1 = RANKS[row];
  const rank2 = RANKS[col];

  if (row === col) {
    // Pairs on diagonal
    return `${rank1}${rank2}`;
  } else if (row < col) {
    // Suited hands above diagonal
    return `${rank1}${rank2}s`;
  } else {
    // Offsuit hands below diagonal
    return `${rank2}${rank1}o`;
  }
}

function getActionColor(
  handData: HandData | undefined,
  action?: string
): string {
  if (!handData) return "bg-muted/30";

  // Get the primary action (highest frequency)
  const actions = Object.entries(handData).filter(
    ([key, val]) => val !== undefined && val > 0
  );

  if (actions.length === 0) return "bg-muted/30";

  // If highlighting a specific action
  if (action && handData[action]) {
    const freq = handData[action] || 0;
    if (freq >= 80) return getActionBgColor(action, "high");
    if (freq >= 50) return getActionBgColor(action, "medium");
    if (freq > 0) return getActionBgColor(action, "low");
  }

  // Otherwise, show the dominant action
  const [primaryAction, primaryFreq] = actions.reduce((a, b) =>
    (b[1] || 0) > (a[1] || 0) ? b : a
  );

  if ((primaryFreq || 0) >= 80) return getActionBgColor(primaryAction, "high");
  if ((primaryFreq || 0) >= 50)
    return getActionBgColor(primaryAction, "medium");
  if ((primaryFreq || 0) > 0) return getActionBgColor(primaryAction, "low");

  return "bg-muted/30";
}

function getActionBgColor(
  action: string,
  intensity: "high" | "medium" | "low"
): string {
  const colors: Record<string, Record<string, string>> = {
    raise: {
      high: "bg-red-500/90",
      medium: "bg-red-500/60",
      low: "bg-red-500/30",
    },
    call: {
      high: "bg-green-500/90",
      medium: "bg-green-500/60",
      low: "bg-green-500/30",
    },
    fold: {
      high: "bg-slate-500/90",
      medium: "bg-slate-500/60",
      low: "bg-slate-500/30",
    },
    allin: {
      high: "bg-purple-500/90",
      medium: "bg-purple-500/60",
      low: "bg-purple-500/30",
    },
  };

  return colors[action]?.[intensity] || "bg-muted/30";
}

function getFrequencyText(handData: HandData | undefined): string {
  if (!handData) return "";

  const entries = Object.entries(handData).filter(
    ([_, val]) => val !== undefined && val > 0
  );

  if (entries.length === 0) return "";

  // Show the highest frequency
  const [_, maxFreq] = entries.reduce((a, b) =>
    (b[1] || 0) > (a[1] || 0) ? b : a
  );

  return `${maxFreq}%`;
}

export function RangeGrid({
  hands,
  selectedHand,
  onHandClick,
  highlightAction,
  className,
  compact = false,
}: RangeGridProps) {
  const t = useTranslations();
  const [hoveredHand, setHoveredHand] = useState<string | null>(null);

  return (
    <div className={cn("w-full max-w-2xl mx-auto", className)}>
      <div
        className={cn(
          "grid gap-[1px] bg-border rounded-lg overflow-hidden",
          "grid-cols-13"
        )}
        style={{
          gridTemplateColumns: "repeat(13, 1fr)",
        }}
      >
        {RANKS.map((_, rowIndex) =>
          RANKS.map((_, colIndex) => {
            const hand = getHandKey(rowIndex, colIndex);
            const handData = hands[hand];
            const isSelected = selectedHand === hand;
            const isHovered = hoveredHand === hand;
            const isPair = rowIndex === colIndex;

            return (
              <button
                key={hand}
                className={cn(
                  "aspect-square flex flex-col items-center justify-center",
                  "text-[10px] sm:text-xs md:text-sm font-medium transition-all",
                  "hover:ring-2 hover:ring-primary hover:z-10",
                  getActionColor(handData, highlightAction),
                  isSelected && "ring-2 ring-primary",
                  isHovered && "ring-2 ring-primary/50",
                  isPair && "font-bold",
                  !compact && "p-0.5 sm:p-1"
                )}
                onClick={() => onHandClick?.(hand)}
                onMouseEnter={() => setHoveredHand(hand)}
                onMouseLeave={() => setHoveredHand(null)}
                title={`${hand}: ${JSON.stringify(handData || {})}`}
              >
                <span className={cn(isPair && "text-primary-foreground")}>
                  {hand}
                </span>
                {!compact && handData && (
                  <span className="text-[8px] sm:text-[10px] md:text-xs opacity-80">
                    {getFrequencyText(handData)}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Legend */}
      {!compact && (
        <div className="flex flex-wrap justify-center gap-4 mt-4 text-sm">
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-red-500/80" />
            <span>{t("range.legend.raise")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-green-500/80" />
            <span>{t("range.legend.call")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-purple-500/80" />
            <span>{t("range.legend.allin")}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded bg-slate-500/80" />
            <span>{t("range.legend.fold")}</span>
          </div>
        </div>
      )}

      {/* Hover/Selected Hand Details */}
      {(hoveredHand || selectedHand) && (
        <div className="mt-4 p-3 rounded-lg bg-muted/50 text-sm">
          <div className="font-bold text-lg mb-2">
            {hoveredHand || selectedHand}
          </div>
          <HandDetails
            handData={hands[hoveredHand || selectedHand || ""] || {}}
          />
        </div>
      )}
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
      call: t("range.legend.call"),
      fold: t("range.legend.fold"),
      allin: t("range.legend.allin"),
    };
    return map[action] || action;
  };

  return (
    <div className="flex flex-wrap gap-3">
      {actions.map(([action, freq]) => (
        <div key={action} className="flex items-center gap-1.5">
          <div
            className={cn(
              "w-3 h-3 rounded",
              action === "raise" && "bg-red-500",
              action === "call" && "bg-green-500",
              action === "fold" && "bg-slate-500",
              action === "allin" && "bg-purple-500"
            )}
          />
          <span>{getActionLabel(action)}:</span>
          <span className="font-medium">{freq}%</span>
        </div>
      ))}
    </div>
  );
}

export default RangeGrid;
