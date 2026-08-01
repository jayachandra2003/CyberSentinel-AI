"use client";

import React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, Radar } from "lucide-react";

export const Loader: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center p-12 space-y-4">
      <div className="relative flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
          className="w-16 h-16 rounded-full border-2 border-cyan-500/20 border-t-cyan-500"
        />
        <ShieldCheck className="absolute h-8 w-8 text-cyan-500 animate-pulse" />
      </div>
      <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-cyan-600 dark:text-cyan-400 uppercase">
        <Radar className="h-4 w-4 animate-spin" />
        <span>Initializing Sentinel Environment...</span>
      </div>
    </div>
  );
};
