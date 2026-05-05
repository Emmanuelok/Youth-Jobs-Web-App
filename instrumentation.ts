/**
 * Next.js instrumentation hook. Runs on every server start (Node and Edge
 * runtimes) and is the canonical place to wire Sentry. Loads the right
 * config file lazily so the client bundle stays clean.
 *
 * Sentry is fully optional — without SENTRY_DSN nothing initialises and
 * @sentry/nextjs becomes a no-op import.
 */
export async function register() {
  if (!process.env.SENTRY_DSN) return;

  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  } else if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export async function onRequestError(
  err: unknown,
  request: { path: string; method: string; headers: Record<string, string> },
  context: { routerKind: "Pages Router" | "App Router"; routePath: string; routeType: "render" | "route" | "action" | "middleware" },
) {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureRequestError(err, request, context);
}
