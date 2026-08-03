"use client";

import React from "react";
import {
  Sparkles,
  TrendingUp,
  ArrowRight,
  Target,
  Briefcase,
  Crosshair,
  Unlock,
  ShieldX,
  Server,
} from "lucide-react";
import { ReportFinding } from "./reportUtils";

interface AIRecommendationCardProps {
  finding: ReportFinding;
  targetDomain?: string;
}

export const AIRecommendationCard: React.FC<AIRecommendationCardProps> = ({
  finding,
  targetDomain = "Target Domain",
}) => {
  const severity = finding?.severity ?? "INFO";
  const title = finding?.title ?? "Security Observation";

  const aiConfidence = finding?.confidence?.score ?? 98;
  const scoreImprovement = severity === "CRITICAL" ? 25 : severity === "HIGH" ? 15 : severity === "MEDIUM" ? 10 : 5;

  const attackSteps = [
    {
      step: "01",
      title: "Reconnaissance",
      desc: `Automated bots discover missing ${title} on ${targetDomain}`,
      icon: <Crosshair className="h-3.5 w-3.5 text-purple-400" />,
      badge: "Discovery",
    },
    {
      step: "02",
      title: "Exploit Vector",
      desc: `Threat actor crafts payloads targeting unhardened headers/TLS`,
      icon: <Unlock className="h-3.5 w-3.5 text-amber-400" />,
      badge: "Weaponization",
    },
    {
      step: "03",
      title: "Session Intercept",
      desc: `MITM, XSS, or cookie sniffing executed on active users`,
      icon: <ShieldX className="h-3.5 w-3.5 text-rose-400" />,
      badge: "Execution",
    },
    {
      step: "04",
      title: "Infrastructure Impact",
      desc: `Credential theft, data exfiltration, or brand reputation loss`,
      icon: <Server className="h-3.5 w-3.5 text-rose-500" />,
      badge: "Compromise",
    },
  ];

  return (
    <div className="p-4 rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-950/40 via-slate-900/80 to-slate-900/60 shadow-md space-y-3">
      {/* Header Banner */}
      <div className="flex items-center justify-between gap-3 flex-wrap border-b border-purple-500/20 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/20 text-purple-300 border border-purple-500/30">
            <Sparkles className="h-4 w-4 animate-pulse text-purple-300" />
          </div>
          <div>
            <h4 className="text-[14px] font-bold font-mono text-white tracking-wide flex items-center gap-2">
              CyberSentinel AI SOC Recommendation
            </h4>
            <span className="text-[11px] text-purple-300 font-mono">
              Engine Model: Autonomous Defense v1.7.0
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px]">
          <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold">
            AI Confidence: {aiConfidence}%
          </span>
          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
            <TrendingUp className="h-3 w-3" /> +{scoreImprovement} Pts Score Fix
          </span>
        </div>
      </div>

      {/* Graphical Attack Flow Diagram */}
      <div className="space-y-2 pt-1">
        <div className="flex items-center justify-between text-[11px] font-mono font-bold text-purple-300">
          <span className="flex items-center gap-1.5">
            <Target className="h-3.5 w-3.5 text-purple-400" /> Graphical Adversary Attack Chain Flow
          </span>
          <span className="text-slate-400 font-normal text-[10px]">MITRE ATT&CK T1190 / T1557</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {attackSteps.map((s, idx) => (
            <div
              key={idx}
              className="relative p-2.5 rounded-lg bg-slate-950/90 border border-purple-500/20 space-y-1 group hover:border-purple-500/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 text-[9.5px] font-mono font-bold">
                  STEP {s.step}
                </span>
                <span className="text-[9px] font-mono text-slate-400 uppercase font-semibold">
                  {s.badge}
                </span>
              </div>

              <div className="flex items-center gap-1.5 font-mono text-[12px] font-bold text-white pt-0.5">
                {s.icon}
                <span>{s.title}</span>
              </div>

              <p className="text-[10.5px] text-slate-400 font-sans leading-tight">
                {s.desc}
              </p>

              {idx < 3 && (
                <div className="hidden lg:block absolute -right-2.5 top-1/2 -translate-y-1/2 z-10 text-purple-400">
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Business Priority & Consequences */}
      <div className="p-3 rounded-lg bg-slate-950/80 border border-purple-500/20 space-y-1">
        <span className="text-purple-300 font-mono font-bold uppercase text-[10px] flex items-center gap-1">
          <Briefcase className="h-3.5 w-3.5 text-purple-400" /> Business Priority & Consequence Assessment
        </span>
        <p className="text-slate-300 font-normal leading-relaxed text-[12px] pt-0.5">
          {finding?.businessImpact ?? "High remediation priority. Eliminating this gap prevents threat actor reconnaissance and reduces overall organizational risk exposure."}
        </p>
      </div>
    </div>
  );
};
