"use client";

import React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface CardProps extends HTMLMotionProps<"div"> {
  glow?: boolean;
  hoverEffect?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  className,
  glow = false,
  hoverEffect = true,
  ...props
}) => {
  return (
    <motion.div
      whileHover={hoverEffect ? { y: -4, transition: { duration: 0.2 } } : undefined}
      className={cn(
        "relative rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm transition-all dark:border-slate-800/80 dark:bg-slate-900/80 backdrop-blur-md text-slate-900 dark:text-slate-100",
        glow &&
          "border-cyan-500/40 dark:border-cyan-500/30 shadow-md dark:shadow-[0_0_25px_rgba(0,240,255,0.15)]",
        className
      )}
      {...props}
    >
      {/* Decorative subtle ambient top light */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent pointer-events-none rounded-t-2xl" />
      {children}
    </motion.div>
  );
};
