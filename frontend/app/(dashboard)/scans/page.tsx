"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import {
  scanService,
  Scan,
  EngineQueueStatus,
  EngineScanDetails,
} from "@/services/api/scanService";
import { EngineQueueWidget } from "@/components/scans/EngineQueueWidget";
import { BatchScanModal } from "@/components/scans/BatchScanModal";
import { EngineScanDetailsModal } from "@/components/scans/EngineScanDetailsModal";
import { ScanDetailModal } from "@/components/scans/ScanDetailModal";
import {
  Radar,
  Send,
  Layers,
  Search,
  XCircle,
  Eye,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Activity,
  RefreshCw,
} from "lucide-react";

export default function ScansPage() {
  const [targetInput, setTargetInput] = useState("");
  const [profile, setProfile] = useState("Standard Scan");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Queue health status & Scans list
  const [queueStatus, setQueueStatus] = useState<EngineQueueStatus | null>(null);
  const [scans, setScans] = useState<Scan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Modals
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [selectedScanDetails, setSelectedScanDetails] = useState<EngineScanDetails | null>(null);
  const [selectedReportScan, setSelectedReportScan] = useState<Scan | null>(null);

  // Data fetching callback
  const fetchData = useCallback(async () => {
    try {
      const [queueRes, scansRes] = await Promise.all([
        scanService.getEngineQueueStatus(),
        scanService.getScans(),
      ]);

      if (queueRes.success && queueRes.data) {
        setQueueStatus(queueRes.data);
      }
      if (scansRes.success && scansRes.data) {
        setScans(scansRes.data);
      }
    } catch (err) {
      console.error("Failed to refresh scan engine data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Poll every 5 seconds (no WebSockets)
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Handle single scan submission
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetInput.trim()) return;

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await scanService.createSingleScan({
        target: targetInput.trim(),
        profile,
      });

      if (res.success && res.data) {
        setSuccessMsg(`Scan #${res.data.scan_id} enqueued successfully for '${res.data.target}'.`);
        setTargetInput("");
        fetchData();
      } else {
        setErrorMsg(res.error || "Scan submission failed.");
      }
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { detail?: string } }; message?: string };
      const msg = errorResponse?.response?.data?.detail || errorResponse?.message || "Failed to submit scan.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle cancellation
  const handleCancelScan = async (scanId: number) => {
    try {
      const res = await scanService.cancelScan(scanId);
      if (res.success) {
        setSuccessMsg(`Scan #${scanId} cancelled successfully.`);
        fetchData();
      }
    } catch (err: unknown) {
      const errorResponse = err as { response?: { data?: { detail?: string } }; message?: string };
      const msg = errorResponse?.response?.data?.detail || errorResponse?.message || "Failed to cancel scan.";
      setErrorMsg(msg);
    }
  };

  // Open scan details modal
  const handleViewDetails = async (scanId: number) => {
    try {
      const res = await scanService.getEngineScanDetails(scanId);
      if (res.success && res.data) {
        setSelectedScanDetails(res.data);
      }
    } catch (err) {
      console.error("Failed to load details:", err);
    }
  };

  // Filtered scans list
  const filteredScans = scans.filter((s) => {
    const matchesSearch = s.target_domain.toLowerCase().includes(searchQuery.toLowerCase());
    if (statusFilter === "ALL") return matchesSearch;
    return matchesSearch && s.status.toUpperCase() === statusFilter;
  });

  const getStatusBadge = (statusStr: string, progress: number) => {
    switch (statusStr.toUpperCase()) {
      case "COMPLETED":
        return <Badge variant="emerald">Completed</Badge>;
      case "RUNNING":
        return <Badge variant="cyan">Running ({progress}%)</Badge>;
      case "QUEUED":
        return <Badge variant="amber">Queued</Badge>;
      case "FAILED":
        return <Badge variant="rose">Failed</Badge>;
      case "CANCELLED":
        return <Badge variant="slate">Cancelled</Badge>;
      default:
        return <Badge variant="purple">{statusStr}</Badge>;
    }
  };

  return (
    <ProtectedRoute>
      <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-cyber-dark text-slate-900 dark:text-slate-100 transition-colors">
        <Navbar />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 p-6 space-y-6 bg-slate-50 dark:bg-cyber-dark transition-colors overflow-hidden font-sans">
            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="border-b border-slate-200 dark:border-slate-800 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Radar className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
                  Enterprise Scan Engine Dashboard
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Multi-target security scan orchestrator, dynamic queue health monitor, and module execution console.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsBatchModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center gap-2 border border-slate-700 transition-colors"
                >
                  <Layers className="h-4 w-4 text-cyan-400" />
                  Batch New Scan
                </button>
                <button
                  onClick={fetchData}
                  className="p-2 rounded-xl border border-slate-300 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  title="Refresh Dashboard"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                </button>
              </div>
            </motion.div>

            {/* Error / Success Toast Banners */}
            <AnimatePresence>
              {errorMsg && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-rose-400 flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                    <span>{errorMsg}</span>
                  </div>
                  <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white font-bold ml-2">
                    ✕
                  </button>
                </motion.div>
              )}

              {successMsg && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 flex items-center justify-between text-xs font-mono"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                  <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-white font-bold ml-2">
                    ✕
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Single Scan Submission Card */}
            <Card glow className="p-5">
              <form onSubmit={handleSingleSubmit} className="flex flex-col md:flex-row items-center gap-3">
                <div className="flex-1 w-full relative">
                  <input
                    type="text"
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    placeholder="Enter target domain or hostname (e.g. example.com, target.org)"
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono transition-colors"
                  />
                </div>

                <div className="w-full md:w-48">
                  <select
                    value={profile}
                    onChange={(e) => setProfile(e.target.value)}
                    className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500 font-sans"
                  >
                    <option value="Standard Scan">Standard Scan (6 Modules)</option>
                    <option value="Quick Scan">Quick Scan (3 Modules)</option>
                    <option value="Compliance Scan">Compliance Scan (3 Modules)</option>
                    <option value="Full Scan">Full Scan (Deep Audit)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !targetInput.trim()}
                  className="w-full md:w-auto px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors flex-shrink-0"
                >
                  <Send className="h-4 w-4" />
                  {isSubmitting ? "Enqueuing..." : "Start Scan"}
                </button>
              </form>
            </Card>

            {/* Queue Health Status KPI Widget */}
            <EngineQueueWidget status={queueStatus} isLoading={isLoading} />

            {/* Active Scans Console Section */}
            <Card glow className="p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-cyan-500" />
                  <h3 className="text-base font-bold text-slate-900 dark:text-white font-mono">
                    Scan Jobs Execution Log
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">({filteredScans.length} items)</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Search Bar */}
                  <div className="relative">
                    <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search domain..."
                      className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-lg pl-8 pr-3 py-1 text-xs text-slate-900 dark:text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>

                  {/* Filter Pills */}
                  <div className="flex items-center gap-1 font-mono text-[11px]">
                    {["ALL", "RUNNING", "QUEUED", "COMPLETED", "FAILED", "CANCELLED"].map((f) => (
                      <button
                        key={f}
                        onClick={() => setStatusFilter(f)}
                        className={`px-2.5 py-1 rounded-md transition-colors ${
                          statusFilter === f
                            ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40 font-bold"
                            : "text-slate-400 hover:text-white hover:bg-slate-800"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Scans Table */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-slate-100 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-mono text-[11px]">
                      <tr>
                        <th className="p-3 px-4">Target Domain</th>
                        <th className="p-3 px-4">Profile</th>
                        <th className="p-3 px-4">Status</th>
                        <th className="p-3 px-4">Execution Progress</th>
                        <th className="p-3 px-4">Duration</th>
                        <th className="p-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-slate-950">
                      {filteredScans.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-slate-500 dark:text-slate-400 font-mono">
                            No scan jobs matching the current filter.
                          </td>
                        </tr>
                      ) : (
                        filteredScans.map((s) => {
                          const isPending = s.status.toUpperCase() === "QUEUED" || s.status.toUpperCase() === "RUNNING";

                          return (
                            <tr key={s.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                              {/* Domain */}
                              <td className="p-3 px-4">
                                <div className="font-bold font-mono text-slate-900 dark:text-white text-sm">
                                  {s.target_domain}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">ID #{s.id}</div>
                              </td>

                              {/* Profile */}
                              <td className="p-3 px-4">
                                <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300">
                                  {s.scan_type}
                                </span>
                              </td>

                              {/* Status */}
                              <td className="p-3 px-4">
                                {getStatusBadge(s.status, s.progress)}
                              </td>

                              {/* Progress */}
                              <td className="p-3 px-4 min-w-[180px]">
                                <div className="space-y-1">
                                  <div className="flex items-center justify-between text-[11px] font-mono">
                                    <span className="text-slate-400">Progress</span>
                                    <span className="font-bold text-cyan-400">{s.progress}%</span>
                                  </div>
                                  <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                                    <div
                                      className={`h-full transition-all duration-500 ${
                                        s.status.toUpperCase() === "COMPLETED"
                                          ? "bg-emerald-500"
                                          : s.status.toUpperCase() === "FAILED"
                                          ? "bg-rose-500"
                                          : "bg-cyan-500"
                                      }`}
                                      style={{ width: `${s.progress}%` }}
                                    />
                                  </div>
                                </div>
                              </td>

                              {/* Duration */}
                              <td className="p-3 px-4 font-mono text-[11px] text-slate-400">
                                {s.duration ? `${s.duration}s` : "In Progress..."}
                              </td>

                              {/* Actions */}
                              <td className="p-3 px-4 text-right">
                                <div className="flex items-center justify-end gap-1.5">
                                  {isPending && (
                                    <button
                                      onClick={() => handleCancelScan(s.id)}
                                      className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-medium flex items-center gap-1 transition-colors"
                                      title="Cancel Scan"
                                    >
                                      <XCircle className="h-3.5 w-3.5" />
                                      Cancel
                                    </button>
                                  )}

                                  <button
                                    onClick={() => handleViewDetails(s.id)}
                                    className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium flex items-center gap-1 transition-colors"
                                    title="View Engine Console Details"
                                  >
                                    <Eye className="h-3.5 w-3.5 text-cyan-400" />
                                    Details
                                  </button>

                                  {s.status.toUpperCase() === "COMPLETED" && (
                                    <button
                                      onClick={() => setSelectedReportScan(s)}
                                      className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium flex items-center gap-1 transition-colors"
                                      title="View Full Report"
                                    >
                                      <FileText className="h-3.5 w-3.5" />
                                      Report
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </Card>
          </main>
        </div>
      </div>

      {/* Batch Scan Submission Modal */}
      <BatchScanModal
        isOpen={isBatchModalOpen}
        onClose={() => setIsBatchModalOpen(false)}
        onSuccess={fetchData}
      />

      {/* Engine Details Console Modal */}
      <EngineScanDetailsModal
        isOpen={!!selectedScanDetails}
        onClose={() => setSelectedScanDetails(null)}
        details={selectedScanDetails}
      />

      {/* Full Assessment Report Modal */}
      {selectedReportScan && (
        <ScanDetailModal
          isOpen={!!selectedReportScan}
          onClose={() => setSelectedReportScan(null)}
          scan={selectedReportScan}
        />
      )}
    </ProtectedRoute>
  );
}
