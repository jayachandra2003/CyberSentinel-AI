"use client";

import React from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Radar, Plus } from "lucide-react";

export default function ScansPage() {
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
              className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4"
            >
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Radar className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                  Defensive Scan Engine
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400">Manage and initiate authorized domain security scans.</p>
              </div>
              <Button variant="primary" size="sm">
                <Plus className="mr-1 h-4 w-4" />
                Register New Target
              </Button>
            </motion.div>

            <Card glow className="p-8 text-center space-y-4">
              <p className="text-slate-700 dark:text-slate-300 text-sm sm:text-base">
                Abstract Scan Orchestrator Interface ready. No active scanning logic implemented.
              </p>
              <Badge variant="cyan">Defensive Engine Scaffolded</Badge>
            </Card>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
