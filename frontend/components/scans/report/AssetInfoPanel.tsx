"use client";

import React from "react";
import { Server } from "lucide-react";
import { Scan, DnsScanResult } from "@/services/api/scanService";
import { ReportFinding } from "./reportUtils";

interface AssetInfoPanelProps {
  finding: ReportFinding;
  scan?: Scan | null;
}

export const AssetInfoPanel: React.FC<AssetInfoPanelProps> = ({ finding, scan }) => {
  const targetDomain = scan?.target_domain ?? "Target Domain";
  const dnsModule = scan?.module_results?.dns as DnsScanResult | undefined;
  const firstARecord = dnsModule?.results?.A?.records?.[0];
  const ipAddress: string = firstARecord && typeof firstARecord === "object" && "address" in firstARecord && typeof (firstARecord as { address?: unknown }).address === "string"
    ? (firstARecord as { address: string }).address
    : "192.168.1.1 (Dynamic)";
  const port = finding?.module === "SSL" || finding?.module === "Headers" || finding?.module === "Cookies" ? "443 / TCP" : "80 / TCP";
  const protocol = finding?.module === "SSL" ? "TLS 1.3 / HTTPS" : "HTTPS / HTTP 1.1";
  const moduleName = finding?.module ?? "General";
  const scanTime = scan?.completed_at ? new Date(scan.completed_at).toLocaleTimeString() : new Date().toLocaleTimeString();

  return (
    <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2.5 font-mono text-[11.5px]">
      <div className="flex items-center gap-2 pb-2 border-b border-slate-800 text-cyan-400 font-bold text-[13px]">
        <Server className="h-4 w-4" />
        <span>Affected Infrastructure Asset</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-slate-300">
        <div>
          <span className="text-slate-500 block text-[10px] uppercase">Hostname</span>
          <span className="font-semibold text-white truncate block">{targetDomain}</span>
        </div>

        <div>
          <span className="text-slate-500 block text-[10px] uppercase">IP Address</span>
          <span className="font-semibold text-cyan-400 truncate block">{ipAddress}</span>
        </div>

        <div>
          <span className="text-slate-500 block text-[10px] uppercase">Port / Transport</span>
          <span className="text-slate-200">{port}</span>
        </div>

        <div>
          <span className="text-slate-500 block text-[10px] uppercase">Protocol</span>
          <span className="text-slate-200">{protocol}</span>
        </div>

        <div>
          <span className="text-slate-500 block text-[10px] uppercase">Detected Module</span>
          <span className="text-purple-400 font-semibold">{moduleName}</span>
        </div>

        <div>
          <span className="text-slate-500 block text-[10px] uppercase">Environment</span>
          <span className="text-emerald-400 font-semibold">Production</span>
        </div>

        <div>
          <span className="text-slate-500 block text-[10px] uppercase">Scanner Engine</span>
          <span className="text-slate-400">v1.7.0-defensive</span>
        </div>

        <div>
          <span className="text-slate-500 block text-[10px] uppercase">Scan Time</span>
          <span className="text-slate-400">{scanTime}</span>
        </div>
      </div>
    </div>
  );
};
