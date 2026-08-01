"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  Radar, 
  FileText, 
  ShieldAlert, 
  History, 
  Key, 
  User, 
  Settings,
  ShieldCheck,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/scans", label: "Scan Engine", icon: Radar },
  { href: "/vulnerabilities", label: "Vulnerabilities", icon: ShieldAlert },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/audit-logs", label: "Audit Trail", icon: History },
  { href: "/api-keys", label: "API Keys", icon: Key },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 border-r border-slate-200 bg-slate-100/80 dark:border-slate-800 dark:bg-slate-950 min-h-[calc(100vh-4rem)] p-4 hidden lg:flex flex-col justify-between transition-colors">
      <div className="space-y-1">
        <div className="px-3 py-2 text-xs font-mono font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2">
          Platform SOC Modules
        </div>
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group",
                isActive
                  ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shadow-sm dark:shadow-glow-cyan font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/80 dark:hover:bg-slate-900/80 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-indicator"
                  className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-cyan-500"
                />
              )}
              <Icon className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive ? "text-cyan-600 dark:text-cyan-400" : "")} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </div>

      {/* User Profile & Defensive Mandate Box */}
      <div className="space-y-3">
        {user && (
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold text-xs">
                <User className="h-4 w-4" />
              </div>
              <div className="overflow-hidden text-xs">
                <div className="font-semibold text-slate-900 dark:text-white truncate">{user.full_name || "Analyst"}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">{user.email}</div>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}

        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/50 space-y-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            <span>Defensive Mandate</span>
          </div>
          <p className="leading-relaxed text-[11px]">
            100% Defensive Scope. Authorized Domain Assessment Protocol Enabled.
          </p>
        </div>
      </div>
    </aside>
  );
};
