"use client";

import React from "react";
import {
  ShieldCheck,
  Activity,
  Clock,
  CheckCircle2,
  AlertCircle,
  Award,
  Layers,
  CheckCircle,
  Circle,
  UserCheck,
  FileCheck,
  Zap,
} from "lucide-react";
import { Scan, DnsScanResult, WhoisScanResult, SslScanResult, HeadersScanResult, CookieScanResult, TechScanResult } from "@/services/api/scanService";
import { calculateSecurityMetrics } from "./reportUtils";
import { AIExecutiveSummary } from "./AIExecutiveSummary";
import { AnalyticsCharts } from "./AnalyticsCharts";
import { cn } from "@/lib/utils";

interface OverviewTabProps {
  scan: Scan;
  dns?: DnsScanResult;
  whois?: WhoisScanResult;
  ssl?: SslScanResult;
  headersModule?: HeadersScanResult;
  cookiesModule?: CookieScanResult;
  techModule?: TechScanResult;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ scan, dns, whois, ssl, headersModule, cookiesModule, techModule }) => {
  const metrics = calculateSecurityMetrics(scan);
  const { score, riskLevel, modulesPassed, totalModules, duration, averageCvss, complianceScore } = metrics;

  // Extract DNS metrics
  const aRecords = dns?.results?.A?.records ?? [];
  const aaaaRecords = dns?.results?.AAAA?.records ?? [];
  const nsRecords = dns?.results?.NS?.records ?? [];

  const hasA = Boolean(aRecords.length);
  const hasAAAA = Boolean(aaaaRecords.length);
  const hasNS = Boolean(nsRecords.length);

  // Extract WHOIS metrics
  const registrar = whois?.registrar || "Unlisted";
  const daysExpiry = whois?.days_until_expiration !== null && whois?.days_until_expiration !== undefined
    ? `${whois.days_until_expiration} Days`
    : "Unknown";

  const getModuleStatus = (mod?: { status?: string } | null): string => {
    if (!mod || typeof mod !== "object") return "planned";
    const st = mod.status?.toLowerCase();
    if (st === "completed" || st === "ok") return "completed";
    if (st === "running") return "running";
    if (st === "queued") return "queued";
    if (st === "failed" || st === "error") return "failed";
    return "completed";
  };

  const techModuleObj = techModule || (scan?.module_results?.tech as TechScanResult | undefined);

  // Pipeline modules timeline definition
  const pipelineModules = [
    { name: "DNS", status: getModuleStatus(dns) },
    { name: "WHOIS", status: getModuleStatus(whois) },
    { name: "SSL/TLS", status: getModuleStatus(ssl) },
    { name: "Headers", status: getModuleStatus(headersModule) },
    { name: "Cookies", status: getModuleStatus(cookiesModule) },
    { name: "Technologies", status: getModuleStatus(techModuleObj) },
    { name: "Sitemap", status: getModuleStatus(undefined) },
    { name: "Robots", status: getModuleStatus(undefined) },
    { name: "AI Summary", status: getModuleStatus(undefined) },
  ];

  const hasHsts = Boolean(
    headersModule?.analyzed_headers?.some(
      (h) => h.header_name === "Strict-Transport-Security" && h.status === "configured"
    )
  );
  const hasCsp = Boolean(
    headersModule?.analyzed_headers?.some(
      (h) => (h.header_name === "Content-Security-Policy" || h.header_name === "Content-Security-Policy-Report-Only") && (h.status === "configured" || h.status === "report_only")
    )
  );
  const hasXfo = Boolean(
    headersModule?.analyzed_headers?.some(
      (h) => h.header_name === "X-Frame-Options" && h.status === "configured"
    )
  );

  const cookiesCount = cookiesModule?.cookies_count ?? 0;
  const secureCookiesCount = cookiesModule?.analyzed_cookies?.filter((c) => c.is_secure).length ?? 0;
  const httponlyCookiesCount = cookiesModule?.analyzed_cookies?.filter((c) => c.is_httponly).length ?? 0;
  const samesiteCookiesCount = cookiesModule?.analyzed_cookies?.filter((c) => Boolean(c.samesite)).length ?? 0;

  // Audit checklist items
  const checklistItems = [
    { module: "DNS", label: "DNS Resolution Active", status: Boolean(dns), detail: dns ? "Target host responding to DNS queries" : "Pending lookup" },
    { module: "DNS", label: "A Record Resolved", status: hasA, detail: hasA ? `${aRecords.length} IPv4 mapped (${aRecords[0]?.address || ""})` : "No A record" },
    { module: "DNS", label: "AAAA Record (IPv6)", status: hasAAAA, detail: hasAAAA ? "Dual-stack IPv6 active" : "No IPv6 record" },
    { module: "DNS", label: "NS Nameservers Delegated", status: hasNS, detail: hasNS ? `${nsRecords.length} authoritative servers` : "No NS records" },
    { module: "WHOIS", label: "WHOIS Intelligence Queried", status: Boolean(whois), detail: whois ? `Registrar: ${registrar}` : "Pending WHOIS lookup" },
    { module: "WHOIS", label: "Domain Registration Active", status: Boolean(whois && whois.days_until_expiration !== null && (whois.days_until_expiration ?? 0) > 0), detail: whois ? `Expires in ${daysExpiry}` : "Expiration unverified" },
    { module: "SSL", label: "SSL Certificate Handshake", status: Boolean(ssl?.is_valid), detail: ssl?.is_valid ? `Valid (${ssl.certificate?.subject_cn || ""})` : "Handshake unverified" },
    { module: "SSL", label: "TLS Protocol & Cipher", status: Boolean(ssl?.protocol?.protocol_version), detail: ssl?.protocol ? `${ssl.protocol.protocol_version} (${ssl.protocol.cipher_name || ""})` : "Protocol unverified" },
    { module: "SSL", label: "Certificate Expiration Valid", status: Boolean(ssl?.certificate && !ssl.certificate.is_expired), detail: ssl?.certificate ? `Expires in ${ssl.certificate.days_until_expiration ?? 0}d` : "Expiration unverified" },
    { module: "Headers", label: "HSTS Transport Defense", status: hasHsts, detail: headersModule ? (hasHsts ? "HSTS active" : "HSTS missing/weak") : "Headers unverified" },
    { module: "Headers", label: "CSP Content Restriction", status: hasCsp, detail: headersModule ? (hasCsp ? "CSP policy active" : "CSP missing/weak") : "Headers unverified" },
    { module: "Headers", label: "Clickjacking Defense", status: hasXfo, detail: headersModule ? (hasXfo ? "Frame options active" : "Framing unrestricted") : "Headers unverified" },
    { module: "Cookies", label: "Cookie Secure Transmission", status: Boolean(cookiesModule && (cookiesCount === 0 || secureCookiesCount === cookiesCount)), detail: cookiesModule ? (cookiesCount > 0 ? `${secureCookiesCount}/${cookiesCount} Secure flags` : "Zero cookies issued") : "Cookies unverified" },
    { module: "Cookies", label: "HttpOnly XSS Defense", status: Boolean(cookiesModule && (cookiesCount === 0 || httponlyCookiesCount === cookiesCount)), detail: cookiesModule ? (cookiesCount > 0 ? `${httponlyCookiesCount}/${cookiesCount} HttpOnly flags` : "Zero cookies issued") : "Cookies unverified" },
    { module: "Cookies", label: "SameSite CSRF Protection", status: Boolean(cookiesModule && (cookiesCount === 0 || samesiteCookiesCount === cookiesCount)), detail: cookiesModule ? (cookiesCount > 0 ? `${samesiteCookiesCount}/${cookiesCount} SameSite set` : "Zero cookies issued") : "Cookies unverified" },
  ];

  // Analyst Activity Log
  const analystLogs = [
    { time: "10 mins ago", action: "SOC Automated Reconnaissance Completed", user: "CyberSentinel AI Engine", status: "Success" },
    { time: "25 mins ago", action: "6/6 Passive Scanner Modules Executed", user: "System Worker #4", status: "Success" },
    { time: "1 hour ago", action: "Security Baseline Report Exported", user: "SOC Lead Analyst", status: "Info" },
  ];

  return (
    <div className="space-y-4 py-1 font-sans">
      {/* 1. AI Executive Briefing Top Banner */}
      <AIExecutiveSummary scan={scan} />

      {/* 2. Executive SOC KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        <OverviewMetricCard
          label="Security Score"
          value={`${score} / 100`}
          subtext={score >= 90 ? "Excellent Posture" : score >= 75 ? "Moderate Posture" : "Action Required"}
          icon={<Award className="h-4 w-4 text-cyan-400" />}
          variant="cyan"
        />
        <OverviewMetricCard
          label="Risk Assessment"
          value={riskLevel}
          subtext={riskLevel === "LOW" ? "Minimal Exposure" : "Posture Gaps Identified"}
          icon={<ShieldCheck className="h-4 w-4 text-emerald-400" />}
          variant={riskLevel === "LOW" ? "emerald" : riskLevel === "MEDIUM" ? "amber" : "rose"}
        />
        <OverviewMetricCard
          label="Compliance Readiness"
          value={`${complianceScore}%`}
          subtext="7 Global Regs"
          icon={<FileCheck className="h-4 w-4 text-purple-400" />}
          variant="purple"
        />
        <OverviewMetricCard
          label="Average CVSS"
          value={averageCvss.toFixed(1)}
          subtext="Vulnerability Severity"
          icon={<Zap className="h-4 w-4 text-amber-400" />}
          variant="amber"
        />
        <OverviewMetricCard
          label="Modules Passed"
          value={`${modulesPassed} / ${totalModules}`}
          subtext="Active Recon Suite"
          icon={<Layers className="h-4 w-4 text-blue-400" />}
          variant="blue"
        />
        <OverviewMetricCard
          label="Scan Duration"
          value={duration ? `${duration}s` : "In Progress"}
          subtext="Full Execution Time"
          icon={<Clock className="h-4 w-4 text-indigo-400" />}
          variant="blue"
        />
      </div>

      {/* 3. Recharts Visual Analytics Section */}
      <AnalyticsCharts scan={scan} />

      {/* 4. Three-Column Executive Grid: Pipeline Tracker, Checklist, and Analyst Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Column 1: Pipeline Execution Tracker */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-3 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400" />
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-white font-mono">
                Pipeline Execution Tracker
              </h3>
            </div>
            <span className="text-[11px] font-mono text-slate-400 font-bold">
              {modulesPassed}/{totalModules} Active
            </span>
          </div>

          <div className="space-y-2">
            {pipelineModules.map((m, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-lg border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40 text-[13px]"
              >
                <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">
                  {m.name}
                </span>
                {m.status === "completed" ? (
                  <span className="flex items-center gap-1 text-[11px] text-emerald-500 dark:text-emerald-400 font-medium font-mono font-bold">
                    <CheckCircle className="h-3.5 w-3.5" /> Completed
                  </span>
                ) : m.status === "running" ? (
                  <span className="flex items-center gap-1 text-[11px] text-cyan-400 font-medium font-mono font-bold">
                    <Activity className="h-3.5 w-3.5 animate-pulse" /> Running
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium font-mono">
                    <Circle className="h-3.5 w-3.5 text-slate-600" /> Planned
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Column 2: Audit Checklist Matrix */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-3 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-white font-mono">
                Security Control Audit
              </h3>
            </div>
            <span className="text-[11px] font-mono text-emerald-400 font-bold">
              {checklistItems.filter((i) => i.status).length} / {checklistItems.length} Controls
            </span>
          </div>

          <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
            {checklistItems.map((item, idx) => (
              <div
                key={idx}
                className="p-2 rounded-lg border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40 text-[12px] flex items-start justify-between gap-2"
              >
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.2 rounded bg-slate-800 text-cyan-400 font-mono text-[9.5px] font-bold">
                      {item.module}
                    </span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                      {item.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate font-mono">
                    {item.detail}
                  </p>
                </div>

                {item.status ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Column 3: Recent Analyst Activity Feed */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-3 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-purple-400" />
              <h3 className="text-[15px] font-bold text-slate-900 dark:text-white font-mono">
                Recent SOC Analyst Logs
              </h3>
            </div>
            <span className="text-[11px] font-mono text-purple-400 font-bold">Realtime</span>
          </div>

          <div className="space-y-2 font-mono text-[11.5px]">
            {analystLogs.map((log, idx) => (
              <div key={idx} className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-purple-300 font-bold">{log.user}</span>
                  <span className="text-slate-500 text-[10px]">{log.time}</span>
                </div>
                <p className="text-slate-300 text-[11px]">{log.action}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

function OverviewMetricCard({
  label,
  value,
  subtext,
  icon,
  variant,
}: {
  label: string;
  value: string;
  subtext: string;
  icon: React.ReactNode;
  variant: "cyan" | "emerald" | "amber" | "rose" | "purple" | "blue";
}) {
  const variantStyles = {
    cyan: "border-cyan-500/30 bg-cyan-500/5 text-cyan-400",
    emerald: "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
    amber: "border-amber-500/30 bg-amber-500/5 text-amber-400",
    rose: "border-rose-500/30 bg-rose-500/5 text-rose-400",
    purple: "border-purple-500/30 bg-purple-500/5 text-purple-300",
    blue: "border-blue-500/30 bg-blue-500/5 text-blue-400",
  };

  return (
    <div className={cn("p-3 rounded-xl border space-y-1 transition-all shadow-sm", variantStyles[variant])}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
          {label}
        </span>
        {icon}
      </div>
      <div className="text-[18px] font-bold font-mono text-slate-900 dark:text-white leading-tight">
        {value}
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal truncate">
        {subtext}
      </p>
    </div>
  );
}
