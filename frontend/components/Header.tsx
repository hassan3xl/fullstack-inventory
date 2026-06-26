"use client";

import React from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "./ui/button";
import { motion } from "framer-motion";

interface StatCardData {
  title: string;
  value: string | number;
  icon?: React.ReactNode;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  iconBg?: string;
  cardBg?: string;
}

interface HeaderProps {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  showRefresh?: boolean;
  stats?: StatCardData[];
  actions?: React.ReactNode;
}

const StatCard = ({
  title,
  value,
  icon,
  trend,
  iconBg,
  cardBg,
}: StatCardData) => {
  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`group relative bg-secondary/10 ${cardBg} p-4 sm:p-6 rounded-2xl border border-border/50 shadow-xs hover:shadow-md transition-all duration-300`}
    >
      <div className="flex justify-between items-center mb-3 sm:mb-4">
        <span className="text-[10px] sm:text-xs font-semibold uppercase tracking-wider text-primary truncate max-w-[70%]">
          {title}
        </span>
        <div className={`p-1.5 sm:p-2.5 rounded-xl shrink-0 ${iconBg || "bg-muted"}`}>{icon}</div>
      </div>

      <div className="flex items-baseline justify-between mt-2">
        <h3 className="text-lg sm:text-2xl font-black tracking-tight text-foreground truncate">
          {value}
        </h3>
        {trend && (
          <div
            className={`flex items-center gap-0.5 text-[8px] sm:text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
              trend.isPositive
                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/10"
                : "bg-amber-500/10 text-amber-600 border border-amber-500/10"
            }`}
          >
            {trend.value}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  onRefresh,
  showRefresh = true,
  stats,
  actions,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mb-8"
    >
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        {/* Left side - title/subtitle */}
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-foreground">
            {title}
          </h1>
          {subtitle && (
            <p className="text-md sm:text-lg text-muted-foreground mt-1">
              {subtitle}
            </p>
          )}
        </div>

        {/* Right side - actions */}
        <div className="flex items-center gap-2">
          {actions && <div className="flex items-center gap-2">{actions}</div>}
          {showRefresh && onRefresh && (
            <Button
              variant="outline"
              size="icon"
              onClick={onRefresh}
              title="Refresh"
              className="hover:bg-accent hover:text-foreground transition-colors rounded-lg"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Stats Section */}
      {stats && stats.length > 0 && (
        <div
          className={`grid grid-cols-2 sm:grid-cols-2 ${
            stats.length > 2
              ? "lg:grid-cols-2 xl:grid-cols-4"
              : "lg:grid-cols-" + stats.length
          } gap-4 sm:gap-6`}
        >
          {stats.map((stat, index) => (
            <StatCard key={index} {...stat} />
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default Header;
