"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from "recharts";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { RouteGuard } from "@/components/auth/RouteGuard";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Table, TableHeader, TableBody, TableRow, TableCell } from "@/components/ui/Table";
import { 
  ShieldCheck, 
  Radar, 
  AlertTriangle, 
  FileText, 
  CheckCircle2, 
  Plus, 
  Search, 
  Activity, 
  ExternalLink,
  Shield,
  Trash2,
  Loader2
} from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { scanService, Scan } from "@/services/api/scanService";
import { NewScanModal } from "@/components/scans/NewScanModal";
import { ScanDetailModal } from "@/components/scans/ScanDetailModal";

const chartData = [
  { name: "Mon", score: 82, findings: 4 },
  { name: "Tue", score: 85, findings: 3 },
  { name: "Wed", score: 89, findings: 2 },
  { name: "Thu", score: 88, findings: 3 },
  { name: "Fri", score: 92, findings: 1 },
  { name: "Sat", score: 95, findings: 1 },
  { name: "Sun", score: 96, findings: 0 },
];

export default function DashboardPage() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const queryClient = useQueryClient();

  const [isNewScanOpen, setIsNewScanOpen] = useState(false);
  const [selectedScan, setSelectedScan] = useState<Scan | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Auto-polling scans list from backend until scans complete
  const { data: scansResponse, isLoading: isScansLoading } = useQuery({
    queryKey: ["scans"],
    queryFn: () => scanService.getScans(),
    refetchInterval: (query) => {
      const scans = query.state.data?.data;
      const activeScans = scans?.some((s) =>
        ["Pending", "Queued", "Running"].includes(s.status)
      );
      return activeScans ? 1500 : 5000;
    },
  });

  const scans = scansResponse?.data || [];

  const deleteMutation = useMutation({
    mutationFn: (id: number) => scanService.deleteScan(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scans"] });
    },
  });

  const filteredScans = scans.filter((s) =>
    s.target_domain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeScansCount = scans.filter((s) =>
    ["Pending", "Queued", "Running"].includes(s.status)
  ).length;

  const completedScansCount = scans.filter((s) => s.status === "Completed").length;

  const getStatusBadge = (status: string, progress: number) => {
    switch (status) {
      case "Completed":
        return <Badge variant="emerald">Completed</Badge>;
      case "Running":
        return <Badge variant="cyan">Running ({progress}%)</Badge>;
      case "Queued":
        return <Badge variant="amber">Queued</Badge>;
      case "Failed":
        return <Badge variant="rose">Failed</Badge>;
      default:
        return <Badge variant="purple">Pending</Badge>;
    }
  };

  return (
    <RouteGuard>
      <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-cyber-dark text-slate-900 dark:text-slate-100 transition-colors">
        <Navbar />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-8 bg-slate-50 dark:bg-cyber-dark transition-colors overflow-hidden">
            {/* Header banner */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4"
            >
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tight">
                  <ShieldCheck className="h-7 w-7 text-cyan-600 dark:text-cyan-400" />
                  Security Operations Center
                </h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Real-time defensive posture monitoring & authorized assessment analytics.
                </p>
              </div>
              <div className="flex items-center gap-3">
                {activeScansCount > 0 && (
                  <Badge variant="cyan" className="animate-pulse flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {activeScansCount} Active Pipeline Task{activeScansCount > 1 ? "s" : ""}
                  </Badge>
                )}
                <Button variant="primary" size="sm" onClick={() => setIsNewScanOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  New Scan
                </Button>
              </div>
            </motion.div>

            {/* Metrics overview cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <Card glow className="space-y-3">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider">Total Scans Executed</span>
                  <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                    <Radar className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{scans.length}</div>
                  <span className="text-xs text-cyan-600 dark:text-cyan-400 font-semibold">
                    {completedScansCount} Completed
                  </span>
                </div>
                <div className="text-xs text-slate-500">Defensive Pipelines Enqueued</div>
              </Card>

              <Card glow className="space-y-3">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider">Active Pipelines</span>
                  <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-white">{activeScansCount}</div>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                    Auto Polling
                  </span>
                </div>
                <div className="text-xs text-slate-500">Async Workers Running</div>
              </Card>

              <Card glow className="space-y-3">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider">Warnings Intercepted</span>
                  <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-white">0</div>
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-semibold">Clean Framework</span>
                </div>
                <div className="text-xs text-slate-500">Abstract Scan Modules Ready</div>
              </Card>

              <Card glow className="space-y-3">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400">
                  <span className="text-xs font-mono font-semibold uppercase tracking-wider">Generated Reports</span>
                  <div className="p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                    <FileText className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  </div>
                </div>
                <div className="flex items-baseline justify-between">
                  <div className="text-3xl font-extrabold text-slate-900 dark:text-white">0</div>
                  <span className="text-xs text-purple-600 dark:text-purple-400 font-semibold">Framework Ready</span>
                </div>
                <div className="text-xs text-slate-500">Executive Assessments</div>
              </Card>
            </div>

            {/* Security Risk Score Analytics Chart */}
            <Card glow className="space-y-4 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Activity className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                    Security Posture Score Trend (7 Days)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Aggregated defensive health metric across all authorized target domains.
                  </p>
                </div>
                <Badge variant="emerald">Posture Index: 100/100</Badge>
              </div>

              <div className="h-64 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreGlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00f0ff" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#00f0ff" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? "#1e293b" : "#e2e8f0"} />
                    <XAxis dataKey="name" stroke={isDark ? "#94a3b8" : "#64748b"} fontSize={12} />
                    <YAxis domain={[60, 100]} stroke={isDark ? "#94a3b8" : "#64748b"} fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isDark ? "#0f172a" : "#ffffff",
                        borderColor: isDark ? "#1e293b" : "#e2e8f0",
                        color: isDark ? "#f8fafc" : "#0f172a",
                        borderRadius: "12px",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="#00f0ff"
                      strokeWidth={3}
                      fillOpacity={1}
                      fill="url(#scoreGlow)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Card>

            {/* Recent Scans Execution Table */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                  Recent Scan Executions & Pipeline Status
                </h2>
                <div className="flex items-center gap-3">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search domain..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-1.5 pl-9 pr-4 text-xs text-slate-900 dark:text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <Button variant="primary" size="sm" onClick={() => setIsNewScanOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    New Scan
                  </Button>
                </div>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell>Target Domain</TableCell>
                    <TableCell>Scan Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Progress</TableCell>
                    <TableCell>Duration</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isScansLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500 font-mono text-xs">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto text-cyan-500 mb-2" />
                        Fetching scan execution pipeline...
                      </TableCell>
                    </TableRow>
                  ) : filteredScans.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500 font-mono text-xs">
                        No scan tasks initiated yet. Click &quot;New Scan&quot; above to launch a defensive assessment.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredScans.map((scan) => (
                      <TableRow key={scan.id} className="group hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition-colors">
                        <TableCell className="font-mono text-cyan-600 dark:text-cyan-400 font-semibold">
                          {scan.target_domain}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{scan.scan_type}</TableCell>
                        <TableCell>{getStatusBadge(scan.status, scan.progress)}</TableCell>
                        <TableCell className="w-48">
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] font-mono text-slate-500">
                              <span>{scan.progress}%</span>
                              <span>{scan.status}</span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: "0%" }}
                                animate={{ width: `${scan.progress}%` }}
                                transition={{ duration: 0.3 }}
                                className={`h-full ${
                                  scan.status === "Completed"
                                    ? "bg-emerald-500"
                                    : scan.status === "Failed"
                                    ? "bg-rose-500"
                                    : "bg-cyan-500 animate-pulse"
                                }`}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-slate-500">
                          {scan.duration ? `${scan.duration}s` : scan.status === "Completed" ? "0.0s" : "Running..."}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedScan(scan);
                                setIsDetailOpen(true);
                              }}
                            >
                              <ExternalLink className="h-3.5 w-3.5 mr-1" />
                              Details
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteMutation.mutate(scan.id)}
                              className="text-slate-400 hover:text-rose-500 hover:bg-rose-500/10"
                              title="Delete Scan Record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </main>
        </div>

        {/* New Scan Modal */}
        <NewScanModal
          isOpen={isNewScanOpen}
          onClose={() => setIsNewScanOpen(false)}
          onScanCreated={() => {
            queryClient.invalidateQueries({ queryKey: ["scans"] });
          }}
        />

        {/* Scan Detail Modal */}
        <ScanDetailModal
          scan={selectedScan}
          isOpen={isDetailOpen}
          onClose={() => {
            setIsDetailOpen(false);
            setSelectedScan(null);
          }}
        />
      </div>
    </RouteGuard>
  );
}
