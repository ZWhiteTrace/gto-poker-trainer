"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/stores/authStore";
import { useProgressStore } from "@/stores/progressStore";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { initialize, user, isInitialized } = useAuthStore();
  const { loadFromCloud } = useProgressStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  // Load progress from cloud when user logs in
  useEffect(() => {
    if (isInitialized && user) {
      loadFromCloud(user.id);
    }
  }, [isInitialized, user, loadFromCloud]);

  return <>{children}</>;
}
