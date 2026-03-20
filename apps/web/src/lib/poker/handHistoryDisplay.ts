import type { ActionType, HandHistoryPlayer, Position, Street } from "./types";

export type PokerLocale = "en" | "zh-TW";

const actionLabels: Record<PokerLocale, Record<ActionType, string>> = {
  "zh-TW": {
    fold: "棄牌",
    check: "過牌",
    call: "跟注",
    bet: "下注",
    raise: "加注",
    allin: "All-in",
  },
  en: {
    fold: "Fold",
    check: "Check",
    call: "Call",
    bet: "Bet",
    raise: "Raise",
    allin: "All-in",
  },
};

const streetLabels: Record<PokerLocale, Record<Street, string>> = {
  "zh-TW": {
    preflop: "翻前",
    flop: "翻牌",
    turn: "轉牌",
    river: "河牌",
    showdown: "攤牌",
  },
  en: {
    preflop: "Preflop",
    flop: "Flop",
    turn: "Turn",
    river: "River",
    showdown: "Showdown",
  },
};

const improvementAreaLabels: Record<string, string> = {
  "Too tight - folding too often": "過緊，棄牌過多",
  "Too loose - calling too often": "過鬆，跟注過多",
  "Too passive - missing value bets": "過於被動，錯過價值下注",
  "Too aggressive - over-betting": "過於激進，下注過大",
};

export function getPokerActionLabel(action: ActionType, locale: PokerLocale): string {
  return actionLabels[locale][action];
}

export function getHandHistoryStreetLabel(street: Street, locale: PokerLocale): string {
  return streetLabels[locale][street];
}

export function getDisplayPlayerName(
  player: Pick<HandHistoryPlayer, "isHero" | "name" | "nameZh">,
  locale: PokerLocale
): string {
  if (player.isHero) return "Hero";
  return locale === "en" ? player.name : player.nameZh || player.name;
}

export function getDisplayPlayerNameByPosition(
  players: HandHistoryPlayer[],
  position: Position,
  locale: PokerLocale
): string {
  const player = players.find((entry) => entry.position === position);
  if (!player) return position;
  return getDisplayPlayerName(player, locale);
}

export function getDisplayHandDescription(
  description: string | undefined,
  descriptionZh: string | undefined,
  locale: PokerLocale
): string | undefined {
  if (!description && !descriptionZh) return undefined;
  return locale === "en" ? description || descriptionZh : descriptionZh || description;
}

export function localizeCommonMistake(mistake: string, locale: PokerLocale): string {
  if (locale === "en" || mistake === "None") return mistake;
  const match = mistake.match(/^([a-z]+) when should ([a-z]+)$/);
  if (!match) return mistake;
  const [, actualAction, recommendedAction] = match;
  return `${getPokerActionLabel(actualAction as ActionType, locale)}，其實應該 ${getPokerActionLabel(recommendedAction as ActionType, locale)}`;
}

export function localizeImprovementArea(area: string, locale: PokerLocale): string {
  if (locale === "en") return area;
  return improvementAreaLabels[area] || area;
}
