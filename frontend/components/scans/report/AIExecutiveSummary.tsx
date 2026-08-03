"use client";

import React, { useState } from "react";
import {
  Sparkles,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  Briefcase,
  ListChecks,
} from "lucide-react";
import { Scan } from "@/services/api/scanService";
import { calculateSecurityMetrics } from "./reportUtils";
import { cn } from "@/lib/utils";

interface AIExecutiveSummaryProps {
  scan: Scan;
}

export const AIExecutiveSummary: React.FC<AIExecutiveSummaryProps> = ({ scan }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const metrics = calculateSecurityMetrics(scan);
  const { score, riskLevel, findingsCount, modulesPassed, totalModules } = metrics;

  const criticalCount = findingsCount?.critical ?? 0;
  const highCount = findingsCount?.high ?? 0;
  const mediumCount = findingsCount?.medium ?? 0;
  const lowCount = (findingsCount?.info ?? 0) + (findingsCount?.warning ?? 0);
  const targetDomain = scan?.target_domain ?? "Target Domain";

  // Derive Executive Risk Assessment Statement
  let riskAssessment = "";
  let postureSummary = "";
  let businessImpact = "";

  if (score >= 90) {
    riskAssessment = "Low Risk / Well-Hardened Security Posture";
    postureSummary = `The target domain '${targetDomain}' demonstrates strong defense-in-depth security controls across application headers, transport layer TLS, and domain intelligence. Zero critical vulnerability exposures were identified during passive reconnaissance.`;
    businessImpact = "Minimal operational, compliance, or reputation risk detected. Current technical configurations comply with industry defensive standards.";
  } else if (score >= 70) {
    riskAssessment = "Moderate Risk / Minor Posture Gaps Identified";
    postureSummary = `The target domain '${targetDomain}' displays satisfactory baseline security, but contains actionable misconfigurations in HTTP response headers, cookie flags, or server disclosure parameters.`;
    businessImpact = "Low-to-moderate exposure to automated web scanners and opportunistic reconnaissance attacks. Remediation will prevent threat actor intelligence gathering.";
  } else if (score >= 50) {
    riskAssessment = "Elevated Risk / Actionable Vulnerabilities Detected";
    postureSummary = `Reconnaissance identified notable security gaps on '${targetDomain}'. Critical defensive headers (such as HSTS or CSP) are missing or misconfigured, exposing endpoints to potential session hijacking or clickjacking threats.`;
    businessImpact = "Increased probability of exploitation by malicious actors targeting web application misconfigurations. Priority remediation recommended.";
  } else {
    riskAssessment = "Critical Risk / Urgent Security Remediation Required";
    postureSummary = `Multiple high-severity security weaknesses and unhardened infrastructure endpoints were discovered on '${targetDomain}'. Immediate intervention is required to establish defensive baseline protections.`;
    businessImpact = "High risk of credential theft, cross-site scripting (XSS), or session compromise. Failure to remediate exposes organizational assets to active exploitation.";
  }

  // Determine Priority Recommended Fix Order
  const fixOrder: string[] = [];
  if (criticalCount > 0 || highCount > 0) {
    fixOrder.push("Remediate High/Critical security observations by enforcing Strict-Transport-Security (HSTS) and Content-Security-Policy (CSP).");
  }
  if (findingsCount.total > 0) {
    fixOrder.push("Enforce HttpOnly, Secure, and SameSite attributes across all session and authentication cookies.");
    fixOrder.push("Suppress granular web server software version banners (e.g. Server and X-Powered-By headers).");
  }
  fixOrder.push("Maintain routine automated scanning to monitor infrastructure posture drift.");

  return (
    <div className="rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-950/30 via-slate-900/60 to-slate-900/40 p-4 shadow-lg transition-all space-y-3">
      {/* Executive Summary Card Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30 text-purple-300">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[17px] font-bold font-mono text-white tracking-wide">
                AI Executive Security Summary
              </h3>
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono text-[11px] font-bold">
                SOC Automated Briefing
              </span>
            </div>
            <p className="text-[12px] text-slate-400 font-normal mt-0.5">
              Automated executive assessment generated for target: <span className="font-mono text-slate-200">{targetDomain}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1.5 px-3 rounded-lg border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 font-mono text-[12px] flex items-center gap-1.5 transition-colors"
        >
          {isExpanded ? "Collapse Summary" : "Expand Summary"}
          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>

      {/* Expandable Body */}
      {isExpanded && (
        <div className="space-y-4 pt-2 border-t border-purple-500/20 text-[13px]">
          {/* Top 4 KPI Metrics Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono">
            <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase font-medium">Security Posture</span>
              <div className="text-[14px] font-bold text-cyan-400 truncate">{score} / 100</div>
            </div>

            <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase font-medium">Risk Assessment</span>
              <div className={cn("text-[14px] font-bold truncate", riskLevel === "LOW" ? "text-emerald-400" : riskLevel === "MEDIUM" ? "text-amber-400" : "text-rose-400")}>
                {riskLevel} RISK
              </div>
            </div>

            <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase font-medium">High/Crit Issues</span>
              <div className="text-[14px] font-bold text-rose-400">{criticalCount + highCount}</div>
            </div>

            <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-950/60 space-y-0.5">
              <span className="text-[10px] text-slate-400 uppercase font-medium">Passed Modules</span>
              <div className="text-[14px] font-bold text-purple-400">{modulesPassed} / {totalModules}</div>
            </div>
          </div>

          {/* Posture Assessment Narrative */}
          <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-950/50 space-y-1.5">
            <div className="flex items-center gap-2 font-semibold text-slate-200 font-mono text-[14px]">
              <TrendingUp className="h-4 w-4 text-cyan-400" />
              <span>Executive Posture Assessment</span>
            </div>
            <p className="text-slate-300 font-normal leading-relaxed text-[13px]">
              {postureSummary}
            </p>
          </div>

          {/* Business Impact & Fix Order Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="p-3.5 rounded-lg border border-amber-500/20 bg-amber-500/5 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-amber-300 font-mono text-[14px]">
                <Briefcase className="h-4 w-4 text-amber-400" />
                <span>Estimated Business Impact</span>
              </div>
              <p className="text-slate-300 font-normal leading-relaxed text-[12.5px]">
                {businessImpact}
              </p>
            </div>

            <div className="p-3.5 rounded-lg border border-purple-500/20 bg-purple-500/5 space-y-1.5">
              <div className="flex items-center gap-2 font-semibold text-purple-300 font-mono text-[14px]">
                <ListChecks className="h-4 w-4 text-purple-400" />
                <span>Recommended Priority Fix Order</span>
              </div>
              <ul className="space-y-1 text-slate-300 font-normal text-[12px] list-disc list-inside">
                {fixOrder.map((fix, idx) => (
                  <li key={idx} className="leading-snug">
                    <span className="font-semibold text-purple-300 font-mono">Step {idx + 1}:</span> {fix}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
