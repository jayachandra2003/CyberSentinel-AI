import React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
  variant?: "cyan" | "emerald" | "amber" | "rose" | "purple" | "slate";
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "cyan",
  children,
  dot = true,
  className,
}) => {
  const styles = {
    cyan: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border-cyan-500/30",
    emerald: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30",
    amber: "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30",
    rose: "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30",
    purple: "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/30",
    slate: "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-700",
  };

  const dotColors = {
    cyan: "bg-cyan-500",
    emerald: "bg-emerald-500",
    amber: "bg-amber-500",
    rose: "bg-rose-500",
    purple: "bg-purple-500",
    slate: "bg-slate-400",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 text-xs font-semibold uppercase tracking-wider select-none backdrop-blur-sm",
        styles[variant],
        className
      )}
    >
      {dot && <span className={cn("h-1.5 w-1.5 rounded-full animate-pulse", dotColors[variant])} />}
      {children}
    </span>
  );
};
