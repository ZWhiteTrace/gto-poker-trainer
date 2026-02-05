/**
 * Standardized Error Handling Utilities
 */

import { logger, createModuleLogger } from "./logger";

// Re-export logger for convenience
export { logger, createModuleLogger };

// ============================================
// Error Types
// ============================================

export class AppError extends Error {
  constructor(
    message: string,
    public code: string = "UNKNOWN_ERROR",
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "AppError";
  }
}

export class ApiError extends AppError {
  constructor(
    message: string,
    public status?: number,
    context?: Record<string, unknown>
  ) {
    super(message, "API_ERROR", context);
    this.name = "ApiError";
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", context);
    this.name = "ValidationError";
  }
}

export class NetworkError extends AppError {
  constructor(message: string = "Network error", context?: Record<string, unknown>) {
    super(message, "NETWORK_ERROR", context);
    this.name = "NetworkError";
  }
}

// ============================================
// Error Extraction Helpers
// ============================================

/**
 * Extract a user-friendly error message from any error type
 * @param error - The error to extract message from
 * @param fallback - Fallback message if extraction fails
 */
export function getErrorMessage(error: unknown, fallback: string = "An error occurred"): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object" && "message" in error) {
    return String((error as { message: unknown }).message);
  }
  return fallback;
}

/**
 * Log error and return user-friendly message
 * Useful for catch blocks where you need to both log and display error
 */
export function handleError(
  error: unknown,
  context: string,
  fallback: string = "An error occurred"
): string {
  const message = getErrorMessage(error, fallback);
  logger.error(`[${context}]`, message, error);
  return message;
}

// ============================================
// Type Guards
// ============================================

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

// ============================================
// Async Error Wrapper
// ============================================

/**
 * Wrap async function with error handling
 * Returns [result, null] on success, [null, error] on failure
 */
export async function tryCatch<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<[T, null] | [null, Error]> {
  try {
    const result = await fn();
    return [result, null];
  } catch (error) {
    if (context) {
      logger.error(`[${context}]`, error);
    }
    return [null, error instanceof Error ? error : new Error(getErrorMessage(error))];
  }
}
