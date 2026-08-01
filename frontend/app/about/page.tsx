"use client";

import React from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ShieldCheck, Cpu, Lock, CheckCircle2 } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-cyber-dark text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar />
      <main className="flex-1 py-16 px-4 mx-auto max-w-5xl space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <Badge variant="cyan">Architecture Overview</Badge>
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">About CyberSentinel AI</h1>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Building next-generation defensive cybersecurity tools focused on scope authorization, compliance, and enterprise software engineering principles.
          </p>
        </motion.div>

        <Card glow className="space-y-6 p-8">
          <div className="flex items-center gap-3 text-cyan-600 dark:text-cyan-400 font-bold text-xl">
            <ShieldCheck className="h-7 w-7" />
            <span>Our Defensive Mandate</span>
          </div>
          <p className="text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
            CyberSentinel AI was engineered from the ground up as a purely defensive security platform. We believe that proactive domain posture management should be accessible, transparent, and strictly compliant with legal cybersecurity standards.
          </p>
          <div className="border-t border-slate-200 dark:border-slate-800 pt-6 grid sm:grid-cols-2 gap-4 text-xs font-mono text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <Cpu className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              <span>Next.js 15 App Router Frontend</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <Lock className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
              <span>Python 3.12 & FastAPI Clean Backend</span>
            </div>
          </div>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
