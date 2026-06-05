"use client";

import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

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
  const [mounted, setMounted] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    // Save current scroll position
    const scrollY = window.scrollY;

    // Lock body scroll without shifting layout
    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.overflow = "hidden";

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);

      // Restore body scroll
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.overflow = "";
      window.scrollTo(0, scrollY);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <>
      {/* ── Backdrop ─────────────────────────────────────────────── */}
      <div
        className="fixed inset-0 bg-black/70 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/*
       * ── Outer wrapper ──────────────────────────────────────────
       * On mobile: covers full screen, flex column, NO overflow
       * so the PANEL itself scrolls internally.
       * On sm+: centres the panel with padding.
       */}
      <div
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/*
         * ── Panel ──────────────────────────────────────────────
         * Mobile  : slides up from bottom, full width, rounded top,
         *           max-height 92dvh so top of screen is always visible,
         *           internal scroll via overflow-y-auto on the body.
         * Desktop : centred card, max-height 90vh.
         */}
        <div
          className={`
            relative w-full bg-card flex flex-col
            max-h-[92dvh] sm:max-h-[90vh]
            rounded-t-2xl sm:rounded-2xl
            border-0 sm:border sm:border-border
            shadow-2xl
            transform-gpu
            ${sizeClasses[size]}
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ─────────────────────────────────────────── */}
          {(title || description) && (
            <div className="shrink-0 flex items-start justify-between gap-4 px-5 py-4 border-b border-border bg-card rounded-t-2xl z-10">
              <div className="flex-1 min-w-0">
                {title && (
                  <h2 className="text-lg sm:text-2xl font-black tracking-tight text-foreground leading-tight">
                    {title}
                  </h2>
                )}
                {description && (
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    {description}
                  </p>
                )}
              </div>
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
          {/*
           * KEY FIX: overflow-y-auto here (not on the outer wrapper)
           * so the header stays pinned and only the content scrolls.
           * -webkit-overflow-scrolling: touch enables momentum scroll
           * on iOS/Android Chrome.
           */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto overflow-x-hidden px-5 py-5 bg-card transform-gpu isolate"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {children}
          </div>

          {/* ── Footer hint (desktop only) ─────────────────────── */}
          {showFooterHint && (
            <div className="shrink-0 px-4 py-2.5 border-t border-border bg-muted/40 hidden sm:flex items-center justify-center gap-2 rounded-b-2xl">
              <kbd className="px-2 py-1 bg-background border border-border rounded text-[10px] font-semibold text-muted-foreground">
                Esc
              </kbd>
              <span className="text-[11px] text-muted-foreground">
                to close
              </span>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body,
  );
};

export default BaseModal;
