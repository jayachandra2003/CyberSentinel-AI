import React from "react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { EngineScanDetails } from "@/services/api/scanService";
import { Clock, Cpu, Shield, Code, Lock, FileText, Database, Cookie } from "lucide-react";

interface EngineScanDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  details: EngineScanDetails | null;
}

export const EngineScanDetailsModal: React.FC<EngineScanDetailsModalProps> = ({
  isOpen,
  onClose,
  details,
}) => {
  if (!details) return null;

  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case "COMPLETED":
        return <Badge variant="emerald">Completed</Badge>;
      case "RUNNING":
        return <Badge variant="cyan">Running ({details.progress}%)</Badge>;
      case "QUEUED":
        return <Badge variant="amber">Queued</Badge>;
      case "FAILED":
        return <Badge variant="rose">Failed</Badge>;
      case "CANCELLED":
        return <Badge variant="slate">Cancelled</Badge>;
      default:
        return <Badge variant="purple">{status}</Badge>;
    }
  };

  const getModuleIcon = (modId: string) => {
    switch (modId.toLowerCase()) {
      case "dns": return <Database className="h-3.5 w-3.5 text-cyan-400" />;
      case "whois": return <FileText className="h-3.5 w-3.5 text-cyan-400" />;
      case "ssl": return <Lock className="h-3.5 w-3.5 text-cyan-400" />;
      case "headers": return <Shield className="h-3.5 w-3.5 text-cyan-400" />;
      case "cookies": return <Cookie className="h-3.5 w-3.5 text-cyan-400" />;
      case "tech": return <Cpu className="h-3.5 w-3.5 text-cyan-400" />;
      default: return <Code className="h-3.5 w-3.5 text-cyan-400" />;
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Engine Console — ${details.target_domain}`}>
      <div className="space-y-4 p-1 text-xs font-sans">
        {/* Header Metadata */}
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold font-mono text-slate-900 dark:text-white">
                {details.target_domain}
              </h3>
              <span className="text-[11px] font-mono text-slate-400">ID #{details.scan_id}</span>
              {getStatusBadge(details.status)}
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              <span className="flex items-center gap-1">
                <Cpu className="h-3 w-3 text-cyan-500" />
                Profile: <strong className="text-slate-300 font-mono">{details.profile}</strong>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-cyan-500" />
                State: <strong className="text-slate-300 font-mono">{details.current_state}</strong>
              </span>
            </div>
          </div>

          <div className="text-right flex sm:flex-col items-center sm:items-end justify-between">
            <div className="text-[11px] text-slate-400 font-mono">Progress</div>
            <div className="text-lg font-bold font-mono text-cyan-400">{details.progress}%</div>
          </div>
        </div>

        {/* Timestamps Card */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          <div className="p-2 rounded bg-slate-900/40 border border-slate-800">
            <div className="text-slate-500 font-mono text-[10px]">CREATED AT</div>
            <div className="font-mono text-slate-200 mt-0.5">
              {details.created_at ? new Date(details.created_at).toLocaleTimeString() : "N/A"}
            </div>
          </div>
          <div className="p-2 rounded bg-slate-900/40 border border-slate-800">
            <div className="text-slate-500 font-mono text-[10px]">STARTED AT</div>
            <div className="font-mono text-slate-200 mt-0.5">
              {details.started_at ? new Date(details.started_at).toLocaleTimeString() : "N/A"}
            </div>
          </div>
          <div className="p-2 rounded bg-slate-900/40 border border-slate-800">
            <div className="text-slate-500 font-mono text-[10px]">COMPLETED AT</div>
            <div className="font-mono text-slate-200 mt-0.5">
              {details.completed_at ? new Date(details.completed_at).toLocaleTimeString() : "N/A"}
            </div>
          </div>
          <div className="p-2 rounded bg-slate-900/40 border border-slate-800">
            <div className="text-slate-500 font-mono text-[10px]">DURATION</div>
            <div className="font-mono text-cyan-400 mt-0.5">{details.duration ?? 0}s</div>
          </div>
        </div>

        {/* Summary Banner */}
        {details.summary && (
          <div className="p-3 rounded-lg border border-slate-800 bg-slate-900/80 font-mono text-[11px] text-slate-300">
            <span className="text-cyan-400 font-bold">Summary: </span>
            {details.summary}
          </div>
        )}

        {/* Module Execution Status Table */}
        <div className="space-y-1.5">
          <div className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
            Scanner Module Execution Status
          </div>
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-100 dark:bg-slate-900 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-2.5 px-3">Module ID</th>
                  <th className="p-2.5 px-3">Status</th>
                  <th className="p-2.5 px-3 text-right">Execution State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-slate-950">
                {Object.entries(details.module_status).map(([modId, modStatus]) => (
                  <tr key={modId} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                    <td className="p-2.5 px-3 flex items-center gap-2 capitalize font-semibold text-slate-800 dark:text-slate-200">
                      {getModuleIcon(modId)}
                      {modId} Module
                    </td>
                    <td className="p-2.5 px-3 uppercase text-[11px]">
                      <span
                        className={
                          modStatus === "completed"
                            ? "text-emerald-400 font-bold"
                            : modStatus === "running"
                            ? "text-cyan-400 font-bold animate-pulse"
                            : modStatus === "failed"
                            ? "text-rose-400 font-bold"
                            : modStatus === "cancelled"
                            ? "text-slate-400 font-medium"
                            : "text-amber-400 font-medium"
                        }
                      >
                        {modStatus}
                      </span>
                    </td>
                    <td className="p-2.5 px-3 text-right">
                      {modStatus === "completed" ? (
                        <span className="text-emerald-500 text-[11px]">✓ Finished</span>
                      ) : modStatus === "running" ? (
                        <span className="text-cyan-400 text-[11px]">⚙ In Progress</span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">⏳ Waiting</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium"
          >
            Close Console
          </button>
        </div>
      </div>
    </Modal>
  );
};
