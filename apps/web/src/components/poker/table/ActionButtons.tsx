"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { AvailableAction, ActionType } from "@/lib/poker/types";

const actionButtonsCopy = {
  "zh-TW": {
    pot: "底池",
    betSizeSlider: "下注尺寸滑桿",
    foldHand: "棄掉這手牌",
    check: "過牌",
    callBb: (amount: number) => `跟注 ${amount} 個大盲`,
    betToBb: (amount: number) => `下注到 ${amount} 個大盲`,
    raiseToBb: (amount: number) => `加注到 ${amount} 個大盲`,
    allInBb: (amount: number) => `All-in ${amount} 個大盲`,
    shortcut: (key: string, label: string) => `${key} = ${label}`,
  },
  en: {
    pot: "Pot",
    betSizeSlider: "Bet size slider",
    foldHand: "Fold your hand",
    check: "Check",
    callBb: (amount: number) => `Call ${amount} big blinds`,
    betToBb: (amount: number) => `Bet ${amount} big blinds`,
    raiseToBb: (amount: number) => `Raise to ${amount} big blinds`,
    allInBb: (amount: number) => `Go all in for ${amount} big blinds`,
    shortcut: (key: string, label: string) => `${key} = ${label}`,
  },
} as const;

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
  const locale = useLocale() === "en" ? "en" : "zh-TW";
  const copy = actionButtonsCopy[locale];
  const [inputValue, setInputValue] = useState("");
  const getActionLabel = (action: AvailableAction | undefined) =>
    !action ? "" : locale === "en" ? action.label : action.labelZh;

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

  // GGPoker style presets - simplified for mobile
  const betSizePresets = [
    { label: "33%", value: roundToHalf(Math.max(minBet, callAmount + effectivePot * 0.33)) },
    { label: "50%", value: roundToHalf(Math.max(minBet, callAmount + effectivePot * 0.5)) },
    { label: "75%", value: roundToHalf(Math.max(minBet, callAmount + effectivePot * 0.75)) },
    { label: copy.pot, value: roundToHalf(Math.max(minBet, callAmount + effectivePot * 1.0)) },
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
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border border-gray-700/80 bg-gray-900/95 p-3 backdrop-blur-sm sm:gap-3 sm:p-4",
        className
      )}
    >
      {/* 下注控制區 (只在可以 bet/raise 時顯示) */}
      {betOrRaiseAction && (
        <div className="flex flex-col gap-2 sm:gap-2">
          {/* 預設尺寸 - 使用 grid 確保不會被截斷，加大觸控區域 */}
          <div className="grid grid-cols-4 gap-1.5 sm:gap-1.5">
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
                  "h-9 px-1 text-xs font-semibold sm:h-8 sm:px-2 sm:text-xs",
                  "border-gray-600 bg-gray-800/60 hover:bg-gray-700 active:bg-gray-600",
                  Math.abs(selectedBetSize - preset.value) < 0.3 &&
                    "border-green-500 bg-green-500/20 text-green-400"
                )}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          {/* 滑桿 + 數值顯示 - 加大滑桿和拇指 */}
          <div className="flex items-center gap-2 sm:gap-2">
            <span className="w-7 shrink-0 text-[10px] text-gray-500 sm:w-8 sm:text-xs">
              {roundToHalf(minBet)}
            </span>
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
              aria-label={copy.betSizeSlider}
              aria-valuemin={roundToHalf(minBet)}
              aria-valuemax={roundToHalf(maxBet)}
              aria-valuenow={roundToHalf(selectedBetSize)}
              className="h-2 flex-1 cursor-pointer appearance-none rounded-full bg-gray-700 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-green-400 [&::-webkit-slider-thumb]:bg-green-500 [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-110"
            />
            {/* 數值顯示/輸入 - 加大 */}
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
              className="h-8 w-14 shrink-0 rounded border border-gray-600 bg-gray-800 px-1.5 text-center font-mono text-xs text-white focus:border-green-500 focus:ring-1 focus:ring-green-500/50 focus:outline-none sm:h-7 sm:w-16 sm:text-xs"
            />
          </div>
        </div>
      )}

      {/* 主要動作按鈕 - GGPoker 風格，加大觸控區域 */}
      <div className="flex justify-center gap-2">
        {/* Fold */}
        {foldAction && (
          <Button
            variant="ghost"
            onClick={() => onAction("fold")}
            disabled={disabled}
            aria-label={copy.foldHand}
            className="h-12 flex-1 border border-red-700/50 bg-red-900/40 text-red-100 hover:bg-red-800/60 active:bg-red-700/70 sm:h-12"
          >
            <span className="text-base font-bold sm:text-base">{getActionLabel(foldAction)}</span>
          </Button>
        )}

        {/* Check */}
        {checkAction && (
          <Button
            variant="ghost"
            onClick={() => onAction("check")}
            disabled={disabled}
            aria-label={copy.check}
            className="h-12 flex-1 border border-gray-600/50 bg-gray-700/50 text-gray-100 hover:bg-gray-600/60 active:bg-gray-500/70 sm:h-12"
          >
            <span className="text-base font-bold sm:text-base">{getActionLabel(checkAction)}</span>
          </Button>
        )}

        {/* Call */}
        {callAction && (
          <Button
            variant="ghost"
            onClick={() => onAction("call")}
            disabled={disabled}
            aria-label={copy.callBb(roundToHalf(currentBet))}
            className="h-12 flex-1 border border-blue-700/50 bg-blue-900/40 text-blue-100 hover:bg-blue-800/60 active:bg-blue-700/70 sm:h-12"
          >
            <div className="flex flex-col items-center leading-tight">
              <span className="text-base font-bold sm:text-base">{getActionLabel(callAction)}</span>
              <span className="text-[11px] opacity-80 sm:text-xs">
                {roundToHalf(currentBet)} BB
              </span>
            </div>
          </Button>
        )}

        {/* Bet/Raise */}
        {betOrRaiseAction && (
          <Button
            variant="ghost"
            onClick={() => onAction(betOrRaiseAction.type, roundToHalf(selectedBetSize))}
            disabled={disabled}
            aria-label={
              betAction
                ? copy.betToBb(roundToHalf(selectedBetSize))
                : copy.raiseToBb(roundToHalf(selectedBetSize))
            }
            className="h-12 flex-1 border border-green-600/50 bg-green-900/50 text-green-100 hover:bg-green-800/60 active:bg-green-700/70 sm:h-12"
          >
            <div className="flex flex-col items-center leading-tight">
              <span className="text-base font-bold sm:text-base">{getActionLabel(betOrRaiseAction)}</span>
              <span className="text-[11px] opacity-80 sm:text-xs">
                {roundToHalf(selectedBetSize)} BB
              </span>
            </div>
          </Button>
        )}

        {/* All-In - 只在沒有其他 raise 選項或金額接近 all-in 時單獨顯示 */}
        {allinAction && !betOrRaiseAction && (
          <Button
            variant="ghost"
            onClick={() => onAction("allin")}
            disabled={disabled}
            aria-label={copy.allInBb(roundToHalf(heroStack))}
            className="h-12 flex-1 border border-amber-600/50 bg-amber-900/50 text-amber-100 hover:bg-amber-800/60 active:bg-amber-700/70 sm:h-12"
          >
            <div className="flex flex-col items-center leading-tight">
              <span className="text-base font-bold sm:text-base">{getActionLabel(allinAction)}</span>
              <span className="text-[11px] opacity-80 sm:text-xs">{roundToHalf(heroStack)} BB</span>
            </div>
          </Button>
        )}
      </div>

      {/* 快捷鍵提示 - 只在桌面顯示 */}
      <div className="hidden justify-center gap-4 text-[10px] text-gray-500 sm:flex">
        {foldAction && <span>{copy.shortcut("F", getActionLabel(foldAction))}</span>}
        {(checkAction || callAction) && (
          <span>{copy.shortcut("C", getActionLabel(checkAction || callAction))}</span>
        )}
        {betOrRaiseAction && <span>{copy.shortcut("R", getActionLabel(betOrRaiseAction))}</span>}
        {allinAction && <span>{copy.shortcut("A", getActionLabel(allinAction))}</span>}
      </div>
    </div>
  );
}

// 簡化版動作按鈕 (用於 mobile compact view)
interface SimpleActionButtonsProps {
  availableActions: AvailableAction[];
  onAction: (action: ActionType, amount?: number) => void;
  disabled?: boolean;
  className?: string;
}

export function SimpleActionButtons({
  availableActions,
  onAction,
  disabled = false,
  className,
}: SimpleActionButtonsProps) {
  const locale = useLocale() === "en" ? "en" : "zh-TW";
  const roundToHalf = (value: number) => Math.round(value * 2) / 2;

  return (
    <div className={cn("flex justify-center gap-2", className)}>
      {availableActions.map((action) => (
        <Button
          key={action.type}
          variant={action.type === "fold" ? "destructive" : "default"}
          size="sm"
          onClick={() => onAction(action.type, action.minAmount)}
          disabled={disabled}
        >
          {locale === "en" ? action.label : action.labelZh}
          {action.minAmount && action.type !== "fold" && action.type !== "check" && (
            <span className="ml-1">{roundToHalf(action.minAmount)}</span>
          )}
        </Button>
      ))}
    </div>
  );
}
