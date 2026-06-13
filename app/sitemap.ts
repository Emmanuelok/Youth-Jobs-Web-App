import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/url";

/**
 * Static public surfaces only. We intentionally do NOT enumerate individual
 * job detail pages here: they churn fast, some are short-lived, and building
 * the list would couple sitemap generation to the database. Search engines
 * discover live jobs by crawling /jobs.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = appUrl();
  const now = new Date();
  const routes = ["", "/jobs", "/privacy", "/terms"];
  return routes.map((path) => ({
    url: `${base}${path}`,
    lastModified: now,
    changeFrequency: path === "/jobs" ? "hourly" : "weekly",
    priority: path === "" ? 1 : path === "/jobs" ? 0.9 : 0.3,
  }));
}
