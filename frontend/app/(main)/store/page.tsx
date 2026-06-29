"use client";

import React from "react";
import Image from "next/image";
import {
  ShieldCheck,
  Activity,
  CalendarDays,
  Crown,
  Tag,
  Layers,
  Cpu,
  Store,
  Sparkles,
} from "lucide-react";
import { useGetStore } from "@/lib/hooks/store.hook";
import { useBusinessConfig } from "@/lib/hooks/useBusinessConfig";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import Loader from "@/components/Loader";

// ── Capability pill ──────────────────────────────────────────────────────
const CapabilityPill = ({
  label,
  enabled,
}: {
  label: string;
  enabled: boolean;
}) => (
  <span
    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all duration-300 ${
      enabled
        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-sm"
        : "bg-muted/40 text-muted-foreground/50 border-border/20 line-through"
    }`}
  >
    <span
      className={`w-1.5 h-1.5 rounded-full ${enabled ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30"}`}
    />
    {label}
  </span>
);

// ── Info row ─────────────────────────────────────────────────────────────
const InfoRow = ({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) => (
  <div className="flex items-start gap-4 py-4 border-b border-border/40 last:border-0 hover:bg-muted/10 px-2 rounded-xl transition-all duration-200">
    <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 text-primary">
      <Icon className="w-4 h-4" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">
        {label}
      </p>
      <div
        className={`text-sm font-bold text-foreground break-all ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </div>
    </div>
  </div>
);

export default function StoreProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const { data: store, isLoading: storeLoading } = useGetStore();
  const { config } = useBusinessConfig();

  const platformRole = (user?.role ||
    user?.permissions?.platform_role ||
    null) as string | null;
  const isPlatformAdmin = platformRole === "platform_admin";

  if (authLoading || storeLoading) {
    return <Loader />;
  }

  if (!store) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Store className="w-16 h-16 text-muted-foreground/30" />
        <p className="font-bold text-foreground">Store profile not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Top Header ────────────────────────── */}
      <Header
        title="Store Profile"
        subtitle="View your business identity, details, capabilities, and subscription tier."
      />

      {/* ── Cohesive Store Profile Card ───────────────── */}
      <div className="relative rounded-2xl overflow-hidden border border-border/50 bg-card shadow-sm">
        {/* Cover Banner */}
        <div className="h-40 w-full bg-gradient-to-r from-primary/15 via-primary/5 to-blue-500/15 relative overflow-hidden border-b border-border/40">
          <div className="absolute top-0 right-0 w-96 h-96 -mt-32 -mr-32 bg-primary/20 blur-[80px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-72 h-72 -mb-20 -ml-20 bg-blue-500/20 blur-[80px] rounded-full pointer-events-none" />
        </div>

        {/* Profile Content Container */}
        <div className="px-6 pb-8 pt-0 sm:px-8 relative z-10 flex flex-col md:flex-row items-center md:items-end gap-6">
          {/* Logo container */}
          <div className="relative -mt-16 shrink-0">
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-500 rounded-full blur-md opacity-30" />
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-card shadow-lg bg-muted flex items-center justify-center">
              <Image
                src={store.logo || "/placeholder.png"}
                alt={store.name}
                fill
                unoptimized
                className="object-cover"
              />
            </div>
          </div>

          {/* Details & Info area */}
          <div className="flex-1 flex flex-col md:flex-row md:items-end justify-between gap-6 w-full text-center md:text-left">
            <div className="space-y-3 min-w-0">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-foreground">
                  {store.name}
                </h1>
              </div>

              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="text-xs text-muted-foreground font-semibold bg-muted/65 px-2.5 py-1 rounded-full">
                  {store.category || "General Business"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Two-column content ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left col: store details (3/5) */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border/40 flex items-center gap-2">
              <Store className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-black text-xs uppercase tracking-widest text-muted-foreground">
                Store Details
              </h2>
            </div>
            <div className="px-6 py-2">
              <InfoRow
                icon={Tag}
                label="Business Classification"
                value={store.category || "Uncategorized"}
              />
              <InfoRow
                icon={Layers}
                label="Store Type"
                value={config.displayName}
              />
              <InfoRow
                icon={Activity}
                label="Operational Status"
                value={
                  <span
                    className={
                      store.is_active
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-500"
                    }
                  >
                    {store.is_active ? "Active & Operational" : "Suspended"}
                  </span>
                }
              />
              <InfoRow
                icon={CalendarDays}
                label="Platform Member Since"
                value={new Date(store.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              />
            </div>
          </div>
        </div>

        {/* Right col: capabilities + subscription (2/5) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Subscription Info Card */}
          {store.current_plan && (
            <div className="bg-gradient-to-br from-primary/10 to-blue-500/5 rounded-2xl border border-primary/20 shadow-sm overflow-hidden relative">
              <div className="px-6 py-4 border-b border-primary/15 flex items-center gap-2">
                <h2 className="font-black text-xs uppercase tracking-widest text-primary">
                  Subscription Tier
                </h2>
              </div>
              <div className="px-6 py-5 space-y-4">
                <div>
                  <p className="text-2xl font-black text-foreground capitalize mt-0.5">
                    {store.current_plan.name}
                  </p>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/40">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-semibold">
                      Max Products
                    </span>
                    <span className="font-bold text-foreground">
                      {store.current_plan.max_products === -1
                        ? "Unlimited"
                        : store.current_plan.max_products}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-semibold">
                      Max Staff Members
                    </span>
                    <span className="font-bold text-foreground">
                      {store.current_plan.max_staff === -1
                        ? "Unlimited"
                        : store.current_plan.max_staff}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-muted-foreground font-semibold">
                      Custom Subdomain
                    </span>
                    <span className="font-bold text-foreground">
                      {store.current_plan.has_subdomain
                        ? "Supported"
                        : "Not Supported"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Store capabilities */}
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border/40 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-black text-xs uppercase tracking-widest text-muted-foreground">
                Store Capabilities
              </h2>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-xs text-muted-foreground font-medium animate-pulse">
                Active feature configuration:
              </p>
              <div className="flex flex-wrap gap-2">
                <CapabilityPill
                  label="Expiry Tracking"
                  enabled={config.features.expiryTracking}
                />
                <CapabilityPill
                  label="Variant Tracking"
                  enabled={config.features.variantTracking}
                />
                <CapabilityPill
                  label="Serial Numbers"
                  enabled={config.features.serialNumberTracking}
                />
                <CapabilityPill
                  label="Weight Units"
                  enabled={config.features.weightUnitSupport}
                />
              </div>
              {config.customFields.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border/40">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2">
                    Custom Fields
                  </p>
                  <div className="space-y-1">
                    {config.customFields.map((f) => (
                      <div
                        key={f.name}
                        className="flex items-center gap-2 text-xs font-semibold text-muted-foreground"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-primary/50 shrink-0" />
                        {f.label}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
