"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import BaseModal from "../modals/BaseModal";
import { Button } from "@/components/ui/button";
import { useUpdateStockBatch } from "@/lib/hooks/product.hook";
import { toast } from "sonner";
import { Calendar, Layers, Hash, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";

interface EditBatchModalProps {
  productId: string;
  batch: any; // The active batch object being edited
  baseUnit: string;
  packUnit: string;
  unitsPerPack: number;
  isModalOpen: boolean;
  closeModal: () => void;
  onBatchUpdated?: () => void;
}

interface FormValues {
  quantity: string;
  initial_quantity: string;
  batch_number: string;
  production_date: string;
  best_before_days: string;
  expiry_date: string;
}

const EditBatchModal: React.FC<EditBatchModalProps> = ({
  productId,
  batch,
  baseUnit,
  packUnit,
  unitsPerPack,
  isModalOpen,
  closeModal,
  onBatchUpdated,
}) => {
  const updateBatchMutation = useUpdateStockBatch();
  const [multiplier, setMultiplier] = React.useState<number>(1);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    defaultValues: {
      quantity: "",
      initial_quantity: "",
      batch_number: "",
      production_date: "",
      best_before_days: "",
      expiry_date: "",
    },
  });

  const productionDate = watch("production_date");
  const bestBeforeDays = watch("best_before_days");
  const expiryDate = watch("expiry_date");
  const quantityVal = watch("quantity");
  const initialQuantityVal = watch("initial_quantity");

  // Populate form with current batch data on load / change
  useEffect(() => {
    if (batch) {
      const prodDateStr = batch.production_date || "";
      const expDateStr = batch.expiry_date || "";
      let diffDaysStr = "";

      if (prodDateStr && expDateStr) {
        const prod = new Date(prodDateStr);
        const exp = new Date(expDateStr);
        if (!isNaN(prod.getTime()) && !isNaN(exp.getTime())) {
          const diffTime = exp.getTime() - prod.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          diffDaysStr = diffDays >= 0 ? String(diffDays) : "0";
        }
      }

      const qty = batch.quantity ?? 0;
      const initQty = batch.initial_quantity ?? 0;
      let initialMultiplier = 1;
      
      if (unitsPerPack > 1 && qty % unitsPerPack === 0 && initQty % unitsPerPack === 0) {
        initialMultiplier = unitsPerPack;
      }

      setMultiplier(initialMultiplier);

      reset({
        batch_number: batch.batch_number || "",
        quantity: String(Math.floor(qty / initialMultiplier)),
        initial_quantity: String(Math.floor(initQty / initialMultiplier)),
        production_date: prodDateStr,
        expiry_date: expDateStr,
        best_before_days: diffDaysStr,
      });
    }
  }, [batch, reset, unitsPerPack]);

  const updateExpiryFromProdAndDays = (prodDateStr: string, daysStr: string) => {
    if (!prodDateStr || !daysStr) return;
    const prodDate = new Date(prodDateStr);
    const days = parseInt(daysStr);
    if (!isNaN(prodDate.getTime()) && !isNaN(days)) {
      const expDate = new Date(prodDate.getTime() + days * 24 * 60 * 60 * 1000);
      setValue("expiry_date", expDate.toISOString().split("T")[0]);
    }
  };

  const updateDaysFromProdAndExpiry = (prodDateStr: string, expDateStr: string) => {
    if (!prodDateStr || !expDateStr) return;
    const prodDate = new Date(prodDateStr);
    const expDate = new Date(expDateStr);
    if (!isNaN(prodDate.getTime()) && !isNaN(expDate.getTime())) {
      const diffTime = expDate.getTime() - prodDate.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setValue("best_before_days", diffDays >= 0 ? String(diffDays) : "0");
    }
  };

  const onSubmit = async (data: FormValues) => {
    const rawQty = parseInt(data.quantity);
    const qty = rawQty * multiplier;

    const rawInitialQty = parseInt(data.initial_quantity);
    const initialQty = rawInitialQty * multiplier;

    if (isNaN(qty) || qty < 0) {
      toast.error("Invalid Input", {
        description: "Quantity must be a non-negative integer.",
      });
      return;
    }

    try {
      const payload = {
        batch_number: data.batch_number.trim(),
        quantity: qty,
        initial_quantity: isNaN(initialQty) ? qty : initialQty,
        production_date: data.production_date || null,
        expiry_date: data.expiry_date || null,
      };

      await updateBatchMutation.mutateAsync({
        productId,
        batchId: batch.id,
        data: payload,
      });

      toast.success("Stock batch updated successfully!");

      if (onBatchUpdated) onBatchUpdated();
      closeModal();
    } catch (error: any) {
      toast.error(
        error?.error || error?.detail || "Failed to update stock batch.",
      );
    }
  };

  return (
    <BaseModal
      isOpen={isModalOpen}
      onClose={closeModal}
      title="Modify Stock Batch"
      description={`Edit FEFO details for batch ${batch?.batch_number}.`}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="sm:col-span-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  name="quantity"
                  register={register}
                  label="Remaining Quantity"
                  type="number"
                  icon={Layers}
                  placeholder="e.g. 50"
                  error={errors.quantity}
                  validation={{
                    required: "Remaining quantity is required",
                    min: { value: 0, message: "Quantity cannot be negative" },
                  }}
                />

                <Input
                  name="initial_quantity"
                  register={register}
                  label="Initial Quantity"
                  type="number"
                  icon={Layers}
                  placeholder="e.g. 100"
                  error={errors.initial_quantity}
                  validation={{
                    required: "Initial quantity is required",
                    min: { value: 0, message: "Quantity cannot be negative" },
                  }}
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-muted-foreground mb-1.5 uppercase tracking-wider">
                Unit Type
              </label>
              <select
                value={multiplier}
                onChange={(e) => setMultiplier(parseInt(e.target.value))}
                className="w-full bg-background border border-border/50 rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:border-primary/50 text-foreground"
              >
                <option value={1}>Loose {baseUnit}(s) (x1)</option>
                <option value={12}>Dozen (x12)</option>
                <option value={24}>Crate (x24)</option>
                {unitsPerPack > 1 && unitsPerPack !== 12 && unitsPerPack !== 24 && (
                  <option value={unitsPerPack}>
                    {packUnit} (x{unitsPerPack})
                  </option>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-primary/[0.03] border border-primary/15 rounded-xl p-3 flex justify-between items-center text-xs text-primary font-bold">
              <span>Total Calculated Remaining:</span>
              <span className="text-sm font-black tracking-tight">
                {((parseInt(quantityVal || "0") * multiplier)).toLocaleString()} {baseUnit}(s)
              </span>
            </div>

            <div className="bg-muted/40 border border-border/30 rounded-xl p-3 flex justify-between items-center text-xs text-muted-foreground font-bold">
              <span>Total Calculated Initial:</span>
              <span className="text-sm font-black tracking-tight">
                {((parseInt(initialQuantityVal || "0") * multiplier)).toLocaleString()} {baseUnit}(s)
              </span>
            </div>
          </div>

          <Input
            name="batch_number"
            register={register}
            label="Batch/Lot Number"
            type="text"
            icon={Hash}
            error={errors.batch_number}
            validation={{ required: "Batch/Lot number is required" }}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              name="production_date"
              register={register}
              label="Production Date"
              type="date"
              icon={Calendar}
              error={errors.production_date}
              validation={{
                onChange: (e: any) => {
                  const pDate = e.target.value;
                  const bDays = watch("best_before_days");
                  const eDate = watch("expiry_date");
                  if (bDays) {
                    updateExpiryFromProdAndDays(pDate, bDays);
                  } else if (eDate) {
                    updateDaysFromProdAndExpiry(pDate, eDate);
                  }
                }
              }}
            />

            <Input
              name="best_before_days"
              register={register}
              label="Best Before (Days)"
              type="number"
              icon={Clock}
              placeholder="e.g. 30"
              error={errors.best_before_days}
              validation={{
                min: { value: 0, message: "Value cannot be negative" },
                onChange: (e: any) => {
                  const bDays = e.target.value;
                  const pDate = watch("production_date");
                  if (pDate) {
                    updateExpiryFromProdAndDays(pDate, bDays);
                  }
                }
              }}
            />
          </div>

          <Input
            name="expiry_date"
            register={register}
            label="Expiry Date"
            type="date"
            icon={Calendar}
            error={errors.expiry_date}
            validation={{
              onChange: (e: any) => {
                const eDate = e.target.value;
                const pDate = watch("production_date");
                if (pDate) {
                  updateDaysFromProdAndExpiry(pDate, eDate);
                }
              }
            }}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 pt-4 justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={closeModal}
            className="rounded-lg px-4 sm:px-6 w-full sm:w-auto"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="rounded-lg px-4 sm:px-8 w-full sm:w-auto shadow-lg shadow-primary/20"
            disabled={updateBatchMutation.isPending}
          >
            {updateBatchMutation.isPending ? "Saving..." : "Update Batch"}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
};

export default EditBatchModal;
