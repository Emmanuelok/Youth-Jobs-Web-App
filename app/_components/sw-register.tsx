"use client";

import { useEffect } from "react";

/**
 * Registers the service worker after the page is interactive. Kept tiny and
 * dependency-free so it adds negligible weight to the low-data bundle.
 * Silently no-ops where service workers are unsupported.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .catch(() => undefined);
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
