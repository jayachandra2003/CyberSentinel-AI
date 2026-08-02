"use client";

import React from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  KeyRound,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
} from "lucide-react";
import { SslScanResult } from "@/services/api/scanService";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface SslTabProps {
  ssl: SslScanResult;
}

export const SslTab: React.FC<SslTabProps> = ({ ssl }) => {
  const cert = ssl.certificate;
  const proto = ssl.protocol;
  const observations = ssl.security_observations ?? [];

  const getRiskBadge = (level: string) => {
    switch (level?.toUpperCase()) {
      case "CRITICAL":
        return <Badge variant="rose" className="text-[12px] font-medium px-2.5 py-0.5">Risk: Critical</Badge>;
      case "HIGH":
        return <Badge variant="amber" className="text-[12px] font-medium px-2.5 py-0.5">Risk: High</Badge>;
      case "MEDIUM":
        return <Badge variant="amber" className="text-[12px] font-medium px-2.5 py-0.5">Risk: Medium</Badge>;
      default:
        return <Badge variant="emerald" className="text-[12px] font-medium px-2.5 py-0.5">Risk: Low</Badge>;
    }
  };

  const getExpiryBadge = (days: number | null | undefined, isExpired: boolean) => {
    if (isExpired) {
      return <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[12px] font-mono font-medium">Expired</span>;
    }
    if (days !== null && days !== undefined) {
      if (days <= 7) {
        return <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[12px] font-mono font-medium">Expires in {days}d</span>;
      }
      if (days <= 30) {
        return <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[12px] font-mono font-medium">Expires in {days}d</span>;
      }
      return <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[12px] font-mono font-medium">Valid ({days}d remaining)</span>;
    }
    return <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[12px] font-mono font-medium">Unknown</span>;
  };

  return (
    <div className="space-y-4 py-1">
      {/* Top Banner KPI Card */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex-shrink-0">
            <Lock className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-[18px] font-bold font-mono text-slate-900 dark:text-white">
                SSL / TLS Security Posture
              </h3>
              {getRiskBadge(ssl.risk_level)}
              {ssl.is_valid ? (
                <Badge variant="emerald" className="text-[12px]">Valid Handshake</Badge>
              ) : (
                <Badge variant="rose" className="text-[12px]">Handshake Failed</Badge>
              )}
            </div>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 font-normal mt-0.5">
              Target: <span className="font-mono text-slate-700 dark:text-slate-300 font-medium">{ssl.target}</span> • Cryptographic & Certificate Identity Inspection
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="p-2 px-3.5 rounded-lg border border-cyan-500/20 bg-cyan-500/5 text-right">
            <div className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">SSL Risk Score</div>
            <div className="text-xl font-bold font-mono text-cyan-400 leading-none mt-0.5">
              {ssl.risk_score} <span className="text-[12px] text-slate-500 font-normal">/ 100</span>
            </div>
          </div>
        </div>
      </div>

      {ssl.error_message && (
        <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 text-[14px] flex items-center gap-2.5 font-mono">
          <ShieldAlert className="h-5 w-5 flex-shrink-0" />
          <span>{ssl.error_message}</span>
        </div>
      )}

      {/* Grid Layout: Left Certificate Info, Right Protocol Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Certificate Metadata Card */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
            <FileCheck className="h-4.5 w-4.5 text-cyan-400" />
            <h4 className="text-[16px] font-semibold text-slate-900 dark:text-white">
              Certificate Metadata
            </h4>
          </div>

          <div className="space-y-2.5 text-[14px]">
            <DataRow label="Subject Common Name (CN)" value={cert?.subject_cn} isMono />
            <DataRow label="Issuer Common Name (CN)" value={cert?.issuer_cn} isMono />
            <DataRow label="Issuer Organization" value={cert?.issuer_organization} />
            <DataRow
              label="Signature Algorithm"
              value={cert?.signature_algorithm || "Unspecified"}
              isMono
              highlight={Boolean(cert?.signature_algorithm)}
            />
            <DataRow label="Serial Number" value={cert?.serial_number} isMono />
            <DataRow label="X.509 Version" value={cert?.version ? `v${cert.version}` : undefined} isMono />
            <DataRow label="Valid From" value={cert?.valid_from ? new Date(cert.valid_from).toUTCString() : undefined} isMono />
            <DataRow label="Valid To (Expiration)" value={cert?.valid_to ? new Date(cert.valid_to).toUTCString() : undefined} isMono />
            <div className="flex items-center justify-between py-1">
              <span className="text-slate-500 dark:text-slate-400 font-normal">Certificate Status</span>
              {getExpiryBadge(cert?.days_until_expiration, cert?.is_expired ?? false)}
            </div>

            {/* Subject Alternative Names (SANs) */}
            {cert?.subject_alternative_names && cert.subject_alternative_names.length > 0 && (
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
                <span className="text-[12px] font-medium text-slate-400 uppercase tracking-wider block">
                  Subject Alternative Names (SANs) — {cert.subject_alternative_names.length}
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1 scrollbar-thin">
                  {cert.subject_alternative_names.map((san, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[12px] font-mono text-slate-700 dark:text-slate-300"
                    >
                      {san}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Transport & Cipher Suite Security Card */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
            <KeyRound className="h-4.5 w-4.5 text-purple-400" />
            <h4 className="text-[16px] font-semibold text-slate-900 dark:text-white">
              Transport & Cipher Security
            </h4>
          </div>

          <div className="space-y-2.5 text-[14px]">
            <DataRow
              label="TLS Protocol Version"
              value={proto?.protocol_version}
              isMono
              highlight
            />
            <DataRow label="Cipher Suite Name" value={proto?.cipher_name} isMono highlight />
            <DataRow label="Cipher Protocol Version" value={proto?.cipher_version} isMono />
            <DataRow label="Encryption Key Size" value={proto?.cipher_bits ? `${proto.cipher_bits} bits` : undefined} isMono />
            <DataRow label="Handshake Latency" value={proto?.handshake_time_ms ? `${proto.handshake_time_ms} ms` : undefined} isMono />
            <DataRow label="Self-Signed Certificate" value={cert?.is_self_signed ? "Yes (Untrusted)" : "No (Trusted CA)"} />
          </div>
        </div>
      </div>

      {/* Security Observations List */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-3">
        <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
          <ShieldCheck className="h-4.5 w-4.5 text-emerald-400" />
          <h4 className="text-[16px] font-semibold text-slate-900 dark:text-white">
            SSL / TLS Security Observations ({observations.length})
          </h4>
        </div>

        <div className="space-y-2">
          {observations.map((obs, idx) => (
            <div
              key={idx}
              className={cn(
                "p-3 rounded-lg border flex items-start gap-3",
                obs.severity === "CRITICAL"
                  ? "border-rose-500/30 bg-rose-500/5 text-rose-300"
                  : obs.severity === "HIGH"
                  ? "border-orange-500/30 bg-orange-500/5 text-orange-300"
                  : obs.severity === "MEDIUM"
                  ? "border-amber-500/30 bg-amber-500/5 text-amber-300"
                  : "border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-slate-300"
              )}
            >
              {obs.severity === "CRITICAL" || obs.severity === "HIGH" ? (
                <ShieldAlert className="h-4.5 w-4.5 text-rose-400 flex-shrink-0 mt-0.5" />
              ) : obs.severity === "MEDIUM" ? (
                <AlertTriangle className="h-4.5 w-4.5 text-amber-400 flex-shrink-0 mt-0.5" />
              ) : (
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 flex-shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold text-slate-900 dark:text-white font-mono">
                    {obs.title}
                  </span>
                  <span className="text-[11px] font-mono px-1.5 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    {obs.code}
                  </span>
                </div>
                <p className="text-[14px] text-slate-600 dark:text-slate-300 font-normal leading-relaxed">
                  {obs.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

function DataRow({
  label,
  value,
  isMono,
  highlight,
}: {
  label: string;
  value?: string | number | null;
  isMono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-slate-100 dark:border-slate-800/50 last:border-0">
      <span className="text-slate-500 dark:text-slate-400 font-normal">{label}</span>
      <span
        className={cn(
          "font-normal text-right truncate max-w-[280px]",
          isMono && "font-mono text-[13px]",
          highlight ? "text-cyan-600 dark:text-cyan-400 font-semibold" : "text-slate-900 dark:text-slate-200"
        )}
      >
        {value !== null && value !== undefined && value !== "" ? String(value) : "N/A"}
      </span>
    </div>
  );
}
