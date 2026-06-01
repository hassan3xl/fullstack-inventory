"use client";

import Sidebar from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { BASE_URL } from "@/lib/services/apiService";
import Loader from "@/components/Loader";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        window.location.href = "/login";
      } else if (user.role === "platform_admin" || user.permissions?.platform_role === "platform_admin") {
        const backendUrl = BASE_URL ? BASE_URL.replace(/\/api\/?$/, "") : "http://localhost:8000";
        window.location.href = backendUrl;
      }
    }
  }, [user, loading]);

  if (loading || !user || user.role === "platform_admin" || user.permissions?.platform_role === "platform_admin") {
    return <Loader />;
  }

  return (
    <div className="bg-background text-foreground">
      <Navbar />

      <div className="flex">
        <Sidebar />

        <div className="flex-1 w-full">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 pt-14 mt-6 min-h-[calc(100vh-3.5rem)] ">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
