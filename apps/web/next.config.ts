import type { NextConfig } from "next";
import path from "path";
import createNextIntlPlugin from "next-intl/plugin";
import { withSentryConfig } from "@sentry/nextjs";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Performance optimizations
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },

  // Resolve @data/* alias for Turbopack (mirrors tsconfig paths)
  // Uses both __dirname and process.cwd() for CI compatibility
  turbopack: {
    resolveAlias: {
      "@data": path.resolve(process.cwd(), "../../data"),
    },
  },

  // Webpack fallback for @data/* alias
  webpack: (config) => {
    config.resolve.alias["@data"] = path.resolve(process.cwd(), "../../data");
    return config;
  },

  // Experimental features for better performance
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
  },

  // Enable compression
  compress: true,

  // Reduce bundle size by removing console.log in production
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },

  // Headers for caching static assets and security
  async headers() {
    return [
      {
        // Security headers for all routes
        source: "/:path*",
        headers: [
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
        ],
      },
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

// Apply plugins: next-intl → Sentry
export default withSentryConfig(
  withNextIntl(nextConfig),
  sentryWebpackPluginOptions
);
