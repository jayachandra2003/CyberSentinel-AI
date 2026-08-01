"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck, Mail } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function ForgotPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-cyber-dark text-slate-900 dark:text-slate-100 p-4 transition-colors">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            <ShieldCheck className="h-8 w-8 text-cyan-600 dark:text-cyan-400" />
            CyberSentinel <span className="text-cyan-600 dark:text-cyan-400">AI</span>
          </Link>
          <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300">Reset Account Password</h2>
        </div>

        <Card glow className="space-y-6 p-8">
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  placeholder="analyst@cybersentinel.ai"
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none transition-colors"
                />
              </div>
            </div>

            <Button type="submit" variant="primary" className="w-full">
              Send Reset Link
            </Button>
          </form>

          <div className="text-center text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200 dark:border-slate-800 pt-4">
            Remember your password?{" "}
            <Link href="/login" className="text-cyan-600 dark:text-cyan-400 font-semibold hover:underline">
              Back to Login
            </Link>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
