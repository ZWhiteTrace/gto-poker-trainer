"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { AvailableAction, ActionType } from "@/lib/poker/types";

interface ActionButtonsProps {
  availableActions: AvailableAction[];
  onAction: (action: ActionType, amount?: number) => void;
  currentBet: number;
  potSize: number;
  heroStack: number;
  selectedBetSize: number;
  onBetSizeChange: (size: number) => void;
  disabled?: boolean;
  className?: string;
}

export function ActionButtons({
  availableActions,
  onAction,
  currentBet,
  potSize,
  heroStack,
  selectedBetSize,
  onBetSizeChange,
  disabled = false,
  className,
}: ActionButtonsProps) {
  // 找出各種動作
  const foldAction = availableActions.find((a) => a.type === "fold");
  const checkAction = availableActions.find((a) => a.type === "check");
  const callAction = availableActions.find((a) => a.type === "call");
  const betAction = availableActions.find((a) => a.type === "bet");
  const raiseAction = availableActions.find((a) => a.type === "raise");
  const allinAction = availableActions.find((a) => a.type === "allin");

  // 加注/下注的選項
  const betOrRaiseAction = betAction || raiseAction;
  const minBet = betOrRaiseAction?.minAmount || 1;
  const maxBet = betOrRaiseAction?.maxAmount || heroStack;

  // 預設下注尺寸
  const betSizePresets = [
    { label: "33%", value: Math.max(minBet, potSize * 0.33) },
    { label: "50%", value: Math.max(minBet, potSize * 0.5) },
    { label: "75%", value: Math.max(minBet, potSize * 0.75) },
    { label: "100%", value: Math.max(minBet, potSize) },
    { label: "150%", value: Math.max(minBet, potSize * 1.5) },
  ];

  return (
    <div className={cn("flex flex-col gap-3 p-4 bg-gray-900/90 rounded-xl border border-gray-700", className)}>
      {/* 主要動作按鈕 */}
      <div className="flex gap-2 justify-center">
        {/* Fold */}
        {foldAction && (
          <Button
            variant="destructive"
            size="lg"
            onClick={() => onAction("fold")}
            disabled={disabled}
            className="min-w-20"
          >
            <span className="font-bold">FOLD</span>
            <span className="text-xs opacity-70 ml-1">(F)</span>
          </Button>
        )}

        {/* Check */}
        {checkAction && (
          <Button
            variant="secondary"
            size="lg"
            onClick={() => onAction("check")}
            disabled={disabled}
            className="min-w-24 bg-gray-600 hover:bg-gray-500"
          >
            <span className="font-bold">CHECK</span>
            <span className="text-xs opacity-70 ml-1">(C)</span>
          </Button>
        )}

        {/* Call */}
        {callAction && (
          <Button
            variant="secondary"
            size="lg"
            onClick={() => onAction("call")}
            disabled={disabled}
            className="min-w-28 bg-blue-600 hover:bg-blue-500"
          >
            <span className="font-bold">CALL</span>
            <span className="text-sm ml-1">{currentBet.toFixed(1)}</span>
            <span className="text-xs opacity-70 ml-1">(C)</span>
          </Button>
        )}

        {/* Bet/Raise */}
        {betOrRaiseAction && (
          <Button
            variant="default"
            size="lg"
            onClick={() => onAction(betOrRaiseAction.type, selectedBetSize)}
            disabled={disabled}
            className="min-w-28 bg-green-600 hover:bg-green-500"
          >
            <span className="font-bold">{betAction ? "BET" : "RAISE"}</span>
            <span className="text-sm ml-1">{selectedBetSize.toFixed(1)}</span>
            <span className="text-xs opacity-70 ml-1">(R)</span>
          </Button>
        )}

        {/* All-In */}
        {allinAction && (
          <Button
            variant="default"
            size="lg"
            onClick={() => onAction("allin")}
            disabled={disabled}
            className="min-w-24 bg-red-600 hover:bg-red-500"
          >
            <span className="font-bold">ALL IN</span>
            <span className="text-xs opacity-70 ml-1">(A)</span>
          </Button>
        )}
      </div>

      {/* 下注尺寸控制 (只在可以 bet/raise 時顯示) */}
      {betOrRaiseAction && (
        <>
          {/* 滑桿 */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-400 w-16">{minBet.toFixed(1)}</span>
            <input
              type="range"
              min={minBet}
              max={maxBet}
              step={0.5}
              value={selectedBetSize}
              onChange={(e) => onBetSizeChange(parseFloat(e.target.value))}
              disabled={disabled}
              className="flex-1 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
            <span className="text-sm text-gray-400 w-16 text-right">{maxBet.toFixed(1)}</span>
          </div>

          {/* 預設尺寸按鈕 */}
          <div className="flex gap-2 justify-center flex-wrap">
            {betSizePresets.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                onClick={() => onBetSizeChange(Math.min(preset.value, maxBet))}
                disabled={disabled || preset.value > maxBet}
                className={cn(
                  "min-w-14",
                  Math.abs(selectedBetSize - preset.value) < 0.1 && "border-green-500 bg-green-500/20"
                )}
              >
                {preset.label}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onBetSizeChange(maxBet)}
              disabled={disabled}
              className={cn(
                "min-w-14 border-red-500/50",
                Math.abs(selectedBetSize - maxBet) < 0.1 && "border-red-500 bg-red-500/20"
              )}
            >
              ALL
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// 簡化版動作按鈕 (用於 mobile)
interface SimpleActionButtonsProps {
  availableActions: AvailableAction[];
  onAction: (action: ActionType, amount?: number) => void;
  currentBet: number;
  disabled?: boolean;
  className?: string;
}

export function SimpleActionButtons({
  availableActions,
  onAction,
  currentBet,
  disabled = false,
  className,
}: SimpleActionButtonsProps) {
  return (
    <div className={cn("flex gap-2 justify-center", className)}>
      {availableActions.map((action) => (
        <Button
          key={action.type}
          variant={action.type === "fold" ? "destructive" : "default"}
          size="sm"
          onClick={() => onAction(action.type, action.minAmount)}
          disabled={disabled}
        >
          {action.label}
          {action.minAmount && action.type !== "fold" && action.type !== "check" && (
            <span className="ml-1">{action.minAmount.toFixed(1)}</span>
          )}
        </Button>
      ))}
    </div>
  );
}
