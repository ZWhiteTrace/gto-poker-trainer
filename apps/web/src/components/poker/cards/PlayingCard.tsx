"use client";

import { memo } from "react";
import { cn } from "@/lib/utils";
import type { Card, Suit, Rank } from "@/lib/poker/types";
import { SUIT_SYMBOLS, SUIT_CARD_COLORS } from "@/lib/poker/types";

interface PlayingCardProps {
  card: Card;
  size?: "sm" | "md" | "lg";
  hidden?: boolean;
  highlighted?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "w-10 h-14 text-lg",
  md: "w-14 h-20 text-2xl sm:w-16 sm:h-24 sm:text-3xl",
  lg: "w-20 h-28 text-3xl sm:w-24 sm:h-32 sm:text-4xl",
};

export const PlayingCard = memo(function PlayingCard({
  card,
  size = "md",
  hidden = false,
  highlighted = false,
  className,
}: PlayingCardProps) {
  if (hidden) {
    return <CardBack size={size} className={className} />;
  }

  const suitColor = SUIT_CARD_COLORS[card.suit];
  const suitSymbol = SUIT_SYMBOLS[card.suit];

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-lg border-2 bg-white shadow-md dark:bg-gray-100",
        highlighted ? "border-primary ring-primary/50 ring-2" : "border-gray-200",
        sizeClasses[size],
        className
      )}
    >
      <span className={cn("font-bold", suitColor)}>{card.rank}</span>
      <span className={cn("text-[0.8em]", suitColor)}>{suitSymbol}</span>
    </div>
  );
});

interface CardBackProps {
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const CardBack = memo(function CardBack({ size = "md", className }: CardBackProps) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center rounded-lg border-2 border-gray-300 shadow-md",
        "bg-gradient-to-br from-blue-600 to-blue-800",
        sizeClasses[size],
        className
      )}
    >
      {/* Card back pattern */}
      <div className="absolute inset-2 rounded border-2 border-blue-400/30">
        <div className="flex h-full w-full items-center justify-center">
          <div className="h-4 w-4 rounded-full border-2 border-blue-400/50" />
        </div>
      </div>
    </div>
  );
});

interface HoleCardsProps {
  cards: [Card, Card] | null;
  hidden?: boolean;
  size?: "sm" | "md" | "lg";
  highlighted?: boolean;
  className?: string;
}

export const HoleCards = memo(function HoleCards({
  cards,
  hidden = false,
  size = "md",
  highlighted = false,
  className,
}: HoleCardsProps) {
  if (!cards) {
    return (
      <div className={cn("flex gap-1", className)}>
        <CardBack size={size} />
        <CardBack size={size} />
      </div>
    );
  }

  if (hidden) {
    return (
      <div className={cn("flex gap-1", className)}>
        <CardBack size={size} />
        <CardBack size={size} />
      </div>
    );
  }

  return (
    <div className={cn("flex gap-1", className)}>
      <PlayingCard card={cards[0]} size={size} highlighted={highlighted} />
      <PlayingCard card={cards[1]} size={size} highlighted={highlighted} />
    </div>
  );
});

// Helper function to create a card from string notation (e.g., "As", "Kh")
export function parseCard(notation: string): Card {
  const rank = notation[0] as Rank;
  const suit = notation[1] as Suit;
  return { rank, suit };
}

// Helper to format card for display
export function formatCard(card: Card): string {
  return `${card.rank}${SUIT_SYMBOLS[card.suit]}`;
}

// Helper to format hole cards for display
export function formatHoleCards(cards: [Card, Card]): string {
  return `${formatCard(cards[0])} ${formatCard(cards[1])}`;
}
