"use client";

import React, { useState } from "react";
import {
  AlertTriangle,
  ShieldX,
  ShieldCheck,
  Filter,
  Lightbulb,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { Scan } from "@/services/api/scanService";
import { extractReportFindings, FindingItem, SeverityLevel } from "./reportUtils";
import { cn } from "@/lib/utils";

interface SecurityTabProps {
  scan: Scan;
}

export const SecurityTab: React.FC<SecurityTabProps> = ({ scan }) => {
  const [filterSeverity, setFilterSeverity] = useState<string>("ALL");

  const findings: FindingItem[] = extractReportFindings(scan);

  const criticalCount = findings.filter((f) => f.severity === "CRITICAL").length;
  const highCount = findings.filter((f) => f.severity === "HIGH").length;
  const mediumCount = findings.filter((f) => f.severity === "MEDIUM").length;
  const warningCount = findings.filter((f) => f.severity === "WARNING").length;
  const infoCount = findings.filter((f) => f.severity === "INFO").length;

  const filteredFindings = findings.filter((f) => {
    if (filterSeverity === "ALL") return true;
    return f.severity === filterSeverity;
  });

  return (
    <div className="space-y-4 py-1">
      {/* Top Filter Bar — 18px Semibold Sentence Case Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center gap-2.5">
          <Filter className="h-4.5 w-4.5 text-cyan-400" />
          {/* Section Title 18px Semibold */}
          <span className="text-[18px] font-semibold text-slate-900 dark:text-white">
            Security & Risk Observations ({findings.length})
          </span>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <FilterPill
            label="All"
            count={findings.length}
            isActive={filterSeverity === "ALL"}
            onClick={() => setFilterSeverity("ALL")}
          />
          <FilterPill
            label="Critical"
            count={criticalCount}
            variant="rose"
            isActive={filterSeverity === "CRITICAL"}
            onClick={() => setFilterSeverity("CRITICAL")}
          />
          <FilterPill
            label="High"
            count={highCount}
            variant="orange"
            isActive={filterSeverity === "HIGH"}
            onClick={() => setFilterSeverity("HIGH")}
          />
          <FilterPill
            label="Medium"
            count={mediumCount}
            variant="amber"
            isActive={filterSeverity === "MEDIUM"}
            onClick={() => setFilterSeverity("MEDIUM")}
          />
          <FilterPill
            label="Warning"
            count={warningCount}
            variant="yellow"
            isActive={filterSeverity === "WARNING"}
            onClick={() => setFilterSeverity("WARNING")}
          />
          <FilterPill
            label="Info"
            count={infoCount}
            variant="emerald"
            isActive={filterSeverity === "INFO"}
            onClick={() => setFilterSeverity("INFO")}
          />
        </div>
      </div>

      {/* Findings Cards List */}
      {filteredFindings.length === 0 ? (
        <div className="p-8 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-2">
          <ShieldCheck className="h-8 w-8 text-emerald-400 mx-auto" />
          <h4 className="text-[16px] font-semibold text-slate-900 dark:text-white">
            No Security Observations Flagged
          </h4>
          <p className="text-[14px] text-slate-500 dark:text-slate-400 font-normal">
            {filterSeverity === "ALL"
              ? "All evaluated posture checks passed without security alerts."
              : `No ${filterSeverity.toLowerCase()} observations recorded.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredFindings.map((item) => (
            <FindingCard key={item.id} finding={item} />
          ))}
        </div>
      )}
    </div>
  );
};

function FindingCard({ finding }: { finding: FindingItem }) {
  const severityConfig: Record<
    SeverityLevel,
    { borderCls: string; badgeCls: string; icon: React.ReactNode }
  > = {
    CRITICAL: {
      borderCls: "border-rose-500/30 bg-rose-500/5",
      badgeCls: "bg-rose-500/15 text-rose-400 border-rose-500/40",
      icon: <ShieldX className="h-4.5 w-4.5 text-rose-400 flex-shrink-0" />,
    },
    HIGH: {
      borderCls: "border-orange-500/30 bg-orange-500/5",
      badgeCls: "bg-orange-500/15 text-orange-400 border-orange-500/40",
      icon: <AlertCircle className="h-4.5 w-4.5 text-orange-400 flex-shrink-0" />,
    },
    MEDIUM: {
      borderCls: "border-amber-500/30 bg-amber-500/5",
      badgeCls: "bg-amber-500/15 text-amber-400 border-amber-500/40",
      icon: <AlertTriangle className="h-4.5 w-4.5 text-amber-400 flex-shrink-0" />,
    },
    WARNING: {
      borderCls: "border-amber-500/25 bg-amber-500/5",
      badgeCls: "bg-amber-500/10 text-amber-300 border-amber-500/30",
      icon: <AlertTriangle className="h-4.5 w-4.5 text-amber-300 flex-shrink-0" />,
    },
    INFO: {
      borderCls: "border-emerald-500/30 bg-emerald-500/5",
      badgeCls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/40",
      icon: <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 flex-shrink-0" />,
    },
  };

  const config = severityConfig[finding.severity];

  return (
    <div className={cn("p-4 rounded-xl border space-y-3 transition-all", config.borderCls)}>
      {/* Header Row — 16px Finding Title */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="mt-0.5">{config.icon}</div>
          <div>
            {/* 16px Finding Title */}
            <span className="text-[16px] font-semibold text-slate-900 dark:text-white leading-snug block">
              {finding.title}
            </span>
            <span className="text-[13px] text-slate-500 dark:text-slate-400 font-normal mt-0.5 block">
              Module Source: {finding.module}
            </span>
          </div>
        </div>

        <span
          className={cn(
            "px-2.5 py-0.5 rounded-full border text-[12px] font-medium flex-shrink-0 capitalize",
            config.badgeCls
          )}
        >
          {finding.severity.toLowerCase()}
        </span>
      </div>

      {/* Description — 15px Body Text */}
      <p className="text-[15px] font-normal text-slate-700 dark:text-slate-300 leading-relaxed px-0.5">
        {finding.description}
      </p>

      {/* Actionable SOC Recommendation Box — 15px Text */}
      <div className="p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white/60 dark:bg-slate-950/60 space-y-1">
        <div className="flex items-center gap-1.5 text-[13px] font-medium text-cyan-500">
          <Lightbulb className="h-4 w-4" />
          <span>Actionable Recommendation</span>
        </div>
        <p className="text-[15px] font-normal text-slate-700 dark:text-slate-200 leading-relaxed">
          {finding.recommendation}
        </p>
      </div>
    </div>
  );
}

function FilterPill({
  label,
  count,
  variant = "slate",
  isActive,
  onClick,
}: {
  label: string;
  count: number;
  variant?: "slate" | "rose" | "orange" | "amber" | "yellow" | "emerald";
  isActive: boolean;
  onClick: () => void;
}) {
  const variantStyles = {
    slate: isActive ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-400 font-semibold" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-medium",
    rose: isActive ? "border-rose-500/40 bg-rose-500/10 text-rose-400 font-semibold" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-medium",
    orange: isActive ? "border-orange-500/40 bg-orange-500/10 text-orange-400 font-semibold" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-medium",
    amber: isActive ? "border-amber-500/40 bg-amber-500/10 text-amber-400 font-semibold" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-medium",
    yellow: isActive ? "border-amber-500/40 bg-amber-500/10 text-amber-300 font-semibold" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-medium",
    emerald: isActive ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-semibold" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-medium",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[13px] transition-all",
        variantStyles[variant]
      )}
    >
      <span>{label}</span>
      <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-[11px] font-mono font-medium">
        {count}
      </span>
    </button>
  );
}
