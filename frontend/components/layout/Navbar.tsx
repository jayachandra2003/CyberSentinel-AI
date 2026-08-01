"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Terminal, Cpu, Menu, X, LayoutDashboard, Radar, ShieldAlert, FileText, History, Key, Settings, LogOut, User } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";

const mobileNavLinks = [
  { href: "/features", label: "Features" },
  { href: "/about", label: "About" },
  { href: "/docs", label: "Documentation" },
  { href: "/dashboard", label: "SOC Dashboard", icon: LayoutDashboard },
  { href: "/scans", label: "Scan Engine", icon: Radar },
  { href: "/vulnerabilities", label: "Vulnerabilities", icon: ShieldAlert },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/audit-logs", label: "Audit Logs", icon: History },
  { href: "/api-keys", label: "API Keys", icon: Key },
  { href: "/settings", label: "Settings", icon: Settings },
];

export const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/80 dark:border-slate-800/80 dark:bg-slate-950/80 backdrop-blur-md transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 font-bold text-xl text-slate-900 dark:text-white tracking-wider group">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 group-hover:border-cyan-500/50 transition-colors">
            <ShieldCheck className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
          </div>
          <span>
            CyberSentinel <span className="text-cyan-600 dark:text-cyan-400 font-mono text-xs px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">AI</span>
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-slate-600 dark:text-slate-300">
          <Link href="/features" className={`hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors ${pathname === "/features" ? "text-cyan-600 dark:text-cyan-400 font-semibold" : ""}`}>
            Features
          </Link>
          <Link href="/about" className={`hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors ${pathname === "/about" ? "text-cyan-600 dark:text-cyan-400 font-semibold" : ""}`}>
            About
          </Link>
          <Link href="/docs" className={`hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors ${pathname === "/docs" ? "text-cyan-600 dark:text-cyan-400 font-semibold" : ""}`}>
            Docs
          </Link>
          <Link href="/dashboard" className="hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors flex items-center gap-1.5 px-3 py-1 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-700 dark:text-cyan-400 font-medium">
            <Cpu className="h-4 w-4" />
            Dashboard
          </Link>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <ThemeToggle />

          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs font-mono text-slate-700 dark:text-slate-300">
                <User className="h-3.5 w-3.5 text-cyan-500" />
                <span className="max-w-[140px] truncate">{user?.email || "Analyst"}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={logout} className="text-rose-600 dark:text-rose-400 hover:bg-rose-500/10">
                <LogOut className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          ) : (
            <>
              <Link href="/login" className="hidden sm:inline-flex">
                <Button variant="ghost" size="sm">Login</Button>
              </Link>
              <Link href="/register" className="hidden sm:inline-flex">
                <Button variant="primary" size="sm">
                  <Terminal className="mr-1 h-3.5 w-3.5" />
                  Register
                </Button>
              </Link>
            </>
          )}

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
            aria-label="Toggle Mobile Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-4 space-y-2 overflow-hidden"
          >
            {mobileNavLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  pathname === link.href
                    ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-semibold"
                    : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
                }`}
              >
                {link.icon ? <link.icon className="h-4 w-4 text-cyan-600 dark:text-cyan-400" /> : null}
                {link.label}
              </Link>
            ))}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex gap-2">
              {isAuthenticated ? (
                <Button variant="ghost" size="sm" onClick={logout} className="w-full text-rose-500">
                  <LogOut className="mr-1 h-4 w-4" />
                  Logout ({user?.email})
                </Button>
              ) : (
                <>
                  <Link href="/login" className="w-1/2" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full">Login</Button>
                  </Link>
                  <Link href="/register" className="w-1/2" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="primary" size="sm" className="w-full">Register</Button>
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
};
