"use client";

import React from "react";
import { ShieldCheck, Loader2 } from "lucide-react";

export const SessionLoadingScreen: React.FC = () => {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-white relative overflow-hidden select-none">
      {/* Background Ambient Orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-cyan-500/10 blur-[140px] rounded-full pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Brand Icon with Cyber Ring */}
        <div className="relative flex items-center justify-center">
          <div className="absolute inset-0 rounded-2xl bg-cyan-500/20 blur-md animate-pulse" />
          <div className="relative p-4 rounded-2xl bg-slate-900 border border-cyan-500/30 shadow-2xl flex items-center justify-center">
            <ShieldCheck className="h-10 w-10 text-cyan-400" />
          </div>
        </div>

        {/* Loading Spinner & Status Text */}
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex items-center gap-2 text-cyan-400 font-mono text-xs uppercase tracking-widest">
            <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
            <span>Restoring Session Mandate...</span>
          </div>
          <p className="text-slate-400 text-xs font-mono">
            Verifying cryptographic token signatures
          </p>
        </div>
      </div>
    </div>
  );
};
