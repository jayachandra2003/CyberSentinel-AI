"use client";

import React from "react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Scan } from "@/services/api/scanService";
import { Globe, Clock, Activity, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

interface ScanDetailModalProps {
  scan: Scan | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ScanDetailModal: React.FC<ScanDetailModalProps> = ({ scan, isOpen, onClose }) => {
  if (!scan) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
        return <Badge variant="emerald">Completed</Badge>;
      case "Running":
        return <Badge variant="cyan">Running ({scan.progress}%)</Badge>;
      case "Queued":
        return <Badge variant="amber">Queued</Badge>;
      case "Failed":
        return <Badge variant="rose">Failed</Badge>;
      default:
        return <Badge variant="purple">Pending</Badge>;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Scan Details #${scan.id}`}>
      <div className="space-y-5 pt-2">
        {/* Header Overview Banner */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-950/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
              <Globe className="h-5 w-5 text-cyan-500" />
              <span className="text-base font-mono">{scan.target_domain}</span>
            </div>
            {getStatusBadge(scan.status)}
          </div>

          {/* Progress Bar */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs font-mono text-slate-600 dark:text-slate-400">
              <span>Pipeline Status</span>
              <span>{scan.progress}%</span>
            </div>
            <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: "0%" }}
                animate={{ width: `${scan.progress}%` }}
                transition={{ duration: 0.4 }}
                className={`h-full ${
                  scan.status === "Completed"
                    ? "bg-emerald-500"
                    : scan.status === "Failed"
                    ? "bg-rose-500"
                    : "bg-cyan-500 animate-pulse"
                }`}
              />
            </div>
          </div>
        </div>

        {/* Scan Metrics Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/40 dark:bg-slate-900/40 space-y-1">
            <div className="text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
              <Activity className="h-3.5 w-3.5 text-cyan-500" />
              Scan Type
            </div>
            <div className="font-semibold text-slate-900 dark:text-white">{scan.scan_type}</div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/40 dark:bg-slate-900/40 space-y-1">
            <div className="text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-cyan-500" />
              Execution Duration
            </div>
            <div className="font-semibold text-slate-900 dark:text-white">
              {scan.duration ? `${scan.duration}s` : "In Progress..."}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/40 dark:bg-slate-900/40 space-y-1">
            <div className="text-slate-500 dark:text-slate-400 font-mono">Started At</div>
            <div className="font-mono text-slate-900 dark:text-slate-300">
              {scan.started_at ? new Date(scan.started_at).toLocaleTimeString() : "N/A"}
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/40 dark:bg-slate-900/40 space-y-1">
            <div className="text-slate-500 dark:text-slate-400 font-mono">Completed At</div>
            <div className="font-mono text-slate-900 dark:text-slate-300">
              {scan.completed_at ? new Date(scan.completed_at).toLocaleTimeString() : "N/A"}
            </div>
          </div>
        </div>

        {/* Summary Box */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/40 dark:bg-slate-900/40 space-y-1.5 text-xs">
          <div className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5 font-mono">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            Execution Summary
          </div>
          <p className="text-slate-600 dark:text-slate-300 leading-relaxed font-mono text-[11px]">
            {scan.summary || "No summary available."}
          </p>
        </div>
      </div>
    </Modal>
  );
};
