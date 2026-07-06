import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { financeApi, DebtData, ExpenseData } from "../api/finance.api";
import { QUERY_KEYS } from "./queryKeys";

// Debts Hooks
export const useGetDebts = () => {
  return useQuery<DebtData[]>({
    queryKey: QUERY_KEYS.DEBTS,
    queryFn: financeApi.getDebts,
    staleTime: 1000 * 60 * 5,
  });
};

export const useCreateDebt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: financeApi.createDebt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DEBTS });
    },
  });
};

export const useUpdateDebt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: financeApi.updateDebt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DEBTS });
    },
  });
};

export const useDeleteDebt = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: financeApi.deleteDebt,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.DEBTS });
    },
  });
};

// Expenses Hooks
export const useGetExpenses = () => {
  return useQuery<ExpenseData[]>({
    queryKey: QUERY_KEYS.EXPENSES,
    queryFn: financeApi.getExpenses,
    staleTime: 1000 * 60 * 5,
  });
};

export const useCreateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: financeApi.createExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EXPENSES });
    },
  });
};

export const useUpdateExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: financeApi.updateExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EXPENSES });
    },
  });
};

export const useDeleteExpense = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: financeApi.deleteExpense,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.EXPENSES });
    },
  });
};
