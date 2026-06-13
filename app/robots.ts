import type { MetadataRoute } from "next";
import { appUrl } from "@/lib/url";

export default function robots(): MetadataRoute.Robots {
  const base = appUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/jobs"],
        // Keep private + authenticated surfaces out of search indexes.
        disallow: [
          "/admin",
          "/employer",
          "/messages",
          "/applications",
          "/settings",
          "/cv",
          "/onboarding",
          "/sign-in",
          "/consent",
          "/api",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
