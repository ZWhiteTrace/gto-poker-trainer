"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import type { Card } from "@/lib/poker/types";
import { PlayingCard, CardBack } from "../cards";

interface CommunityCardsProps {
  cards: Card[];
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function CommunityCards({ cards, size = "md", className }: CommunityCardsProps) {
  // 最多 5 張公牌
  const displayCards = cards.slice(0, 5);
  const emptySlots = 5 - displayCards.length;

  // Track which cards are newly dealt for animation
  const prevCardCount = useRef(0);
  const [newCardIndices, setNewCardIndices] = useState<number[]>([]);

  useEffect(() => {
    if (cards.length > prevCardCount.current) {
      // New cards were dealt
      const newIndices = Array.from(
        { length: cards.length - prevCardCount.current },
        (_, i) => prevCardCount.current + i
      );
      setNewCardIndices(newIndices);

      // Clear the "new" status after animation
      const timer = setTimeout(() => setNewCardIndices([]), 1000);
      return () => clearTimeout(timer);
    } else if (cards.length < prevCardCount.current) {
      // Board was reset
      setNewCardIndices([]);
    }
    prevCardCount.current = cards.length;
  }, [cards.length]);

  return (
    <div className={cn("flex gap-1.5 sm:gap-2", className)}>
      {/* 已發出的公牌 */}
      {displayCards.map((card, index) => {
        const isNew = newCardIndices.includes(index);
        return (
          <div
            key={`${card.rank}${card.suit}-${index}`}
            className={cn(isNew && "animate-card-deal", isNew && "animate-card-highlight")}
            style={{
              animationDelay: isNew
                ? `${(index - (cards.length - newCardIndices.length)) * 100}ms`
                : undefined,
            }}
          >
            <PlayingCard card={card} size={size} />
          </div>
        );
      })}

      {/* 空位佔位符 (可選，視覺參考用) */}
      {emptySlots > 0 && cards.length > 0 && (
        <>
          {Array.from({ length: emptySlots }).map((_, index) => (
            <div key={`empty-${index}`} className="opacity-20">
              <EmptyCardSlot size={size} />
            </div>
          ))}
        </>
      )}

      {/* 完全沒有公牌時的提示 */}
      {cards.length === 0 && (
        <div className="flex gap-1.5 sm:gap-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <EmptyCardSlot key={index} size={size} />
          ))}
        </div>
      )}
    </div>
  );
}

// 空牌位
interface EmptyCardSlotProps {
  size?: "sm" | "md" | "lg";
}

const slotSizeClasses = {
  sm: "w-10 h-14",
  md: "w-14 h-20 sm:w-16 sm:h-24",
  lg: "w-20 h-28 sm:w-24 sm:h-32",
};

function EmptyCardSlot({ size = "md" }: EmptyCardSlotProps) {
  return (
    <div
      className={cn(
        "rounded-lg border-2 border-dashed border-white/20 bg-black/20",
        slotSizeClasses[size]
      )}
    />
  );
}

// 單街公牌顯示 (用於行動歷史)
interface StreetCardsProps {
  street: "flop" | "turn" | "river";
  cards: Card[];
  size?: "sm" | "md";
  className?: string;
}

export function StreetCards({ street, cards, size = "sm", className }: StreetCardsProps) {
  const streetLabels = {
    flop: "Flop",
    turn: "Turn",
    river: "River",
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="w-12 text-xs text-gray-400">{streetLabels[street]}</span>
      <div className="flex gap-1">
        {cards.map((card, index) => (
          <PlayingCard key={`${card.rank}${card.suit}-${index}`} card={card} size={size} />
        ))}
      </div>
    </div>
  );
}
