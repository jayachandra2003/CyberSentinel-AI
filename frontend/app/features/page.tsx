"use client";

import React from "react";
import { motion } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Shield, Lock, FileCode, Users, Layers, Activity } from "lucide-react";

export default function FeaturesPage() {
  const features = [
    {
      icon: Lock,
      title: "Domain Target Ownership Verification",
      desc: "Requires DNS TXT record or token meta-tag verification prior to running any defensive security checks.",
      badge: "Compliance",
      variant: "cyan" as const,
    },
    {
      icon: Layers,
      title: "Modular Scanner Architecture",
      desc: "Structured engine with interface contracts for SSL, HTTP Security Headers, Cookies, and DNS configuration.",
      badge: "Architecture",
      variant: "emerald" as const,
    },
    {
      icon: Activity,
      title: "Celery & Redis Asynchronous Queue",
      desc: "Distributed background task queue for non-blocking assessment execution and report generation.",
      badge: "Infrastructure",
      variant: "amber" as const,
    },
    {
      icon: Users,
      title: "Granular RBAC Security Model",
      desc: "Role-based access control supporting SuperAdmin, Admin, Analyst, Auditor, and User permissions.",
      badge: "Security",
      variant: "purple" as const,
    },
    {
      icon: FileCode,
      title: "Standardized API & JSON Envelopes",
      desc: "FastAPI REST Gateway with OpenAPI specs, versioning, and unified error response structures.",
      badge: "API Gateway",
      variant: "rose" as const,
    },
    {
      icon: Shield,
      title: "Immutable System Audit Logs",
      desc: "Complete event tracing logging user activity, authentication events, and scan requests.",
      badge: "Auditability",
      variant: "cyan" as const,
    },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-cyber-dark text-slate-900 dark:text-slate-100 transition-colors">
      <Navbar />
      <main className="flex-1 py-16 px-4 mx-auto max-w-7xl space-y-12">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <Badge variant="purple">Full Feature Matrix</Badge>
          <h1 className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">Platform Capabilities</h1>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Explore the defensive architectural capabilities of CyberSentinel AI.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <Card key={idx} glow className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                    <Icon className="h-6 w-6" />
                  </div>
                  <Badge variant={feat.variant}>{feat.badge}</Badge>
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{feat.title}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{feat.desc}</p>
              </Card>
            );
          })}
        </div>
      </main>
      <Footer />
    </div>
  );
}
