"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Shield,
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Search,
  Server,
} from "lucide-react";
import { HeadersScanResult, HeaderAnalysisItem } from "@/services/api/scanService";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface HeadersTabProps {
  headers: HeadersScanResult;
}

export const HeadersTab: React.FC<HeadersTabProps> = ({ headers }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const analyzed = headers.analyzed_headers ?? [];
  const rawHeaders = headers.raw_headers ?? {};
  const observations = headers.security_observations ?? [];

  const getRiskBadge = (level: string) => {
    switch (level?.toUpperCase()) {
      case "CRITICAL":
        return <Badge variant="rose" className="text-[12px] font-medium px-2.5 py-0.5">Risk: Critical</Badge>;
      case "HIGH":
        return <Badge variant="amber" className="text-[12px] font-medium px-2.5 py-0.5">Risk: High</Badge>;
      case "MEDIUM":
        return <Badge variant="amber" className="text-[12px] font-medium px-2.5 py-0.5">Risk: Medium</Badge>;
      default:
        return <Badge variant="emerald" className="text-[12px] font-medium px-2.5 py-0.5">Risk: Low</Badge>;
    }
  };

  const getHeaderStatusBadge = (status: HeaderAnalysisItem["status"]) => {
    switch (status) {
      case "configured":
        return <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[12px] font-mono font-medium">Configured</span>;
      case "report_only":
        return <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[12px] font-mono font-medium">Report Only</span>;
      case "missing":
        return <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[12px] font-mono font-medium">Missing</span>;
      case "weak":
        return <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[12px] font-mono font-medium">Weak / Short</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[12px] font-mono font-medium">Info</span>;
    }
  };

  const handleCopyHeader = (key: string, value: string) => {
    navigator.clipboard.writeText(`${key}: ${value}`);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredRawHeaders = Object.entries(rawHeaders).filter(
    ([k, v]) =>
      k.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-4 py-1">
      {/* Top Banner KPI Card */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex-shrink-0">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[18px] font-bold font-mono text-slate-900 dark:text-white">
                HTTP Security Headers Posture
              </h3>
              {getRiskBadge(headers.risk_level)}
              {headers.status_code && (
                <Badge variant="cyan" className="text-[12px]">HTTP {headers.status_code}</Badge>
              )}
            </div>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">
              Target: <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">{headers.effective_url || headers.target}</span> • {headers.headers_count} Raw Headers Captured
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="p-2 px-3.5 rounded-lg border border-cyan-500/20 bg-cyan-500/5 text-right">
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Headers Risk Score</div>
            <div className="text-xl font-bold font-mono text-cyan-400 leading-none mt-0.5">
              {headers.risk_score} <span className="text-[12px] text-slate-500 font-normal">/ 100</span>
            </div>
          </div>
        </div>
      </div>

      {/* Evaluated Security Headers Audit Table */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
          <FileCheck className="h-4.5 w-4.5 text-cyan-400" />
          <h4 className="text-[16px] font-semibold text-slate-900 dark:text-white">
            Evaluated Defensive Headers ({analyzed.length})
          </h4>
        </div>

        <div className="space-y-2">
          {analyzed.map((item, idx) => (
            <div
              key={idx}
              className="p-3 rounded-lg border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40 space-y-1.5"
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold font-mono text-slate-900 dark:text-white">
                    {item.header_name}
                  </span>
                  {getHeaderStatusBadge(item.status)}
                </div>
                {item.header_value && (
                  <button
                    onClick={() => handleCopyHeader(item.header_name, item.header_value!)}
                    className="p-1 text-slate-400 hover:text-cyan-400 text-[12px] flex items-center gap-1 font-mono transition-colors"
                  >
                    {copiedKey === item.header_name ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                    {copiedKey === item.header_name ? "Copied" : "Copy"}
                  </button>
                )}
              </div>

              {item.header_value && (
                <div className="p-2 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[12px] font-mono text-cyan-600 dark:text-cyan-400 break-all">
                  {item.header_value}
                </div>
              )}

              <p className="text-[13px] text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Security Observations List */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
          <ShieldCheck className="h-4.5 w-4.5 text-emerald-400" />
          <h4 className="text-[16px] font-semibold text-slate-900 dark:text-white">
            Security Observations & Findings ({observations.length})
          </h4>
        </div>

        <div className="space-y-2">
          {observations.map((obs, idx) => (
            <div
              key={idx}
              className={cn(
                "p-3 rounded-lg border flex items-start gap-3",
                obs.severity === "CRITICAL" || obs.severity === "HIGH"
                  ? "border-rose-500/30 bg-rose-500/5 text-rose-300"
                  : obs.severity === "MEDIUM"
                  ? "border-amber-500/30 bg-amber-500/5 text-amber-300"
                  : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-slate-300"
              )}
            >
              {obs.severity === "CRITICAL" || obs.severity === "HIGH" ? (
                <ShieldAlert className="h-4.5 w-4.5 text-rose-400 flex-shrink-0 mt-0.5" />
              ) : obs.severity === "MEDIUM" ? (
                <AlertTriangle className="h-4.5 w-4.5 text-amber-400 flex-shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold text-slate-900 dark:text-white font-mono">
                    {obs.title}
                  </span>
                  <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    {obs.code}
                  </span>
                </div>
                <p className="text-[14px] text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
                  {obs.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Raw Response Headers Table */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Server className="h-4.5 w-4.5 text-purple-400" />
            <h4 className="text-[16px] font-semibold text-slate-900 dark:text-white">
              Raw HTTP Response Headers ({Object.keys(rawHeaders).length})
            </h4>
          </div>

          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search headers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="p-1.5 pl-8 text-[12px] font-mono rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white w-48 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto pr-1 scrollbar-thin border rounded-lg border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-[12px] font-mono border-collapse">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700">
                <th className="p-2.5 px-3 w-1/3">Header Name</th>
                <th className="p-2.5 px-3">Header Value</th>
                <th className="p-2.5 px-3 text-right w-16">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredRawHeaders.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-slate-400 font-normal">
                    No matching headers found.
                  </td>
                </tr>
              ) : (
                filteredRawHeaders.map(([k, v], idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-950/40 transition-colors">
                    <td className="p-2.5 px-3 font-semibold text-slate-900 dark:text-slate-200 break-all">{k}</td>
                    <td className="p-2.5 px-3 text-slate-600 dark:text-slate-300 break-all">{v}</td>
                    <td className="p-2.5 px-3 text-right">
                      <button
                        onClick={() => handleCopyHeader(k, v)}
                        className="p-1 text-slate-400 hover:text-cyan-400"
                        title="Copy header"
                      >
                        {copiedKey === k ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
