"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import BaseModal from "../modals/BaseModal";
import { Button } from "@/components/ui/button";
import { useReceiveStockBatch } from "@/lib/hooks/product.hook";
import { toast } from "sonner";
import { Calendar, Layers, Hash, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";

interface ReceiveBatchModalProps {
  productId: string;
  productName: string;
  baseUnit: string;
  packUnit: string;
  unitsPerPack: number;
  isModalOpen: boolean;
  closeModal: () => void;
  onBatchReceived?: () => void;
}

interface FormValues {
  quantity: string;
  batch_number: string;
  production_date: string;
  best_before_days: string;
  expiry_date: string;
}

const ReceiveBatchModal: React.FC<ReceiveBatchModalProps> = ({
  productId,
  productName,
  baseUnit,
  packUnit,
  unitsPerPack,
  isModalOpen,
  closeModal,
  onBatchReceived,
}) => {
  const receiveBatchMutation = useReceiveStockBatch();
  const [multiplier, setMultiplier] = React.useState<number>(unitsPerPack > 1 ? unitsPerPack : 1);

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

  // Reset form when modal closes/opens
  useEffect(() => {
    if (!isModalOpen) {
      reset();
    } else {
      setMultiplier(unitsPerPack > 1 ? unitsPerPack : 1);
    }
  }, [isModalOpen, reset, unitsPerPack]);

  // Update expiry date when production date or best before days change
  useEffect(() => {
    if (productionDate && bestBeforeDays) {
      const prodDate = new Date(productionDate);
      const days = parseInt(bestBeforeDays);
      if (!isNaN(prodDate.getTime()) && !isNaN(days)) {
        const expDate = new Date(
          prodDate.getTime() + days * 24 * 60 * 60 * 1000,
        );
        const expDateStr = expDate.toISOString().split("T")[0];
        if (expiryDate !== expDateStr) {
          setValue("expiry_date", expDateStr);
        }
      }
    }
  }, [productionDate, bestBeforeDays, setValue, expiryDate]);

  // Update best before days when expiry date or production date change
  useEffect(() => {
    if (productionDate && expiryDate) {
      const prodDate = new Date(productionDate);
      const expDate = new Date(expiryDate);
      if (!isNaN(prodDate.getTime()) && !isNaN(expDate.getTime())) {
        const diffTime = expDate.getTime() - prodDate.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const diffDaysStr = diffDays >= 0 ? String(diffDays) : "0";
        if (bestBeforeDays !== diffDaysStr) {
          setValue("best_before_days", diffDaysStr);
        }
      }
    }
  }, [productionDate, expiryDate, setValue, bestBeforeDays]);

  const onSubmit = async (data: FormValues) => {
    const rawQty = parseInt(data.quantity);
    const qty = rawQty * multiplier;

    if (isNaN(qty) || qty <= 0) {
      toast.error("Invalid Input", {
        description: "Quantity must be a positive integer.",
      });
      return;
    }

    try {
      const payload = {
        batch_number: data.batch_number.trim() || undefined,
        quantity: qty,
        production_date: data.production_date || null,
        expiry_date: data.expiry_date || null,
      };

      await receiveBatchMutation.mutateAsync({
        productId,
        data: payload,
      });

      toast.success("Stock batch received successfully!", {
        description: "Product inventory has been updated.",
      });

      reset();
      if (onBatchReceived) onBatchReceived();
      closeModal();
    } catch (error: any) {
      toast.error(
        error?.error || error?.detail || "Failed to receive stock batch.",
      );
    }
  };

  return (
    <BaseModal
      isOpen={isModalOpen}
      onClose={closeModal}
      title="Receive Stock Batch"
      description={`Log a new batch delivery for ${productName}.`}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="sm:col-span-2">
              <Input
                name="quantity"
                register={register}
                label="Quantity"
                type="number"
                icon={Layers}
                placeholder="e.g. 10"
                error={errors.quantity}
                validation={{
                  required: "Quantity is required",
                  min: { value: 1, message: "Quantity must be at least 1" },
                }}
              />
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

          <div className="bg-primary/[0.03] border border-primary/15 rounded-xl p-3 flex justify-between items-center text-xs text-primary font-bold">
            <span>Total Calculated Quantity:</span>
            <span className="text-sm font-black tracking-tight">
              {((parseInt(quantityVal || "0") * multiplier)).toLocaleString()} {baseUnit}(s)
            </span>
          </div>

          <Input
            name="batch_number"
            register={register}
            label="Batch/Lot Number (Optional)"
            type="text"
            icon={Hash}
            placeholder="e.g. LOT-2026-A (Auto-generated if left blank)"
            error={errors.batch_number}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              name="production_date"
              register={register}
              label="Production Date"
              type="date"
              icon={Calendar}
              error={errors.production_date}
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
              }}
            />
          </div>

          <Input
            name="expiry_date"
            register={register}
            label="Expiry Date (Auto-calculated)"
            type="date"
            icon={Calendar}
            error={errors.expiry_date}
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
            disabled={receiveBatchMutation.isPending}
          >
            {receiveBatchMutation.isPending ? "Saving..." : "Receive Stock"}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
};

export default ReceiveBatchModal;
