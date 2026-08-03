"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Scan } from "@/services/api/scanService";
import { calculateSecurityMetrics, extractReportFindings } from "./reportUtils";
import {
  GitCompare,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ScanComparisonModalProps {
  scans: Scan[];
  isOpen: boolean;
  onClose: () => void;
}

export const ScanComparisonModal: React.FC<ScanComparisonModalProps> = ({
  scans,
  isOpen,
  onClose,
}) => {
  const completedScans = scans.filter((s) => s.status === "Completed");

  const [scanAId, setScanAId] = useState<number | null>(
    completedScans.length > 0 ? completedScans[0].id : null
  );
  const [scanBId, setScanBId] = useState<number | null>(
    completedScans.length > 1 ? completedScans[1].id : null
  );

  if (!isOpen) return null;

  const scanA = completedScans.find((s) => s.id === scanAId);
  const scanB = completedScans.find((s) => s.id === scanBId);

  const metricsA = scanA ? calculateSecurityMetrics(scanA) : null;
  const metricsB = scanB ? calculateSecurityMetrics(scanB) : null;

  const scoreDelta = metricsA && metricsB ? metricsB.score - metricsA.score : 0;

  const findingsA = scanA ? extractReportFindings(scanA) : [];
  const findingsB = scanB ? extractReportFindings(scanB) : [];

  const findingsAIds = new Set(findingsA.map((f) => f.title));
  const findingsBIds = new Set(findingsB.map((f) => f.title));

  const newFindings = findingsB.filter((f) => !findingsAIds.has(f.title));
  const fixedFindings = findingsA.filter((f) => !findingsBIds.has(f.title));

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Security Posture Comparison Engine" size="report">
      <div className="space-y-4 py-1 text-[13px]">
        {/* Top Selectors Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 font-mono">
          <div>
            <label className="text-[11px] text-slate-400 font-medium block uppercase mb-1">
              Baseline Scan (Scan A)
            </label>
            <select
              value={scanAId ?? ""}
              onChange={(e) => setScanAId(Number(e.target.value))}
              className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
            >
              {completedScans.map((s) => (
                <option key={s.id} value={s.id}>
                  #{s.id} — {s.target_domain} ({s.created_at ? new Date(s.created_at).toLocaleDateString() : "Recent"})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[11px] text-slate-400 font-medium block uppercase mb-1">
              Comparison Scan (Scan B)
            </label>
            <select
              value={scanBId ?? ""}
              onChange={(e) => setScanBId(Number(e.target.value))}
              className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
            >
              {completedScans.map((s) => (
                <option key={s.id} value={s.id}>
                  #{s.id} — {s.target_domain} ({s.created_at ? new Date(s.created_at).toLocaleDateString() : "Recent"})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Comparison Summary Banner */}
        {scanA && scanB && metricsA && metricsB ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-cyan-500/30 bg-cyan-500/5 space-y-3">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2 font-mono font-bold text-[16px] text-slate-900 dark:text-white">
                  <GitCompare className="h-5 w-5 text-cyan-400" />
                  <span>Posture Delta Summary</span>
                </div>

                <div className="flex items-center gap-2 font-mono">
                  <span className="text-slate-400">Score Delta:</span>
                  <span
                    className={cn(
                      "px-2.5 py-1 rounded-lg font-bold text-[14px]",
                      scoreDelta > 0
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : scoreDelta < 0
                        ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                        : "bg-slate-800 text-slate-400"
                    )}
                  >
                    {scoreDelta > 0 ? `+${scoreDelta} pts (Improved)` : scoreDelta < 0 ? `${scoreDelta} pts (Regressed)` : "No Change"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[12px] pt-2 border-t border-cyan-500/20">
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase">Scan A Score</span>
                  <span className="font-bold text-cyan-400">{metricsA.score} / 100</span>
                </div>
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase">Scan B Score</span>
                  <span className="font-bold text-cyan-400">{metricsB.score} / 100</span>
                </div>
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase">New Findings</span>
                  <span className="font-bold text-rose-400">+{newFindings.length}</span>
                </div>
                <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase">Resolved Findings</span>
                  <span className="font-bold text-emerald-400">-{fixedFindings.length}</span>
                </div>
              </div>
            </div>

            {/* Resolved vs Newly Introduced Findings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Newly Introduced Findings */}
              <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-2">
                <div className="flex items-center gap-2 font-mono font-bold text-rose-400">
                  <ShieldAlert className="h-4 w-4" />
                  <span>Newly Introduced Issues ({newFindings.length})</span>
                </div>
                {newFindings.length === 0 ? (
                  <p className="text-slate-400 font-mono text-[12px] italic">Zero new security issues introduced.</p>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    {newFindings.map((f, i) => (
                      <div key={i} className="p-2 rounded bg-slate-900/80 border border-rose-500/20 font-mono text-[12px] text-slate-200">
                        {f.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Resolved / Fixed Findings */}
              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2">
                <div className="flex items-center gap-2 font-mono font-bold text-emerald-400">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Resolved / Fixed Issues ({fixedFindings.length})</span>
                </div>
                {fixedFindings.length === 0 ? (
                  <p className="text-slate-400 font-mono text-[12px] italic">No previously logged issues were resolved.</p>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    {fixedFindings.map((f, i) => (
                      <div key={i} className="p-2 rounded bg-slate-900/80 border border-emerald-500/20 font-mono text-[12px] text-slate-200">
                        {f.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center text-slate-400 font-mono">
            Select two completed scans to generate posture comparison analysis.
          </div>
        )}
      </div>
    </Modal>
  );
};
