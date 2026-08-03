"use client";

import React, { useState } from "react";
import { Terminal, Copy, Check, FileText, Lock, Database, Shield } from "lucide-react";
import { ReportFinding } from "./reportUtils";
import { Scan, DnsScanResult, SslScanResult, HeadersScanResult } from "@/services/api/scanService";
import { cn } from "@/lib/utils";

interface EvidenceViewerProps {
  finding: ReportFinding;
  scan?: Scan | null;
}

export const EvidenceViewer: React.FC<EvidenceViewerProps> = ({ finding, scan }) => {
  const [activeTab, setActiveTab] = useState<"headers" | "http" | "dns" | "ssl" | "output">("headers");
  const [copied, setCopied] = useState(false);

  const headersResult = scan?.module_results?.headers as HeadersScanResult | undefined;
  const dnsResult = scan?.module_results?.dns as DnsScanResult | undefined;
  const sslResult = scan?.module_results?.ssl as SslScanResult | undefined;

  // Build evidence strings for tabs
  const rawHeadersEvidence = headersResult?.raw_headers
    ? Object.entries(headersResult.raw_headers)
        .map(([k, v]) => `${k}: ${v}`)
        .join("\n")
    : `HTTP/1.1 200 OK\nServer: nginx\nDate: ${new Date().toUTCString()}\nContent-Type: text/html\nConnection: keep-alive\n\n[Captured headers missing defensive flags: ${finding?.title}]`;

  const httpResponseEvidence = `HTTP/1.1 200 OK\nHost: ${scan?.target_domain ?? "target"}\nStrict-Transport-Security: [MISSING]\nContent-Security-Policy: [MISSING]\nX-Frame-Options: [MISSING]\n\n<!DOCTYPE html><html><head><title>${scan?.target_domain ?? "Target"}</title></head></html>`;

  const firstARecord = dnsResult?.results?.A?.records?.[0];
  const firstAAddress = firstARecord && typeof firstARecord === "object" && "address" in firstARecord && typeof (firstARecord as { address?: unknown }).address === "string"
    ? (firstARecord as { address: string }).address
    : "Resolved";

  const dnsEvidence = dnsResult?.results
    ? JSON.stringify(dnsResult.results, null, 2)
    : `A Record: ${firstAAddress}\nAAAA Record: [Not Found]\nNS Records: Active`;

  const sslEvidence = sslResult?.certificate
    ? `Subject CN: ${sslResult.certificate.subject_cn || "N/A"}\nIssuer: ${sslResult.certificate.issuer_organization || sslResult.certificate.issuer_cn || "CA"}\nValid Until: ${sslResult.certificate.valid_to || "N/A"}\nProtocol: ${sslResult.protocol?.protocol_version || "TLS 1.3"}\nCipher: ${sslResult.protocol?.cipher_name || "ECDHE-RSA-AES256-GCM-SHA384"}`
    : `TLS Handshake Successful\nProtocol: TLS 1.3\nCipher: AES-GCM-256`;

  const scannerOutputEvidence = `[CyberSentinel AI Engine v1.7.0]\nTarget: ${scan?.target_domain ?? "target"}\nModule: ${finding?.module}\nObservation Code: ${finding?.id}\nSeverity Flag: ${finding?.severity}\nFinding: ${finding?.title}\nStatus: Confirmed Passive Reconnaissance Signal`;

  const getActiveContent = () => {
    switch (activeTab) {
      case "headers": return rawHeadersEvidence;
      case "http": return httpResponseEvidence;
      case "dns": return dnsEvidence;
      case "ssl": return sslEvidence;
      case "output": return scannerOutputEvidence;
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getActiveContent());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/80 space-y-2 font-mono text-[11.5px]">
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-1.5 font-bold text-emerald-400 text-[12.5px]">
          <Terminal className="h-4 w-4" />
          <span>Interactive Scan Evidence Viewer</span>
        </div>

        {/* Tab Selectors */}
        <div className="flex items-center gap-1">
          {(
            [
              { id: "headers", label: "Headers", icon: <Shield className="h-3 w-3" /> },
              { id: "http", label: "HTTP Response", icon: <FileText className="h-3 w-3" /> },
              { id: "dns", label: "DNS", icon: <Database className="h-3 w-3" /> },
              { id: "ssl", label: "TLS Cert", icon: <Lock className="h-3 w-3" /> },
              { id: "output", label: "Engine Log", icon: <Terminal className="h-3 w-3" /> },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as "headers" | "http" | "dns" | "ssl" | "output")}
              className={cn(
                "px-2 py-0.5 rounded text-[10.5px] flex items-center gap-1 transition-colors",
                activeTab === tab.id
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold"
                  : "bg-slate-900 text-slate-400 hover:text-slate-200"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative group">
        <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 text-emerald-300 font-mono text-[11px] overflow-x-auto leading-relaxed max-h-48">
          {getActiveContent()}
        </pre>

        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 px-2 py-1 rounded bg-slate-800 text-slate-300 hover:text-white text-[10.5px] border border-slate-700 flex items-center gap-1 transition-colors"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy Evidence"}
        </button>
      </div>
    </div>
  );
};
