"use client";

import React, { useState, useMemo } from "react";
import Header from "@/components/Header";
import Loader from "@/components/Loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatNaira } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  useGetDebts,
  useCreateDebt,
  useUpdateDebt,
  useDeleteDebt,
  useGetExpenses,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
} from "@/lib/hooks/finance.hook";
import { useGetCustomers } from "@/lib/hooks/sales.hook";
import { DebtData, ExpenseData } from "@/lib/api/finance.api";
import {
  Wallet,
  TrendingDown,
  Plus,
  Trash2,
  Edit2,
  Calendar,
  User,
  Tag,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  Clock,
  PiggyBank,
  Coins,
} from "lucide-react";
import { toast } from "sonner";

export default function LedgerPage() {
  const { user, isOwner, isAdmin, isManager, isOnline } = useAuth();
  const [activeTab, setActiveTab] = useState<"debts" | "expenses">("debts");

  // Search & Filter state
  const [debtSearch, setDebtSearch] = useState("");
  const [debtFilter, setDebtFilter] = useState<string>("all");
  const [expenseSearch, setExpenseSearch] = useState("");
  const [expenseFilter, setExpenseFilter] = useState<string>("all");

  // Debts & Expenses Queries
  const { data: debts = [], isLoading: loadingDebts } = useGetDebts();
  const { data: expenses = [], isLoading: loadingExpenses } = useGetExpenses();
  const { data: customers = [] } = useGetCustomers();

  // Mutations
  const createDebtMutation = useCreateDebt();
  const updateDebtMutation = useUpdateDebt();
  const deleteDebtMutation = useDeleteDebt();

  const createExpenseMutation = useCreateExpense();
  const updateExpenseMutation = useUpdateExpense();
  const deleteExpenseMutation = useDeleteExpense();

  // Modal states
  const [isDebtModalOpen, setIsDebtModalOpen] = useState(false);
  const [editingDebt, setEditingDebt] = useState<DebtData | null>(null);
  const [debtForm, setDebtForm] = useState<{
    debt_type: "owed_to_us" | "owed_by_us";
    customer_id: string;
    debtor_creditor_name: string;
    amount: string;
    description: string;
    due_date: string;
  }>({
    debt_type: "owed_to_us",
    customer_id: "",
    debtor_creditor_name: "",
    amount: "",
    description: "",
    due_date: "",
  });

  // Payment Recording Modal states
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentDebt, setPaymentDebt] = useState<DebtData | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");

  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseData | null>(null);
  const [expenseForm, setExpenseForm] = useState<{
    category: "rent" | "salaries" | "utilities" | "purchases" | "marketing" | "other";
    amount: string;
    description: string;
    expense_date: string;
  }>({
    category: "other",
    amount: "",
    description: "",
    expense_date: new Date().toISOString().split("T")[0],
  });

  // Permissions
  const canModify = isOwner || isAdmin || isManager;

  // Debts Computations
  const debtStats = useMemo(() => {
    let owedToUs = 0;
    let owedByUs = 0;
    let totalPaid = 0;

    debts.forEach((d) => {
      const amt = Number(d.amount) || 0;
      const paid = Number(d.amount_paid) || 0;
      const balance = amt - paid;

      if (d.debt_type === "owed_to_us") {
        owedToUs += balance;
      } else {
        owedByUs += balance;
      }
      totalPaid += paid;
    });

    return { owedToUs, owedByUs, totalPaid };
  }, [debts]);

  const filteredDebts = useMemo(() => {
    return debts.filter((d) => {
      const matchesSearch = d.debtor_creditor_name
        .toLowerCase()
        .includes(debtSearch.toLowerCase());
      if (!matchesSearch) return false;

      if (debtFilter === "all") return true;
      if (debtFilter === "owed_to_us" || debtFilter === "owed_by_us") {
        return d.debt_type === debtFilter;
      }
      return d.status === debtFilter;
    });
  }, [debts, debtSearch, debtFilter]);

  // Expenses Computations
  const expenseStats = useMemo(() => {
    let total = 0;
    const categoryTotals: Record<string, number> = {};

    expenses.forEach((e) => {
      const amt = Number(e.amount) || 0;
      total += amt;
      categoryTotals[e.category] = (categoryTotals[e.category] || 0) + amt;
    });

    return { total, categoryTotals };
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const matchesSearch = (e.description || "")
        .toLowerCase()
        .includes(expenseSearch.toLowerCase());
      if (!matchesSearch) return false;

      if (expenseFilter === "all") return true;
      return e.category === expenseFilter;
    });
  }, [expenses, expenseSearch, expenseFilter]);

  // Handlers for Debt modal
  const openAddDebt = () => {
    setEditingDebt(null);
    setDebtForm({
      debt_type: "owed_to_us",
      customer_id: "",
      debtor_creditor_name: "",
      amount: "",
      description: "",
      due_date: "",
    });
    setIsDebtModalOpen(true);
  };

  const openEditDebt = (debt: DebtData) => {
    setEditingDebt(debt);
    setDebtForm({
      debt_type: debt.debt_type,
      customer_id: debt.customer?.id || "",
      debtor_creditor_name: debt.debtor_creditor_name,
      amount: String(debt.amount),
      description: debt.description || "",
      due_date: debt.due_date || "",
    });
    setIsDebtModalOpen(true);
  };

  const handleDebtSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtForm.debtor_creditor_name.trim()) {
      toast.error("Please enter a name or select a customer.");
      return;
    }
    const amt = parseFloat(debtForm.amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    const payload: DebtData = {
      debt_type: debtForm.debt_type,
      customer_id: debtForm.customer_id || null,
      debtor_creditor_name: debtForm.debtor_creditor_name.trim(),
      amount: amt,
      description: debtForm.description.trim() || undefined,
      due_date: debtForm.due_date || null,
    };

    try {
      if (editingDebt) {
        await updateDebtMutation.mutateAsync({
          id: editingDebt.id,
          amount_paid: editingDebt.amount_paid,
          ...payload,
        });
        toast.success("Debt record updated successfully.");
      } else {
        await createDebtMutation.mutateAsync(payload);
        toast.success("Debt record created successfully.");
      }
      setIsDebtModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save debt record.");
    }
  };

  // Handlers for Recording Payments
  const openRecordPayment = (debt: DebtData) => {
    setPaymentDebt(debt);
    setPaymentAmount("");
    setIsPaymentModalOpen(true);
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentDebt || !paymentDebt.id) return;
    const payAmt = parseFloat(paymentAmount);
    if (isNaN(payAmt) || payAmt <= 0) {
      toast.error("Please enter a valid positive payment amount.");
      return;
    }
    const currentPaid = Number(paymentDebt.amount_paid || 0);
    const totalAmount = Number(paymentDebt.amount);
    const remaining = totalAmount - currentPaid;

    if (payAmt > remaining) {
      toast.error(`Payment cannot exceed the remaining balance of ${formatNaira(remaining)}`);
      return;
    }

    try {
      await updateDebtMutation.mutateAsync({
        id: paymentDebt.id,
        amount: totalAmount,
        amount_paid: currentPaid + payAmt,
        debt_type: paymentDebt.debt_type,
        debtor_creditor_name: paymentDebt.debtor_creditor_name,
        customer_id: paymentDebt.customer?.id || null,
      });
      toast.success("Payment recorded successfully.");
      setIsPaymentModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to record payment.");
    }
  };

  const handleDeleteDebt = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this debt record?")) return;
    try {
      await deleteDebtMutation.mutateAsync(id);
      toast.success("Debt record deleted successfully.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete debt record.");
    }
  };

  // Handlers for Expense modal
  const openAddExpense = () => {
    setEditingExpense(null);
    setExpenseForm({
      category: "other",
      amount: "",
      description: "",
      expense_date: new Date().toISOString().split("T")[0],
    });
    setIsExpenseModalOpen(true);
  };

  const openEditExpense = (expense: ExpenseData) => {
    setEditingExpense(expense);
    setExpenseForm({
      category: expense.category,
      amount: String(expense.amount),
      description: expense.description || "",
      expense_date: expense.expense_date || new Date().toISOString().split("T")[0],
    });
    setIsExpenseModalOpen(true);
  };

  const handleExpenseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(expenseForm.amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    const payload: ExpenseData = {
      category: expenseForm.category,
      amount: amt,
      description: expenseForm.description.trim() || undefined,
      expense_date: expenseForm.expense_date,
    };

    try {
      if (editingExpense) {
        await updateExpenseMutation.mutateAsync({ id: editingExpense.id, ...payload });
        toast.success("Expense record updated successfully.");
      } else {
        await createExpenseMutation.mutateAsync(payload);
        toast.success("Expense record created successfully.");
      }
      setIsExpenseModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to save expense record.");
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this expense record?")) return;
    try {
      await deleteExpenseMutation.mutateAsync(id);
      toast.success("Expense record deleted successfully.");
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete expense record.");
    }
  };

  if (loadingDebts || loadingExpenses) {
    return <Loader />;
  }

  return (
    <div className="space-y-6 relative pb-12">
      <Header
        title="Ledger Book & Accounts"
        subtitle="Manage and track store debts, receivables, payables, and day-to-day operational expenses."
      />

      {/* Tabs Control */}
      <div className="flex border-b border-border/50 max-w-md">
        <button
          onClick={() => setActiveTab("debts")}
          className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all duration-300 ${
            activeTab === "debts"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Debts Tracker
        </button>
        <button
          onClick={() => setActiveTab("expenses")}
          className={`flex-1 py-3 text-sm font-bold border-b-2 transition-all duration-300 ${
            activeTab === "expenses"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Expenses Tracker
        </button>
      </div>

      {/* Debts Content */}
      {activeTab === "debts" && (
        <div className="space-y-6">
          {/* Debt KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="rounded-xl border-border/50 shadow-sm bg-emerald-50/20 dark:bg-emerald-950/10">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Owed to Us (Receivables)
                    </p>
                    <h3 className="text-2xl font-black mt-2 text-emerald-600 dark:text-emerald-400">
                      {formatNaira(debtStats.owedToUs)}
                    </h3>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <Wallet size={24} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border-border/50 shadow-sm bg-rose-50/20 dark:bg-rose-950/10">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Owed by Us (Payables)
                    </p>
                    <h3 className="text-2xl font-black mt-2 text-rose-600 dark:text-rose-400">
                      {formatNaira(debtStats.owedByUs)}
                    </h3>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600">
                    <TrendingDown size={24} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border-border/50 shadow-sm bg-blue-50/20 dark:bg-blue-950/10">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Total Payments Collected
                    </p>
                    <h3 className="text-2xl font-black mt-2 text-blue-600 dark:text-blue-400">
                      {formatNaira(debtStats.totalPaid)}
                    </h3>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                    <PiggyBank size={24} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-card/60 p-4 rounded-xl border border-border/50 shadow-sm">
            <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input
                  type="text"
                  placeholder="Search debtor/creditor name..."
                  value={debtSearch}
                  onChange={(e) => setDebtSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-muted/40 border border-border/50 rounded-lg focus:outline-none focus:border-primary/50"
                />
              </div>
              {/* Filter */}
              <div className="relative">
                <select
                  value={debtFilter}
                  onChange={(e) => setDebtFilter(e.target.value)}
                  className="w-full sm:w-48 pl-3 pr-8 py-2 text-sm bg-muted/40 border border-border/50 rounded-lg focus:outline-none focus:border-primary/50 appearance-none font-medium cursor-pointer"
                >
                  <option value="all">All Records</option>
                  <option value="owed_to_us">Owed to Us</option>
                  <option value="owed_by_us">Owed by Us</option>
                  <option value="pending">Status: Pending</option>
                  <option value="partially_paid">Status: Partial</option>
                  <option value="paid">Status: Paid</option>
                </select>
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={14} />
              </div>
            </div>

            <button
              onClick={openAddDebt}
              className="flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold text-sm px-5 py-2.5 rounded-lg hover:opacity-90 shadow-md shadow-primary/20 transition-all duration-300"
            >
              <Plus size={16} />
              Record Debt
            </button>
          </div>

          {/* Debts Table */}
          <div className="bg-card/40 border border-border/50 rounded-xl overflow-hidden shadow-sm">
            {filteredDebts.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground font-medium">
                No debts found matching the filters.
              </div>
            ) : (
              <>
                {/* Cards layout for mobile/tablet/desktop (up to lg/xl) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 xl:hidden">
                  {filteredDebts.map((debt) => {
                    const bal = Number(debt.amount) - (Number(debt.amount_paid) || 0);
                    return (
                      <div
                        key={debt.id}
                        className="bg-card border border-border/40 rounded-xl p-4 space-y-3 flex flex-col justify-between hover:border-primary/30 transition-all duration-300 shadow-sm"
                      >
                        <div className="space-y-2">
                          {/* Header: Name and Status */}
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <h4 className="font-bold text-sm text-foreground truncate max-w-[180px]">
                                {debt.debtor_creditor_name}
                              </h4>
                              {debt.customer && (
                                <p className="text-[10px] text-primary font-semibold mt-0.5">
                                  Linked: {debt.customer.name}
                                </p>
                              )}
                            </div>
                            <span
                              className={`text-[9px] font-black px-2 py-0.5 rounded-full flex items-center gap-0.5 w-max ${
                                debt.status === "paid"
                                  ? "bg-emerald-500/10 text-emerald-600"
                                  : debt.status === "partially_paid"
                                  ? "bg-amber-500/10 text-amber-600"
                                  : "bg-rose-500/10 text-rose-600"
                              }`}
                            >
                              {debt.status === "paid" ? "PAID" : debt.status === "partially_paid" ? "PARTIAL" : "PENDING"}
                            </span>
                          </div>

                          {/* Badges: Type */}
                          <div className="flex gap-2">
                            <span
                              className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                                debt.debt_type === "owed_to_us"
                                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                              }`}
                            >
                              {debt.debt_type === "owed_to_us" ? "OWED TO US" : "WE OWE"}
                            </span>
                          </div>

                          {/* Description */}
                          {debt.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2 bg-muted/25 p-2 rounded-lg">
                              {debt.description}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2 border-t border-border/30 pt-3">
                          {/* Amounts info */}
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <span className="text-[10px] text-muted-foreground font-semibold">Total</span>
                              <p className="font-bold text-foreground truncate">{formatNaira(debt.amount)}</p>
                            </div>
                            <div>
                              <span className="text-[10px] text-muted-foreground font-semibold">Paid</span>
                              <p className="font-bold text-emerald-600 truncate">{formatNaira(debt.amount_paid || 0)}</p>
                            </div>
                            <div>
                              <span className="text-[10px] text-muted-foreground font-semibold">Balance</span>
                              <p className="font-black text-rose-600 truncate">{formatNaira(bal)}</p>
                            </div>
                          </div>

                          {/* Due Date & Actions */}
                          <div className="flex items-center justify-between border-t border-border/20 pt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar size={12} />
                              {debt.due_date || "No due date"}
                            </span>

                            <div className="flex items-center gap-1.5">
                              {debt.status !== "paid" && (
                                <button
                                  onClick={() => openRecordPayment(debt)}
                                  className="p-1.5 text-emerald-600 hover:bg-emerald-500/10 rounded-md transition-colors"
                                  title="Record Payment"
                                >
                                  <Coins size={14} />
                                </button>
                              )}
                              {canModify ? (
                                <>
                                  <button
                                    onClick={() => openEditDebt(debt)}
                                    className="p-1.5 text-muted-foreground hover:text-primary hover:bg-accent/40 rounded-md transition-colors"
                                    title="Edit"
                                  >
                                    <Edit2 size={14} />
                                  </button>
                                  <button
                                    onClick={() => debt.id && handleDeleteDebt(debt.id)}
                                    className="p-1.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-md transition-colors"
                                    title="Delete"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              ) : (
                                debt.status === "paid" && <span className="text-[10px] text-muted-foreground/30">Read-Only</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Table layout for xl screens and up */}
                <div className="overflow-x-auto hidden xl:block">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border/50">
                        <th className="p-4 text-xs font-black text-muted-foreground uppercase tracking-wider">
                          Debtor/Creditor
                        </th>
                        <th className="p-4 text-xs font-black text-muted-foreground uppercase tracking-wider">
                          Type
                        </th>
                        <th className="p-4 text-xs font-black text-muted-foreground uppercase tracking-wider">
                          Total Amount
                        </th>
                        <th className="p-4 text-xs font-black text-muted-foreground uppercase tracking-wider">
                          Amount Paid
                        </th>
                        <th className="p-4 text-xs font-black text-muted-foreground uppercase tracking-wider">
                          Balance
                        </th>
                        <th className="p-4 text-xs font-black text-muted-foreground uppercase tracking-wider">
                          Due Date
                        </th>
                        <th className="p-4 text-xs font-black text-muted-foreground uppercase tracking-wider">
                          Status
                        </th>
                        <th className="p-4 text-xs font-black text-muted-foreground uppercase tracking-wider text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredDebts.map((debt) => {
                        const bal = Number(debt.amount) - (Number(debt.amount_paid) || 0);
                        return (
                          <tr key={debt.id} className="hover:bg-muted/10 transition-colors duration-200">
                            <td className="p-4">
                              <div className="font-bold text-sm text-foreground">
                                {debt.debtor_creditor_name}
                              </div>
                              {debt.customer && (
                                <div className="text-[10px] font-semibold text-primary mt-0.5">
                                  Linked Customer: {debt.customer.name} ({debt.customer.phone})
                                </div>
                              )}
                              {debt.description && (
                                <div className="text-xs text-muted-foreground mt-1 max-w-[200px] truncate">
                                  {debt.description}
                                </div>
                              )}
                            </td>
                            <td className="p-4">
                              <span
                                className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                                  debt.debt_type === "owed_to_us"
                                    ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                    : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                                }`}
                              >
                                  {debt.debt_type === "owed_to_us" ? "OWED TO US" : "WE OWE"}
                              </span>
                            </td>
                            <td className="p-4 font-bold text-sm">{formatNaira(debt.amount)}</td>
                            <td className="p-4 font-bold text-sm text-emerald-600 dark:text-emerald-400">
                              {formatNaira(debt.amount_paid || 0)}
                            </td>
                            <td className="p-4 font-black text-sm text-rose-600 dark:text-rose-400">
                              {formatNaira(bal)}
                            </td>
                            <td className="p-4 text-sm text-muted-foreground">
                              {debt.due_date ? (
                                <span className="flex items-center gap-1.5">
                                  <Calendar size={14} />
                                  {debt.due_date}
                                </span>
                              ) : (
                                <span className="text-muted-foreground/40">—</span>
                              )}
                            </td>
                            <td className="p-4">
                              <span
                                className={`text-[10px] font-black px-2.5 py-1 rounded-full flex items-center gap-1 w-max ${
                                  debt.status === "paid"
                                    ? "bg-emerald-500/10 text-emerald-600"
                                    : debt.status === "partially_paid"
                                    ? "bg-amber-500/10 text-amber-600"
                                    : "bg-rose-500/10 text-rose-600"
                                }`}
                              >
                                {debt.status === "paid" ? (
                                  <>
                                    <CheckCircle2 size={12} />
                                    PAID
                                  </>
                                ) : debt.status === "partially_paid" ? (
                                  <>
                                    <Clock size={12} />
                                    PARTIAL
                                  </>
                                ) : (
                                  <>
                                    <AlertCircle size={12} />
                                    PENDING
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {debt.status !== "paid" && (
                                  <button
                                    onClick={() => openRecordPayment(debt)}
                                    className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10 rounded-lg transition-all duration-200"
                                    title="Record Payment"
                                  >
                                    <Coins size={16} />
                                  </button>
                                )}
                                {canModify ? (
                                  <>
                                    <button
                                      onClick={() => openEditDebt(debt)}
                                      className="p-2 text-muted-foreground hover:text-primary hover:bg-accent/40 rounded-lg transition-all duration-200"
                                      title="Edit Details"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                    <button
                                      onClick={() => debt.id && handleDeleteDebt(debt.id)}
                                      className="p-2 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-all duration-200"
                                      title="Delete Record"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </>
                                ) : (
                                  debt.status === "paid" && (
                                    <span className="text-xs text-muted-foreground/40">Read-Only</span>
                                  )
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Expenses Content */}
      {activeTab === "expenses" && (
        <div className="space-y-6">
          {/* Expense KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="rounded-xl border-border/50 shadow-sm bg-rose-50/20 dark:bg-rose-950/10">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Total Expenses
                    </p>
                    <h3 className="text-2xl font-black mt-2 text-rose-600 dark:text-rose-400">
                      {formatNaira(expenseStats.total)}
                    </h3>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600">
                    <TrendingDown size={24} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border-border/50 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Rent & Utilities
                    </p>
                    <h3 className="text-xl font-bold mt-2">
                      {formatNaira(
                        (expenseStats.categoryTotals["rent"] || 0) +
                          (expenseStats.categoryTotals["utilities"] || 0)
                      )}
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                    <Tag size={18} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border-border/50 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Salaries & wages
                    </p>
                    <h3 className="text-xl font-bold mt-2">
                      {formatNaira(expenseStats.categoryTotals["salaries"] || 0)}
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-600">
                    <User size={18} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-xl border-border/50 shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Stock Purchases
                    </p>
                    <h3 className="text-xl font-bold mt-2">
                      {formatNaira(expenseStats.categoryTotals["purchases"] || 0)}
                    </h3>
                  </div>
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
                    <Wallet size={18} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-card/60 p-4 rounded-xl border border-border/50 shadow-sm">
            <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
                <input
                  type="text"
                  placeholder="Search expense description..."
                  value={expenseSearch}
                  onChange={(e) => setExpenseSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-sm bg-muted/40 border border-border/50 rounded-lg focus:outline-none focus:border-primary/50"
                />
              </div>
              {/* Filter */}
              <div className="relative">
                <select
                  value={expenseFilter}
                  onChange={(e) => setExpenseFilter(e.target.value)}
                  className="w-full sm:w-48 pl-3 pr-8 py-2 text-sm bg-muted/40 border border-border/50 rounded-lg focus:outline-none focus:border-primary/50 appearance-none font-medium cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  <option value="rent">Rent</option>
                  <option value="salaries">Salaries</option>
                  <option value="utilities">Utilities</option>
                  <option value="purchases">Purchases</option>
                  <option value="marketing">Marketing</option>
                  <option value="other">Other</option>
                </select>
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={14} />
              </div>
            </div>

            <button
              onClick={openAddExpense}
              className="flex items-center justify-center gap-2 bg-primary text-primary-foreground font-bold text-sm px-5 py-2.5 rounded-lg hover:opacity-90 shadow-md shadow-primary/20 transition-all duration-300"
            >
              <Plus size={16} />
              Record Expense
            </button>
          </div>

          {/* Expenses List/Table */}
          <div className="bg-card/40 border border-border/50 rounded-xl overflow-hidden shadow-sm">
            {filteredExpenses.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground font-medium">
                No expense records found.
              </div>
            ) : (
              <>
                {/* Cards layout for mobile/tablet/desktop (up to lg/xl) */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 xl:hidden">
                  {filteredExpenses.map((expense) => (
                    <div
                      key={expense.id}
                      className="bg-card border border-border/40 rounded-xl p-4 space-y-3 flex flex-col justify-between hover:border-primary/30 transition-all duration-300 shadow-sm"
                    >
                      <div className="space-y-2">
                        {/* Header: Category & Amount */}
                        <div className="flex justify-between items-start gap-2">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase bg-muted text-foreground">
                            {expense.category}
                          </span>
                          <p className="font-black text-sm text-rose-600 dark:text-rose-400">
                            {formatNaira(expense.amount)}
                          </p>
                        </div>

                        {/* Description */}
                        <p className="text-xs text-foreground font-medium line-clamp-3 min-h-[40px]">
                          {expense.description || <span className="text-muted-foreground/30 italic">No description</span>}
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-border/30 pt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1.5">
                          <Calendar size={12} />
                          {expense.expense_date}
                        </span>

                        {canModify && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openEditExpense(expense)}
                              className="p-1.5 text-muted-foreground hover:text-primary hover:bg-accent/40 rounded-md transition-colors"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => expense.id && handleDeleteExpense(expense.id)}
                              className="p-1.5 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-md transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Table layout for xl screens and up */}
                <div className="overflow-x-auto hidden xl:block">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-muted/30 border-b border-border/50">
                        <th className="p-4 text-xs font-black text-muted-foreground uppercase tracking-wider">
                          Category
                        </th>
                        <th className="p-4 text-xs font-black text-muted-foreground uppercase tracking-wider">
                          Description
                        </th>
                        <th className="p-4 text-xs font-black text-muted-foreground uppercase tracking-wider">
                          Date
                        </th>
                        <th className="p-4 text-xs font-black text-muted-foreground uppercase tracking-wider">
                          Amount
                        </th>
                        <th className="p-4 text-xs font-black text-muted-foreground uppercase tracking-wider text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {filteredExpenses.map((expense) => (
                        <tr key={expense.id} className="hover:bg-muted/10 transition-colors duration-200">
                          <td className="p-4">
                            <span className="text-xs font-black px-2.5 py-1 rounded-full uppercase bg-muted text-foreground">
                              {expense.category}
                            </span>
                          </td>
                          <td className="p-4 text-sm font-medium">
                            {expense.description || <span className="text-muted-foreground/30">No description</span>}
                          </td>
                          <td className="p-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1.5">
                              <Calendar size={14} />
                              {expense.expense_date}
                            </span>
                          </td>
                          <td className="p-4 font-black text-sm text-rose-600 dark:text-rose-400">
                            {formatNaira(expense.amount)}
                          </td>
                          <td className="p-4 text-right">
                            {canModify ? (
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={() => openEditExpense(expense)}
                                  className="p-2 text-muted-foreground hover:text-primary hover:bg-accent/40 rounded-lg transition-all duration-200"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => expense.id && handleDeleteExpense(expense.id)}
                                  className="p-2 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 rounded-lg transition-all duration-200"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground/40">Read-Only</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Debt Record / Edit Modal */}
      <Dialog open={isDebtModalOpen} onOpenChange={setIsDebtModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black text-lg">
              {editingDebt ? "Update Debt Record" : "Record New Debt"}
            </DialogTitle>
            <DialogDescription>
              Input the debtor/creditor info and details below.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleDebtSubmit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Debt Type
              </label>
              <select
                value={debtForm.debt_type}
                onChange={(e) => {
                  const newType = e.target.value as any;
                  setDebtForm({
                    ...debtForm,
                    debt_type: newType,
                    customer_id: "",
                    debtor_creditor_name: "",
                  });
                }}
                className="w-full p-2.5 text-sm bg-muted/40 border border-border/50 rounded-lg focus:outline-none focus:border-primary/50 font-medium"
              >
                <option value="owed_to_us">Owed to Us (Receivable)</option>
                <option value="owed_by_us">Owed by Us (Payable)</option>
              </select>
            </div>

            {debtForm.debt_type === "owed_to_us" && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Link to Customer (Optional)
                </label>
                <select
                  value={debtForm.customer_id || ""}
                  onChange={(e) => {
                    const custId = e.target.value;
                    const matched = customers.find((c: any) => c.id === custId);
                    setDebtForm({
                      ...debtForm,
                      customer_id: custId,
                      debtor_creditor_name: matched ? matched.name : "",
                    });
                  }}
                  className="w-full p-2.5 text-sm bg-muted/40 border border-border/50 rounded-lg focus:outline-none focus:border-primary/50 font-medium"
                >
                  <option value="">-- No Link (Enter Name Below) --</option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                {debtForm.debt_type === "owed_to_us" ? "Debtor Name" : "Creditor Name"}
              </label>
              <input
                type="text"
                required
                value={debtForm.debtor_creditor_name}
                onChange={(e) => setDebtForm({ ...debtForm, debtor_creditor_name: e.target.value })}
                disabled={!!debtForm.customer_id}
                placeholder={
                  debtForm.debt_type === "owed_to_us"
                    ? "Enter debtor name..."
                    : "e.g. ABC Wholesalers, Supplier"
                }
                className="w-full p-2.5 text-sm bg-muted/40 border border-border/50 rounded-lg focus:outline-none focus:border-primary/50 disabled:opacity-60 disabled:cursor-not-allowed"
              />
              {debtForm.customer_id && (
                <p className="text-[10px] text-primary mt-1 font-semibold">
                  Linked to registered customer. Name is autofilled.
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Total Amount (₦)
              </label>
              <input
                type="number"
                required
                step="0.01"
                min="0.01"
                value={debtForm.amount}
                onChange={(e) => setDebtForm({ ...debtForm, amount: e.target.value })}
                placeholder="0.00"
                className="w-full p-2.5 text-sm bg-muted/40 border border-border/50 rounded-lg focus:outline-none focus:border-primary/50 font-bold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Due Date
              </label>
              <input
                type="date"
                value={debtForm.due_date}
                onChange={(e) => setDebtForm({ ...debtForm, due_date: e.target.value })}
                className="w-full p-2.5 text-sm bg-muted/40 border border-border/50 rounded-lg focus:outline-none focus:border-primary/50 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Description / Notes
              </label>
              <textarea
                value={debtForm.description}
                onChange={(e) => setDebtForm({ ...debtForm, description: e.target.value })}
                placeholder="Details of what was purchased or terms of payment..."
                rows={3}
                className="w-full p-2.5 text-sm bg-muted/40 border border-border/50 rounded-lg focus:outline-none focus:border-primary/50 resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => setIsDebtModalOpen(false)}
                className="px-4 py-2 text-sm font-bold border border-border/50 hover:bg-accent rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-primary text-primary-foreground font-bold text-sm rounded-lg hover:opacity-90 shadow-md shadow-primary/10"
              >
                {editingDebt ? "Save Changes" : "Record Debt"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Expense Record / Edit Modal */}
      <Dialog open={isExpenseModalOpen} onOpenChange={setIsExpenseModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black text-lg">
              {editingExpense ? "Update Expense Record" : "Record New Expense"}
            </DialogTitle>
            <DialogDescription>
              Specify operational costs to monitor overall cashflow.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleExpenseSubmit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Expense Category
              </label>
              <select
                value={expenseForm.category}
                onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as any })}
                className="w-full p-2.5 text-sm bg-muted/40 border border-border/50 rounded-lg focus:outline-none focus:border-primary/50 font-medium"
              >
                <option value="rent">Rent</option>
                <option value="salaries">Salaries</option>
                <option value="utilities">Utilities</option>
                <option value="purchases">Stock Purchases</option>
                <option value="marketing">Marketing & Sales</option>
                <option value="other">Other Operational Expenses</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Amount (₦)
              </label>
              <input
                type="number"
                required
                step="0.01"
                min="0.01"
                value={expenseForm.amount}
                onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                placeholder="0.00"
                className="w-full p-2.5 text-sm bg-muted/40 border border-border/50 rounded-lg focus:outline-none focus:border-primary/50 font-bold text-rose-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Expense Date
              </label>
              <input
                type="date"
                required
                value={expenseForm.expense_date}
                onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                className="w-full p-2.5 text-sm bg-muted/40 border border-border/50 rounded-lg focus:outline-none focus:border-primary/50 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                Description / Memo
              </label>
              <textarea
                value={expenseForm.description}
                onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                placeholder="e.g. Paid electricity bill for July, purchase of logistics printer..."
                rows={3}
                className="w-full p-2.5 text-sm bg-muted/40 border border-border/50 rounded-lg focus:outline-none focus:border-primary/50 resize-none"
              />
            </div>

            <DialogFooter className="pt-2">
              <button
                type="button"
                onClick={() => setIsExpenseModalOpen(false)}
                className="px-4 py-2 text-sm font-bold border border-border/50 hover:bg-accent rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-primary text-primary-foreground font-bold text-sm rounded-lg hover:opacity-90 shadow-md shadow-primary/10"
              >
                {editingExpense ? "Save Changes" : "Record Expense"}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      {/* Record Payment Modal */}
      <Dialog open={isPaymentModalOpen} onOpenChange={setIsPaymentModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-black text-lg">Record Payment</DialogTitle>
            <DialogDescription>
              Input the amount paid to deduct from the remaining debt balance.
            </DialogDescription>
          </DialogHeader>

          {paymentDebt && (
            <div className="space-y-4 pt-2">
              {/* Debt Summary Box */}
              <div className="bg-muted/40 border border-border/50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-sm text-foreground">
                      {paymentDebt.debtor_creditor_name}
                    </h4>
                    <span className="text-[10px] text-muted-foreground uppercase font-black">
                      {paymentDebt.debt_type === "owed_to_us" ? "Owed to Us" : "We Owe"}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                      paymentDebt.status === "paid"
                        ? "bg-emerald-500/10 text-emerald-600"
                        : paymentDebt.status === "partially_paid"
                        ? "bg-amber-500/10 text-amber-600"
                        : "bg-rose-500/10 text-rose-600"
                    }`}
                  >
                    {paymentDebt.status?.replace("_", " ").toUpperCase()}
                  </span>
                </div>

                <div className="border-t border-border/30 pt-2 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground font-medium">Total Amount:</span>
                    <p className="font-bold text-sm">{formatNaira(paymentDebt.amount)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-medium">Remaining Balance:</span>
                    <p className="font-black text-sm text-rose-600">
                      {formatNaira(Number(paymentDebt.amount) - Number(paymentDebt.amount_paid || 0))}
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Payment Amount (₦)
                  </label>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="0.01"
                    max={Number(paymentDebt.amount) - Number(paymentDebt.amount_paid || 0)}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    className="w-full p-2.5 text-sm bg-muted/40 border border-border/50 rounded-lg focus:outline-none focus:border-primary/50 font-bold text-emerald-600"
                  />
                </div>

                <DialogFooter className="pt-2">
                  <button
                    type="button"
                    onClick={() => setIsPaymentModalOpen(false)}
                    className="px-4 py-2 text-sm font-bold border border-border/50 hover:bg-accent rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-primary text-primary-foreground font-bold text-sm rounded-lg hover:opacity-90 shadow-md shadow-primary/10"
                  >
                    Record Payment
                  </button>
                </DialogFooter>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
