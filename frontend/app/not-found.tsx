"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-cyber-dark text-slate-900 dark:text-white p-4 transition-colors">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center text-center space-y-4 max-w-md"
      >
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500">
          <ShieldOff className="h-12 w-12 animate-pulse" />
        </div>
        <h1 className="text-4xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-white">
          404 - TARGET NOT FOUND
        </h1>
        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
          The requested URL path does not exist within the CyberSentinel AI platform directory.
        </p>
        <Link href="/">
          <Button variant="primary">Return to Gateway</Button>
        </Link>
      </motion.div>
    </div>
  );
}
