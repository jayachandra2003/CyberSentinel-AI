"use client";

import React, { useState, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { scanService, BatchScanResponse } from "@/services/api/scanService";
import { Layers, AlertTriangle, CheckCircle2, Send } from "lucide-react";

interface BatchScanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BatchScanModal: React.FC<BatchScanModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [rawInput, setRawInput] = useState("");
  const [profile, setProfile] = useState("Standard Scan");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<BatchScanResponse | null>(null);

  // Client-side domain validation helper
  const parseTargets = useMemo(() => {
    const lines = rawInput
      .split("\n")
      .map((l) => l.trim().toLowerCase())
      .filter((l) => l.length > 0);

    const validSet = new Set<string>();
    const duplicates: string[] = [];
    const invalid: string[] = [];

    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    const forbidden = ["localhost", "127.0.0.1", "0.0.0.0"];

    lines.forEach((line) => {
      const clean = line.replace(/^(https?:\/\/)?/, "").split("/")[0].split(":")[0];
      if (forbidden.includes(clean) || clean.startsWith("192.168.") || clean.startsWith("10.")) {
        invalid.push(line);
      } else if (!domainRegex.test(clean)) {
        invalid.push(line);
      } else if (validSet.has(clean)) {
        duplicates.push(clean);
      } else {
        validSet.add(clean);
      }
    });

    return {
      valid: Array.from(validSet),
      duplicates,
      invalid,
      total: lines.length,
    };
  }, [rawInput]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parseTargets.valid.length === 0) {
      setErrorMsg("Please enter at least one valid domain target.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setResult(null);

    try {
      const res = await scanService.createBatchScans({
        targets: parseTargets.valid,
        profile,
      });

      if (res.success && res.data) {
        setResult(res.data);
        onSuccess();
      } else {
        setErrorMsg(res.error || "Batch submission failed.");
      }
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { detail?: string } }; message?: string };
      const msg = errorResponse?.response?.data?.detail || errorResponse?.message || "Failed to submit batch scans.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setRawInput("");
    setResult(null);
    setErrorMsg(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleReset} title="Batch Scan Submission Engine">
      <div className="space-y-4 p-1">
        {!result ? (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="h-4 w-4 text-cyan-500" />
                  Multi-Target Batch Reconnaissance
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Enter target domain names (one per line). Up to 10 targets per batch.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-400">Profile:</label>
                <select
                  value={profile}
                  onChange={(e) => setProfile(e.target.value)}
                  className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="Standard Scan">Standard Scan (6 Modules)</option>
                  <option value="Quick Scan">Quick Scan (3 Modules)</option>
                  <option value="Compliance Scan">Compliance Scan (3 Modules)</option>
                  <option value="Full Scan">Full Scan (Deep Audit)</option>
                </select>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-400 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>TARGET INPUT TEXTAREA</span>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400">Valid: {parseTargets.valid.length}</span>
                  <span className="text-amber-400">Duplicates: {parseTargets.duplicates.length}</span>
                  <span className="text-rose-400">Invalid: {parseTargets.invalid.length}</span>
                </div>
              </div>
              <textarea
                value={rawInput}
                onChange={(e) => setRawInput(e.target.value)}
                placeholder={"example.com\ngithub.com\ncloudflare.com\ncyber-sentinel.io"}
                rows={6}
                className="w-full bg-slate-900/80 border border-slate-300 dark:border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-900 dark:text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <span className="text-[11px] text-slate-500">
                Max batch size: <strong className="text-slate-400">10 targets</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || parseTargets.valid.length === 0}
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Send className="h-3.5 w-3.5" />
                  {isSubmitting ? "Enqueuing Batch..." : `Submit Batch (${parseTargets.valid.length})`}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="space-y-4 font-sans text-xs">
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-5 w-5" />
                <span>Batch Enqueued Successfully</span>
              </div>
              <Badge variant="emerald" className="font-mono">ID: {result.batch_id}</Badge>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/60">
                <div className="text-[11px] text-slate-400">Total Targets</div>
                <div className="text-lg font-bold font-mono text-white mt-0.5">{result.total_jobs}</div>
              </div>
              <div className="p-2.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10">
                <div className="text-[11px] text-cyan-400">Queued Jobs</div>
                <div className="text-lg font-bold font-mono text-cyan-300 mt-0.5">{result.queued_jobs}</div>
              </div>
              <div className="p-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10">
                <div className="text-[11px] text-rose-400">Skipped / Failed</div>
                <div className="text-lg font-bold font-mono text-rose-300 mt-0.5">{result.failed_targets.length}</div>
              </div>
            </div>

            {result.scan_ids.length > 0 && (
              <div className="space-y-1">
                <div className="text-[11px] text-slate-400 font-mono">ENQUEUED SCAN IDS</div>
                <div className="flex items-center gap-1.5 flex-wrap font-mono text-[11px]">
                  {result.scan_ids.map((id) => (
                    <span key={id} className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-400 font-semibold">
                      #{id}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.failed_targets.length > 0 && (
              <div className="space-y-1">
                <div className="text-[11px] text-rose-400 font-mono">SKIPPED TARGETS</div>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {result.failed_targets.map((item, idx) => (
                    <div key={idx} className="p-1.5 px-2 rounded bg-rose-950/40 border border-rose-500/20 text-rose-300 flex items-center justify-between text-[11px]">
                      <span className="font-mono">{item.target}</span>
                      <span className="text-[10px] text-rose-400">{item.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={handleReset}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
              >
                Close & View Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
