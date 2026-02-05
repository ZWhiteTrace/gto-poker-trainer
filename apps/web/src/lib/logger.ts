/**
 * Unified Logger
 * - Development: logs to console
 * - Production: silences debug/info, only errors go to Sentry
 */

const isDev = process.env.NODE_ENV === "development";

type LogLevel = "debug" | "info" | "warn" | "error";

interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

function createLogger(prefix?: string): Logger {
  const formatMessage = (level: LogLevel, args: unknown[]) => {
    if (prefix) {
      return [`[${prefix}]`, ...args];
    }
    return args;
  };

  return {
    debug: (...args: unknown[]) => {
      if (isDev) {
        console.debug(...formatMessage("debug", args));
      }
    },

    info: (...args: unknown[]) => {
      if (isDev) {
        console.info(...formatMessage("info", args));
      }
    },

    warn: (...args: unknown[]) => {
      if (isDev) {
        console.warn(...formatMessage("warn", args));
      }
    },

    error: (...args: unknown[]) => {
      // Always log errors, but in production they go to Sentry
      if (isDev) {
        console.error(...formatMessage("error", args));
      } else {
        // In production, Sentry captures console.error automatically
        // Or we could explicitly call Sentry.captureException here
        console.error(...formatMessage("error", args));
      }
    },
  };
}

// Default logger instance
export const logger = createLogger();

// Create namespaced loggers for different modules
export const createModuleLogger = (moduleName: string): Logger => {
  return createLogger(moduleName);
};

// Specific module loggers
export const solverLogger = createModuleLogger("Solver");
export const authLogger = createModuleLogger("Auth");
export const apiLogger = createModuleLogger("API");
export const drillLogger = createModuleLogger("Drill");
