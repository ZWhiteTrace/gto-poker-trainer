import type { Position } from "./types";

export interface AggressionProfile {
  aggression: number;
}

export function roundToHalf(value: number): number {
  return Math.round(value * 2) / 2;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getOpenRaiseSize(
  position: Position,
  effectiveStack: number,
  profile: AggressionProfile
): number {
  let base = 2.5;
  if (effectiveStack <= 20) {
    base = 2.0;
  } else if (effectiveStack <= 40) {
    base = 2.2;
  } else if (effectiveStack >= 120) {
    base = 2.7;
  }

  if (position === "SB") {
    base += effectiveStack <= 20 ? 0.3 : 0.5;
  }

  const aggressionScale = 0.9 + profile.aggression * 0.2;
  return base * aggressionScale;
}

export function getThreeBetSize(openSize: number, isIP: boolean, effectiveStack: number): number {
  let multiplier = isIP ? 3.0 : 3.5;
  if (effectiveStack <= 25) {
    multiplier = isIP ? 2.6 : 3.0;
  } else if (effectiveStack >= 120) {
    multiplier = isIP ? 3.5 : 4.0;
  }
  return openSize * multiplier;
}

export function getFourBetSize(
  threeBetSize: number,
  isIP: boolean,
  effectiveStack: number
): number {
  let multiplier = isIP ? 2.2 : 2.4;
  if (effectiveStack <= 40) {
    multiplier = 2.1;
  } else if (effectiveStack >= 120) {
    multiplier = isIP ? 2.3 : 2.5;
  }
  return threeBetSize * multiplier;
}
