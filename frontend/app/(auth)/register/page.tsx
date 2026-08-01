"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, User, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, ArrowRight } from "lucide-react";
import { registerSchema, RegisterFormData } from "@/lib/validation/authSchemas";
import { authService } from "@/services/api/authService";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { PasswordStrengthIndicator } from "@/components/auth/PasswordStrengthIndicator";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: "",
      email: "",
      password: "",
      confirm_password: "",
    },
  });

  const passwordValue = useWatch({ control, name: "password" });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setServerError(null);
    setSuccessMessage(null);

    try {
      // Execute REAL POST request to FastAPI backend: http://127.0.0.1:8000/api/v1/auth/register
      const response = await authService.registerUser({
        email: data.email,
        password: data.password,
        full_name: data.full_name,
      });

      if (response.success) {
        setSuccessMessage("Registration successful! Redirecting to login...");
        setTimeout(() => {
          router.push("/login");
        }, 1500);
      } else {
        setServerError(response.error || "Registration failed. Please check your details.");
      }
    } catch (err: any) {
      const backendError =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        err.message ||
        "Failed to connect to authentication server.";
      setServerError(typeof backendError === "string" ? backendError : JSON.stringify(backendError));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-slate-50 dark:bg-cyber-dark text-slate-900 dark:text-slate-100 p-4 transition-colors selection:bg-cyan-500 selection:text-white relative overflow-hidden">
      {/* Background Ambient Orbs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[550px] h-[350px] bg-purple-500/10 dark:bg-cyan-500/15 blur-[120px] rounded-full pointer-events-none" />

      {/* Top Header Controls */}
      <div className="w-full max-w-7xl mx-auto flex items-center justify-between py-4">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-xl text-slate-900 dark:text-white tracking-wider">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <ShieldCheck className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <span>CyberSentinel <span className="text-cyan-600 dark:text-cyan-400 font-mono text-xs px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">AI</span></span>
        </Link>
        <ThemeToggle />
      </div>

      {/* Main Register Form Container */}
      <main className="flex-1 flex items-center justify-center py-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-lg space-y-6"
        >
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
              Create Authorized Analyst Account
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Register credentials to evaluate domain defensive posture.
            </p>
          </div>

          <Card glow className="p-8 space-y-6 border-slate-200/80 dark:border-slate-800/80 shadow-xl">
            {/* Alert Messages Area */}
            <AnimatePresence>
              {serverError && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3.5 flex items-start gap-2.5 text-xs text-rose-700 dark:text-rose-400"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{serverError}</span>
                </motion.div>
              )}

              {successMessage && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-400"
                >
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{successMessage}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {/* Full Name Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Security Analyst"
                    {...register("full_name")}
                    className={`w-full rounded-xl border bg-slate-100/80 dark:bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all ${
                      errors.full_name ? "border-rose-500 dark:border-rose-500" : "border-slate-200 dark:border-slate-800"
                    }`}
                    aria-invalid={!!errors.full_name}
                  />
                </div>
                {errors.full_name && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 font-medium">{errors.full_name.message}</p>
                )}
              </div>

              {/* Email Address Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="analyst@yourdomain.com"
                    {...register("email")}
                    className={`w-full rounded-xl border bg-slate-100/80 dark:bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all ${
                      errors.email ? "border-rose-500 dark:border-rose-500" : "border-slate-200 dark:border-slate-800"
                    }`}
                    aria-invalid={!!errors.email}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 font-medium">{errors.email.message}</p>
                )}
              </div>

              {/* Password Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    {...register("password")}
                    className={`w-full rounded-xl border bg-slate-100/80 dark:bg-slate-950 py-2.5 pl-10 pr-10 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all ${
                      errors.password ? "border-rose-500 dark:border-rose-500" : "border-slate-200 dark:border-slate-800"
                    }`}
                    aria-invalid={!!errors.password}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 font-medium">{errors.password.message}</p>
                )}

                {/* Password Strength Indicator */}
                <PasswordStrengthIndicator password={passwordValue} />
              </div>

              {/* Confirm Password Field */}
              <div className="space-y-1.5">
                <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••••••"
                    {...register("confirm_password")}
                    className={`w-full rounded-xl border bg-slate-100/80 dark:bg-slate-950 py-2.5 pl-10 pr-10 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all ${
                      errors.confirm_password ? "border-rose-500 dark:border-rose-500" : "border-slate-200 dark:border-slate-800"
                    }`}
                    aria-invalid={!!errors.confirm_password}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirm_password && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 font-medium">{errors.confirm_password.message}</p>
                )}
              </div>

              {/* Terms Checkbox */}
              <div className="space-y-1 pt-1">
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    id="acceptTerms"
                    {...register("acceptTerms")}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-700 text-cyan-600 focus:ring-cyan-500 cursor-pointer accent-cyan-500"
                  />
                  <label htmlFor="acceptTerms" className="text-xs font-medium text-slate-600 dark:text-slate-400 cursor-pointer select-none leading-normal">
                    I agree to the Terms of Service & Ethical Defensive Mandate (100% Authorized Target Assessment Only).
                  </label>
                </div>
                {errors.acceptTerms && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 mt-1 font-medium">{errors.acceptTerms.message}</p>
                )}
              </div>

              {/* Register Button */}
              <Button
                type="submit"
                variant="primary"
                className="w-full py-2.5 mt-2"
                isLoading={isLoading}
              >
                Create Account
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </form>

            <div className="text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800/80 pt-4">
              Already registered?{" "}
              <Link href="/login" className="text-cyan-600 dark:text-cyan-400 font-semibold hover:underline">
                Sign In to Gateway
              </Link>
            </div>
          </Card>
        </motion.div>
      </main>

      {/* Footer copyright */}
      <div className="text-center py-4 text-xs text-slate-500">
        CyberSentinel AI Platform • Strictly Authorized Assessment Mandate
      </div>
    </div>
  );
}
