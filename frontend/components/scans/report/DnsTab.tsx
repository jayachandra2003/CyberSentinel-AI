"use client";

import React, { useState, useCallback } from "react";
import {
  Server,
  Wifi,
  Mail,
  Globe,
  FileText,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Download,
  ShieldAlert,
  Database,
  Layers,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DnsScanResult } from "@/services/api/scanService";
import { cn } from "@/lib/utils";

interface DnsTabProps {
  dns: DnsScanResult;
}

const RECORD_ORDER = ["A", "AAAA", "MX", "NS", "TXT", "CNAME"] as const;

const RECORD_ICONS: Record<string, React.ReactNode> = {
  A: <Server className="h-4.5 w-4.5 text-cyan-400" />,
  AAAA: <Wifi className="h-4.5 w-4.5 text-purple-400" />,
  MX: <Mail className="h-4.5 w-4.5 text-amber-400" />,
  NS: <Globe className="h-4.5 w-4.5 text-blue-400" />,
  TXT: <FileText className="h-4.5 w-4.5 text-emerald-400" />,
  CNAME: <ArrowRight className="h-4.5 w-4.5 text-rose-400" />,
};

export const DnsTab: React.FC<DnsTabProps> = ({ dns }) => {
  const [expandedType, setExpandedType] = useState<string | null>("A");
  const [copiedAll, setCopiedAll] = useState(false);
  const [exported, setExported] = useState(false);

  const toggleAccordion = (type: string) => {
    setExpandedType((prev) => (prev === type ? null : type));
  };

  const getRecordText = (rtype: string, record: Record<string, unknown>): string => {
    switch (rtype) {
      case "A":
      case "AAAA":
        return String(record.address ?? "");
      case "MX":
        return `${record.preference} ${record.exchange}`.trim();
      case "NS":
        return String(record.nameserver ?? "");
      case "TXT": {
        const vals = record.values as string[] | undefined;
        return (vals ?? []).join(" ");
      }
      case "CNAME":
        return String(record.target ?? "");
      default:
        return JSON.stringify(record);
    }
  };

  const handleCopyAll = useCallback(async () => {
    const lines: string[] = [];
    RECORD_ORDER.forEach((rtype) => {
      const res = dns.results[rtype];
      if (res?.status === "ok" && res.records.length > 0) {
        lines.push(`; ${rtype} Records`);
        res.records.forEach((rec) => {
          lines.push(getRecordText(rtype, rec));
        });
        lines.push("");
      }
    });

    try {
      await navigator.clipboard.writeText(lines.join("\n").trim());
      setCopiedAll(true);
      setTimeout(() => setCopiedAll(false), 1800);
    } catch {
      // Fail silently if clipboard unpermitted
    }
  }, [dns]);

  const handleExportJson = useCallback(() => {
    const payload = {
      module: "dns",
      target: dns.target,
      results: dns.results,
      total_records_found: dns.total_records_found,
      failed_lookups: dns.failed_lookups,
      security_observations: dns.security_observations,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `dns_results_${dns.target.replace(/\./g, "_")}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  }, [dns]);

  return (
    <div className="space-y-4 py-1">
      {/* Top Toolbar — Sentence Case 18px Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center gap-2.5">
          <Database className="h-4.5 w-4.5 text-cyan-400" />
          {/* Section Title 18px Semibold */}
          <span className="text-[18px] font-semibold text-slate-900 dark:text-white">
            DNS Record Modules
          </span>
          <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium text-[12px]">
            {dns.total_records_found} Records Extracted
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyAll}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-all",
              copiedAll
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 hover:border-cyan-500/40 hover:text-cyan-400"
            )}
          >
            {copiedAll ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedAll ? "Copied All" : "Copy All"}</span>
          </button>

          <button
            onClick={handleExportJson}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-all",
              exported
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 hover:border-cyan-500/40 hover:text-cyan-400"
            )}
          >
            {exported ? <Check className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
            <span>{exported ? "Exported" : "Export JSON"}</span>
          </button>
        </div>
      </div>

      {/* Accordions List (16px Accordion Header & 14-15px Monospaced Record Data) */}
      <div className="space-y-2.5">
        {RECORD_ORDER.map((rtype) => {
          const result = dns.results[rtype];
          if (!result) return null;

          const isExpanded = expandedType === rtype;
          const hasRecords = result.status === "ok" && result.records.length > 0;

          return (
            <div
              key={rtype}
              className="border border-slate-200 dark:border-slate-800/80 rounded-xl overflow-hidden bg-white dark:bg-slate-900/40 transition-all"
            >
              {/* Accordion Header (16px Semibold) */}
              <button
                onClick={() => toggleAccordion(rtype)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 text-left transition-colors",
                  isExpanded
                    ? "bg-slate-100/80 dark:bg-slate-800/60"
                    : "bg-slate-50/50 dark:bg-slate-900/20 hover:bg-slate-100/50 dark:hover:bg-slate-800/40"
                )}
              >
                <div className="flex items-center gap-3">
                  {RECORD_ICONS[rtype] ?? <Layers className="h-4.5 w-4.5 text-slate-400" />}
                  <div className="flex items-center gap-2">
                    <span className="text-[16px] font-semibold text-slate-900 dark:text-white">
                      {rtype} Records
                    </span>
                    <span className="text-[13px] text-slate-500 dark:text-slate-400 font-normal">
                      ({result.records?.length || 0})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <DnsStatusPill status={result.status} />
                  {isExpanded ? (
                    <ChevronDown className="h-4.5 w-4.5 text-slate-400" />
                  ) : (
                    <ChevronRight className="h-4.5 w-4.5 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Accordion Body: Table View (14-15px Technical Values) */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden border-t border-slate-200 dark:border-slate-800"
                  >
                    {!hasRecords ? (
                      <div className="p-3.5 px-4 text-[14px] text-slate-500 dark:text-slate-400 italic">
                        {result.error || `No ${rtype} records found for target domain.`}
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {/* Table Column Headers (12px Medium Upper) */}
                        <div className="hidden sm:grid grid-cols-12 gap-3 px-4 py-2 bg-slate-100/50 dark:bg-slate-950/40 text-[12px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-800">
                          <div className="col-span-8 sm:col-span-9">Record Content / Technical Value</div>
                          <div className="col-span-2 text-right">TTL</div>
                          <div className="col-span-2 sm:col-span-1 text-center">Action</div>
                        </div>

                        {result.records.map((rec, i) => (
                          <DnsRecordRowItem
                            key={i}
                            rtype={rtype}
                            record={rec}
                            getText={() => getRecordText(rtype, rec)}
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
};

function DnsRecordRowItem({
  rtype,
  record,
  getText,
}: {
  rtype: string;
  record: Record<string, unknown>;
  getText: () => string;
}) {
  const [copied, setCopied] = useState(false);
  const [expandedTxt, setExpandedTxt] = useState(false);
  const ttl = record.ttl as number | undefined;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(getText());
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fail silently
    }
  };

  // Render values per type (14-15px Monospaced Technical Record Data)
  const renderContent = () => {
    if (rtype === "MX") {
      const pref = record.preference as number;
      const exch = (record.exchange as string | undefined) ?? "";
      // Check RFC 7505 Null MX
      const isNullMX = pref === 0 && (exch === "." || exch.trim() === "");

      if (isNullMX) {
        return (
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border border-rose-500/30 bg-rose-500/10 text-[12px] font-medium text-rose-400">
              <ShieldAlert className="h-3.5 w-3.5" />
              NULL MX — RFC 7505
            </div>
            <p className="text-[13px] text-slate-500 dark:text-slate-400">
              This domain explicitly rejects email.
            </p>
          </div>
        );
      }

      return (
        <div className="flex items-center gap-2 flex-wrap font-mono text-[14px]">
          <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-medium">
            Priority {pref}
          </span>
          <span className="text-slate-400">→</span>
          <span className="text-slate-800 dark:text-slate-200 font-normal break-all">{exch}</span>
        </div>
      );
    }

    if (rtype === "TXT") {
      const vals = record.values as string[] | undefined;
      const fullText = (vals ?? []).join(" ");
      const isLong = fullText.length > 90;

      return (
        <div className="space-y-1 font-mono text-[14px]">
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-1 min-w-0 flex-1">
              {(vals ?? []).map((v, idx) => (
                <span
                  key={idx}
                  className={cn(
                    "block font-mono text-emerald-600 dark:text-emerald-400 text-[14px] font-normal break-all leading-relaxed",
                    !expandedTxt && isLong && "line-clamp-2"
                  )}
                >
                  {v}
                </span>
              ))}
            </div>

            {isLong && (
              <button
                onClick={() => setExpandedTxt((v) => !v)}
                className="text-[12px] text-cyan-500 hover:text-cyan-400 flex items-center gap-1 flex-shrink-0 pt-0.5"
              >
                {expandedTxt ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
                {expandedTxt ? "Less" : "More"}
              </button>
            )}
          </div>
        </div>
      );
    }

    if (rtype === "A" || rtype === "AAAA") {
      return (
        <span className="font-mono text-cyan-600 dark:text-cyan-400 text-[14px] font-normal break-all">
          {String(record.address)}
        </span>
      );
    }

    if (rtype === "NS") {
      return (
        <span className="font-mono text-blue-600 dark:text-blue-400 text-[14px] font-normal break-all">
          {String(record.nameserver)}
        </span>
      );
    }

    if (rtype === "CNAME") {
      return (
        <span className="font-mono text-rose-600 dark:text-rose-400 text-[14px] font-normal break-all">
          {String(record.target)}
        </span>
      );
    }

    return <span className="font-mono text-[14px] text-slate-500 break-all">{JSON.stringify(record)}</span>;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-3 px-4 py-2.5 bg-white/40 dark:bg-slate-950/20 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors items-center">
      {/* Content Column (14-15px Monospaced Record Data) */}
      <div className="sm:col-span-8 lg:col-span-9 min-w-0">{renderContent()}</div>

      {/* TTL Column */}
      <div className="sm:col-span-2 text-left sm:text-right font-mono text-[13px] text-slate-500 dark:text-slate-400">
        {ttl !== undefined ? (
          <span className="inline-block px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 text-[12px] font-normal">
            {ttl}s
          </span>
        ) : (
          <span className="text-[12px] text-slate-400">—</span>
        )}
      </div>

      {/* Action Column */}
      <div className="sm:col-span-2 lg:col-span-1 flex items-center sm:justify-center">
        <button
          onClick={handleCopy}
          title="Copy Record"
          className={cn(
            "p-1.5 rounded-lg border transition-all flex items-center justify-center gap-1 w-full sm:w-auto text-[12px] font-medium",
            copied
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
              : "border-slate-200 dark:border-slate-800 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/30"
          )}
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          <span className="sm:hidden text-[11px]">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
    </div>
  );
}

function DnsStatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ok: { label: "OK", cls: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" },
    nxdomain: { label: "NXDOMAIN", cls: "bg-rose-500/10 text-rose-400 border-rose-500/30" },
    no_answer: { label: "No Answer", cls: "bg-amber-500/10 text-amber-400 border-amber-500/30" },
    timeout: { label: "Timeout", cls: "bg-orange-500/10 text-orange-400 border-orange-500/30" },
    error: { label: "Error", cls: "bg-rose-500/10 text-rose-400 border-rose-500/30" },
  };
  const { label, cls } = map[status] ?? { label: status, cls: "bg-slate-500/10 text-slate-400 border-slate-500/30" };

  return (
    <span className={cn("px-2.5 py-0.5 rounded-full border text-[11px] font-medium uppercase tracking-wider", cls)}>
      {label}
    </span>
  );
}
