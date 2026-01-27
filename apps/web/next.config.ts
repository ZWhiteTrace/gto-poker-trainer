import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Performance optimizations
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  // Experimental features for better performance
  experimental: {
    optimizeCss: true,
  },

  // Enable compression
  compress: true,

  // Reduce bundle size by removing console.log in production
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Headers for caching static assets
  async headers() {
    return [
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|gif|ico|woff|woff2)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },

  // Redirects for common typos/old URLs
  async redirects() {
    return [
      {
        source: "/ranges",
        destination: "/range",
        permanent: true,
      },
    ];
  },
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
