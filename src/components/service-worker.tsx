"use client";

import { useEffect } from "react";

/** Registers the offline fallback service worker in production builds only. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((error) => {
      console.warn("[sw] registration failed", error);
    });
  }, []);
  return null;
}
