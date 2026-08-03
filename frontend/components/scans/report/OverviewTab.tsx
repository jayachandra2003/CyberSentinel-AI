"use client";

import React from "react";
import {
  ShieldCheck,
  Activity,
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Check,
  Award,
  Layers,
  CheckCircle,
  Circle,
} from "lucide-react";
import { Scan, DnsScanResult, WhoisScanResult, SslScanResult, HeadersScanResult, CookieScanResult } from "@/services/api/scanService";
import { calculateSecurityMetrics } from "./reportUtils";
import { cn } from "@/lib/utils";

interface OverviewTabProps {
  scan: Scan;
  dns?: DnsScanResult;
  whois?: WhoisScanResult;
  ssl?: SslScanResult;
  headersModule?: HeadersScanResult;
  cookiesModule?: CookieScanResult;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ scan, dns, whois, ssl, headersModule, cookiesModule }) => {
  const metrics = calculateSecurityMetrics(scan);
  const { score, riskLevel, modulesPassed, totalModules, findingsCount, duration } = metrics;

  // Extract DNS metrics
  const aRecords = dns?.results.A?.records ?? [];
  const aaaaRecords = dns?.results.AAAA?.records ?? [];
  const nsRecords = dns?.results.NS?.records ?? [];

  const hasA = Boolean(aRecords.length);
  const hasAAAA = Boolean(aaaaRecords.length);
  const hasNS = Boolean(nsRecords.length);

  // Extract WHOIS metrics
  const registrar = whois?.registrar || "Unlisted";
  const daysExpiry = whois?.days_until_expiration !== null && whois?.days_until_expiration !== undefined
    ? `${whois.days_until_expiration} Days`
    : "Unknown";

  // Pipeline modules timeline definition
  const pipelineModules = [
    { name: "DNS", status: dns ? "completed" : "pending" },
    { name: "WHOIS", status: whois ? "completed" : "pending" },
    { name: "SSL/TLS", status: ssl ? "completed" : "pending" },
    { name: "Headers", status: headersModule ? "completed" : "pending" },
    { name: "Cookies", status: cookiesModule ? "completed" : "pending" },
    { name: "Technologies", status: "pending" },
    { name: "Sitemap", status: "pending" },
    { name: "Robots", status: "pending" },
    { name: "AI Summary", status: "pending" },
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

  // Compact compliance audit checks
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

  return (
    <div className="space-y-4 py-1">
      {/* Subtle KPI Cards */}
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
          subtext="Active Scanner Suite"
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

      {/* Grid: Left Pipeline Status & Right Checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pipeline Execution Tracker */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-cyan-400" />
              <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white">
                Pipeline Execution Status
              </h3>
            </div>
            <span className="text-[12px] font-mono text-slate-400">
              {modulesPassed}/{totalModules} Active
            </span>
          </div>

          <div className="space-y-2">
            {pipelineModules.map((m, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-lg border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40 text-[14px]"
              >
                <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">
                  {m.name}
                </span>
                {m.status === "completed" ? (
                  <span className="flex items-center gap-1 text-[12px] text-emerald-500 dark:text-emerald-400 font-medium font-mono">
                    <CheckCircle className="h-3.5 w-3.5" /> Completed
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[12px] text-slate-400 font-mono">
                    <Circle className="h-3.5 w-3.5" /> Planned
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Technical Posture Checklist */}
        <div className="lg:col-span-2 p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              <h3 className="text-[16px] font-semibold text-slate-900 dark:text-white">
                Defensive Audit Verification Checklist
              </h3>
            </div>
            <span className="text-[12px] text-slate-400 font-normal">
              {checklistItems.filter((i) => i.status).length} / {checklistItems.length} Checks Passed
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {checklistItems.map((item, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40 flex items-start gap-2.5"
              >
                {item.status ? (
                  <Check className="h-4 w-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="space-y-0.5 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-mono px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                      {item.module}
                    </span>
                    <span className="text-[14px] font-semibold text-slate-900 dark:text-white truncate">
                      {item.label}
                    </span>
                  </div>
                  <p className="text-[13px] text-slate-500 dark:text-slate-400 font-normal truncate">
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

function OverviewMetricCard({
  label,
  value,
  subtext,
  icon,
  variant = "cyan",
}: {
  label: string;
  value: string;
  subtext: string;
  icon: React.ReactNode;
  variant?: "cyan" | "emerald" | "amber" | "rose" | "purple" | "blue";
}) {
  const variantStyles = {
    cyan: "border-cyan-500/20 bg-cyan-500/5 text-cyan-400",
    emerald: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400",
    amber: "border-amber-500/20 bg-amber-500/5 text-amber-400",
    rose: "border-rose-500/20 bg-rose-500/5 text-rose-400",
    purple: "border-purple-500/20 bg-purple-500/5 text-purple-400",
    blue: "border-blue-500/20 bg-blue-500/5 text-blue-400",
  };

  return (
    <div className={cn("p-3 rounded-xl border space-y-1.5", variantStyles[variant])}>
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-slate-500 dark:text-slate-400">{label}</span>
        {icon}
      </div>
      <div className="text-[28px] font-semibold font-mono leading-none tracking-tight">
        {value}
      </div>
      <div className="text-[12px] font-normal text-slate-500 dark:text-slate-400 truncate">
        {subtext}
      </div>
    </div>
  );
}
