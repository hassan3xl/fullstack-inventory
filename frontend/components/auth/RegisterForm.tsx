"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Key, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { apiService, getBackendErrorMessage } from "@/lib/services/apiService";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { handleLogin } from "@/lib/actions/auth.actions";
import GoogleSignInButton from "./GoogleSignInButton";

type FormValues = {
  email: string;
  password1: string;
  password2: string;
  otp: string;
};

export default function RegisterForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<"form" | "otp">("form");
  const [otpSentEmail, setOtpSentEmail] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    watch,
    setError,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    mode: "onBlur",
  });

  // Keep the react-hook-form 'otp' value in sync with the 6 individual boxes
  useEffect(() => {
    setValue("otp", otpDigits.join(""), { shouldValidate: step === "otp" });
  }, [otpDigits, setValue, step]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const onSendOTP = async (data: FormValues) => {
    setIsLoading(true);

    try {
      // Request registration OTP code
      await apiService.postWithoutToken("/auth/otp/request-register/", {
        email: data.email,
      });

      toast.success("Verification code sent!", {
        description: `Check your inbox at ${data.email}`,
      });
      setOtpSentEmail(data.email);
      setOtpDigits(["", "", "", "", "", ""]);
      setStep("otp");
      setResendTimer(60);
    } catch (error: any) {
      console.error("Send OTP error:", error);
      const errorMessage = getBackendErrorMessage(error);
      
      // If backend says email already registered, attach validation error directly to field
      if (errorMessage.toLowerCase().includes("exists")) {
        setError("email", {
          type: "manual",
          message: "A user with this email already exists.",
        });
      } else {
        toast.error("Error sending verification code", {
          description: errorMessage,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onRegister = async (data: FormValues) => {
    const fullOtp = otpDigits.join("");
    if (fullOtp.length < 6) {
      setError("otp", {
        type: "manual",
        message: "Please enter the full 6-digit verification code.",
      });
      return;
    }

    setIsLoading(true);

    try {
      const res = await apiService.postWithoutToken("/auth/register/", {
        email: data.email,
        password1: data.password1,
        password2: data.password2,
        otp: fullOtp,
      });

      if (res.access) {
        // Automatically login the user
        await handleLogin(
          res.user,
          res.access,
          res.user?.roles || null
        );

        toast.success("Account created successfully!", {
          description: "Setting up your onboarding...",
        });

        // Redirect to onboarding page after successful signup
        setTimeout(() => {
          window.location.href = "/onboarding";
        }, 1500);
      } else {
        toast.error("Sign up failed", {
          description:
            res.message || "Please check your information and try again.",
        });
      }
    } catch (error: any) {
      console.error("Sign up error:", error);
      const errorMessage = getBackendErrorMessage(error);

      if (errorMessage.toLowerCase().includes("code") || errorMessage.toLowerCase().includes("otp")) {
        setError("otp", {
          type: "manual",
          message: errorMessage || "Invalid or expired verification code.",
        });
      } else {
        toast.error("Sign up error", {
          description: errorMessage,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0 || !otpSentEmail) return;
    setIsLoading(true);
    try {
      await apiService.postWithoutToken("/auth/otp/request-register/", {
        email: otpSentEmail,
      });
      toast.success("Verification code resent successfully!");
      setOtpDigits(["", "", "", "", "", ""]);
      setResendTimer(60);
    } catch (error: any) {
      const errorMessage = getBackendErrorMessage(error);
      toast.error("Resend failed", {
        description: errorMessage || "Could not resend verification code.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (value: string, index: number) => {
    if (value && !/^\d+$/.test(value)) return; // Only digits

    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    // Auto-focus next input box
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-box-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === "Backspace") {
      if (!otpDigits[index] && index > 0) {
        const newDigits = [...otpDigits];
        newDigits[index - 1] = "";
        setOtpDigits(newDigits);
        const prevInput = document.getElementById(`otp-box-${index - 1}`);
        prevInput?.focus();
      } else {
        const newDigits = [...otpDigits];
        newDigits[index] = "";
        setOtpDigits(newDigits);
      }
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").trim();
    // Extract only digits from the pasted text (in case of spaces, hyphens, or extra formatting)
    const digitsOnly = pasteData.replace(/\D/g, "");
    
    if (digitsOnly.length === 0) return;

    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      if (i < digitsOnly.length) {
        newDigits[i] = digitsOnly[i];
      }
    }
    setOtpDigits(newDigits);

    // Focus the appropriate input box based on length (maximum 5 for index 0-5)
    const focusIndex = Math.min(digitsOnly.length, 5);
    const targetInput = document.getElementById(`otp-box-${focusIndex}`);
    targetInput?.focus();
  };

  if (step === "otp") {
    return (
      <div className="w-full max-w-lg p-8 rounded-lg shadow-lg border border-border bg-card">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Verify Email</h1>
          <p className="text-muted-foreground text-sm">
            We sent a 6-digit code to <span className="font-semibold text-foreground">{otpSentEmail}</span>
          </p>
        </div>

        {/* OTP Form */}
        <form onSubmit={handleSubmit(onRegister)} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium block text-center mb-4">
              Enter Verification Code
            </label>
            
            {/* Hidden field for validation synchronization */}
            <input 
              type="hidden" 
              {...register("otp", { 
                required: "Verification code is required",
                minLength: { value: 6, message: "Code must be exactly 6 digits" }
              })} 
            />

            {/* Individual OTP digit boxes */}
            <div className="flex justify-center gap-2 sm:gap-3 py-2">
              {otpDigits.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-box-${index}`}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  autoComplete="one-time-code"
                  value={digit}
                  disabled={isLoading}
                  onChange={(e) => handleOtpChange(e.target.value, index)}
                  onKeyDown={(e) => handleOtpKeyDown(e, index)}
                  onPaste={handleOtpPaste}
                  className="w-12 h-12 sm:w-14 sm:h-14 text-center text-xl font-bold rounded-xl border border-input bg-background focus:ring-2 focus:ring-primary focus:border-primary transition-all font-mono"
                />
              ))}
            </div>

            {errors.otp && (
              <p className="text-sm text-destructive text-center mt-2 font-medium">
                {errors.otp.message}
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full mt-4"
            disabled={isLoading}
            id="otp-verify-button"
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Verifying...
              </div>
            ) : (
              "Verify & Register"
            )}
          </Button>

          <div className="flex justify-between items-center text-sm pt-2">
            <button
              type="button"
              onClick={() => setStep("form")}
              disabled={isLoading}
              className="text-muted-foreground hover:text-foreground transition-colors text-xs"
            >
              &larr; Back to registration
            </button>

            <button
              type="button"
              onClick={handleResend}
              disabled={isLoading || resendTimer > 0}
              className="text-primary hover:underline disabled:text-muted-foreground disabled:no-underline transition-colors text-xs font-medium"
            >
              {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend code"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg p-8 rounded-lg shadow-lg border border-border bg-card">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Create Account</h1>
        <p className="text-muted-foreground text-sm">Join us today and get started</p>
      </div>

      {/* Sign Up Form */}
      <form onSubmit={handleSubmit(onSendOTP)} className="space-y-6">
        {/* Email Field */}
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email Address
          </label>
          <Input
            name="email"
            icon={Mail}
            register={register}
            type="email"
            placeholder="you@example.com"
            disabled={isLoading}
            error={errors.email}
            validation={{
              required: "Email is required",
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Invalid email address",
              },
            }}
            className="w-full"
          />
        </div>

        {/* Password Field */}
        <div className="space-y-4">
          <div className="relative">
            <Input
              label="Password"
              name="password1"
              icon={Key}
              register={register}
              type="password"
              placeholder="At least 6 characters"
              disabled={isLoading}
              error={errors.password1}
              validation={{
                required: "Password is required",
                minLength: {
                  value: 6,
                  message: "Password must be at least 6 characters",
                },
              }}
              className="w-full"
            />
          </div>
          <div className="relative">
            <Input
              label="Confirm Password"
              name="password2"
              icon={Key}
              register={register}
              type="password"
              placeholder="At least 6 characters"
              disabled={isLoading}
              error={errors.password2}
              validation={{
                required: "Confirm password is required",
                validate: (val: string) => {
                  if (watch("password1") !== val) {
                    return "Passwords do not match";
                  }
                },
              }}
              className="w-full"
            />
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="text-xs text-muted-foreground">
          By creating an account, you agree to our{" "}
          <Link
            href="/terms"
            title="Terms"
            className="text-primary hover:underline"
            id="terms-link"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            title="Privacy"
            className="text-primary hover:underline"
            id="privacy-link"
          >
            Privacy Policy
          </Link>
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
          id="register-submit-button"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              Sending Verification...
            </div>
          ) : (
            "Create Account"
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="my-6 flex items-center">
        <div className="flex-1 border-t border-border" />
        <span className="px-3 text-sm text-muted-foreground">or</span>
        <div className="flex-1 border-t border-border" />
      </div>

      {/* Google Sign Up Button */}
      <div className="mb-6">
        <GoogleSignInButton isLoading={isLoading} setIsLoading={setIsLoading} text="Sign up with Google" />
      </div>

      {/* Sign In Link */}
      <div className="text-center">
        <p className="text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link
            href="/login"
            title="Sign In"
            className="text-primary font-medium hover:underline"
            id="login-link"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
