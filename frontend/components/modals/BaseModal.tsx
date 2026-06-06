"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  description?: string;
  showFooterHint?: boolean;
}

const sizeClasses = {
  sm: "sm:max-w-md",
  md: "sm:max-w-lg",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = "md",
  showFooterHint = true,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent
        className={cn(
          "relative w-full h-full sm:h-auto bg-card flex flex-col p-0 gap-0 overflow-hidden",
          "max-h-full sm:max-h-[90vh] rounded-none sm:rounded-2xl border-0 sm:border border-border shadow-2xl mx-auto",
          sizeClasses[size]
        )}
      >
        {/* ── Header ─────────────────────────────────────────── */}
        {(title || description) && (
          <div className="shrink-0 flex items-start justify-between gap-4 px-5 py-4 border-b border-border bg-card rounded-none sm:rounded-t-2xl z-10">
            <DialogHeader className="flex-1 text-left sm:text-left space-y-0.5">
              {title && (
                <DialogTitle className="text-lg sm:text-2xl font-black tracking-tight text-foreground leading-tight">
                  {title}
                </DialogTitle>
              )}
              {description && (
                <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                  {description}
                </DialogDescription>
              )}
            </DialogHeader>
            <button
              onClick={onClose}
              className="shrink-0 rounded-xl p-2 hover:bg-accent transition-colors cursor-pointer mt-0.5"
              aria-label="Close modal"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          </div>
        )}
        {/* ── Scrollable Body ────────────────────────────────── */}
        <div
          className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-5 bg-card"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {children}
        </div>

        {/* ── Footer hint (desktop only) ─────────────────────── */}
        {showFooterHint && (
          <div className="shrink-0 px-4 py-2.5 border-t border-border bg-muted/40 hidden sm:flex items-center justify-center gap-2 rounded-none sm:rounded-b-2xl">
            <kbd className="px-2 py-1 bg-background border border-border rounded text-[10px] font-semibold text-muted-foreground">
              Esc
            </kbd>
            <span className="text-[11px] text-muted-foreground">
              to close
            </span>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BaseModal;
