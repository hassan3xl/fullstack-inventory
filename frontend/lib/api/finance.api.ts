import { apiService } from "../services/apiService";

export interface DebtData {
  id?: string;
  customer?: {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
  } | null;
  customer_id?: string | null;
  debt_type: "owed_to_us" | "owed_by_us";
  debtor_creditor_name: string;
  amount: number;
  amount_paid?: number;
  description?: string;
  due_date?: string | null;
  status?: "pending" | "partially_paid" | "paid";
}

export interface ExpenseData {
  id?: string;
  category: "rent" | "salaries" | "utilities" | "purchases" | "marketing" | "other";
  amount: number;
  description?: string;
  expense_date?: string;
}

export const financeApi = {
  // Debts CRUD
  getDebts: async () => {
    try {
      return await apiService.get("/finance/debts/");
    } catch (error) {
      console.error("Error fetching debts:", error);
      throw error;
    }
  },

  createDebt: async (data: DebtData) => {
    try {
      return await apiService.post("/finance/debts/", data);
    } catch (error) {
      console.error("Error creating debt:", error);
      throw error;
    }
  },

  updateDebt: async ({ id, ...data }: DebtData) => {
    try {
      return await apiService.patch(`/finance/debts/${id}/`, data);
    } catch (error) {
      console.error("Error updating debt:", error);
      throw error;
    }
  },

  deleteDebt: async (id: string) => {
    try {
      return await apiService.delete(`/finance/debts/${id}/`);
    } catch (error) {
      console.error("Error deleting debt:", error);
      throw error;
    }
  },

  // Expenses CRUD
  getExpenses: async () => {
    try {
      return await apiService.get("/finance/expenses/");
    } catch (error) {
      console.error("Error fetching expenses:", error);
      throw error;
    }
  },

  createExpense: async (data: ExpenseData) => {
    try {
      return await apiService.post("/finance/expenses/", data);
    } catch (error) {
      console.error("Error creating expense:", error);
      throw error;
    }
  },

  updateExpense: async ({ id, ...data }: ExpenseData) => {
    try {
      return await apiService.patch(`/finance/expenses/${id}/`, data);
    } catch (error) {
      console.error("Error updating expense:", error);
      throw error;
    }
  },

  deleteExpense: async (id: string) => {
    try {
      return await apiService.delete(`/finance/expenses/${id}/`);
    } catch (error) {
      console.error("Error deleting expense:", error);
      throw error;
    }
  },
};
