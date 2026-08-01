"use client";

import React from "react";
import {
  ShieldCheck,
  Activity,
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Shield,
  Check,
  Award,
  Layers,
  CheckCircle,
  Circle,
} from "lucide-react";
import { Scan, DnsScanResult } from "@/services/api/scanService";
import { calculateSecurityMetrics } from "./reportUtils";
import { cn } from "@/lib/utils";

interface OverviewTabProps {
  scan: Scan;
  dns?: DnsScanResult;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ scan, dns }) => {
  const metrics = calculateSecurityMetrics(scan);
  const { score, riskLevel, modulesPassed, totalModules, findingsCount, duration } = metrics;

  // Extract DNS metrics
  const recordsFound = dns?.total_records_found ?? 0;
  const aRecords = dns?.results.A?.records ?? [];
  const aaaaRecords = dns?.results.AAAA?.records ?? [];
  const nsRecords = dns?.results.NS?.records ?? [];
  const mxRecords = dns?.results.MX?.records ?? [];

  const hasA = Boolean(aRecords.length);
  const hasAAAA = Boolean(aaaaRecords.length);
  const hasNS = Boolean(nsRecords.length);

  // Check MX Null MX (RFC 7505)
  const isNullMX = mxRecords.some(
    (r) => r.preference === 0 && ((r.exchange as string) === "." || !(r.exchange as string)?.trim())
  );

  // Check SPF & DMARC from security observations
  const obsText = (dns?.security_observations ?? []).join(" ");
  const hasSpf = obsText.toLowerCase().includes("spf record found") || obsText.toLowerCase().includes("spf");
  const missingDmarc = obsText.toLowerCase().includes("dmarc");

  // Pipeline modules timeline definition (14-15px Sentence Case Chips)
  const pipelineModules = [
    { name: "DNS", status: "completed" },
    { name: "WHOIS", status: "pending" },
    { name: "SSL/TLS", status: "pending" },
    { name: "Headers", status: "pending" },
    { name: "Cookies", status: "pending" },
    { name: "Technologies", status: "pending" },
    { name: "Sitemap", status: "pending" },
    { name: "Robots", status: "pending" },
    { name: "AI Summary", status: "pending" },
  ];

  // Compact compliance audit checks (Sentence Case, 14-15px Text)
  const checklistItems = [
    { module: "DNS", label: "DNS Resolution Active", status: Boolean(dns), detail: dns ? "Target host responding to DNS queries" : "Pending lookup" },
    { module: "DNS", label: "A Record Resolved", status: hasA, detail: hasA ? `${aRecords.length} IPv4 mapped (${aRecords[0]?.address || ""})` : "No A record" },
    { module: "DNS", label: "AAAA Record (IPv6)", status: hasAAAA, detail: hasAAAA ? "Dual-stack IPv6 active" : "No IPv6 record" },
    { module: "DNS", label: "NS Nameservers Delegated", status: hasNS, detail: hasNS ? `${nsRecords.length} authoritative servers` : "No NS records" },
    { module: "DNS", label: "SPF Mail Policy Configured", status: hasSpf, detail: hasSpf ? "Sender policy framework detected" : "SPF check unverified" },
    { module: "DNS", label: "DMARC Policy Enforcement", status: !missingDmarc, detail: missingDmarc ? "DMARC record missing or unconfigured" : "DMARC record present" },
  ];

  return (
    <div className="space-y-4 py-1">
      {/* Subtle KPI Cards — 13px Labels & 28px Semibold Values */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <OverviewMetricCard
          label="Security Score"
          value={`${score} / 100`}
          subtext={score >= 90 ? "Excellent Posture" : score >= 75 ? "Moderate Posture" : "Action Required"}
          icon={<Award className="h-4 w-4 text-cyan-400" />}
          variant="cyan"
        />
        <OverviewMetricCard
          label="Risk Level"
          value={riskLevel}
          subtext={riskLevel === "LOW" ? "Minimal Exposure" : "Posture Gaps Identified"}
          icon={<ShieldCheck className="h-4 w-4 text-emerald-400" />}
          variant={riskLevel === "LOW" ? "emerald" : riskLevel === "MEDIUM" ? "amber" : "rose"}
        />
        <OverviewMetricCard
          label="Modules Passed"
          value={`${modulesPassed} / ${totalModules}`}
          subtext="DNS Assessment Module"
          icon={<Layers className="h-4 w-4 text-purple-400" />}
          variant="purple"
        />
        <OverviewMetricCard
          label="Security Findings"
          value={String(findingsCount.total)}
          subtext={`${findingsCount.critical + findingsCount.high} High/Crit · ${findingsCount.warning + findingsCount.medium} Warn`}
          icon={<AlertTriangle className="h-4 w-4 text-amber-400" />}
          variant={findingsCount.total > 0 ? "amber" : "emerald"}
        />
        <OverviewMetricCard
          label="Scan Duration"
          value={duration ? `${duration}s` : "In Progress"}
          subtext="Full Execution Time"
          icon={<Clock className="h-4 w-4 text-blue-400" />}
          variant="blue"
        />
      </div>

      {/* Scanner Engine Pipeline Bar — 18px Semibold Sentence Case Title & 14-15px Chips */}
      <div className="p-3 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[18px] font-semibold text-slate-900 dark:text-white">
            <Activity className="h-4.5 w-4.5 text-cyan-500" />
            <span>Scanner Engine Pipeline</span>
          </div>
          <span className="text-[13px] text-slate-500 font-normal">1 Completed · 8 Planned</span>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
          {pipelineModules.map((mod, idx) => (
            <div
              key={idx}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[14px] font-medium whitespace-nowrap transition-all",
                mod.status === "completed"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : "border-slate-200 dark:border-slate-800/80 bg-white/40 dark:bg-slate-950/40 text-slate-400 dark:text-slate-600 opacity-70"
              )}
            >
              {mod.status === "completed" ? (
                <CheckCircle className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-slate-400 dark:text-slate-600 flex-shrink-0" />
              )}
              <span>{mod.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Section: Executive Assessment & Compliance Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Left Column: Executive Assessment (18px Semibold Sentence Case Title) */}
        <div className="lg:col-span-5 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-[18px] font-semibold text-slate-900 dark:text-white">
              <Shield className="h-4.5 w-4.5 text-cyan-500" />
              <span>Executive Assessment</span>
            </div>

            <p className="text-[15px] font-normal text-slate-700 dark:text-slate-300 leading-relaxed">
              {scan.summary || "Defensive posture scan completed successfully. Core DNS security parameters verified."}
            </p>

            {/* Executive Data Table (14px Table Text) */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden divide-y divide-slate-200 dark:divide-slate-800 text-[14px] font-normal">
              <ExecutiveRow label="Target Host" value={scan.target_domain} highlight isMono />
              <ExecutiveRow label="Scan Duration" value={duration ? `${duration}s` : "In Progress"} />
              <ExecutiveRow label="Modules Executed" value={`${modulesPassed} / ${totalModules} (DNS)`} />
              <ExecutiveRow label="DNS Records Found" value={`${recordsFound} Records`} />
              <ExecutiveRow label="IPv4 (A Record)" value={hasA ? `${aRecords.length} Active` : "None"} />
              <ExecutiveRow label="IPv6 (AAAA)" value={hasAAAA ? `${aaaaRecords.length} Active` : "None"} />
              <ExecutiveRow label="Nameservers" value={hasNS ? `${nsRecords.length} Delegated` : "None"} />
              <ExecutiveRow label="MX Status" value={isNullMX ? "NULL MX (RFC 7505)" : hasA ? `${mxRecords.length} Active` : "None"} />
              <ExecutiveRow label="SPF Policy" value={hasSpf ? "Configured" : "Unverified"} badge={hasSpf ? "emerald" : "amber"} />
              <ExecutiveRow label="DMARC Policy" value={missingDmarc ? "Missing" : "Configured"} badge={missingDmarc ? "amber" : "emerald"} />
              <ExecutiveRow label="Overall Risk" value={riskLevel} badge={riskLevel === "LOW" ? "emerald" : "amber"} />
            </div>
          </div>
        </div>

        {/* Right Column: Compliance & Security Audit (18px Semibold Sentence Case Title) */}
        <div className="lg:col-span-7 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[18px] font-semibold text-slate-900 dark:text-white">
              <CheckCircle2 className="h-4.5 w-4.5 text-emerald-500" />
              <span>Compliance & Security Audit</span>
            </div>
            <span className="text-[13px] font-normal text-slate-500 dark:text-slate-400">
              6 Verification Checks
            </span>
          </div>

          {/* Compact Compliance Audit Grid (14-15px Text) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {checklistItems.map((item, idx) => (
              <div
                key={idx}
                className={cn(
                  "p-2 px-2.5 rounded-lg border text-[14px] font-normal flex items-start gap-2 transition-colors",
                  item.status
                    ? "border-emerald-500/20 bg-emerald-500/5 text-slate-900 dark:text-slate-200"
                    : "border-amber-500/25 bg-amber-500/5 text-slate-900 dark:text-slate-200"
                )}
              >
                {item.status ? (
                  <div className="p-0.5 rounded-full bg-emerald-500/10 text-emerald-400 mt-0.5 flex-shrink-0">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                ) : (
                  <div className="p-0.5 rounded-full bg-amber-500/10 text-amber-400 mt-0.5 flex-shrink-0">
                    <AlertCircle className="h-3.5 w-3.5" />
                  </div>
                )}
                <div className="min-w-0 flex-1 leading-snug">
                  <div className="font-medium flex items-center justify-between gap-1">
                    <span className="truncate">{item.label}</span>
                    <span className={cn("text-[11px] font-medium flex-shrink-0", item.status ? "text-emerald-400" : "text-amber-400")}>
                      {item.status ? "Passed" : "Flagged"}
                    </span>
                  </div>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400 truncate mt-0.5 font-normal">
                    {item.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

function ExecutiveRow({
  label,
  value,
  highlight,
  badge,
  isMono,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  badge?: "emerald" | "amber" | "rose";
  isMono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-2.5 py-1.5 bg-white/40 dark:bg-slate-950/20">
      <span className="text-slate-500 dark:text-slate-400 text-[13px] font-normal">{label}</span>
      <span
        className={cn(
          "text-[14px] font-medium",
          isMono && "font-mono",
          highlight ? "text-cyan-400" : "text-slate-900 dark:text-slate-200",
          badge === "emerald" && "text-emerald-400",
          badge === "amber" && "text-amber-400",
          badge === "rose" && "text-rose-400"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function OverviewMetricCard({
  label,
  value,
  subtext,
  icon,
  variant = "cyan",
}: {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ReactNode;
  variant?: "cyan" | "emerald" | "amber" | "rose" | "blue" | "purple";
}) {
  const colorMap = {
    cyan: "border-cyan-500/20 bg-cyan-500/5 text-cyan-400",
    emerald: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400",
    amber: "border-amber-500/20 bg-amber-500/5 text-amber-400",
    rose: "border-rose-500/20 bg-rose-500/5 text-rose-400",
    blue: "border-blue-500/20 bg-blue-500/5 text-blue-400",
    purple: "border-purple-500/20 bg-purple-500/5 text-purple-400",
  };

  return (
    <div className={cn("p-3 px-3.5 rounded-xl border space-y-1 transition-all flex flex-col justify-between h-full min-h-[85px]", colorMap[variant])}>
      <div className="flex items-center justify-between text-[13px] font-medium text-slate-500 dark:text-slate-400">
        <span className="truncate">{label}</span>
        {icon}
      </div>
      <div>
        {/* Primary Value 28px Semibold */}
        <div className="text-[28px] font-semibold font-mono tracking-tight text-slate-900 dark:text-white leading-tight">
          {value}
        </div>
        {subtext && <div className="text-[13px] font-normal text-slate-500 dark:text-slate-400 truncate mt-0.5">{subtext}</div>}
      </div>
    </div>
  );
}
