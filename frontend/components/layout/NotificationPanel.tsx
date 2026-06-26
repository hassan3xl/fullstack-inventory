"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Check,
  Trash2,
  CheckCheck,
  User,
  MessageSquare,
  Heart,
  DollarSign,
  AlertCircle,
  X,
  Clock,
  Package,
} from "lucide-react";
import {
  useGetNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useClearAllNotifications,
} from "@/lib/hooks/notifications.hook";

type Notification = {
  id: string;
  type?: string;
  category?: string;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  action_url?: string;
};

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationPanel({
  isOpen,
  onClose,
}: NotificationPanelProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const [filter, setFilter] = useState<"all" | "unread">("all");
  const { data: fetchedNotifications = [] } = useGetNotifications();
  const notifications = fetchedNotifications as Notification[];

  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
  const deleteNotificationMutation = useDeleteNotification();
  const clearAllNotificationsMutation = useClearAllNotifications();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getIcon = (category: string | undefined) => {
    const iconClass = "w-4 h-4";
    if (!category) return <Bell className={iconClass} />;
    const cat = category.toLowerCase();
    
    if (cat.includes("message")) return <MessageSquare className={iconClass} />;
    if (cat.includes("like")) return <Heart className={iconClass} />;
    if (cat.includes("comment")) return <MessageSquare className={iconClass} />;
    if (cat.includes("payment") || cat.includes("sale")) return <DollarSign className={iconClass} />;
    if (cat.includes("alert") || cat.includes("expiry") || cat.includes("stock")) return <AlertCircle className={iconClass} />;
    if (cat.includes("user") || cat.includes("staff")) return <User className={iconClass} />;
    if (cat.includes("product") || cat.includes("category") || cat.includes("batch")) return <Package className={iconClass} />;
    return <Bell className={iconClass} />;
  };

  const getIconColor = (category: string | undefined) => {
    if (!category) return "bg-muted text-muted-foreground border border-border/50";
    const cat = category.toLowerCase();
    
    if (cat.includes("message")) return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/10";
    if (cat.includes("like")) return "bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/10";
    if (cat.includes("comment")) return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/10";
    if (cat.includes("payment") || cat.includes("sale")) return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/10";
    if (cat.includes("alert") || cat.includes("expiry") || cat.includes("stock")) return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/10";
    if (cat.includes("user") || cat.includes("staff")) return "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/10";
    if (cat.includes("product") || cat.includes("category") || cat.includes("batch")) return "bg-primary/10 text-primary border border-primary/10";
    return "bg-muted text-muted-foreground border border-border/50";
  };

  const markAsRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    markAsReadMutation.mutate(id);
  };

  const markAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const deleteNotification = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNotificationMutation.mutate(id);
  };

  const clearAll = () => {
    clearAllNotificationsMutation.mutate();
  };

  const filteredNotifications =
    filter === "unread"
      ? notifications.filter((n) => !n.is_read)
      : notifications;

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="notification-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs cursor-pointer"
        />
      )}
      {isOpen && (
        <motion.div
          key="notification-panel"
          initial={{ x: "100%" }}
          animate={{ x: 0 }}
          exit={{ x: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 250 }}
          className="fixed inset-y-0 right-0 z-50 w-full max-w-md h-screen bg-card border-l border-border/80 shadow-2xl flex flex-col focus:outline-none"
        >
          {/* Header */}
          <div className="p-5 border-b border-border/50 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black tracking-tight text-foreground flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary" />
                Notifications
                {unreadCount > 0 && (
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
                    {unreadCount}
                  </span>
                )}
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-muted text-muted-foreground hover:text-foreground rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Actions Bar */}
          <div className="px-5 py-3 bg-muted/30 border-b border-border/45 flex items-center justify-between gap-2">
            {/* Filter Tabs */}
            <div className="flex bg-muted/80 p-1 rounded-lg border border-border/30">
              <button
                onClick={() => setFilter("all")}
                className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all duration-200 cursor-pointer ${
                  filter === "all"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter("unread")}
                className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all duration-200 cursor-pointer ${
                  filter === "unread"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Unread {unreadCount > 0 && `(${unreadCount})`}
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {unreadCount > 0 && (
                <Button
                  onClick={markAllAsRead}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 rounded-lg text-[10px] font-bold border border-border/40 hover:bg-background/80"
                >
                  <CheckCheck className="w-3.5 h-3.5 mr-1 text-primary animate-pulse" />
                  Mark all read
                </Button>
              )}

              {notifications.length > 0 && (
                <Button
                  onClick={clearAll}
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 rounded-lg text-[10px] font-bold text-red-600 hover:text-red-700 hover:bg-red-500/5 border border-red-500/10 hover:border-red-500/20"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-thin">
            {filteredNotifications.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-muted rounded-full mb-3">
                  <Bell className="w-6 h-6 text-muted-foreground" />
                </div>
                <h3 className="text-sm font-bold text-foreground mb-0.5">
                  No notifications
                </h3>
                <p className="text-xs text-muted-foreground max-w-[240px] mx-auto">
                  {filter === "unread"
                    ? "You're all caught up! No unread notifications at this time."
                    : "You don't have any notifications yet. We'll let you know when something happens."}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`rounded-xl border transition-all duration-300 p-4 group flex items-start gap-3 relative ${
                    !notification.is_read
                      ? "bg-primary/[0.01] border-primary/20 shadow-xs"
                      : "bg-card border-border/40 hover:border-border/80"
                  }`}
                >
                  {/* Icon container */}
                  <div
                    className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${getIconColor(
                      notification.category || notification.type,
                    )}`}
                  >
                    {getIcon(notification.category || notification.type)}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pr-8">
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <h3
                        className={`text-xs font-bold tracking-tight leading-snug break-words ${
                          notification.is_read
                            ? "text-foreground/80"
                            : "text-foreground"
                        }`}
                      >
                        {notification.title}
                      </h3>
                      {!notification.is_read && (
                        <span className="shrink-0 w-1.5 h-1.5 bg-blue-500 rounded-full mt-1"></span>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground mb-2 leading-normal break-words">
                      {notification.message}
                    </p>

                    {notification.action_url && (
                      <a
                        href={notification.action_url}
                        className="text-[10px] font-bold text-primary hover:underline mb-2 inline-block"
                      >
                        View details
                      </a>
                    )}

                    <div className="flex items-center gap-1 text-[9px] text-muted-foreground/80 font-medium">
                      <Clock className="w-3 h-3" />
                      <span>
                        {new Date(notification.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-card/90 backdrop-blur-xs pl-1 rounded-md">
                    {!notification.is_read && (
                      <button
                        onClick={(e) => markAsRead(notification.id, e)}
                        className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded-md transition-colors cursor-pointer"
                        title="Mark as read"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => deleteNotification(notification.id, e)}
                      className="p-1 hover:bg-red-500/10 text-muted-foreground hover:text-red-500 rounded-md transition-colors cursor-pointer"
                      title="Delete"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
