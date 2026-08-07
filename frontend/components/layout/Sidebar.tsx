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
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

const links = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard, badge: "SOC Main" },
  { href: "/scans", label: "Scan Engine", icon: Radar, badge: "2 Active", badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" },
  { href: "/vulnerabilities", label: "Vulnerabilities", icon: ShieldAlert, badge: "3 Crit", badgeColor: "bg-rose-500/20 text-rose-400 border-rose-500/30" },
  { href: "/reports", label: "Reports", icon: FileText, badge: "14 Ready", badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/30" },
  { href: "/audit-logs", label: "Audit Trail", icon: History, badge: "Live Log", badgeColor: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30" },
  { href: "/api-keys", label: "API Keys", icon: Key },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const Sidebar: React.FC = () => {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <aside className="w-64 border-r border-slate-200 bg-slate-100/80 dark:border-slate-800 dark:bg-slate-950 min-h-[calc(100vh-4rem)] p-4 hidden lg:flex flex-col justify-between transition-colors font-sans">
      <div className="space-y-1">
        <div className="flex items-center justify-between px-3 py-2 text-[11px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2">
          <span>Platform SOC Modules</span>
          <span className="flex items-center gap-1 text-emerald-400 text-[10px]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
          </span>
        </div>
        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "relative flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all group",
                isActive
                  ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shadow-sm dark:shadow-glow-cyan font-semibold"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-200/80 dark:hover:bg-slate-900/80 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <div className="flex items-center gap-3">
                {isActive && (
                  <motion.div
                    layoutId="sidebar-active-indicator"
                    className="absolute left-0 top-2 bottom-2 w-1 rounded-r-full bg-cyan-500"
                  />
                )}
                <Icon className={cn("h-4 w-4 transition-transform group-hover:scale-110", isActive ? "text-cyan-600 dark:text-cyan-400" : "")} />
                <span>{link.label}</span>
              </div>

              {link.badge && (
                <span className={cn("px-2 py-0.2 rounded-full font-mono text-[10px] border font-bold", link.badgeColor || "bg-slate-800 text-slate-400 border-slate-700")}>
                  {link.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* User Profile & Defensive Mandate Box */}
      <div className="space-y-3">
        {user && (
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-bold text-xs">
                <User className="h-4 w-4" />
              </div>
              <div className="overflow-hidden text-xs">
                <div className="font-semibold text-slate-900 dark:text-white truncate">{user.full_name || "SOC Analyst"}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">{user.email}</div>
              </div>
            </div>
            <button
              onClick={() => logout()}
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
