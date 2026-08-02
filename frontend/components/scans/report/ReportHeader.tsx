"use client";

import React from "react";
import { Globe, ShieldCheck, Database, AlertTriangle, Code2, Award, Cpu, Calendar, FileText, Lock, Shield } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Scan } from "@/services/api/scanService";
import { calculateSecurityMetrics } from "./reportUtils";
import { cn } from "@/lib/utils";

export type ReportTab = "overview" | "dns" | "whois" | "ssl" | "headers" | "security" | "json";

interface ReportHeaderProps {
  scan: Scan;
  activeTab: ReportTab;
  setActiveTab: (tab: ReportTab) => void;
  dnsRecordCount: number;
  whoisRecordCount?: number;
  sslObsCount?: number;
  headersObsCount?: number;
  securityObsCount: number;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  scan,
  activeTab,
  setActiveTab,
  dnsRecordCount,
  whoisRecordCount = 0,
  sslObsCount = 0,
  headersObsCount = 0,
  securityObsCount,
}) => {
  const metrics = calculateSecurityMetrics(scan);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
        return <Badge variant="emerald" className="text-[12px] font-medium px-2.5 py-0.5">Completed</Badge>;
      case "Running":
        return <Badge variant="cyan" className="text-[12px] font-medium px-2.5 py-0.5">Running ({scan.progress}%)</Badge>;
      case "Queued":
        return <Badge variant="amber" className="text-[12px] font-medium px-2.5 py-0.5">Queued</Badge>;
      case "Failed":
        return <Badge variant="rose" className="text-[12px] font-medium px-2.5 py-0.5">Failed</Badge>;
      default:
        return <Badge variant="purple" className="text-[12px] font-medium px-2.5 py-0.5">Pending</Badge>;
    }
  };

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "CRITICAL":
        return <span className="px-2.5 py-0.5 rounded-full border bg-rose-500/10 text-rose-400 border-rose-500/30 font-medium text-[12px]">Risk: Critical</span>;
      case "HIGH":
        return <span className="px-2.5 py-0.5 rounded-full border bg-orange-500/10 text-orange-400 border-orange-500/30 font-medium text-[12px]">Risk: High</span>;
      case "MEDIUM":
        return <span className="px-2.5 py-0.5 rounded-full border bg-amber-500/10 text-amber-400 border-amber-500/30 font-medium text-[12px]">Risk: Medium</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/30 font-medium text-[12px]">Risk: Low</span>;
    }
  };

  const generatedTime = scan.completed_at
    ? new Date(scan.completed_at).toISOString().replace("T", " ").substring(0, 19) + " UTC"
    : new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC";

  const tabs: { id: ReportTab; label: string; icon: React.ReactNode; badge?: number | string }[] = [
    { id: "overview", label: "Overview", icon: <ShieldCheck className="h-4 w-4" /> },
    { id: "dns", label: "DNS Records", icon: <Database className="h-4 w-4" />, badge: dnsRecordCount },
    { id: "whois", label: "WHOIS", icon: <FileText className="h-4 w-4" />, badge: whoisRecordCount },
    { id: "ssl", label: "SSL / TLS", icon: <Lock className="h-4 w-4" />, badge: sslObsCount },
    { id: "headers", label: "HTTP Headers", icon: <Shield className="h-4 w-4" />, badge: headersObsCount },
    { id: "security", label: "Security & Risk", icon: <AlertTriangle className="h-4 w-4" />, badge: securityObsCount },
    { id: "json", label: "Raw JSON", icon: <Code2 className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-3 flex-shrink-0">
      {/* Top Metadata Header */}
      <div className="p-3.5 px-4 rounded-xl border border-slate-200 dark:border-slate-800/80 bg-slate-50/80 dark:bg-slate-900/60 backdrop-blur-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Left: Target Domain & Metadata */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex-shrink-0">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-xl sm:text-2xl md:text-[28px] font-bold font-mono text-slate-900 dark:text-white tracking-tight leading-none">
                  {scan.target_domain}
                </h2>
                <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[12px] font-mono text-slate-600 dark:text-slate-300 font-medium">
                  ID #{scan.id}
                </span>
                {getStatusBadge(scan.status)}
                {getRiskBadge(metrics.riskLevel)}
              </div>

              {/* Metadata Row */}
              <div className="flex items-center gap-3 text-[13px] text-slate-500 dark:text-slate-400 font-normal mt-1 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-cyan-500" />
                  Engine: <span className="font-mono text-slate-700 dark:text-slate-300 font-normal">v1.2.0-defensive</span>
                </span>
                <span className="hidden sm:inline text-slate-400">•</span>
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-cyan-500" />
                  Generated: <span className="font-mono text-slate-700 dark:text-slate-300 font-normal">{generatedTime}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right: Security Score & Inline Stats */}
          <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
            <div className="p-2 px-3.5 rounded-xl border border-cyan-500/20 bg-cyan-500/5 flex items-center gap-3 flex-shrink-0">
              <Award className="h-6 w-6 text-cyan-400 flex-shrink-0" />
              <div>
                <div className="text-[12px] text-slate-400 font-medium uppercase tracking-wider">
                  Security Score
                </div>
                <div className="text-xl sm:text-2xl md:text-[28px] font-semibold font-mono text-cyan-400 leading-none mt-0.5">
                  {metrics.score} <span className="text-[13px] text-slate-500 font-normal">/ 100</span>
                </div>
              </div>
            </div>

            <div className="hidden sm:grid grid-cols-3 gap-2 text-[13px]">
              <div className="p-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/40">
                <div className="text-[11px] text-slate-400 font-medium">Scan Type</div>
                <div className="font-normal text-slate-900 dark:text-slate-200 truncate max-w-[85px]">
                  {scan.scan_type}
                </div>
              </div>

              <div className="p-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/40">
                <div className="text-[11px] text-slate-400 font-medium">Started</div>
                <div className="font-mono text-slate-900 dark:text-slate-200 text-[12px]">
                  {scan.started_at ? new Date(scan.started_at).toLocaleTimeString() : "N/A"}
                </div>
              </div>

              <div className="p-1.5 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/40">
                <div className="text-[11px] text-slate-400 font-medium">Completed</div>
                <div className="font-mono text-slate-900 dark:text-slate-200 text-[12px]">
                  {scan.completed_at ? new Date(scan.completed_at).toLocaleTimeString() : "N/A"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-none pb-px">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 text-[14px] font-medium transition-all whitespace-nowrap border-b-2 relative",
                isActive
                  ? "text-cyan-600 dark:text-cyan-400 border-cyan-500 font-semibold"
                  : "text-slate-600 dark:text-slate-400 border-transparent hover:text-slate-900 dark:hover:text-slate-200"
              )}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={cn(
                    "px-1.5 py-0.2 rounded-full text-[11px] font-mono ml-0.5",
                    isActive
                      ? "bg-cyan-500/20 text-cyan-400 font-semibold"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-normal"
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
