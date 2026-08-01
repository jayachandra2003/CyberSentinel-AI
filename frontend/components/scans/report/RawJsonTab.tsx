"use client";

import React, { useState, useCallback } from "react";
import { Copy, Check, Download, Code2, FileCode } from "lucide-react";
import { Scan } from "@/services/api/scanService";
import { cn } from "@/lib/utils";

interface RawJsonTabProps {
  scan: Scan;
}

export const RawJsonTab: React.FC<RawJsonTabProps> = ({ scan }) => {
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const jsonString = JSON.stringify(scan, null, 2);

  const handleCopyJson = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Fail silently
    }
  }, [jsonString]);

  const handleDownloadJson = useCallback(() => {
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `scan_report_${scan.target_domain.replace(/\./g, "_")}_${scan.id}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2000);
  }, [jsonString, scan]);

  return (
    <div className="space-y-4 py-1 flex-1 flex flex-col min-h-0">
      {/* Action Header — 18px Semibold Sentence Case Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <Code2 className="h-4.5 w-4.5 text-cyan-400" />
          {/* Section Title 18px Semibold Sentence Case */}
          <span className="text-[18px] font-semibold text-slate-900 dark:text-white">
            Raw JSON Payload
          </span>
          <span className="text-[13px] text-slate-500 font-normal">
            ({(new Blob([jsonString]).size / 1024).toFixed(2)} KB)
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyJson}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-all",
              copied
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 hover:border-cyan-500/40 hover:text-cyan-400"
            )}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? "Copied JSON" : "Copy JSON"}</span>
          </button>

          <button
            onClick={handleDownloadJson}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-all",
              downloaded
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 hover:border-cyan-500/40 hover:text-cyan-400"
            )}
          >
            {downloaded ? <Check className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
            <span>{downloaded ? "Downloaded" : "Download JSON"}</span>
          </button>
        </div>
      </div>

      {/* Code Container (14-15px Monospaced Technical Payload) */}
      <div className="relative flex-1 min-h-[350px] rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-950 p-4 font-mono text-[14px] overflow-auto select-text scrollbar-thin">
        <div className="absolute top-3.5 right-3.5 text-[12px] text-slate-500 flex items-center gap-1 select-none pointer-events-none font-normal">
          <FileCode className="h-3.5 w-3.5" /> JSON
        </div>
        <pre className="text-cyan-400/90 leading-relaxed font-mono whitespace-pre-wrap break-all text-[14px]">
          {jsonString}
        </pre>
      </div>
    </div>
  );
};
