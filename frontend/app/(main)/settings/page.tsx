"use client";

import React, { useRef, useState, useEffect } from "react";
import Image from "next/image";
import {
  Camera,
  ShieldCheck,
  Activity,
  CalendarDays,
  Crown,
  Edit3,
  Check,
  X,
  Bell,
  Lock,
  Tag,
  Layers,
  Cpu,
  Info,
  AlertTriangle,
  Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  useGetStore,
  useUpdateStore,
  useUpdateStoreLogo,
} from "@/lib/hooks/store.hook";
import { useBusinessConfig } from "@/lib/hooks/useBusinessConfig";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/Header";
import { useAuth } from "@/contexts/AuthContext";
import Loader from "@/components/Loader";
import { getBackendErrorMessage } from "@/lib/services/apiService";
import Link from "next/link";

// ── Capability pill ──────────────────────────────────────────────────────
const CapabilityPill = ({
  label,
  enabled,
}: {
  label: string;
  enabled: boolean;
}) => (
  <span
    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
      enabled
        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
        : "bg-muted/60 text-muted-foreground/60 border-border/40 line-through"
    }`}
  >
    <span
      className={`w-1.5 h-1.5 rounded-full ${enabled ? "bg-emerald-500" : "bg-muted-foreground/40"}`}
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
  <div className="flex items-start gap-4 py-4 border-b border-border/40 last:border-0">
    <div className="w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
      <Icon className="w-4 h-4 text-muted-foreground" />
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

// ── Custom Switch Component ──────────────────────────────────────────────
const Switch = ({
  checked,
  onCheckedChange,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}) => {
  return (
    <button
      type="button"
      onClick={() => !disabled && onCheckedChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? "bg-primary" : "bg-muted-foreground/30"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-background shadow-lg ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
};

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const permissions = user?.permissions;
  const isOwner = permissions?.is_owner || user?.role === "is_owner";
  const isAdmin = permissions?.is_admin;
  const isAuthorized = isOwner || isAdmin;

  const { data: store, isLoading: storeLoading } = useGetStore();
  const { config } = useBusinessConfig();

  const updateStoreMutation = useUpdateStore();
  const updateLogoMutation = useUpdateStoreLogo();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const [isHoveringLogo, setIsHoveringLogo] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [showNameWarning, setShowNameWarning] = useState(false);

  const [isEditingSubdomain, setIsEditingSubdomain] = useState(false);
  const [subdomainValue, setSubdomainValue] = useState("");

  // Sync fields when store data loads
  useEffect(() => {
    if (store?.name) setNameValue(store.name);
    if (store?.subdomain) setSubdomainValue(store.subdomain);
  }, [store?.name, store?.subdomain]);

  // Auto-focus input when editing starts
  useEffect(() => {
    if (isEditingName) nameInputRef.current?.focus();
  }, [isEditingName]);

  // Authorization Redirect Guard
  useEffect(() => {
    if (!authLoading && !isAuthorized) {
      toast.error("Access Denied", {
        description:
          "Only store owners and administrators can access store settings.",
      });
      window.location.href = "/dashboard";
    }
  }, [authLoading, isAuthorized]);

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("logo", file);
    try {
      await updateLogoMutation.mutateAsync(fd);
      toast.success("Logo updated successfully", {
        description: "Your business logo has been refreshed.",
      });
    } catch {
      toast.error("Upload failed", {
        description: "Please try a different image file.",
      });
    }
  };

  const handleNameSave = async () => {
    const trimmed = nameValue.trim();
    if (!trimmed) {
      toast.error("Store name cannot be empty.");
      return;
    }
    if (trimmed === store?.name) {
      setIsEditingName(false);
      return;
    }
    try {
      await updateStoreMutation.mutateAsync({ name: trimmed });
      toast.success("Store name updated", {
        description:
          "All staff and the platform admin have been notified of this change.",
        icon: "🔔",
        duration: 5000,
      });
      setIsEditingName(false);
      setShowNameWarning(false);
    } catch {
      toast.error("Update failed", {
        description: "Could not save the new store name. Please try again.",
      });
    }
  };

  const handleNameCancel = () => {
    setNameValue(store?.name || "");
    setIsEditingName(false);
    setShowNameWarning(false);
  };

  const handleSubdomainSave = async () => {
    const trimmed = subdomainValue.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");
    if (trimmed === (store?.subdomain || "")) {
      setIsEditingSubdomain(false);
      return;
    }
    try {
      await updateStoreMutation.mutateAsync({ subdomain: trimmed || null });
      toast.success("Subdomain updated successfully", {
        description: `Your custom store subdomain is now set to ${trimmed || "none"}.`,
      });
      setIsEditingSubdomain(false);
    } catch (err: any) {
      const msg = getBackendErrorMessage(err);
      toast.error("Failed to update subdomain", {
        description: msg,
      });
    }
  };

  const handleToggleEmailNotifications = async (checked: boolean) => {
    try {
      await updateStoreMutation.mutateAsync({
        email_notifications_enabled: checked,
      });
      toast.success(
        checked
          ? "Email notifications enabled"
          : "Email notifications disabled",
        {
          description: checked
            ? "Your staff will receive email notifications based on their role and preferences."
            : "Email notifications for your staff have been disabled.",
        },
      );
    } catch {
      toast.error("Failed to update settings", {
        description: "Could not save your changes. Please try again.",
      });
    }
  };

  if (authLoading || !isAuthorized || storeLoading) {
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

  const isDirty = nameValue.trim() !== store.name;

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* ── Top Header ────────────────────────── */}
      <Header
        title="Store Settings"
        subtitle="Manage your business profile and settings."
      />

      {/* Hidden file input for logo upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleLogoChange}
      />

      {/* ── Cohesive Store Profile Card ───────────────── */}
      <div className="relative rounded-2xl overflow-hidden border border-border/50 bg-card shadow-sm">
        {/* Cover Banner */}
        <div className="h-36 w-full bg-gradient-to-r from-primary/10 via-primary/5 to-blue-500/10 relative overflow-hidden border-b border-border/40">
          {/* Decorative background blurs */}
          <div className="absolute top-0 right-0 w-96 h-96 -mt-32 -mr-32 bg-primary/20 blur-[80px] rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-72 h-72 -mb-20 -ml-20 bg-blue-500/20 blur-[80px] rounded-full pointer-events-none" />
        </div>

        {/* Profile Content Container */}
        <div className="px-6 pb-8 pt-0 sm:px-8 relative z-10 flex flex-col md:flex-row items-center md:items-end gap-6">
          {/* Overlapping Logo container */}
          <div
            className="relative group cursor-pointer -mt-16 shrink-0"
            onClick={() => fileInputRef.current?.click()}
            title="Click to update store logo"
          >
            {/* Glow ring */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-blue-500 rounded-full blur-md opacity-25 group-hover:opacity-60 transition-opacity duration-500" />
            <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-4 border-card shadow-lg bg-muted flex items-center justify-center">
              {updateLogoMutation.isPending ? (
                <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : (
                <Image
                  src={store.logo || "/placeholder.png"}
                  alt={store.name}
                  fill
                  unoptimized
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                />
              )}
              {/* Overlay */}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white gap-1 transition-opacity duration-200">
                <Camera className="w-5 h-5" />
                <span className="text-[8px] font-black uppercase tracking-wider">
                  Change Logo
                </span>
              </div>
            </div>
          </div>

          {/* Details & Actions area */}
          <div className="flex-1 flex flex-col md:flex-row md:items-end justify-between gap-6 w-full text-center md:text-left">
            <div className="space-y-3 min-w-0">
              {/* Name & status */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                <AnimatePresence mode="wait">
                  {isEditingName ? (
                    <motion.div
                      key="edit"
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      className="flex items-center gap-2 w-full max-w-md"
                    >
                      <input
                        ref={nameInputRef}
                        value={nameValue}
                        onChange={(e) => {
                          setNameValue(e.target.value);
                          setShowNameWarning(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleNameSave();
                          if (e.key === "Escape") handleNameCancel();
                        }}
                        className="flex-1 text-xl sm:text-2xl font-black bg-background border-2 border-primary/45 focus:border-primary rounded-xl px-3 py-1.5 outline-none transition-colors"
                        placeholder="Store name…"
                        maxLength={80}
                      />
                      <button
                        onClick={handleNameSave}
                        disabled={updateStoreMutation.isPending || !isDirty}
                        className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
                      >
                        {updateStoreMutation.isPending ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Check className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        onClick={handleNameCancel}
                        className="w-9 h-9 rounded-xl bg-muted text-muted-foreground flex items-center justify-center hover:bg-muted/80 transition-colors cursor-pointer shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="display"
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="flex items-center gap-2.5 group/name"
                    >
                      <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-foreground">
                        {store.name}
                      </h1>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Badges */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                  <Layers className="w-3 h-3" />
                  {config.displayName}
                </span>
              </div>
            </div>

            {/* Profile Action Buttons inside the card itself */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5 shrink-0">
              <Button
                variant="outline"
                className="flex items-center gap-2 font-bold text-xs h-9 px-3 rounded-lg cursor-pointer bg-background hover:bg-muted"
                onClick={() => fileInputRef.current?.click()}
                disabled={updateLogoMutation.isPending}
              >
                <Camera className="w-3.5 h-3.5 text-primary" />
                {updateLogoMutation.isPending ? "Uploading…" : "Upload Logo"}
              </Button>
              {isOwner && !isEditingName && (
                <Button
                  className="flex items-center gap-2 font-bold text-xs h-9 px-3 rounded-lg cursor-pointer"
                  onClick={() => setIsEditingName(true)}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Rename Store
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Notification warning banner when editing */}
        <AnimatePresence>
          {showNameWarning && isEditingName && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-start gap-2.5 bg-amber-500/10 border-t border-amber-500/25 px-6 py-4 text-amber-700 dark:text-amber-400"
            >
              <Bell className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="text-xs font-semibold leading-relaxed">
                Saving this will automatically notify the{" "}
                <strong>platform administrator</strong>,{" "}
                <strong>store admin</strong>, and all{" "}
                <strong>active staff members</strong>.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Two-column content ───────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left col: store details (3/5) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Store info card */}
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border/40 flex items-center gap-2">
              <Store className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-black text-xs uppercase tracking-widest text-muted-foreground">
                Store Details
              </h2>
            </div>
            <div className="px-6">
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

              {/* Custom Business Subdomain Field */}
              <div className="flex items-start gap-4 py-4 border-b border-border/40 last:border-0">
                <div className="w-9 h-9 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">
                    Store Subdomain
                  </p>
                  {store.current_plan?.has_subdomain ? (
                    isEditingSubdomain ? (
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center border-2 border-primary/45 focus-within:border-primary rounded-xl px-3 py-1.5 bg-background flex-1">
                          <input
                            value={subdomainValue}
                            onChange={(e) => setSubdomainValue(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                            className="bg-transparent outline-none text-sm font-bold text-foreground w-full text-right"
                            placeholder="my-store"
                          />
                          <span className="text-muted-foreground text-xs font-semibold ml-1">.qstack.com.ng</span>
                        </div>
                        <button
                          onClick={handleSubdomainSave}
                          disabled={updateStoreMutation.isPending || subdomainValue === (store.subdomain || "")}
                          className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 disabled:opacity-50 transition-colors cursor-pointer shrink-0"
                        >
                          {updateStoreMutation.isPending ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <Check className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setSubdomainValue(store.subdomain || "");
                            setIsEditingSubdomain(false);
                          }}
                          className="w-9 h-9 rounded-xl bg-muted text-muted-foreground flex items-center justify-center hover:bg-muted/80 transition-colors cursor-pointer shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <span className="text-sm font-mono font-bold text-foreground">
                          {store.subdomain ? `${store.subdomain}.qstack.com.ng` : "Not set"}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[11px] font-bold text-primary hover:bg-primary/10 rounded-lg cursor-pointer"
                          onClick={() => {
                            setSubdomainValue(store.subdomain || "");
                            setIsEditingSubdomain(true);
                          }}
                        >
                          Configure
                        </Button>
                      </div>
                    )
                  ) : (
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="text-sm font-bold text-muted-foreground/60 italic">
                        Requires Enterprise Plan
                      </span>
                      <Link href="/subscription">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 px-2 text-[10px] font-bold border-primary/20 text-primary hover:bg-primary/5 rounded-lg cursor-pointer flex items-center gap-1"
                        >
                          <Crown className="w-3 h-3 text-amber-500" />
                          Upgrade
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
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
              <InfoRow
                icon={Crown}
                label="Store ID"
                value={store.store_id}
                mono
              />
            </div>
          </div>
        </div>

        {/* Right col: capabilities + notification info (2/5) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Notification settings card */}
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="px-6 py-4 border-b border-border/40 flex items-center gap-2">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-black text-xs uppercase tracking-widest text-muted-foreground">
                Notification Control
              </h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-foreground">
                    Staff Email Notifications
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Allow system to send transactional emails to staff members
                    for expiry alerts, low stock, and other inventory events.
                  </p>
                </div>
                <div className="pt-0.5">
                  <Switch
                    checked={store.email_notifications_enabled}
                    onCheckedChange={handleToggleEmailNotifications}
                    disabled={updateStoreMutation.isPending}
                  />
                </div>
              </div>

              <div className="flex items-start gap-2.5 bg-muted/40 border border-border/30 rounded-xl px-4 py-3">
                <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  When disabled, only the store owner will receive email alerts.
                  Staff members will still receive in-app notifications in their
                  panel.
                </p>
              </div>
            </div>
          </div>

          {/* Store capabilities */}
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-border/40 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-black text-xs uppercase tracking-widest text-muted-foreground">
                Store Capabilities
              </h2>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-xs text-muted-foreground font-medium">
                Active features configuration:
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

          {/* Notification info card */}
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-amber-500/15 flex items-center gap-2">
              <Bell className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <h2 className="font-black text-xs uppercase tracking-widest text-amber-700 dark:text-amber-400">
                Name Change Alerts
              </h2>
            </div>
            <div className="px-6 py-5 space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                When the store name is updated, notifications will be sent
                directly to:
              </p>
              <ul className="space-y-2">
                {[
                  "Platform Administrator",
                  "Store Owner / Admin account",
                  "All active staff members",
                ].map((r) => (
                  <li
                    key={r}
                    className="flex items-center gap-2.5 text-xs font-bold text-foreground"
                  >
                    <span className="w-5 h-5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                      <Bell className="w-3 h-3" />
                    </span>
                    {r}
                  </li>
                ))}
              </ul>
              <div className="flex items-start gap-2 pt-2 border-t border-amber-500/10">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                <p className="text-[10px] sm:text-[11px] text-muted-foreground leading-normal">
                  All updates are audited. Avoid frequent modifications to
                  prevent disruption or confusion.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
