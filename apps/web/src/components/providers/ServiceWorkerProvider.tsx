"use client";

import { useEffect } from "react";

export function ServiceWorkerProvider() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // SW registration failed silently
      });
    }
  }, []);

  return null;
}
