"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Key, Mail, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { handleLogin, setActiveTenantCookie } from "@/lib/actions/auth.actions";
import { apiService, getBackendErrorMessage } from "@/lib/services/apiService";
import { syncService } from "@/lib/services/syncService";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import GoogleSignInButton from "./GoogleSignInButton";

type FormValues = {
  email: string;
  password: string;
};

type Step = "email" | "password" | "store-select";

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<Step>("email");
  const [emailValue, setEmailValue] = useState("");
  const [allowLoginMeta, setAllowLoginMeta] = useState<any>(null);
  const [lastCheckedEmail, setLastCheckedEmail] = useState<string | null>(null);
  const [lastCheckResp, setLastCheckResp] = useState<any>(null);
  const [availableTenants, setAvailableTenants] = useState<any[]>([]);
  const [selectingTenant, setSelectingTenant] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormValues>();

  const handleSuccessLogin = async (response: any) => {
    try {
      await handleLogin(
        response.user,
        response.access,
        allowLoginMeta ?? response.user?.roles ?? null,
      );

      // Instantly set access token and user in client cookies to avoid race conditions
      if (typeof window !== "undefined") {
        document.cookie = `session_access_token=${encodeURIComponent(response.access)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
        document.cookie = `session_user=${encodeURIComponent(JSON.stringify(response.user))}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      }

      const tenants = response.available_tenants || [];

      if (tenants.length > 1) {
        setAvailableTenants(tenants);
        setStep("store-select");
        setIsLoading(false);
      } else {
        toast.success("Login successful!", {
          description: "Welcome back!",
        });
        const hasTenants = tenants.length > 0;
        if (hasTenants) {
          const tenantId = tenants[0].id;
          await setActiveTenantCookie(tenantId);
          if (typeof window !== "undefined") {
            document.cookie = `active_tenant_id=${encodeURIComponent(tenantId)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
          }

          // Eager preload catalog before redirecting
          try {
            toast.info("Syncing store catalog...", {
              description: "Eagerly preloading products and categories for offline use...",
            });
            await syncService.syncAll();
            toast.success("Catalog synced!", {
              description: "Database is ready for offline use.",
            });
          } catch (syncErr) {
            console.error("Eager sync failed during login:", syncErr);
            toast.error("Failed to preload catalog for offline use. Proceeding online.");
          }
        }
        setTimeout(() => {
          if (!hasTenants && response.user?.role !== "platform_admin") {
            window.location.href = "/onboarding";
          } else {
            window.location.href = "/dashboard";
          }
        }, 1000);
      }
    } catch (err: any) {
      toast.error("Login failed", {
        description:
          getBackendErrorMessage(err) ||
          "An error occurred while processing your login.",
      });
      setIsLoading(false);
    }
  };

  const handleSelectStore = async (tenantId: string) => {
    setSelectingTenant(tenantId);
    try {
      await setActiveTenantCookie(tenantId);
      if (typeof window !== "undefined") {
        document.cookie = `active_tenant_id=${encodeURIComponent(tenantId)}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      }

      // Eager preload catalog before redirecting
      try {
        toast.info("Syncing store catalog...", {
          description: "Eagerly preloading products and categories for offline use...",
        });
        await syncService.syncAll();
        toast.success("Catalog synced!", {
          description: "Database is ready for offline use.",
        });
      } catch (syncErr) {
        console.error("Eager sync failed during store selection:", syncErr);
        toast.error("Failed to preload catalog for offline use. Proceeding online.");
      }

      toast.success("Store selected! Redirecting...", {
        description: "Loading your dashboard catalog.",
      });
      setTimeout(() => {
        window.location.href = "/dashboard";
      }, 1000);
    } catch (err) {
      toast.error("Failed to select store");
    } finally {
      setSelectingTenant(null);
    }
  };

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);

    try {
      if (step === "email") {
        if (
          lastCheckedEmail &&
          lastCheckedEmail === data.email &&
          lastCheckResp
        ) {
          if (!lastCheckResp.allowed) {
            toast.error("Cannot sign in", {
              description:
                lastCheckResp.detail || "You are not allowed to login.",
            });
            setIsLoading(false);
            return;
          }

          setEmailValue(data.email);
          setAllowLoginMeta(lastCheckResp || null);
          setStep("password");
          reset();
          setIsLoading(false);
          return;
        }

        try {
          const resp = await apiService.postWithoutToken("/auth/check-user/", {
            email: data.email,
          });

          const allowed = resp?.allowed ?? !!resp;

          setLastCheckedEmail(data.email);
          setLastCheckResp(resp);

          if (!allowed) {
            const message =
              getBackendErrorMessage(resp) ||
              resp?.detail ||
              "You are not allowed to login.";
            toast.error("Cannot sign in", { description: message });
            setIsLoading(false);
            return;
          }

          setEmailValue(data.email);
          setAllowLoginMeta(resp || null);
          setStep("password");
          reset();
          setIsLoading(false);
          return;
        } catch (err: any) {
          const msg = getBackendErrorMessage(err);
          toast.error("Email verification failed", { description: msg });
          setIsLoading(false);
          return;
        }
      }

      const response = await apiService.postWithoutToken("/auth/login/", {
        email: emailValue || data.email,
        password: data.password,
      });

      if (response && response.access) {
        await handleSuccessLogin(response);
      } else {
        toast.error("Login failed", {
          description:
            response?.detail || "Please check your credentials and try again.",
        });
        setIsLoading(false);
      }
    } catch (error: any) {
      console.log("Login error:", error);
      const errorMessage = getBackendErrorMessage(error);
      toast.error("Login failed", {
        description: errorMessage,
      });
      setIsLoading(false);
    } finally {
      if (step === "email") reset();
    }
  };

  if (step === "store-select") {
    return (
      <div className="w-full max-w-md p-8 rounded-lg shadow-lg border border-border bg-card animate-in fade-in zoom-in duration-300">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
            <Store className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Select Your Business</h1>
          <p className="text-muted-foreground text-sm">
            Choose the store branch/catalog you want to access today
          </p>
        </div>

        <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
          {availableTenants.map((t) => (
            <button
              key={t.id}
              onClick={() => handleSelectStore(t.id)}
              disabled={selectingTenant !== null}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-border/60 hover:border-primary/50 hover:bg-primary/5 text-left cursor-pointer transition-all duration-200 group"
            >
              <div className="min-w-0 flex-1 pr-3">
                <div className="font-bold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                  {t.name}
                </div>
                <div className="text-xs text-muted-foreground capitalize mt-0.5 font-medium">
                  {t.business_type} branch
                </div>
              </div>
              <span className="text-[10px] px-2 py-0.5 bg-muted dark:bg-muted/30 rounded-md capitalize font-bold text-muted-foreground shrink-0 border border-border/30">
                {t.role}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-border/40 text-center">
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setAvailableTenants([]);
            }}
            className="text-xs text-muted-foreground hover:text-foreground font-semibold underline underline-offset-4 cursor-pointer"
          >
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md p-8 rounded-lg shadow-lg border border-border bg-card">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome Back</h1>
        <p className="text-muted-foreground">
          Sign in to your account to continue
        </p>
      </div>

      {/* Login Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Email Field (first step) */}
        {step === "email" && (
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email Address
            </label>
            <Input
              icon={Mail}
              name="email"
              register={register}
              placeholder="you@example.com"
              disabled={isLoading}
              className="w-full"
            />
          </div>
        )}

        {/* When in password step show readonly email summary and password field */}
        {step === "password" && (
          <div className="space-y-4">
            <label htmlFor="email" className="text-sm font-medium">
              Email Address
            </label>
            <div className="flex rounded-md border border-border px-3 py-2 cursor-not-allowed bg-gray-50 items-center gap-3">
              <Mail size={18} className="text-muted-foreground" />
              <div>
                <div className="font-medium">{emailValue}</div>
              </div>
            </div>

            <div className="space-y-2">
              <Input
                icon={Key}
                name="password"
                register={register}
                label="Password"
                placeholder="Password"
                type="password"
                disabled={isLoading}
              />
            </div>
          </div>
        )}

        {/* Forgot Password Link */}
        <div className="flex items-center justify-between">
          <div>
            {step === "password" && (
              <button
                type="button"
                onClick={() => {
                  setStep("email");
                  setAllowLoginMeta(null);
                }}
                className="text-sm text-muted-foreground hover:underline"
              >
                Change email
              </button>
            )}
          </div>

          <div>
            <Link
              href="/forgot-password"
              title="Forgot Password"
              className="text-sm text-primary hover:underline"
              id="forgot-password-link"
            >
              Forgot your password?
            </Link>
          </div>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading || isSubmitting}
          id="login-submit-button"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              {step === "email" ? "Verifying..." : "Signing in..."}
            </div>
          ) : step === "email" ? (
            "Verify Email"
          ) : (
            "Sign In"
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="my-6 flex items-center">
        <div className="flex-1 border-t border-border" />
        <span className="px-3 text-sm text-muted-foreground">or</span>
        <div className="flex-1 border-t border-border" />
      </div>

      <div className="space-y-4">
        <GoogleSignInButton
          isLoading={isLoading}
          setIsLoading={setIsLoading}
          text="Sign in with Google"
          onSuccess={handleSuccessLogin}
        />

        <div className="text-center text-sm text-muted-foreground mt-4">
          Don't have an account?{" "}
          <Link
            href="/register"
            className="text-primary font-medium hover:underline"
          >
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
