"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { scanService } from "@/services/api/scanService";
import { Globe, Radar, AlertCircle } from "lucide-react";
import axios from "axios";

interface NewScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanCreated: () => void;
}

export const NewScanModal: React.FC<NewScanModalProps> = ({ isOpen, onClose, onScanCreated }) => {
  const [targetDomain, setTargetDomain] = useState("");
  const [scanType, setScanType] = useState("Quick Scan");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetDomain.trim()) {
      setError("Target domain is required.");
      return;
    }

    // Clean target domain input (strip http:// or https:// if provided)
    const cleanedDomain = targetDomain.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "");

    setIsLoading(true);
    setError(null);

    try {
      const res = await scanService.createScan({
        target_domain: cleanedDomain,
        scan_type: scanType,
      });

      if (res.success) {
        setTargetDomain("");
        onScanCreated();
        onClose();
      } else {
        setError(res.error || "Failed to launch scan.");
      }
    } catch (err: unknown) {
      // Log full error to console for diagnostics (DevTools → Console)
      console.error("[NewScanModal] Scan creation error:", err);

      if (axios.isAxiosError(err)) {
        if (!err.response) {
          // True network error: backend is unreachable or connection was refused/reset.
          // err.code: "ERR_NETWORK" | "ECONNREFUSED" | "ECONNABORTED" (timeout)
          setError(
            `Cannot connect to backend server. ` +
            `Ensure FastAPI is running on http://127.0.0.1:8000 ` +
            `(uvicorn app.main:app --port 8000). Error: ${err.code ?? err.message}`
          );
        } else {
          // Backend returned an HTTP error response (4xx / 5xx).
          // Extract the most specific error detail from the response body.
          const body = err.response.data as {
            detail?: string | Array<{ msg: string }>;
            error?: string;
            message?: string;
          };
          const detail =
            (typeof body?.detail === "string" ? body.detail : null) ??
            (Array.isArray(body?.detail) ? body.detail.map((d: { msg: string }) => d.msg).join("; ") : null) ??
            body?.error ??
            body?.message ??
            `HTTP ${err.response.status}: ${err.message}`;
          setError(detail);
        }
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred. Check the browser console.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Launch Defensive Target Assessment">
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        {error && (
          <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Target Domain Input */}
        <div className="space-y-1.5">
          <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Target Domain
          </label>
          <div className="relative">
            <Globe className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="example.com"
              value={targetDomain}
              onChange={(e) => setTargetDomain(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
              required
            />
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Enter authorized domain (e.g. example.com, mycompany.org).
          </p>
        </div>

        {/* Scan Type Select */}
        <div className="space-y-1.5">
          <label className="block text-xs font-mono font-semibold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Scan Execution Type
          </label>
          <div className="relative">
            <Radar className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <select
              value={scanType}
              onChange={(e) => setScanType(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100/80 dark:bg-slate-950 py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all cursor-pointer"
            >
              <option value="Quick Scan">Quick Scan (Rapid Defensive Baseline)</option>
              <option value="Full Scan">Full Scan (Comprehensive Posture Audit)</option>
            </select>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
          <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            <Radar className="h-4 w-4 mr-1.5" />
            Submit Scan Task
          </Button>
        </div>
      </form>
    </Modal>
  );
};
