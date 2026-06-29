"use client";

import { useState } from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Key, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { handleLogin } from "@/lib/actions/auth.actions";
import { apiService, getBackendErrorMessage } from "@/lib/services/apiService";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import GoogleSignInButton from "./GoogleSignInButton";

type FormValues = {
  email: string;
  password: string;
};

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"email" | "password">("email");
  const [emailValue, setEmailValue] = useState("");
  const [allowLoginMeta, setAllowLoginMeta] = useState<any>(null);
  const [lastCheckedEmail, setLastCheckedEmail] = useState<string | null>(null);
  const [lastCheckResp, setLastCheckResp] = useState<any>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting },
  } = useForm<FormValues>();

  const onSubmit = async (data: FormValues) => {
    setIsLoading(true);

    try {
      if (step === "email") {
        // If we've already checked this email and it's the same, reuse the response
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

          // Save email and metadata for next step
          setEmailValue(data.email);
          setAllowLoginMeta(resp || null);
          setStep("password");
          reset();
          setIsLoading(false);
          return;
        } catch (err: any) {
          // apiService throws parsed backend error objects
          const msg = getBackendErrorMessage(err);
          toast.error("Email verification failed", { description: msg });
          setIsLoading(false);
          return;
        }
      }

      // Password step: perform actual login
      const response = await apiService.postWithoutToken("/auth/login/", {
        email: emailValue || data.email,
        password: data.password,
      });

      if (response && response.access) {
        // Pass metadata if available (roles/stores)
        await handleLogin(
          response.user,
          response.access,
          allowLoginMeta ?? response.user?.roles ?? null,
        );
        toast.success("Login successful!", {
          description: "Welcome back!",
        });

        const hasTenants = response.available_tenants && response.available_tenants.length > 0;

        // Small delay to show the toast before redirect
        setTimeout(() => {
          if (!hasTenants && response.user?.role !== "platform_admin") {
            window.location.href = "/onboarding";
          } else {
            window.location.href = "/dashboard";
          }
        }, 1000);
      } else {
        toast.error("Login failed", {
          description:
            response?.detail || "Please check your credentials and try again.",
        });
      }
    } catch (error: any) {
      console.log("Login error:", error);
      const errorMessage = getBackendErrorMessage(error);
      toast.error("Login failed", {
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
      // Only reset form when going back to email step — keep email shown on success/failure
      if (step === "email") reset();
    }
  };

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
        <GoogleSignInButton isLoading={isLoading} setIsLoading={setIsLoading} text="Sign in with Google" />

        <div className="text-center text-sm text-muted-foreground mt-4">
          Don't have an account?{" "}
          <Link href="/register" className="text-primary font-medium hover:underline">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
