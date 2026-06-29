"use client";

import React, { useState } from "react";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Plus, User, Shield, Calendar, Lock } from "lucide-react";
import { apiService } from "@/lib/services/apiService";
import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/lib/hooks/queryKeys";
import { useGetStore } from "@/lib/hooks/store.hook";
import { toast } from "sonner";
import StaffForm from "@/components/forms/StaffForm";
const getRoleBadgeStyle = (role: string) => {
  switch (role?.toLowerCase()) {
    case "owner":
      return "bg-amber-500/10 text-amber-500 border border-amber-500/20";
    case "admin":
      return "bg-blue-500/10 text-blue-500 border border-blue-500/20";
    case "manager":
      return "bg-purple-500/10 text-purple-500 border border-purple-500/20";
    case "cashier":
      return "bg-green-500/10 text-green-500 border border-green-500/20";
    default:
      return "bg-muted text-muted-foreground border border-border/30";
  }
};

export default function StaffClient() {
  const { data: store } = useGetStore();
  const isFreePlan = store?.current_plan?.slug === "free";

  // Modals control
  const [isAdding, setIsAdding] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);

  // Fetch Staff List
  const { data: staff, isLoading } = useQuery({
    queryKey: QUERY_KEYS.STAFF_LIST,
    queryFn: () => apiService.get("/staff/list/"),
    staleTime: 1000 * 60 * 5,
  });

  const totalStaff = staff?.length || 0;
  const adminCount =
    staff?.filter((s: any) => s.role === "admin" || s.role === "owner")
      .length || 0;
  const managerCount =
    staff?.filter((s: any) => s.role === "manager").length || 0;
  const cashierCount =
    staff?.filter((s: any) => s.role === "cashier").length || 0;

  return (
    <div className="space-y-8 pb-12">
      <Header
        title="Staff Management"
        subtitle="Manage your team members, cashiers, managers, and access permissions."
        stats={[
          {
            title: "Total Staff",
            value: String(totalStaff),
            iconBg: "bg-primary/10",
          },
          {
            title: "Admins/Owners",
            value: String(adminCount),
            iconBg: "bg-accent/10",
          },
          {
            title: "Managers",
            value: String(managerCount),
            iconBg: "bg-secondary/10",
          },
          {
            title: "Cashiers",
            value: String(cashierCount),
            iconBg: "bg-accent/10",
          },
        ]}
        actions={
          <Button
            onClick={() => {
              if (isFreePlan) {
                toast.error("Staff Limit Reached", {
                  description:
                    "Your Free plan only allows 1 staff member (yourself). Please upgrade your subscription to invite staff members.",
                });
              } else {
                setIsAdding(true);
              }
            }}
            className={`rounded-lg shadow-lg shadow-primary/20 h-11 px-5 font-bold cursor-pointer ${
              isFreePlan ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {isFreePlan ? (
              <Lock className="w-4 h-4 mr-2" />
            ) : (
              <Plus className="w-4 h-4 mr-2" />
            )}
            Add New Staff
          </Button>
        }
      />

      {/* Staff Display */}
      <div className="bg-card rounded-xl border border-border/50 overflow-hidden shadow-sm">
        {/* Mobile/Tablet Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-4 p-4">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground font-semibold md:col-span-2 animate-pulse">
              Loading staff...
            </div>
          ) : staff?.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground font-semibold md:col-span-2">
              No staff found.
            </div>
          ) : (
            staff?.map((member: any) => (
              <div
                key={member.id}
                className="border border-border/50 rounded-xl p-5 bg-muted/20 space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-foreground truncate">
                        {member.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {member.email}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedStaff(member);
                      setIsEditing(true);
                    }}
                    className="rounded-lg text-xs font-bold shrink-0 cursor-pointer"
                  >
                    Manage
                  </Button>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/50">
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold capitalize ${getRoleBadgeStyle(member.role)}`}
                  >
                    <Shield className="w-3 h-3" />
                    {member.role_display}
                  </span>
                  <div className="flex items-center gap-1.5 text-muted-foreground text-[10px] font-semibold">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(member.date_joined).toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-muted/50 border-b border-border/50 text-[10px] uppercase font-black tracking-wider text-muted-foreground">
              <tr>
                <th className="px-6 py-4">Staff Member</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Joined</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={4}
                    className="p-12 text-center text-muted-foreground font-semibold"
                  >
                    Loading staff...
                  </td>
                </tr>
              ) : staff?.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="p-12 text-center text-muted-foreground font-semibold"
                  >
                    No staff found.
                  </td>
                </tr>
              ) : (
                staff?.map((member: any) => (
                  <tr
                    key={member.id}
                    className="hover:bg-muted/30 transition-colors group"
                  >
                    <td className="px-6 py-4 max-w-[300px]">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                          <User className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-foreground truncate">
                            {member.full_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {member.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold capitalize ${getRoleBadgeStyle(member.role)}`}
                      >
                        <Shield className="w-3 h-3" />
                        {member.role_display}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground text-xs font-semibold">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5" />
                        {new Date(member.date_joined).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedStaff(member);
                          setIsEditing(true);
                        }}
                        className="rounded-lg text-xs font-bold cursor-pointer"
                      >
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Unified Staff Form for creation */}
      <StaffForm isModalOpen={isAdding} closeModal={() => setIsAdding(false)} />

      {/* Unified Staff Form for editing */}
      <StaffForm
        isModalOpen={isEditing}
        closeModal={() => {
          setIsEditing(false);
          setSelectedStaff(null);
        }}
        selectedStaff={selectedStaff}
      />
    </div>
  );
}
