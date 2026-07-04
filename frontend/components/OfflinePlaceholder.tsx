"use client";

import React from "react";
import { WifiOff, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import Link from "next/link";

interface OfflinePlaceholderProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
}

export default function OfflinePlaceholder({
  title = "Connection Required",
  description = "This page requires an active internet connection to access real-time data from the server.",
  onRetry,
}: OfflinePlaceholderProps) {
  const handleReload = () => {
    if (onRetry) {
      onRetry();
    } else {
      window.location.reload();
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 100, delay: 0.1 }}
        className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-6 shadow-lg shadow-red-500/5 relative overflow-hidden group"
      >
        <motion.div
          className="absolute inset-0 bg-red-500/5 translate-y-full group-hover:translate-y-0 transition-transform duration-300"
        />
        <WifiOff className="w-10 h-10 relative z-10 group-hover:scale-110 transition-transform duration-300" />
      </motion.div>

      <motion.h3
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-2xl font-black text-foreground tracking-tight mb-3"
      >
        {title}
      </motion.h3>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-muted-foreground max-w-md text-sm leading-relaxed mb-8"
      >
        {description}
      </motion.p>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto"
      >
        <Button
          onClick={handleReload}
          className="shadow-lg shadow-primary/20 rounded-xl h-11 px-6 font-bold flex items-center justify-center gap-2 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Try Reconnecting
        </Button>
        <Button
          variant="outline"
          asChild
          className="rounded-xl border-border bg-background hover:bg-muted/50 h-11 px-6 font-bold flex items-center justify-center gap-2 cursor-pointer"
        >
          <Link href="/dashboard">
            <Home className="w-4 h-4" />
            Go to Dashboard
          </Link>
        </Button>
      </motion.div>
    </div>
  );
}
