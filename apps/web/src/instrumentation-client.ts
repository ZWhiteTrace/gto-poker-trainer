import * as Sentry from "@sentry/nextjs";

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;

const FIRST_PARTY_FRAME_PATTERNS = [
  /https?:\/\/(?:www\.)?grindgto\.com/i,
  /\/_next\/static\//,
  /^webpack-internal:\/\//,
  /^app:\/\/\/_next\//,
];

const THIRD_PARTY_FRAME_PATTERNS = [
  /^chrome-extension:\/\//i,
  /^moz-extension:\/\//i,
  /^safari-web-extension:\/\//i,
  /^app:\/\/\/(?:solana|phantom|backpack|metamask|rabby|okx|bitget|keplr)\b/i,
  /AdGuard.*\.user\.js/i,
  /\.user\.js$/i,
];

function shouldDropThirdPartyBrowserError(event: Sentry.ErrorEvent): boolean {
  const frames =
    event.exception?.values?.flatMap((value) => value.stacktrace?.frames ?? []) ?? [];

  if (frames.length === 0) {
    return false;
  }

  const filenames = frames.map((frame) => frame.filename).filter((name): name is string => !!name);
  const hasThirdPartyFrame = filenames.some((filename) =>
    THIRD_PARTY_FRAME_PATTERNS.some((pattern) => pattern.test(filename))
  );
  const hasFirstPartyFrame = filenames.some((filename) =>
    FIRST_PARTY_FRAME_PATTERNS.some((pattern) => pattern.test(filename))
  );

  return hasThirdPartyFrame && !hasFirstPartyFrame;
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Performance Monitoring
  tracesSampleRate: 0.1, // 10% of transactions for performance monitoring

  // Session Replay (optional)
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Environment
  environment: process.env.NODE_ENV,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  // Filter out noisy errors
  ignoreErrors: [
    // Network errors
    "Network request failed",
    "Failed to fetch",
    "Load failed",
    // Browser extensions
    /^chrome-extension:\/\//,
    /^moz-extension:\/\//,
    // Common benign errors
    "ResizeObserver loop limit exceeded",
    "ResizeObserver loop completed with undelivered notifications",
  ],

  beforeSend(event) {
    // Don't send events in development
    if (process.env.NODE_ENV === "development") {
      return null;
    }

    if (shouldDropThirdPartyBrowserError(event)) {
      return null;
    }

    return event;
  },
});
