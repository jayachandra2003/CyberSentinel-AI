"use client";

import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { 
  ShieldCheck, 
  Terminal, 
  Cpu, 
  Lock, 
  CheckCircle, 
  Server, 
  Activity, 
  ArrowRight,
  Shield,
  Layers,
  FileCheck
} from "lucide-react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: "easeOut" },
  },
};

const stats = [
  { label: "Authorized Scope Enforced", value: "100%", sub: "Strict Verification" },
  { label: "Defensive Modules", value: "9+", sub: "Abstract Interfaces" },
  { label: "Pipeline Uptime SLA", value: "99.9%", sub: "Celery & Redis Worker" },
  { label: "Exploit Risk Payload", value: "0.0%", sub: "Ethical Standard" },
];

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-cyber-dark text-slate-900 dark:text-slate-100 transition-colors selection:bg-cyan-500 selection:text-white">
      <Navbar />

      <main className="flex-1 overflow-hidden">
        {/* Hero Section with Ambient Lights & Motion */}
        <section className="relative py-24 md:py-32 border-b border-slate-200 dark:border-slate-800 bg-cyber-grid">
          {/* Ambient Glow Orbs */}
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-500/10 dark:bg-cyan-500/15 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute top-1/3 left-1/4 w-[300px] h-[200px] bg-purple-500/10 blur-[100px] rounded-full pointer-events-none" />

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="relative z-10 mx-auto max-w-7xl px-4 text-center"
          >
            <motion.div variants={itemVariants} className="inline-block">
              <Badge variant="cyan" className="mb-8 py-1.5 px-4 text-xs font-semibold tracking-wide">
                <ShieldCheck className="mr-1.5 h-4 w-4" />
                Strictly Authorized Defensive Assessment Architecture
              </Badge>
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-5xl mx-auto leading-[1.1]"
            >
              AI-Powered Defensive{" "}
              <span className="bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 dark:from-cyan-400 dark:via-blue-500 dark:to-purple-500 bg-clip-text text-transparent">
                Cybersecurity Platform
              </span>
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed"
            >
              Automated defensive security posture evaluation, compliance checking, and vulnerability reporting designed exclusively for websites you own or hold explicit authorization to assess.
            </motion.p>

            <motion.div variants={itemVariants} className="mt-10 flex flex-wrap justify-center gap-4">
              <Link href="/register">
                <Button size="lg" variant="primary">
                  <Terminal className="h-5 w-5" />
                  Launch Sentinel Environment
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
              <Link href="/docs">
                <Button size="lg" variant="outline">
                  <Cpu className="h-5 w-5" />
                  View Architecture Specs
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* High Impact Stat Counters Grid */}
        <section className="py-12 border-b border-slate-200 dark:border-slate-800/80 bg-white/50 dark:bg-slate-950/40 backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="text-center p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/60 bg-white/40 dark:bg-slate-900/40"
              >
                <div className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">{stat.value}</div>
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300 mt-1">{stat.label}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{stat.sub}</div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section className="py-24 bg-slate-100/60 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800">
          <div className="mx-auto max-w-7xl px-4">
            <div className="text-center mb-16 space-y-3">
              <Badge variant="purple">Modular Design</Badge>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Enterprise Defensive Capabilities
              </h2>
              <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto text-sm sm:text-base">
                Architected with Clean Architecture principles, Repository pattern data access, and Celery asynchronous task distribution.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <Card glow className="space-y-4">
                <div className="p-3 bg-cyan-500/10 rounded-xl w-fit text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                  <Lock className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Scope & Target Authorization</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Mandatory DNS TXT & meta-tag token verification ensures defensive assessment occurs strictly on authorized web assets.
                </p>
                <Badge variant="cyan">Ownership Enforced</Badge>
              </Card>

              <Card glow className="space-y-4">
                <div className="p-3 bg-purple-500/10 rounded-xl w-fit text-purple-600 dark:text-purple-400 border border-purple-500/20">
                  <Server className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Modular Scanner Engine</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Decoupled interface abstraction for SSL certificates, HTTP Security Headers, Cookies, DNS, and Technology Fingerprinting.
                </p>
                <Badge variant="emerald">Clean Architecture</Badge>
              </Card>

              <Card glow className="space-y-4">
                <div className="p-3 bg-blue-500/10 rounded-xl w-fit text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  <Activity className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Immutable Audit Trail</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Granular audit logs record every platform interaction, scan request, and security configuration event into an immutable store.
                </p>
                <Badge variant="amber">Compliance Logging</Badge>
              </Card>
            </div>
          </div>
        </section>

        {/* Ethical Cyber Mandate Banner */}
        <section className="py-20 bg-slate-200/50 dark:bg-slate-900/50 transition-colors relative overflow-hidden">
          <div className="mx-auto max-w-5xl px-4 text-center space-y-6 relative z-10">
            <div className="inline-flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold text-base bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/20">
              <CheckCircle className="h-5 w-5" />
              <span>Ethical Cybersecurity Guarantee</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              Zero Exploits. 100% Defensive Security Posture.
            </h3>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
              CyberSentinel AI contains zero exploit payloads, port crawlers, WHOIS harvesters, or brute-force engines. It functions exclusively as a defensive security posture validator.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
