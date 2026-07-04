"use client";

import { useState, useEffect } from "react";
import { DISABLE_OFFLINE } from "../config/offline";

class NetworkStatusTracker {
  private listeners = new Set<(isOffline: boolean) => void>();
  private isOffline = false;
  private intervalId: any = null;

  constructor() {
    if (typeof window === "undefined") return;
    this.isOffline = !navigator.onLine;

    const updateStatus = () => {
      this.checkStatus();
    };

    window.addEventListener("online", updateStatus);
    window.addEventListener("offline", updateStatus);
    
    // Start heartbeat check
    this.checkStatus();
    // Periodically ping to verify connection stability
    this.intervalId = setInterval(() => this.checkStatus(), 10000);
  }

  public subscribe(listener: (isOffline: boolean) => void) {
    this.listeners.add(listener);
    listener(this.isOffline);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getStatus() {
    return this.isOffline;
  }

  public setOffline(offline: boolean) {
    if (this.isOffline !== offline) {
      this.isOffline = offline;
      this.listeners.forEach(l => l(offline));
    }
  }

  public async checkStatus() {
    if (typeof window === "undefined" || DISABLE_OFFLINE) return;

    // If navigator.onLine is false, we are definitely offline (Scenario A)
    if (!navigator.onLine) {
      this.setOffline(true);
      return;
    }

    // Ping backend API root to double check real connection status (Scenario B)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";
      const pingUrl = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
      await fetch(pingUrl, {
        method: "GET",
        signal: controller.signal,
        cache: "no-store",
      });
      clearTimeout(timeoutId);
      this.setOffline(false);
    } catch (err) {
      clearTimeout(timeoutId);
      this.setOffline(true);
    }
  }
}

const tracker = typeof window !== "undefined" ? new NetworkStatusTracker() : null;

export function useIsOffline() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    if (!tracker) return;
    setIsOffline(tracker.getStatus());
    return tracker.subscribe(setIsOffline);
  }, []);

  return isOffline;
}

export function getIsOfflineStatus(): boolean {
  return tracker ? tracker.getStatus() : false;
}

export function setGlobalOffline(offline: boolean) {
  if (tracker) {
    tracker.setOffline(offline);
    if (!offline) {
      // If we're setting it to online, trigger a check to verify
      tracker.checkStatus();
    }
  }
}

