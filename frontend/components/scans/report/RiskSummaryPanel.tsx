"use client";

import React from "react";
import {
  ShieldAlert,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { SecurityReportMetrics } from "./reportUtils";
import { cn } from "@/lib/utils";

interface RiskSummaryPanelProps {
  metrics: SecurityReportMetrics;
  allExpanded: boolean;
  onToggleExpandAll: () => void;
}

export const RiskSummaryPanel: React.FC<RiskSummaryPanelProps> = ({
  metrics,
  allExpanded,
  onToggleExpandAll,
}) => {
  const { score, riskLevel, findingsCount, averageCvss, complianceScore } = metrics;

  return (
    <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-900/60 backdrop-blur-sm space-y-3">
      {/* Top Header & Actions */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b border-slate-200 dark:border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-cyan-400" />
          <h3 className="text-[17px] font-bold font-mono text-slate-900 dark:text-white tracking-tight">
            Vulnerability & Risk Executive Control Panel
          </h3>
        </div>

        <button
          onClick={onToggleExpandAll}
          className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[12px] font-mono flex items-center gap-1.5 transition-colors"
        >
          {allExpanded ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
          <span>{allExpanded ? "Collapse All Findings" : "Expand All Findings"}</span>
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 font-mono text-[12px]">
        {/* Overall Risk */}
        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Overall Risk</span>
          <div
            className={cn(
              "text-[15px] font-bold truncate",
              riskLevel === "LOW"
                ? "text-emerald-400"
                : riskLevel === "MEDIUM"
                ? "text-amber-400"
                : "text-rose-400"
            )}
          >
            {riskLevel}
          </div>
        </div>

        {/* Security Score */}
        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Security Score</span>
          <div className="text-[15px] font-bold text-cyan-400">{score} / 100</div>
        </div>

        {/* Compliance Score */}
        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Compliance Score</span>
          <div className="text-[15px] font-bold text-purple-400">{complianceScore}%</div>
        </div>

        {/* Average CVSS */}
        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Average CVSS</span>
          <div className="text-[15px] font-bold text-amber-400">{averageCvss.toFixed(1)}</div>
        </div>

        {/* Critical & High Issues */}
        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">High/Crit Gaps</span>
          <div className="text-[15px] font-bold text-rose-400">{findingsCount.critical + findingsCount.high}</div>
        </div>

        {/* Total Findings */}
        <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 space-y-1">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Findings</span>
          <div className="text-[15px] font-bold text-slate-200">{findingsCount.total}</div>
        </div>
      </div>
    </div>
  );
};
