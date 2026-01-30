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

  const primaryRec = hint.recommendations.find(r => r.isPrimary);
  const secondaryRecs = hint.recommendations.filter(r => !r.isPrimary);

  // Check if player made the GTO play
  const isCorrectPlay = lastAction && primaryRec?.action === lastAction;
  const playedFrequency = lastAction
    ? hint.recommendations.find(r => r.action === lastAction)?.frequency
    : null;

  return (
    <div className={cn(
      "bg-gray-900/95 border rounded-xl p-4 shadow-xl",
      mode === "before" ? "border-yellow-500/50" : "border-cyan-500/50",
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <h3 className="text-sm font-semibold text-white">
            {mode === "before" ? "GTO 建議" : "GTO 分析"}
          </h3>
        </div>
        {mode === "after" && lastAction && (
          <div className={cn(
            "px-2 py-0.5 rounded text-xs font-semibold",
            isCorrectPlay ? "bg-green-500/20 text-green-400" : "bg-orange-500/20 text-orange-400"
          )}>
            {isCorrectPlay ? "✓ 正確" : "可改進"}
          </div>
        )}
      </div>

      {/* Board & Hand Analysis */}
      <div className="flex gap-3 mb-3 text-xs">
        <div className="bg-gray-800/50 rounded px-2 py-1">
          <span className="text-gray-400">公牌: </span>
          <span className="text-white font-medium">{hint.reasoning.boardTextureZh}</span>
        </div>
        <div className="bg-gray-800/50 rounded px-2 py-1">
          <span className="text-gray-400">手牌: </span>
          <span className="text-white font-medium">{hint.reasoning.handStrengthZh}</span>
        </div>
        <div className="bg-gray-800/50 rounded px-2 py-1">
          <span className="text-gray-400">位置: </span>
          <span className={cn(
            "font-medium",
            hint.reasoning.positionAdvantage === "IP" ? "text-green-400" : "text-orange-400"
          )}>
            {hint.reasoning.positionAdvantage === "IP" ? "有位置" : "無位置"}
          </span>
        </div>
      </div>

      {/* Recommendations */}
      <div className="space-y-2 mb-3">
        {/* Primary action */}
        {primaryRec && (
          <div className={cn(
            "flex items-center justify-between p-2 rounded-lg",
            ACTION_COLORS[primaryRec.action],
            lastAction === primaryRec.action && "ring-2 ring-green-400"
          )}>
            <div className="flex items-center gap-2">
              <span className="font-semibold">{ACTION_LABELS[primaryRec.action]}</span>
              {primaryRec.sizing && (
                <span className="text-xs opacity-75">({primaryRec.sizing}% pot)</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <FrequencyBar frequency={primaryRec.frequency} color="primary" />
              <span className="text-sm font-bold w-10 text-right">{primaryRec.frequency}%</span>
            </div>
          </div>
        )}

        {/* Secondary actions */}
        {secondaryRecs.map((rec, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center justify-between p-2 rounded-lg opacity-75",
              ACTION_COLORS[rec.action],
              lastAction === rec.action && "ring-2 ring-yellow-400 opacity-100"
            )}
          >
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">{ACTION_LABELS[rec.action]}</span>
              {rec.sizing && (
                <span className="text-xs opacity-75">({rec.sizing}% pot)</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <FrequencyBar frequency={rec.frequency} color="secondary" />
              <span className="text-sm w-10 text-right">{rec.frequency}%</span>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed mode: Key factors */}
      {mode === "detailed" && hint.reasoning.keyFactorsZh.length > 0 && (
        <div className="border-t border-gray-700 pt-3">
          <p className="text-xs text-gray-400 mb-2">決策因素:</p>
          <ul className="space-y-1">
            {hint.reasoning.keyFactorsZh.map((factor, i) => (
              <li key={i} className="text-xs text-gray-300 flex items-start gap-1.5">
                <span className="text-cyan-400 mt-0.5">•</span>
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
            你選擇了 <span className={cn("font-semibold", ACTION_COLORS[lastAction].split(" ")[0])}>
              {ACTION_LABELS[lastAction]}
            </span>
            {playedFrequency !== undefined && (
              <span className="text-gray-500">
                {" "}(GTO 頻率: {playedFrequency}%)
              </span>
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
    <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
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
  const modes: { value: HintMode; label: string; icon: string }[] = [
    { value: "off", label: "關閉", icon: "🔇" },
    { value: "after", label: "行動後", icon: "📊" },
    { value: "before", label: "行動前", icon: "💡" },
    { value: "detailed", label: "詳細", icon: "🎓" },
  ];

  return (
    <div className={cn("flex gap-1 bg-gray-800 rounded-lg p-1", className)}>
      {modes.map((m) => (
        <button
          key={m.value}
          onClick={() => onChange(m.value)}
          className={cn(
            "px-2 py-1 rounded text-xs font-medium transition-colors",
            mode === m.value
              ? "bg-cyan-600 text-white"
              : "text-gray-400 hover:text-white hover:bg-gray-700"
          )}
        >
          <span className="mr-1">{m.icon}</span>
          {m.label}
        </button>
      ))}
    </div>
  );
}
