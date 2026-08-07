"use client";

import React, { useState } from "react";
import {
  Layers,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Search,
  Info,
  Server,
  Code2,
  Globe,
} from "lucide-react";
import { TechScanResult, DetectedTechnology } from "@/services/api/scanService";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface TechTabProps {
  tech: TechScanResult;
}

export const TechTab: React.FC<TechTabProps> = ({ tech }) => {
  const [searchQuery, setSearchQuery] = useState("");

  const detected = tech.detected_technologies ?? [];
  const observations = tech.security_observations ?? [];

  const filteredTechs = detected.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.category_label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.version && t.version.toLowerCase().includes(searchQuery.toLowerCase())) ||
    t.evidence.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group detected technologies by category_label
  const categoryGroups = new Map<string, DetectedTechnology[]>();
  filteredTechs.forEach((item) => {
    const key = item.category_label || "Other";
    const list = categoryGroups.get(key) || [];
    list.push(item);
    categoryGroups.set(key, list);
  });

  const getCategoryIcon = (categoryLabel: string) => {
    const cat = categoryLabel.toLowerCase();
    if (cat.includes("server")) return <Server className="h-4 w-4 text-cyan-400" />;
    if (cat.includes("framework") || cat.includes("library") || cat.includes("language"))
      return <Code2 className="h-4 w-4 text-purple-400" />;
    if (cat.includes("cms")) return <Layers className="h-4 w-4 text-emerald-400" />;
    if (cat.includes("cdn") || cat.includes("waf")) return <Globe className="h-4 w-4 text-amber-400" />;
    return <Cpu className="h-4 w-4 text-blue-400" />;
  };

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

  return (
    <div className="space-y-4 py-1">
      {/* Top Banner KPI Card */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex-shrink-0">
            <Cpu className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[18px] font-bold font-mono text-slate-900 dark:text-white">
                Technology Stack Intelligence
              </h3>
              {getRiskBadge(tech.risk_level)}
            </div>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">
              Target: <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">{tech.effective_url || tech.target}</span> • {tech.tech_count} Technologies Fingerprinted
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="p-2 px-3.5 rounded-lg border border-purple-500/20 bg-purple-500/5 text-right">
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Tech Risk Score</div>
            <div className="text-xl font-bold font-mono text-purple-400 leading-none mt-0.5">
              {tech.risk_score} <span className="text-[12px] text-slate-500 font-normal">/ 100</span>
            </div>
            <div className="text-[10px] text-slate-400 font-normal mt-0.5">Higher Score = Higher Risk</div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Layers className="h-4.5 w-4.5 text-purple-400" />
            <h4 className="text-[16px] font-semibold text-slate-900 dark:text-white">
              Identified Application Layers ({detected.length})
            </h4>
          </div>

          <div className="relative">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search technologies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="p-1.5 pl-8 text-[12px] font-mono rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white w-48 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Empty State vs Grouped Technology Cards */}
        {detected.length === 0 || filteredTechs.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 space-y-2">
            <Info className="h-8 w-8 text-slate-400 mx-auto" />
            <div className="text-[14px] font-mono font-medium text-slate-700 dark:text-slate-300">
              No technologies confidently identified for this target.
            </div>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 max-w-md mx-auto font-normal">
              Server banners, client scripts, and response headers appear well-hardened against passive signature fingerprinting.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {Array.from(categoryGroups.entries()).map(([categoryLabel, items], groupIdx) => (
              <div key={groupIdx} className="space-y-2.5">
                <div className="flex items-center gap-2 text-[14px] font-semibold font-mono text-purple-600 dark:text-purple-400">
                  {getCategoryIcon(categoryLabel)}
                  <span>{categoryLabel} ({items.length})</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {items.map((t, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-lg border border-slate-200 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 space-y-2 flex flex-col justify-between"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <span className="text-[15px] font-bold font-mono text-slate-900 dark:text-white">
                            {t.name}
                          </span>
                          {t.version ? (
                            <span className="px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30 text-[11px] font-mono font-medium">
                              v{t.version}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[11px] font-mono font-medium">
                              Version Unexposed
                            </span>
                          )}
                        </div>

                        <p className="text-[13px] text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
                          {t.description}
                        </p>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800/60 text-[12px] font-mono">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400 text-[11px]">Confidence Meter</span>
                          <span className="font-bold text-purple-400">{t.confidence}%</span>
                        </div>
                        <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-purple-500 to-cyan-400 h-1.5 rounded-full transition-all"
                            style={{ width: `${t.confidence}%` }}
                          />
                        </div>

                        <div className="p-2 rounded bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 truncate">
                          Evidence: <span className="text-slate-800 dark:text-slate-200 font-medium">{t.evidence}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security & Banner Observations */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
          <ShieldCheck className="h-4.5 w-4.5 text-emerald-400" />
          <h4 className="text-[16px] font-semibold text-slate-900 dark:text-white">
            Banner Disclosure & Hardening Observations ({observations.length})
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
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-purple-400 font-bold border border-slate-700">
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
