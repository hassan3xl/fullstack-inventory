"use client";

import React, { useEffect, useState } from "react";
import BaseModal from "@/components/modals/BaseModal";
import { Button } from "@/components/ui/button";
import {
  useAddProduct,
  useEditProduct,
  useGetProduct,
  useGetProductsCategories,
} from "@/lib/hooks/product.hook";
import { useBusinessConfig } from "@/lib/hooks/useBusinessConfig";
import { toast } from "sonner";
import {
  Package,
  DollarSign,
  Info,
  Tag,
  ShieldCheck,
  X,
  Plus,
  Trash2,
  Layers,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { formatPriceWithCommas, parsePriceFromFormatted } from "@/lib/utils";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CapacityEntry {
  name: string;
  price: string;
}

interface ProductFormValues {
  name: string;
  category_id: string;
  unit_price: string;
  pack_price: string;
  description: string;
  is_active: boolean;
  variants: string[];
  capacities: CapacityEntry[];
  base_unit: string;
  pack_unit: string;
  units_per_pack: string | number;
}

interface ProductFormProps {
  isModalOpen: boolean;
  closeModal: () => void;
  /** When provided, form operates in Edit Mode for this product ID. */
  productId?: string;
  /** Callback fired after a successful add (e.g. to trigger refetch). */
  onProductAdded?: () => void;
}

// ─── Name & description placeholders keyed by business type ─────────────────

const NAME_PLACEHOLDERS: Record<string, string> = {
  pharmacy: "e.g. Amoxicillin 500mg Capsules",
  electronics: "e.g. Samsung Galaxy Buds Pro",
  clothing: "e.g. Men's Slim-Fit Chino Trousers",
  general: "e.g. Premium Organic Milk",
  other: "e.g. Product Name",
};

const DESC_PLACEHOLDERS: Record<string, string> = {
  pharmacy: "Describe dosage, form, or usage instructions...",
  electronics: "Describe model, specs, or included accessories...",
  clothing: "Describe material, fit, gender or size range...",
  general: "Brief details about the product...",
  other: "Brief details about the product...",
};

// ─── Component ───────────────────────────────────────────────────────────────

const ProductForm: React.FC<ProductFormProps> = ({
  isModalOpen,
  closeModal,
  productId,
  onProductAdded,
}) => {
  const isEditMode = !!productId;

  const { config } = useBusinessConfig();
  const businessType = config.businessType;

  // Data hooks
  const { data: categories } = useGetProductsCategories();
  const { data: product, isLoading: productLoading } = useGetProduct(
    productId ?? "",
  );
  const addMutation = useAddProduct();
  const editMutation = useEditProduct();
  const [hasPackaging, setHasPackaging] = useState(false);
  const [baseUnitPreset, setBaseUnitPreset] = useState("Piece");
  const [packTypePreset, setPackTypePreset] = useState("Dozen");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProductFormValues>({
    defaultValues: {
      name: "",
      category_id: "",
      unit_price: "",
      pack_price: "",
      description: "",
      is_active: true,
      variants: [],
      capacities: [],
      base_unit: "Piece",
      pack_unit: "Box",
      units_per_pack: 1,
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (isEditMode && product) {
      const units = product.units_per_pack ?? 1;
      setHasPackaging(units > 1);
      
      const presetOptions = ["Piece", "Bottle", "Can", "Sachet", "Bag", "Pack", "Pair", "Roll"];
      const isPreset = presetOptions.includes(product.base_unit ?? "Piece");
      setBaseUnitPreset(isPreset ? (product.base_unit ?? "Piece") : "custom");

      const pUnit = product.pack_unit ?? "Box";
      if (units === 12 && pUnit.toLowerCase() === "dozen") {
        setPackTypePreset("Dozen");
      } else if (units === 24 && pUnit.toLowerCase() === "crate") {
        setPackTypePreset("Crate");
      } else if (units === 48 && pUnit.toLowerCase() === "carton") {
        setPackTypePreset("Carton");
      } else if (units === 10 && pUnit.toLowerCase() === "pack") {
        setPackTypePreset("Pack10");
      } else if (units > 1) {
        setPackTypePreset("custom");
      } else {
        setPackTypePreset("Dozen");
      }

      reset({
        name: product.name ?? "",
        category_id: product.category?.id ?? "",
        unit_price: formatPriceWithCommas(product.unit_price ?? ""),
        pack_price: product.pack_price
          ? formatPriceWithCommas(product.pack_price)
          : "",
        description: product.description ?? "",
        is_active: product.is_active ?? true,
        variants: product.variants ?? [],
        capacities: (product.capacities ?? []).map((c: any) => ({
          name: c.name ?? "",
          price: c.price ? formatPriceWithCommas(c.price) : "",
        })),
        base_unit: product.base_unit ?? "Piece",
        pack_unit: product.pack_unit ?? "Box",
        units_per_pack: product.units_per_pack ?? 1,
      });
    }
  }, [product, isEditMode, reset]);

  // Reset form when create-modal closes
  useEffect(() => {
    if (!isModalOpen && !isEditMode) {
      setHasPackaging(false);
      setBaseUnitPreset("Piece");
      setPackTypePreset("Dozen");
      reset({
        name: "",
        category_id: "",
        unit_price: "",
        pack_price: "",
        description: "",
        is_active: true,
        variants: [],
        capacities: [],
        base_unit: "Piece",
        pack_unit: "Box",
        units_per_pack: 1,
      });
    }
  }, [isModalOpen, isEditMode, reset]);

  // Watch fields for rendering in UI
  const variants = watch("variants") || [];
  const capacities = watch("capacities") || [];

  const [variantInput, setVariantInput] = useState("");

  const addVariant = () => {
    const v = variantInput.trim();
    if (!v) return;
    if (variants.includes(v)) {
      toast.warning("Duplicate variant", {
        description: `"${v}" is already added.`,
      });
      return;
    }
    setValue("variants", [...variants, v]);
    setVariantInput("");
  };

  const removeVariant = (idx: number) => {
    setValue(
      "variants",
      variants.filter((_, i) => i !== idx),
    );
  };

  const addCapacity = () => {
    setValue("capacities", [...capacities, { name: "", price: "" }]);
  };

  const updateCapacity = (
    idx: number,
    field: keyof CapacityEntry,
    value: string,
  ) => {
    const updated = [...capacities];
    updated[idx] = { ...updated[idx], [field]: value };
    setValue("capacities", updated);
  };

  const removeCapacity = (idx: number) => {
    setValue(
      "capacities",
      capacities.filter((_, i) => i !== idx),
    );
  };

  // ── Submit handler ────────────────────────────────────────────────────────

  const onSubmit = async (data: ProductFormValues) => {
    const cleanPrice = parsePriceFromFormatted(data.unit_price);
    const cleanPackPrice =
      hasPackaging && data.pack_price
        ? parsePriceFromFormatted(data.pack_price)
        : null;
    const cleanCapacities = (data.capacities || [])
      .filter((c) => c.name.trim() !== "")
      .map((c) => ({
        name: c.name.trim(),
        price: c.price ? parsePriceFromFormatted(c.price) : null,
      }));

    const payload = {
      id: productId,
      name: data.name,
      description: data.description || null,
      category_id: data.category_id,
      unit_price: cleanPrice,
      pack_price: cleanPackPrice,
      is_active: data.is_active,
      variants: data.variants || [],
      capacities: cleanCapacities,
      base_unit: data.base_unit || "Piece",
      pack_unit: hasPackaging
        ? data.pack_unit || "Box"
        : data.base_unit || "Piece",
      units_per_pack: hasPackaging ? Number(data.units_per_pack) || 12 : 1,
    };

    if (isEditMode) {
      try {
        await editMutation.mutateAsync(payload);
        toast.success("Product updated successfully!");
        closeModal();
      } catch (error: any) {
        toast.error(
          error?.detail || error?.message || "Failed to update product.",
        );
      }
    } else {
      try {
        await addMutation.mutateAsync({
          ...payload,
          stock: 0,
        });
        toast.success("Product cataloged successfully!", {
          description: "You can now receive stock batches to add inventory.",
        });
        onProductAdded?.();
        reset();
        closeModal();
      } catch (error: any) {
        toast.error(
          error?.detail || error?.message || "Failed to create product.",
        );
      }
    }
  };

  // ── Helpers ───────────────────────────────────────────────────────────────

  const categoryOptions =
    categories?.map((cat: any) => ({
      value: cat.id.toString(),
      label: cat.name,
    })) ?? [];

  const isPending = isEditMode ? editMutation.isPending : addMutation.isPending;

  const namePlaceholder =
    NAME_PLACEHOLDERS[businessType] ?? "e.g. Product Name";
  const descPlaceholder =
    DESC_PLACEHOLDERS[businessType] ?? "Brief details about the product...";

  // ── Loading state (edit mode only) ────────────────────────────────────────

  if (isEditMode && productLoading) {
    return (
      <BaseModal
        isOpen={isModalOpen}
        onClose={closeModal}
        title="Edit Product Details"
        description="Loading product data..."
        size="sm"
      >
        <div className="flex flex-col items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-muted-foreground mt-4 font-semibold">
            Loading product details...
          </p>
        </div>
      </BaseModal>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <BaseModal
      isOpen={isModalOpen}
      onClose={closeModal}
      title={
        isEditMode
          ? `Edit ${config.labels.productSingular}`
          : `Add New ${config.labels.productSingular}`
      }
      description={
        isEditMode
          ? `Update the details for this ${config.labels.productSingular.toLowerCase()}.`
          : `Define ${config.labels.productSingular.toLowerCase()} details. Stock is managed separately via batches.`
      }
      // size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ── Core Fields ────────────────────────────────────────────── */}
        <div className="space-y-4">
          <h4 className="flex items-center gap-2 text-xs font-black text-muted-foreground uppercase tracking-widest">
            <Package size={14} /> {config.labels.sectionTitle}
          </h4>

          <Input
            name="name"
            register={register}
            label={`${config.labels.productSingular} Name`}
            icon={Package}
            placeholder={namePlaceholder}
            error={errors.name}
            validation={{ required: "Product name is required" }}
          />

          <Input
            name="category_id"
            register={register}
            label="Category"
            field="select"
            placeholder="Select Category"
            options={categoryOptions}
            error={errors.category_id}
            validation={{ required: "Category is required" }}
          />

          <Input
            name="description"
            register={register}
            label="Description (Optional)"
            field="textarea"
            icon={Info}
            placeholder={descPlaceholder}
            error={errors.description}
            rows={3}
          />

          <Input
            name="unit_price"
            register={register}
            label="Selling Price (₦)"
            icon={DollarSign}
            placeholder="0.00"
            error={errors.unit_price}
            validation={{
              required: "Selling price is required",
              onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                setValue("unit_price", formatPriceWithCommas(e.target.value));
              },
            }}
          />
        </div>

        {/* ── Packaging & Units of Measure ────────────────────────────── */}
        <div className="space-y-4 pt-6 border-t border-border/40">
          <h4 className="flex items-center gap-2 text-xs font-black text-muted-foreground uppercase tracking-widest">
            <Package size={14} /> Packaging & Unit of Measure
          </h4>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Configure how this product is stocked and sold. If this product is
            sold in bulk crates or cartons (e.g. wholesale), you can enable
            packaging below.
          </p>

          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Base/Selling Unit (Single) <span className="text-destructive">*</span>
              </label>
              <select
                value={baseUnitPreset}
                onChange={(e) => {
                  const val = e.target.value;
                  setBaseUnitPreset(val);
                  if (val !== "custom") {
                    setValue("base_unit", val);
                  } else {
                    setValue("base_unit", "");
                  }
                }}
                className="w-full rounded-lg border border-input bg-background px-4 py-2.5 outline-none text-foreground text-sm font-semibold focus:border-ring focus:ring-2 focus:ring-ring/20 min-h-[44px]"
              >
                <option value="Piece">Piece</option>
                <option value="Bottle">Bottle</option>
                <option value="Can">Can</option>
                <option value="Sachet">Sachet</option>
                <option value="Bag">Bag</option>
                <option value="Pack">Pack</option>
                <option value="Pair">Pair</option>
                <option value="Roll">Roll</option>
                <option value="custom">Custom Single Unit...</option>
              </select>
            </div>

            {baseUnitPreset === "custom" && (
              <Input
                name="base_unit"
                register={register}
                label="Custom Single Unit Name"
                placeholder="e.g. Loaf, Tube, Sachet"
                error={errors.base_unit}
                validation={{ required: "Custom unit name is required" }}
              />
            )}
          </div>

          <div className="flex items-center gap-3 p-4 bg-muted/30 border border-border/40 rounded-xl">
            <input
              type="checkbox"
              id="hasPackagingToggle"
              checked={hasPackaging}
              onChange={(e) => {
                const checked = e.target.checked;
                setHasPackaging(checked);
                if (!checked) {
                  setValue("units_per_pack", 1);
                  setValue("pack_unit", watch("base_unit") || "Piece");
                  setValue("pack_price", "");
                } else {
                  // Enable default preset: Dozen
                  setPackTypePreset("Dozen");
                  setValue("units_per_pack", 12);
                  setValue("pack_unit", "Dozen");
                }
              }}
              className="w-4 h-4 rounded text-primary border-border focus:ring-primary/40 cursor-pointer"
            />
            <label
              htmlFor="hasPackagingToggle"
              className="text-xs font-bold text-foreground cursor-pointer select-none leading-none"
            >
              This product is also sold or stocked in wholesale packs (crates,
              cartons, boxes, etc.)
            </label>
          </div>

          {hasPackaging && (
            <div className="p-4 bg-primary/5 border border-primary/20 rounded-xl space-y-4 transition-all">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Bulk Pack Type <span className="text-destructive">*</span>
                </label>
                <select
                  value={packTypePreset}
                  onChange={(e) => {
                    const val = e.target.value;
                    setPackTypePreset(val);
                    if (val === "Dozen") {
                      setValue("pack_unit", "Dozen");
                      setValue("units_per_pack", 12);
                    } else if (val === "Crate") {
                      setValue("pack_unit", "Crate");
                      setValue("units_per_pack", 24);
                    } else if (val === "Carton") {
                      setValue("pack_unit", "Carton");
                      setValue("units_per_pack", 48);
                    } else if (val === "Pack10") {
                      setValue("pack_unit", "Pack");
                      setValue("units_per_pack", 10);
                    } else {
                      setValue("pack_unit", "");
                      setValue("units_per_pack", "");
                    }
                  }}
                  className="w-full rounded-lg border border-input bg-background px-4 py-2.5 outline-none text-foreground text-sm font-semibold focus:border-ring focus:ring-2 focus:ring-ring/20 min-h-[44px]"
                >
                  <option value="Dozen">Dozen (12 items)</option>
                  <option value="Crate">Crate (24 items)</option>
                  <option value="Carton">Carton (48 items)</option>
                  <option value="Pack10">Pack (10 items)</option>
                  <option value="custom">Custom Packaging...</option>
                </select>
              </div>

              {packTypePreset === "custom" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    name="pack_unit"
                    register={register}
                    label="Bulk Pack Unit Name"
                    placeholder="e.g. Box, Bundle, Pack"
                    error={errors.pack_unit}
                    validation={{ required: hasPackaging ? "Pack unit is required" : false }}
                  />
                  <Input
                    name="units_per_pack"
                    register={register}
                    label={`Number of ${watch("base_unit") || "Piece"}s in one pack`}
                    type="number"
                    placeholder="e.g. 10, 50, 100"
                    error={errors.units_per_pack}
                    validation={{
                      required: hasPackaging ? "Units per pack is required" : false,
                      min: {
                        value: 2,
                        message: "Must be at least 2 for bulk packaging",
                      },
                    }}
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-border/40 pt-4">
                <Input
                  name="pack_price"
                  register={register}
                  label={`Bulk ${watch("pack_unit") || "Pack"} Selling Price (₦) - Optional`}
                  icon={DollarSign}
                  placeholder="Defaults to Single Price × Units Per Pack"
                  error={errors.pack_price}
                  validation={{
                    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
                      setValue(
                        "pack_price",
                        formatPriceWithCommas(e.target.value),
                      );
                    },
                  }}
                />
                <div className="flex items-center text-[10px] text-muted-foreground bg-background border border-border/40 rounded-xl p-3">
                  <span>
                    <strong>Summary Formula:</strong> You sell 1 single{" "}
                    <strong>{watch("base_unit") || "Piece"}</strong> at ₦
                    {watch("unit_price") || "0.00"}. A whole{" "}
                    <strong>{watch("pack_unit") || "Box"}</strong> (containing{" "}
                    {watch("units_per_pack") || 1}{" "}
                    {watch("base_unit") || "Piece"}s) will sell for{" "}
                    <strong>
                      ₦
                      {watch("pack_price") ||
                        formatPriceWithCommas(
                          String(
                            Number(
                              parsePriceFromFormatted(
                                watch("unit_price") || "0",
                              ) || 0,
                            ) * Number(watch("units_per_pack") || 1),
                          ),
                        )}
                    </strong>
                    .
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Business-type custom fields (from config) ──────────────── */}
        {config.customFields.length > 0 && (
          <div className="space-y-4 pt-6 border-t border-border/40">
            <h4 className="flex items-center gap-2 text-xs font-black text-muted-foreground uppercase tracking-widest">
              <Tag size={14} /> {config.displayName} Details
            </h4>
            {config.customFields.map((field) => (
              <Input
                key={field.name}
                name={field.name as any}
                register={register}
                label={field.label}
                field={field.type === "select" ? "select" : "input"}
                type={field.type === "number" ? "number" : "text"}
                placeholder={field.placeholder}
                options={field.options}
                validation={
                  field.required
                    ? { required: `${field.label} is required` }
                    : undefined
                }
              />
            ))}
          </div>
        )}

        {/* ── Variants (conditional) ──────── */}
        {config.features.variantTracking && (
          <section className="space-y-3 pt-6 border-t border-border/40">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              <span className="text-xs font-black uppercase tracking-widest text-foreground">
                {businessType === "electronics"
                  ? "Available Colors / Models"
                  : "Variants / Colors"}
              </span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={
                  businessType === "electronics"
                    ? "Add color/model (e.g. Midnight Black, Titanium Gray)…"
                    : "Add variant (e.g. Red, Blue, XL)…"
                }
                value={variantInput}
                onChange={(e) => setVariantInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addVariant();
                  }
                }}
                className="flex-1 px-3 py-2 bg-background border border-border/50 rounded-lg text-xs font-medium focus:outline-none focus:border-primary/50 transition-all text-foreground"
              />
              <button
                type="button"
                onClick={addVariant}
                className="px-3 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-bold hover:bg-primary/90 transition-all cursor-pointer"
              >
                Add
              </button>
            </div>
            {variants.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {variants.map((v, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-[11px] font-bold px-2.5 py-1 rounded-full"
                  >
                    {v}
                    <button
                      type="button"
                      onClick={() => removeVariant(idx)}
                      className="hover:text-red-500 transition-colors cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Capacities / Specs (conditional) ──────── */}
        {config.features.variantTracking && (
          <section className="space-y-3 pt-6 border-t border-border/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <span className="text-xs font-black uppercase tracking-widest text-foreground">
                  {businessType === "electronics"
                    ? "RAM / Storage Configurations"
                    : "Size / Capacity Options"}
                </span>
              </div>
              <button
                type="button"
                onClick={addCapacity}
                className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/15 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Config
              </button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              {businessType === "electronics"
                ? "Define configurations (e.g. 256GB + 8GB RAM) with optional override prices. If left blank, the base price applies."
                : "Define size/capacity tiers with optional override prices (e.g. 500ml, 1L). If left blank, the base price applies."}
            </p>

            {capacities.length === 0 ? (
              <div className="text-center py-4 text-[10px] text-muted-foreground/60 font-medium italic">
                No configurations added — product will sell at base price.
              </div>
            ) : (
              <div className="space-y-2">
                {capacities.map((cap, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-background border border-border/40 rounded-lg p-2"
                  >
                    <input
                      type="text"
                      placeholder={
                        businessType === "electronics"
                          ? "e.g. 256GB + 8GB RAM"
                          : "e.g. 500ml, 1L, Small"
                      }
                      value={cap.name}
                      onChange={(e) =>
                        updateCapacity(idx, "name", e.target.value)
                      }
                      className="flex-1 bg-transparent text-xs font-semibold outline-none placeholder:text-muted-foreground/50 min-w-0 text-foreground"
                    />
                    <div className="h-4 w-px bg-border/50" />
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <span className="text-xs">₦</span>
                      <input
                        type="text"
                        placeholder="Price override"
                        value={cap.price}
                        onChange={(e) =>
                          updateCapacity(
                            idx,
                            "price",
                            formatPriceWithCommas(e.target.value),
                          )
                        }
                        className="w-28 bg-transparent text-xs font-semibold outline-none placeholder:text-muted-foreground/50 text-foreground"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => removeCapacity(idx)}
                      className="p-1 text-red-400 hover:text-red-600 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* ── Status toggle (edit mode only) ─────────────────────────── */}
        {isEditMode && (
          <Input
            name="is_active"
            register={register}
            label="Product is Active"
            field="checkbox"
            error={errors.is_active}
          />
        )}

        {/* ── Footer Buttons ─────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4 justify-end border-t border-border/30">
          <Button
            type="button"
            variant="outline"
            onClick={closeModal}
            className="rounded-lg px-6 h-11 text-xs font-bold cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            className="rounded-lg px-8 h-11 text-xs font-bold shadow-lg shadow-primary/10 cursor-pointer"
            disabled={isPending}
          >
            {isPending
              ? isEditMode
                ? "Updating..."
                : "Creating..."
              : isEditMode
                ? "Save Changes"
                : `Add to Catalog`}
          </Button>
        </div>
      </form>
    </BaseModal>
  );
};

export default ProductForm;
