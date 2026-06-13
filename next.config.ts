import type { NextConfig } from "next";

/**
 * Content-Security-Policy.
 *
 * Pragmatic-but-real: we render inline <style> blocks (CV, agreement, consent
 * pages) and style attributes, so style-src needs 'unsafe-inline'. Next.js
 * App Router injects inline bootstrap scripts; without per-request nonces
 * script-src needs 'unsafe-inline' too. The XSS surface is small — React
 * escapes all interpolated content and we never render user HTML — but the
 * path to tightening this is nonce-based CSP via middleware. Documented so
 * the next hardening pass knows where to go.
 *
 * No third-party browser scripts: Sentry is server-side only, Upstash and
 * Anthropic are called from server actions, SMS via server. So connect-src
 * 'self' is sufficient for the browser.
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
  "manifest-src 'self'",
  "worker-src 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        // Apply security headers to every route.
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // The service worker must be served fresh and scoped to root.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
};

export default nextConfig;
