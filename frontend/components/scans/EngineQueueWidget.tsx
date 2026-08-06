import React from "react";
import { EngineQueueStatus } from "@/services/api/scanService";
import { Cpu, Activity, Clock } from "lucide-react";
import { Card } from "@/components/ui/Card";

interface EngineQueueWidgetProps {
  status: EngineQueueStatus | null;
  isLoading: boolean;
}

export const EngineQueueWidget: React.FC<EngineQueueWidgetProps> = ({ status, isLoading }) => {
  const queueLength = status?.queue_length ?? 0;
  const runningScans = status?.running_scans ?? 0;
  const activeWorkers = status?.active_workers ?? 0;
  const maxWorkers = status?.max_workers ?? 4;

  const utilizationPercent = maxWorkers > 0 ? Math.round((activeWorkers / maxWorkers) * 100) : 0;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Queue Length */}
      <Card glow className="p-4 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Queue Length
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
              {isLoading ? "..." : queueLength} <span className="text-xs font-normal text-slate-500">jobs</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500">
            <Clock className="h-5 w-5" />
          </div>
        </div>
      </Card>

      {/* 2. Running Scans */}
      <Card glow className="p-4 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Running Scans
            </div>
            <div className="text-2xl font-bold font-mono text-cyan-600 dark:text-cyan-400 mt-1">
              {isLoading ? "..." : runningScans} <span className="text-xs font-normal text-slate-500">active</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Activity className="h-5 w-5 animate-pulse" />
          </div>
        </div>
      </Card>

      {/* 3. Active Workers */}
      <Card glow className="p-4 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Worker Pool
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
              {isLoading ? "..." : `${activeWorkers} / ${maxWorkers}`} <span className="text-xs font-normal text-slate-500">workers</span>
            </div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500">
            <Cpu className="h-5 w-5" />
          </div>
        </div>
      </Card>

      {/* 4. Worker Utilization */}
      <Card glow className="p-4 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <div className="w-full">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Utilization
              </span>
              <span className="text-xs font-mono font-bold text-cyan-600 dark:text-cyan-400">
                {utilizationPercent}%
              </span>
            </div>
            <div className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-0.5">
              {isLoading ? "..." : `${utilizationPercent}% Capacity`}
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className="bg-cyan-500 h-full transition-all duration-500"
                style={{ width: `${utilizationPercent}%` }}
              />
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};
