"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { GTOHint, HintMode, ActionType } from "@/lib/poker/types";

interface GTOHintPanelProps {
  hint: GTOHint | null;
  mode: HintMode;
  lastAction?: ActionType;
  className?: string;
}

const ACTION_COLORS: Record<ActionType, string> = {
  fold: "text-red-400 bg-red-500/20",
  check: "text-gray-300 bg-gray-500/20",
  call: "text-blue-400 bg-blue-500/20",
  bet: "text-green-400 bg-green-500/20",
  raise: "text-yellow-400 bg-yellow-500/20",
  allin: "text-red-500 bg-red-600/30",
};

const ACTION_LABELS: Record<ActionType, string> = {
  fold: "棄牌",
  check: "過牌",
  call: "跟注",
  bet: "下注",
  raise: "加注",
  allin: "全下",
};

export function GTOHintPanel({ hint, mode, lastAction, className }: GTOHintPanelProps) {
  if (!hint || mode === "off") return null;

  const primaryRec = hint.recommendations.find((r) => r.isPrimary);
  const secondaryRecs = hint.recommendations.filter((r) => !r.isPrimary);

  // Check if player made the GTO play
  const isCorrectPlay = lastAction && primaryRec?.action === lastAction;
  const playedFrequency = lastAction
    ? hint.recommendations.find((r) => r.action === lastAction)?.frequency
    : null;

  return (
    <div
      className={cn(
        "rounded-xl border bg-gray-900/95 p-3 shadow-xl sm:p-4",
        mode === "before" ? "border-yellow-500/50" : "border-cyan-500/50",
        className
      )}
    >
      {/* Header */}
      <div className="mb-2 flex items-center justify-between sm:mb-3">
        <div className="flex items-center gap-2">
          <span className="text-base sm:text-lg">🎯</span>
          <h3 className="text-xs font-semibold text-white sm:text-sm">
            {mode === "before" ? "GTO 建議" : "GTO 分析"}
          </h3>
        </div>
        {mode === "after" && lastAction && (
          <div
            className={cn(
              "rounded px-2 py-0.5 text-xs font-semibold",
              isCorrectPlay ? "bg-green-500/20 text-green-400" : "bg-orange-500/20 text-orange-400"
            )}
          >
            {isCorrectPlay ? "✓ 正確" : "可改進"}
          </div>
        )}
      </div>

      {/* Board & Hand Analysis */}
      <div className="mb-2 flex flex-wrap gap-1.5 text-xs sm:mb-3 sm:gap-3">
        <div className="rounded bg-gray-800/50 px-2 py-1">
          <span className="text-gray-400">公牌: </span>
          <span className="font-medium text-white">{hint.reasoning.boardTextureZh}</span>
        </div>
        <div className="rounded bg-gray-800/50 px-2 py-1">
          <span className="text-gray-400">手牌: </span>
          <span className="font-medium text-white">{hint.reasoning.handStrengthZh}</span>
        </div>
        <div className="rounded bg-gray-800/50 px-2 py-1">
          <span className="text-gray-400">位置: </span>
          <span
            className={cn(
              "font-medium",
              hint.reasoning.positionAdvantage === "IP" ? "text-green-400" : "text-orange-400"
            )}
          >
            {hint.reasoning.positionAdvantage === "IP" ? "有位置" : "無位置"}
          </span>
        </div>
      </div>

      {/* Recommendations */}
      <div className="mb-2 space-y-1.5 sm:mb-3 sm:space-y-2">
        {/* Primary action */}
        {primaryRec && (
          <div
            className={cn(
              "flex items-center justify-between rounded-lg p-2",
              ACTION_COLORS[primaryRec.action],
              lastAction === primaryRec.action && "ring-2 ring-green-400"
            )}
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold">{ACTION_LABELS[primaryRec.action]}</span>
              {primaryRec.sizing && (
                <span className="text-xs opacity-75">({primaryRec.sizing}% pot)</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <FrequencyBar frequency={primaryRec.frequency} color="primary" />
              <span className="w-10 text-right text-sm font-bold">{primaryRec.frequency}%</span>
            </div>
          </div>
        )}

        {/* Secondary actions */}
        {secondaryRecs.map((rec, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center justify-between rounded-lg p-2 opacity-75",
              ACTION_COLORS[rec.action],
              lastAction === rec.action && "opacity-100 ring-2 ring-yellow-400"
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{ACTION_LABELS[rec.action]}</span>
              {rec.sizing && <span className="text-xs opacity-75">({rec.sizing}% pot)</span>}
            </div>
            <div className="flex items-center gap-2">
              <FrequencyBar frequency={rec.frequency} color="secondary" />
              <span className="w-10 text-right text-sm">{rec.frequency}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed mode: Key factors */}
      {mode === "detailed" && hint.reasoning.keyFactorsZh.length > 0 && (
        <div className="border-t border-gray-700 pt-3">
          <p className="mb-2 text-xs text-gray-400">決策因素:</p>
          <ul className="space-y-1">
            {hint.reasoning.keyFactorsZh.map((factor, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-gray-300">
                <span className="mt-0.5 text-cyan-400">•</span>
                <span>{factor}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* After mode: Show what player did */}
      {mode === "after" && lastAction && playedFrequency !== null && (
        <div className="border-t border-gray-700 pt-3 text-xs">
          <p className="text-gray-400">
            你選擇了{" "}
            <span className={cn("font-semibold", ACTION_COLORS[lastAction].split(" ")[0])}>
              {ACTION_LABELS[lastAction]}
            </span>
            {playedFrequency !== undefined && (
              <span className="text-gray-500"> (GTO 頻率: {playedFrequency}%)</span>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

interface FrequencyBarProps {
  frequency: number;
  color: "primary" | "secondary";
}

function FrequencyBar({ frequency, color }: FrequencyBarProps) {
  return (
    <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-700">
      <div
        className={cn(
          "h-full rounded-full transition-all",
          color === "primary" ? "bg-green-500" : "bg-gray-500"
        )}
        style={{ width: `${frequency}%` }}
      />
    </div>
  );
}

// ============================================
// Hint Mode Selector
// ============================================

interface HintModeSelectorProps {
  mode: HintMode;
  onChange: (mode: HintMode) => void;
  className?: string;
}

export function HintModeSelector({ mode, onChange, className }: HintModeSelectorProps) {
  const modes: { value: HintMode; label: string; tooltip: string }[] = [
    { value: "off", label: "關閉", tooltip: "不顯示 GTO 提示" },
    { value: "after", label: "行動後", tooltip: "你行動後顯示分析（複盤模式）" },
    { value: "before", label: "行動前", tooltip: "輪到你時就顯示建議（引導模式）" },
    { value: "detailed", label: "詳細", tooltip: "顯示詳細的決策因素說明" },
  ];

  return (
    <div className={cn("flex gap-1 rounded-lg bg-gray-800 p-1", className)}>
      {modes.map((m) => (
        <button
          key={m.value}
          onClick={() => onChange(m.value)}
          title={m.tooltip}
          className={cn(
            "rounded px-2 py-1 text-xs font-medium transition-colors",
            mode === m.value
              ? "bg-cyan-600 text-white"
              : "text-gray-400 hover:bg-gray-700 hover:text-white"
          )}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}
