"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { NormalInput } from "@/components/ui/input";
import { apiService, getBackendErrorMessage } from "@/lib/services/apiService";
import { handleLogin } from "@/lib/actions/auth.actions";
import { toast } from "sonner";
import { 
  Building2, 
  Pill, 
  Cpu, 
  Shirt, 
  ShoppingBag, 
  Store, 
  CheckCircle2,
  ArrowRight
} from "lucide-react";
import Loader from "@/components/Loader";

const BUSINESS_TYPES = [
  {
    value: "pharmacy",
    label: "Pharmacy & Medicine",
    icon: Pill,
    description: "Manage medicines, batches, expiries, and prescriptions.",
    color: "from-teal-500/20 to-teal-500/5 hover:border-teal-500",
    iconColor: "text-teal-500",
  },
  {
    value: "electronics",
    label: "Electronics & Gadgets",
    icon: Cpu,
    description: "Track serial numbers, warranties, and item variations.",
    color: "from-blue-500/20 to-blue-500/5 hover:border-blue-500",
    iconColor: "text-blue-500",
  },
  {
    value: "clothing",
    label: "Clothing & Apparel",
    icon: Shirt,
    description: "Manage clothing sizes, colors, and collections.",
    color: "from-purple-500/20 to-purple-500/5 hover:border-purple-500",
    iconColor: "text-purple-500",
  },
  {
    value: "general",
    label: "General Retail",
    icon: ShoppingBag,
    description: "Perfect for supermarkets, convenience stores, and kiosks.",
    color: "from-amber-500/20 to-amber-500/5 hover:border-amber-500",
    iconColor: "text-amber-500",
  },
  {
    value: "other",
    label: "Other Business",
    icon: Store,
    description: "Custom business setup with flexible inventory options.",
    color: "from-slate-500/20 to-slate-500/5 hover:border-slate-500",
    iconColor: "text-slate-500",
  },
];

export default function OnboardingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [businessName, setBusinessName] = useState("");
  const [selectedType, setSelectedType] = useState("general");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState<"form" | "success">("form");

  useEffect(() => {
    if (!loading) {
      if (!user) {
        window.location.href = "/login";
      } else if (
        user.permissions?.store_role || 
        ((user as any).available_tenants && (user as any).available_tenants.length > 0)
      ) {
        router.push("/dashboard");
      }
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <Loader />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      toast.error("Please enter your business name.");
      return;
    }

    setIsSubmitting(true);

    try {
      const tenantRes = await apiService.post("/tenants/", {
        name: businessName,
        business_type: selectedType,
      });

      if (tenantRes && tenantRes.id) {
        const updatedUser = await apiService.get("/auth/user/");

        const match = document.cookie
          .split("; ")
          .find((row) => row.startsWith("session_access_token="));
        const token = match ? decodeURIComponent(match.split("=")[1]) : "";

        if (token && updatedUser) {
          const rolesOrMeta = {
            tenant_id: tenantRes.id,
            tenant_name: tenantRes.name,
            available_tenants: [
              {
                id: tenantRes.id,
                name: tenantRes.name,
                role: "owner",
                role_display: "Owner",
              }
            ],
            permissions: updatedUser.permissions || {},
          };

          await handleLogin(updatedUser, token, rolesOrMeta);
        }

        setStep("success");

        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 2000);
      } else {
        toast.error("Failed to create business", {
          description: "Please check your network and try again.",
        });
      }
    } catch (error: any) {
      console.error("Onboarding error:", error);
      const msg = getBackendErrorMessage(error);
      toast.error("Onboarding failed", {
        description: msg,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (step === "success") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-500/10 via-background to-teal-500/10 p-4">
        <div className="w-full max-w-md p-8 rounded-2xl border border-border bg-card shadow-2xl text-center space-y-6 animate-in fade-in zoom-in duration-300">
          <div className="mx-auto w-20 h-20 bg-teal-100 dark:bg-teal-900/30 text-teal-600 rounded-full flex items-center justify-center animate-bounce">
            <CheckCircle2 size={48} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-extrabold tracking-tight">You're All Set!</h1>
            <p className="text-muted-foreground text-sm">
              Creating your business <strong>{businessName}</strong> and setting up your inventory dashboard...
            </p>
          </div>
          <div className="w-full bg-muted h-2 rounded-full overflow-hidden">
            <div className="bg-teal-500 h-full w-full animate-pulse origin-left transition-all duration-1000" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-500/5 via-background to-teal-500/5 py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="max-w-3xl mx-auto w-full space-y-8 bg-card border border-border p-8 sm:p-10 rounded-2xl shadow-2xl">
        
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center">
            <Building2 size={28} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Tell us about your business
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto text-sm sm:text-base">
            Let's set up your store configuration so you can start tracking stock and sales.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Business Name */}
          <div className="space-y-2">
            <label htmlFor="businessName" className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
              Business Name
            </label>
            <NormalInput
              id="businessName"
              type="text"
              required
              placeholder="e.g. Quantum Pharmacy, Alpha Electronics"
              value={businessName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBusinessName(e.target.value)}
              disabled={isSubmitting}
              className="h-12 text-base px-4 border border-input rounded-xl focus-visible:ring-2 focus-visible:ring-primary"
            />
          </div>

          {/* Business Type Selector */}
          <div className="space-y-4">
            <label className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
              Business Type
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {BUSINESS_TYPES.map((type) => {
                const IconComponent = type.icon;
                const isSelected = selectedType === type.value;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setSelectedType(type.value)}
                    disabled={isSubmitting}
                    className={`flex items-start gap-4 p-4 rounded-xl border text-left transition-all duration-200 bg-gradient-to-b ${
                      isSelected
                        ? `${type.color} border-2 border-primary ring-2 ring-primary/20 scale-[1.01] shadow-md`
                        : "border-border hover:bg-muted/50 hover:scale-[1.005]"
                    }`}
                  >
                    <div className={`p-2.5 rounded-lg bg-card border border-border/50 ${type.iconColor}`}>
                      <IconComponent size={24} />
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-semibold text-card-foreground text-sm sm:text-base">
                        {type.label}
                      </h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {type.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit */}
          <div className="pt-4">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 text-base font-semibold rounded-xl flex items-center justify-center gap-2 group transition-all duration-300"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Creating Your Business...
                </>
              ) : (
                <>
                  Create Business & Get Started
                  <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
