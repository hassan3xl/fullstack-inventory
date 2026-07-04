"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { syncService, getActiveTenantId } from "@/lib/services/syncService";
import { toast } from "sonner";
import { useIsOffline } from "@/lib/hooks/useIsOffline";
import { DISABLE_OFFLINE } from "@/lib/config/offline";

interface SyncContextType {
  isOnline: boolean;
  isSyncing: boolean;
  lastSyncedAt: string | null;
  triggerSync: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isOffline = useIsOffline();
  const isOnline = DISABLE_OFFLINE ? true : !isOffline;
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const tenantId = typeof window !== "undefined" ? getActiveTenantId() : "";

  // Register service worker on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js")
        .then((reg) => console.log("Service Worker registered on scope:", reg.scope))
        .catch((err) => console.error("Service Worker registration failed:", err));
    }
  }, []);

  // Handle online/offline notifications and initial sync
  useEffect(() => {
    if (DISABLE_OFFLINE || !tenantId) return;

    if (isOnline) {
      toast.success("Online", {
        description: "Network connection restored. Syncing data...",
      });
      triggerSync();
    } else {
      toast.warning("Offline Mode", {
        description: "You are currently offline or backend is unreachable. Changes will save locally.",
      });
    }
  }, [isOnline, tenantId]);

  // Initial pull/push and periodic interval syncs (every 5 minutes)
  useEffect(() => {
    if (DISABLE_OFFLINE || !tenantId || !isOnline) return;

    // Run initial sync on mount or tenant switch
    triggerSync();

    const interval = setInterval(() => {
      triggerSync();
    }, 1000 * 60 * 5); // 5 minutes

    return () => clearInterval(interval);
  }, [tenantId, isOnline]);

  const triggerSync = async () => {
    if (DISABLE_OFFLINE || !isOnline || !tenantId) return;
    setIsSyncing(true);

    try {
      await syncService.syncAll();
      setLastSyncedAt(new Date().toLocaleTimeString());
    } catch (err) {
      console.error("Manual database synchronization sweep failed:", err);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <SyncContext.Provider
      value={{
        isOnline,
        isSyncing,
        lastSyncedAt,
        triggerSync,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
};

export const useSync = () => {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error("useSync must be used within a SyncProvider");
  }
  return context;
};
