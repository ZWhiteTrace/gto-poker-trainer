"use client";

import { useState } from "react";
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
  const [inputValue, setInputValue] = useState("");

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

  // Round to 0.5 BB increments for cleaner sizing
  const roundToHalf = (value: number) => Math.round(value * 2) / 2;

  // Calculate bet/raise sizing based on situation
  const isRaise = !!raiseAction;
  const callAmount = isRaise ? currentBet : 0;
  const effectivePot = potSize + callAmount;

  // GGPoker style presets: 25%, 33%, 75%, Pot
  const betSizePresets = [
    { label: "25%", value: roundToHalf(Math.max(minBet, callAmount + effectivePot * 0.25)) },
    { label: "33%", value: roundToHalf(Math.max(minBet, callAmount + effectivePot * 0.33)) },
    { label: "75%", value: roundToHalf(Math.max(minBet, callAmount + effectivePot * 0.75)) },
    { label: "Pot", value: roundToHalf(Math.max(minBet, callAmount + effectivePot * 1.0)) },
  ];

  // Handle direct input
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= minBet && num <= maxBet) {
      onBetSizeChange(roundToHalf(num));
    }
  };

  const handleInputBlur = () => {
    setInputValue(roundToHalf(selectedBetSize).toString());
  };

  // Sync input with selectedBetSize
  const displayValue = inputValue || roundToHalf(selectedBetSize).toString();

  return (
    <div className={cn("flex flex-col gap-2.5 sm:gap-3 p-3 sm:p-4 bg-gray-900/95 rounded-xl border border-gray-700/80 backdrop-blur-sm", className)}>
      {/* 下注控制區 (只在可以 bet/raise 時顯示) */}
      {betOrRaiseAction && (
        <div className="flex flex-col gap-2">
          {/* 預設尺寸 + 輸入框 - GGPoker 風格 */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {betSizePresets.map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                size="sm"
                onClick={() => {
                  onBetSizeChange(Math.min(preset.value, roundToHalf(maxBet)));
                  setInputValue("");
                }}
                disabled={disabled || preset.value > maxBet}
                className={cn(
                  "flex-1 h-7 sm:h-8 px-1 sm:px-2 text-[10px] sm:text-xs font-medium",
                  "bg-gray-800/60 border-gray-600 hover:bg-gray-700",
                  Math.abs(selectedBetSize - preset.value) < 0.3 && "border-green-500 bg-green-500/20 text-green-400"
                )}
              >
                {preset.label}
              </Button>
            ))}
            {/* 金額輸入框 */}
            <div className="relative">
              <input
                type="number"
                value={displayValue}
                onChange={handleInputChange}
                onBlur={handleInputBlur}
                onFocus={() => setInputValue(roundToHalf(selectedBetSize).toString())}
                min={roundToHalf(minBet)}
                max={roundToHalf(maxBet)}
                step={0.5}
                disabled={disabled}
                className="w-16 sm:w-20 h-7 sm:h-8 px-2 text-xs sm:text-sm text-center font-mono
                         bg-gray-800 border border-gray-600 rounded-md text-white
                         focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500/50"
              />
            </div>
          </div>

          {/* 滑桿 */}
          <div className="flex items-center gap-2 px-1">
            <span className="text-[10px] sm:text-xs text-gray-500 w-8 sm:w-10">{roundToHalf(minBet)}</span>
            <input
              type="range"
              min={roundToHalf(minBet)}
              max={roundToHalf(maxBet)}
              step={0.5}
              value={roundToHalf(selectedBetSize)}
              onChange={(e) => {
                onBetSizeChange(parseFloat(e.target.value));
                setInputValue("");
              }}
              disabled={disabled}
              className="flex-1 h-1.5 bg-gray-700 rounded-full appearance-none cursor-pointer
                       [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
                       [&::-webkit-slider-thumb]:bg-green-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer
                       [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-green-400"
            />
            <span className="text-[10px] sm:text-xs text-gray-500 w-8 sm:w-10 text-right">{roundToHalf(maxBet)}</span>
          </div>
        </div>
      )}

      {/* 主要動作按鈕 - GGPoker 風格 */}
      <div className="flex gap-2 justify-center">
        {/* Fold */}
        {foldAction && (
          <Button
            variant="ghost"
            onClick={() => onAction("fold")}
            disabled={disabled}
            className="flex-1 h-11 sm:h-12 bg-red-900/40 hover:bg-red-800/60 border border-red-700/50 text-red-100"
          >
            <span className="font-bold text-sm sm:text-base">Fold</span>
          </Button>
        )}

        {/* Check */}
        {checkAction && (
          <Button
            variant="ghost"
            onClick={() => onAction("check")}
            disabled={disabled}
            className="flex-1 h-11 sm:h-12 bg-gray-700/50 hover:bg-gray-600/60 border border-gray-600/50 text-gray-100"
          >
            <span className="font-bold text-sm sm:text-base">Check</span>
          </Button>
        )}

        {/* Call */}
        {callAction && (
          <Button
            variant="ghost"
            onClick={() => onAction("call")}
            disabled={disabled}
            className="flex-1 h-11 sm:h-12 bg-blue-900/40 hover:bg-blue-800/60 border border-blue-700/50 text-blue-100"
          >
            <div className="flex flex-col items-center leading-tight">
              <span className="font-bold text-sm sm:text-base">Call</span>
              <span className="text-[10px] sm:text-xs opacity-80">{roundToHalf(currentBet)} BB</span>
            </div>
          </Button>
        )}

        {/* Bet/Raise */}
        {betOrRaiseAction && (
          <Button
            variant="ghost"
            onClick={() => onAction(betOrRaiseAction.type, roundToHalf(selectedBetSize))}
            disabled={disabled}
            className="flex-1 h-11 sm:h-12 bg-green-900/50 hover:bg-green-800/60 border border-green-600/50 text-green-100"
          >
            <div className="flex flex-col items-center leading-tight">
              <span className="font-bold text-sm sm:text-base">{betAction ? "Bet" : "Raise"}</span>
              <span className="text-[10px] sm:text-xs opacity-80">{roundToHalf(selectedBetSize)} BB</span>
            </div>
          </Button>
        )}

        {/* All-In - 只在沒有其他 raise 選項或金額接近 all-in 時單獨顯示 */}
        {allinAction && !betOrRaiseAction && (
          <Button
            variant="ghost"
            onClick={() => onAction("allin")}
            disabled={disabled}
            className="flex-1 h-11 sm:h-12 bg-amber-900/50 hover:bg-amber-800/60 border border-amber-600/50 text-amber-100"
          >
            <div className="flex flex-col items-center leading-tight">
              <span className="font-bold text-sm sm:text-base">All In</span>
              <span className="text-[10px] sm:text-xs opacity-80">{roundToHalf(heroStack)} BB</span>
            </div>
          </Button>
        )}
      </div>

      {/* 快捷鍵提示 - 只在桌面顯示 */}
      <div className="hidden sm:flex justify-center gap-4 text-[10px] text-gray-500">
        {foldAction && <span>F = Fold</span>}
        {(checkAction || callAction) && <span>C = {checkAction ? "Check" : "Call"}</span>}
        {betOrRaiseAction && <span>R = {betAction ? "Bet" : "Raise"}</span>}
        {allinAction && <span>A = All-in</span>}
      </div>
    </div>
  );
}

// 簡化版動作按鈕 (用於 mobile compact view)
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
  const roundToHalf = (value: number) => Math.round(value * 2) / 2;

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
            <span className="ml-1">{roundToHalf(action.minAmount)}</span>
          )}
        </Button>
      ))}
    </div>
  );
}
