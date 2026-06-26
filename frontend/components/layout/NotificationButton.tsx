import { BellIcon } from "lucide-react";
import React from "react";

import { useGetNotificationStats } from "@/lib/hooks/notifications.hook";

interface NotificationButtonProps {
  onClick: () => void;
}

const NotificationButton = ({ onClick }: NotificationButtonProps) => {
  const { data: stats } = useGetNotificationStats();
  const unreadCount = stats?.unread || 0;
  return (
    <button
      onClick={onClick}
      className="relative group rounded-xl hover:bg-accent/80 p-2 h-9 w-9 flex items-center justify-center transition-all duration-200 border border-border/50 hover:border-border cursor-pointer"
      title={`${unreadCount} unread notifications`}
    >
      <BellIcon className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white dark:bg-red-500 shadow-sm ring-2 ring-background">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </button>
  );
};

export default NotificationButton;
