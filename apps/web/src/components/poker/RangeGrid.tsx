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

// Color constants matching GTOWizard style
const COLOR_RAISE = "#ef4444"; // Red for raise/3bet/4bet
const COLOR_CALL = "#22c55e";  // Green for call
const COLOR_FOLD = "#1e293b";  // Dark slate for fold (empty)

function getActionColorStyle(handData: HandData | undefined): React.CSSProperties {
  if (!handData) return { backgroundColor: COLOR_FOLD };

  // Get frequencies for each action type
  const raiseFreq = handData.raise || handData["3bet"] || handData["4bet"] || 0;
  const callFreq = handData.call || 0;
  const foldFreq = handData.fold || 0;
  const allinFreq = handData.allin || 0;

  // No action data = not in range
  if (raiseFreq === 0 && callFreq === 0 && allinFreq === 0) {
    return { backgroundColor: COLOR_FOLD };
  }

  // Pure actions (100%) - solid color
  if (raiseFreq >= 100 || allinFreq >= 100) {
    return { backgroundColor: COLOR_RAISE };
  }
  if (callFreq >= 100) {
    return { backgroundColor: COLOR_CALL };
  }

  // Mixed strategy - build proportional gradient
  const stops: string[] = [];
  let currentPos = 0;

  // Order: Raise (red) → Call (green) → Fold (dark)
  if (raiseFreq > 0 || allinFreq > 0) {
    const rFreq = raiseFreq + allinFreq;
    stops.push(`${COLOR_RAISE} ${currentPos}%`);
    currentPos += rFreq;
    stops.push(`${COLOR_RAISE} ${currentPos}%`);
  }

  if (callFreq > 0) {
    stops.push(`${COLOR_CALL} ${currentPos}%`);
    currentPos += callFreq;
    stops.push(`${COLOR_CALL} ${currentPos}%`);
  }

  if (foldFreq > 0 || currentPos < 100) {
    stops.push(`${COLOR_FOLD} ${currentPos}%`);
    stops.push(`${COLOR_FOLD} 100%`);
  }

  return {
    background: `linear-gradient(to right, ${stops.join(", ")})`,
  };
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
                  "aspect-square flex items-center justify-center",
                  "text-[10px] sm:text-xs md:text-sm font-medium transition-all",
                  "hover:ring-2 hover:ring-primary hover:z-10",
                  isSelected && "ring-2 ring-primary",
                  isHovered && "ring-2 ring-primary/50",
                  isPair && "font-bold"
                )}
                style={getActionColorStyle(handData)}
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
      "3bet": "3-Bet",
      "4bet": "4-Bet",
      call: t("range.legend.call"),
      fold: t("range.legend.fold"),
      allin: t("range.legend.allin"),
    };
    return map[action] || action;
  };

  const getActionColor = (action: string): string => {
    if (action === "raise" || action === "3bet" || action === "4bet" || action === "allin") {
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
