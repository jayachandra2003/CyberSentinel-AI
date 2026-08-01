"use client";

import React from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { BookOpen, Terminal } from "lucide-react";

export default function DocsPlaceholderPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-cyber-dark text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar />
      <main className="flex-1 py-16 px-4 mx-auto max-w-5xl space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4 text-center"
        >
          <Badge variant="cyan">Developer Specifications</Badge>
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Developer & System Documentation</h1>
          <p className="text-slate-600 dark:text-slate-400">Technical reference guide for CyberSentinel AI API & Modular Engine.</p>
        </motion.div>

        <Card glow className="space-y-6 p-8">
          <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-bold text-lg">
            <BookOpen className="h-5 w-5" />
            <span>Architecture Overview</span>
          </div>
          <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed">
            The platform architecture follows Clean Architecture guidelines. The API Gateway delegates requests to Domain Services, which interface with generic Repository patterns for database operations and dispatch Celery tasks for background processing.
          </p>

          <div className="bg-slate-900 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-xs text-slate-800 dark:text-slate-300 space-y-2">
            <div className="text-cyan-600 dark:text-cyan-400 font-bold flex items-center gap-1.5">
              <Terminal className="h-4 w-4" />
              API Gateway Health & Version Envelopes
            </div>
            <pre className="text-slate-600 dark:text-slate-400">GET /api/v1/version</pre>
            <pre className="text-slate-600 dark:text-slate-400">GET /health</pre>
          </div>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
