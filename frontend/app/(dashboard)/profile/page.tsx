"use client";

import React from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { User as UserIcon } from "lucide-react";

export default function ProfilePage() {
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
                <UserIcon className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                User Profile & Preferences
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Personal account security settings, multi-factor authentication, and notification preferences.
              </p>
            </motion.div>

            <Card glow className="p-12 text-center space-y-4">
              <div className="text-xl font-bold font-mono text-slate-900 dark:text-white">
                🚧 Coming in Phase 9
              </div>
              <div>
                <Badge variant="cyan" className="text-xs px-3 py-1 font-mono">
                  Planned for v2.0.0
                </Badge>
              </div>
            </Card>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
