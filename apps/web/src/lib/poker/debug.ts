/**
 * Debug logging utilities for poker game development
 * Only logs in development environment
 */

const IS_DEV = process.env.NODE_ENV === "development";

type LogLevel = "info" | "warn" | "error" | "debug";

interface LogOptions {
  level?: LogLevel;
  data?: unknown;
}

/**
 * Log AI decision information
 */
export function logAI(message: string, data?: unknown): void {
  if (!IS_DEV) return;
  console.log(`[AI] ${message}`, data ?? "");
}

/**
 * Log game state changes
 */
export function logGame(message: string, data?: unknown): void {
  if (!IS_DEV) return;
  console.log(`[Game] ${message}`, data ?? "");
}

/**
 * Log betting/action information
 */
export function logAction(message: string, data?: unknown): void {
  if (!IS_DEV) return;
  console.log(`[Action] ${message}`, data ?? "");
}

/**
 * Log hand evaluation details
 */
export function logHand(message: string, data?: unknown): void {
  if (!IS_DEV) return;
  console.log(`[Hand] ${message}`, data ?? "");
}

/**
 * General debug log with configurable level
 */
export function log(message: string, options?: LogOptions): void {
  if (!IS_DEV) return;

  const { level = "info", data } = options ?? {};
  const prefix = `[Poker]`;

  switch (level) {
    case "warn":
      console.warn(`${prefix} ${message}`, data ?? "");
      break;
    case "error":
      console.error(`${prefix} ${message}`, data ?? "");
      break;
    case "debug":
      console.debug(`${prefix} ${message}`, data ?? "");
      break;
    default:
      console.log(`${prefix} ${message}`, data ?? "");
  }
}

/**
 * Performance timing utility
 */
export function timeStart(label: string): void {
  if (!IS_DEV) return;
  console.time(`[Perf] ${label}`);
}

export function timeEnd(label: string): void {
  if (!IS_DEV) return;
  console.timeEnd(`[Perf] ${label}`);
}
