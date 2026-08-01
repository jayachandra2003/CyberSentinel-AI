import React from "react";
import Link from "next/link";
import { Shield, Activity } from "lucide-react";

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-950 py-8 text-slate-600 dark:text-slate-400 text-sm transition-colors">
      <div className="mx-auto max-w-7xl px-4 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
            <Shield className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            <span>CyberSentinel AI Platform</span>
          </div>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <Activity className="h-3 w-3 animate-pulse" />
            All Systems Operational
          </span>
        </div>
        <p className="text-xs text-slate-500 text-center md:text-left">
          Strictly Defensive Assessment Architecture. Authorized Scanning Only. © 2026.
        </p>
        <div className="flex gap-4 text-xs font-medium">
          <Link href="/docs" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">Documentation</Link>
          <Link href="/about" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors">Architecture</Link>
        </div>
      </div>
    </footer>
  );
};
