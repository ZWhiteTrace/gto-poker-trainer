import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Next.js 14+ has instrumentation enabled by default
};

// Sentry configuration options
const sentryWebpackPluginOptions = {
  // Suppresses source map uploading logs during build
  silent: true,
  // Upload source maps only in production
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Auth token for uploading source maps (optional)
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Disable source map upload if no auth token
  disableSourcemapUpload: !process.env.SENTRY_AUTH_TOKEN,
};

// Apply plugins: first next-intl, then Sentry
export default withSentryConfig(
  withNextIntl(nextConfig),
  sentryWebpackPluginOptions
);
