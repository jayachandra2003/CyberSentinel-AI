"use client";

import React, { useState } from "react";
import {
  Cookie,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  Search,
  FileCheck,
  ChevronDown,
  ChevronUp,
  Info,
} from "lucide-react";
import { CookieScanResult, CookieAnalysisItem } from "@/services/api/scanService";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface CookiesTabProps {
  cookies: CookieScanResult;
}

export const CookiesTab: React.FC<CookiesTabProps> = ({ cookies }) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  const analyzed = cookies.analyzed_cookies ?? [];
  const observations = cookies.security_observations ?? [];
  const breakdown = cookies.score_breakdown ?? [];

  // Group cookies by name
  const groupedCookiesMap = new Map<string, CookieAnalysisItem[]>();
  analyzed.forEach((item) => {
    const list = groupedCookiesMap.get(item.name) || [];
    list.push(item);
    groupedCookiesMap.set(item.name, list);
  });

  const groupedCookies = Array.from(groupedCookiesMap.entries()).map(([name, list]) => ({
    name,
    count: list.length,
    primaryItem: list[0],
    allInstances: list,
  }));

  // Calculated metrics
  const totalCookies = cookies.cookies_count;
  const secureCount = analyzed.filter((c) => c.is_secure).length;
  const httponlyCount = analyzed.filter((c) => c.is_httponly).length;
  const samesiteCount = analyzed.filter((c) => Boolean(c.samesite)).length;
  
  const highCritCount = observations.filter(
    (o) => o.severity === "CRITICAL" || o.severity === "HIGH"
  ).length;

  let highestSeverity = "LOW";
  if (observations.some((o) => o.severity === "CRITICAL")) highestSeverity = "CRITICAL";
  else if (observations.some((o) => o.severity === "HIGH")) highestSeverity = "HIGH";
  else if (observations.some((o) => o.severity === "MEDIUM")) highestSeverity = "MEDIUM";

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

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "auth":
        return <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[11px] font-mono font-medium">Auth</span>;
      case "session":
        return <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[11px] font-mono font-medium">Session</span>;
      case "analytics":
        return <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 text-[11px] font-mono font-medium">Analytics</span>;
      case "tracking":
        return <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[11px] font-mono font-medium">Tracking</span>;
      case "functional":
        return <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono font-medium">Functional</span>;
      default:
        return <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[11px] font-mono font-medium">Unknown</span>;
    }
  };

  const handleCopyCookie = (name: string, val: string) => {
    navigator.clipboard.writeText(`${name}=${val}`);
    setCopiedKey(name);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const filteredGroupedCookies = groupedCookies.filter(({ name, primaryItem }) => {
    const matchesSearch =
      name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (primaryItem.value && primaryItem.value.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (primaryItem.domain && primaryItem.domain.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === "ALL" || primaryItem.category.toUpperCase() === selectedCategory.toUpperCase();

    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-4 py-1">
      {/* Top Banner & 7-Metric KPI Card */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex-shrink-0">
              <Cookie className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-[18px] font-bold font-mono text-slate-900 dark:text-white">
                  Cookie Security Audit Console
                </h3>
                {getRiskBadge(cookies.risk_level)}
              </div>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">
                Target: <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">{cookies.effective_url || cookies.target}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="p-2 px-3 rounded-lg border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 transition-colors flex items-center gap-2 text-right"
            >
              <div>
                <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider flex items-center gap-1 justify-end">
                  Risk Score {showBreakdown ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </div>
                <div className="text-xl font-bold font-mono text-purple-400 leading-none mt-0.5">
                  {cookies.risk_score} <span className="text-[12px] text-slate-500 font-normal">/ 100</span>
                </div>
                <div className="text-[10px] text-emerald-500 font-medium mt-0.5">
                  {cookies.cookies_count === 0 ? "No Cookie Risk Detected" : "Lower Score = Lower Risk"}
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* 7 Metric Summary Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800/80 text-[12px] font-mono">
          <div className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/40">
            <div className="text-[10px] text-slate-400 font-medium uppercase">Total Cookies</div>
            <div className="text-base font-bold text-slate-900 dark:text-white mt-0.5">{totalCookies}</div>
          </div>

          <div className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/40">
            <div className="text-[10px] text-slate-400 font-medium uppercase">Secure</div>
            <div className="text-base font-bold text-emerald-400 mt-0.5">{secureCount} / {totalCookies}</div>
          </div>

          <div className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/40">
            <div className="text-[10px] text-slate-400 font-medium uppercase">HttpOnly</div>
            <div className="text-base font-bold text-emerald-400 mt-0.5">{httponlyCount} / {totalCookies}</div>
          </div>

          <div className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/40">
            <div className="text-[10px] text-slate-400 font-medium uppercase">SameSite</div>
            <div className="text-base font-bold text-cyan-400 mt-0.5">{samesiteCount} / {totalCookies}</div>
          </div>

          <div className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/40">
            <div className="text-[10px] text-slate-400 font-medium uppercase">High / Crit</div>
            <div className="text-base font-bold text-rose-400 mt-0.5">{highCritCount}</div>
          </div>

          <div className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/40">
            <div className="text-[10px] text-slate-400 font-medium uppercase">Max Severity</div>
            <div className="text-base font-bold text-amber-400 mt-0.5">{highestSeverity}</div>
          </div>

          <div className="p-2 rounded-lg border border-purple-500/20 bg-purple-500/5">
            <div className="text-[10px] text-slate-400 font-medium uppercase">Posture</div>
            <div className="text-base font-bold text-purple-400 mt-0.5">
              {cookies.risk_score < 20 ? "Low Risk" : cookies.risk_score < 50 ? "Moderate" : "High Risk"}
            </div>
          </div>
        </div>

        {/* Score Breakdown Accordion */}
        {showBreakdown && (
          <div className="p-3 rounded-lg border border-purple-500/20 bg-purple-500/5 space-y-2 text-[12px] font-mono">
            <div className="flex items-center justify-between font-semibold text-purple-300">
              <span className="flex items-center gap-1.5">
                <Info className="h-3.5 w-3.5" /> Risk Score Calculation Breakdown
              </span>
              <span>Total Points: +{cookies.risk_score}</span>
            </div>
            {breakdown.length === 0 ? (
              <p className="text-slate-400 font-normal">Zero score deductions applied. Excellent cookie posture!</p>
            ) : (
              <div className="space-y-1 pt-1 divide-y divide-purple-500/10">
                {breakdown.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between pt-1 text-slate-300">
                    <span className="truncate max-w-md">{item.label}</span>
                    <span className="font-bold text-amber-400 flex-shrink-0">+{item.points} pts</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cookie Grouped Inventory Table */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <FileCheck className="h-4.5 w-4.5 text-purple-400" />
            <h4 className="text-[16px] font-semibold text-slate-900 dark:text-white">
              Issued Cookie Inventory ({groupedCookies.length} Unique / {totalCookies} Total)
            </h4>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Filter Dropdown */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="p-1.5 text-[12px] font-mono rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">All Tiers</option>
                <option value="AUTH">Authentication</option>
                <option value="SESSION">Session & CSRF</option>
                <option value="ANALYTICS">Analytics</option>
                <option value="TRACKING">Tracking</option>
                <option value="FUNCTIONAL">Functional</option>
              </select>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Filter cookies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="p-1.5 pl-8 text-[12px] font-mono rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white w-44 focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        </div>

        {filteredGroupedCookies.length === 0 ? (
          <div className="p-6 text-center text-slate-400 font-mono text-[13px]">
            No response cookies match current filter criteria.
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredGroupedCookies.map(({ name, count, primaryItem, allInstances }, idx) => {
              const isExpanded = expandedGroup === name;
              return (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[15px] font-semibold font-mono text-slate-900 dark:text-white">
                        {name}
                      </span>
                      {count > 1 && (
                        <span className="px-1.5 py-0.2 rounded-full bg-purple-500/20 text-purple-300 font-mono text-[11px] font-bold">
                          ({count})
                        </span>
                      )}
                      {getCategoryBadge(primaryItem.category)}

                      {/* Improved Key-Value Status Badges */}
                      {primaryItem.is_secure ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono font-medium">Secure: Configured</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[11px] font-mono font-medium">Secure: Missing</span>
                      )}

                      {primaryItem.is_httponly ? (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-mono font-medium">HttpOnly: Configured</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/30 text-[11px] font-mono font-medium">HttpOnly: Missing</span>
                      )}

                      {primaryItem.samesite ? (
                        <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 text-[11px] font-mono font-medium">SameSite: {primaryItem.samesite}</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[11px] font-mono font-medium">SameSite: Missing</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {count > 1 && (
                        <button
                          onClick={() => setExpandedGroup(isExpanded ? null : name)}
                          className="p-1 px-2 text-slate-400 hover:text-purple-400 text-[12px] font-mono flex items-center gap-1"
                        >
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                          {isExpanded ? "Collapse" : "Instances"}
                        </button>
                      )}

                      {primaryItem.value && (
                        <button
                          onClick={() => handleCopyCookie(primaryItem.name, primaryItem.value!)}
                          className="p-1 text-slate-400 hover:text-purple-400 text-[12px] flex items-center gap-1 font-mono transition-colors"
                        >
                          {copiedKey === primaryItem.name ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                          {copiedKey === primaryItem.name ? "Copied" : "Copy"}
                        </button>
                      )}
                    </div>
                  </div>

                  {primaryItem.value && (
                    <div className="p-2 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[12px] font-mono text-purple-600 dark:text-purple-400 break-all">
                      {primaryItem.value}
                    </div>
                  )}

                  <div className="flex items-center gap-4 text-[12px] text-slate-500 dark:text-slate-400 font-mono flex-wrap">
                    <span>Domain: <strong className="text-slate-700 dark:text-slate-300">{primaryItem.domain || "Host-only"}</strong></span>
                    <span>Path: <strong className="text-slate-700 dark:text-slate-300">{primaryItem.path || "/"}</strong></span>
                    {primaryItem.max_age && <span>Max-Age: <strong className="text-slate-700 dark:text-slate-300">{primaryItem.max_age}s</strong></span>}
                  </div>

                  {/* Expandable Group Instances */}
                  {isExpanded && count > 1 && (
                    <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5 text-[11px] font-mono">
                      {allInstances.map((inst, i) => (
                        <div key={i} className="p-2 rounded bg-slate-100 dark:bg-slate-900 flex justify-between gap-2">
                          <span className="text-slate-300 truncate">Value: {inst.value}</span>
                          <span className="text-slate-400">Path: {inst.path}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="text-[13px] text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
                    {primaryItem.description}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Professional Nessus/Burp Style Security Findings */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
          <ShieldCheck className="h-4.5 w-4.5 text-emerald-400" />
          <h4 className="text-[16px] font-semibold text-slate-900 dark:text-white">
            Enterprise Security Findings ({observations.length})
          </h4>
        </div>

        <div className="space-y-2">
          {observations.map((obs, idx) => (
            <div
              key={idx}
              className={cn(
                "p-3.5 rounded-lg border flex items-start gap-3 transition-all",
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
              <div className="space-y-1 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-bold border border-slate-700">
                    {obs.code}
                  </span>
                  <span className="text-[15px] font-semibold text-slate-900 dark:text-white font-mono">
                    {obs.title}
                  </span>
                </div>
                <p className="text-[13px] text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
                  {obs.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
