"use client";

import React from "react";
import { Wrench } from "lucide-react";
import { ReportFinding } from "./reportUtils";
import { cn } from "@/lib/utils";

interface RemediationPriorityCardProps {
  finding: ReportFinding;
}

export const RemediationPriorityCard: React.FC<RemediationPriorityCardProps> = ({ finding }) => {
  const severity = finding?.severity ?? "INFO";

  const priority = severity === "CRITICAL" ? "P1 - Immediate Fix" : severity === "HIGH" ? "P2 - High Priority" : "P3 - Standard SLA";
  const estTime = severity === "CRITICAL" || severity === "HIGH" ? "15 - 30 Minutes" : "1 Hour";
  const difficulty = "Low / Configuration Only";
  const downtime = "Zero Downtime Required";
  const serviceRestart = finding?.module === "Headers" || finding?.module === "Tech" ? "Web Server Reload (nginx -s reload)" : "None";
  const responsibleTeam = finding?.module === "SSL" ? "SecOps / PKI Team" : "Web Infrastructure / DevOps";

  return (
    <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2.5 font-mono text-[11.5px]">
      <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-[13px]">
          <Wrench className="h-4 w-4" />
          <span>SOC Remediation Planning & SLA</span>
        </div>
        <span
          className={cn(
            "px-2 py-0.5 rounded font-bold text-[11px]",
            severity === "CRITICAL" || severity === "HIGH"
              ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
              : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
          )}
        >
          {priority}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-slate-300">
        <div>
          <span className="text-slate-500 block text-[10px] uppercase">Estimated Fix Time</span>
          <span className="font-semibold text-white">{estTime}</span>
        </div>

        <div>
          <span className="text-slate-500 block text-[10px] uppercase">Implementation Difficulty</span>
          <span className="text-emerald-400 font-semibold">{difficulty}</span>
        </div>

        <div>
          <span className="text-slate-500 block text-[10px] uppercase">Downtime Required</span>
          <span className="text-slate-200">{downtime}</span>
        </div>

        <div>
          <span className="text-slate-500 block text-[10px] uppercase">Service Impact</span>
          <span className="text-slate-200 truncate block">{serviceRestart}</span>
        </div>

        <div>
          <span className="text-slate-500 block text-[10px] uppercase">Responsible Team</span>
          <span className="text-cyan-400 font-semibold truncate block">{responsibleTeam}</span>
        </div>

        <div>
          <span className="text-slate-500 block text-[10px] uppercase">Target SLA</span>
          <span className="text-purple-400 font-semibold">{severity === "CRITICAL" ? "24 Hours" : "7 Days"}</span>
        </div>
      </div>
    </div>
  );
};
