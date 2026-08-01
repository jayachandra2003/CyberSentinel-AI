"use client";

import React from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { History } from "lucide-react";

export default function AuditLogsPage() {
  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-cyber-dark text-slate-900 dark:text-slate-100 transition-colors">
        <Navbar />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 p-6 space-y-8 bg-slate-50 dark:bg-cyber-dark transition-colors overflow-hidden">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-b border-slate-200 dark:border-slate-800 pb-4"
            >
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                Immutable Audit Trail
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">System user activity, authorization checks, and HTTP intercept logs.</p>
            </motion.div>

            <Card glow className="p-8 text-center space-y-4">
              <p className="text-slate-700 dark:text-slate-300 text-sm sm:text-base">
                AuditLog entity model & audit middleware active.
              </p>
              <Badge variant="amber">Audit Middleware Active</Badge>
            </Card>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
