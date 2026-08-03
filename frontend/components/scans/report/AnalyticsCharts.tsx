"use client";

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Scan, DnsScanResult, WhoisScanResult, SslScanResult, HeadersScanResult, CookieScanResult, TechScanResult } from "@/services/api/scanService";
import { calculateSecurityMetrics } from "./reportUtils";
import { BarChart3, PieChart as PieIcon } from "lucide-react";

interface AnalyticsChartsProps {
  scan: Scan;
}

const SEVERITY_COLORS = {
  Critical: "#f43f5e",
  High: "#f97316",
  Medium: "#f59e0b",
  Warning: "#eab308",
  Info: "#3b82f6",
};

export const AnalyticsCharts: React.FC<AnalyticsChartsProps> = ({ scan }) => {
  const metrics = calculateSecurityMetrics(scan);
  const { findingsCount } = metrics;

  const pieData = [
    { name: "Critical", value: findingsCount?.critical ?? 0 },
    { name: "High", value: findingsCount?.high ?? 0 },
    { name: "Medium", value: findingsCount?.medium ?? 0 },
    { name: "Warning", value: findingsCount?.warning ?? 0 },
    { name: "Info", value: findingsCount?.info ?? 0 },
  ].filter((d) => d.value > 0);

  // Strongly typed module breakdown bar data
  const dnsRes = scan?.module_results?.dns as DnsScanResult | undefined;
  const whoisRes = scan?.module_results?.whois as WhoisScanResult | undefined;
  const sslRes = scan?.module_results?.ssl as SslScanResult | undefined;
  const headersRes = scan?.module_results?.headers as HeadersScanResult | undefined;
  const cookiesRes = scan?.module_results?.cookies as CookieScanResult | undefined;
  const techRes = scan?.module_results?.tech as TechScanResult | undefined;

  const dnsObs = Array.isArray(dnsRes?.security_observations) ? dnsRes.security_observations.length : 0;
  const whoisObs = Array.isArray(whoisRes?.security_observations) ? whoisRes.security_observations.length : 0;
  const sslObs = Array.isArray(sslRes?.security_observations) ? sslRes.security_observations.length : 0;
  const headersObs = Array.isArray(headersRes?.security_observations) ? headersRes.security_observations.length : 0;
  const cookiesObs = Array.isArray(cookiesRes?.security_observations) ? cookiesRes.security_observations.length : 0;
  const techObs = Array.isArray(techRes?.security_observations) ? techRes.security_observations.length : 0;

  const barData = [
    { name: "DNS", findings: dnsObs },
    { name: "WHOIS", findings: whoisObs },
    { name: "SSL", findings: sslObs },
    { name: "Headers", findings: headersObs },
    { name: "Cookies", findings: cookiesObs },
    { name: "Tech", findings: techObs },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 1. Severity Distribution Doughnut Chart */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <PieIcon className="h-4 w-4 text-purple-400" />
            <h4 className="text-[15px] font-semibold text-slate-900 dark:text-white font-mono">
              Severity Distribution
            </h4>
          </div>
          <span className="text-[11px] font-mono text-slate-400">Total: {findingsCount.total}</span>
        </div>

        {pieData.length === 0 ? (
          <div className="h-44 flex items-center justify-center text-[13px] font-mono text-slate-400">
            Zero security findings detected.
          </div>
        ) : (
          <div className="h-48 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={SEVERITY_COLORS[entry.name as keyof typeof SEVERITY_COLORS] || "#64748b"}
                    />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#0f172a",
                    borderColor: "#334155",
                    borderRadius: "8px",
                    color: "#f8fafc",
                    fontSize: "12px",
                    fontFamily: "monospace",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* 2. Findings Per Module Bar Chart */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-cyan-400" />
            <h4 className="text-[15px] font-semibold text-slate-900 dark:text-white font-mono">
              Findings Per Module
            </h4>
          </div>
          <span className="text-[11px] font-mono text-slate-400">6 Modules</span>
        </div>

        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontFamily="monospace" />
              <YAxis stroke="#64748b" fontSize={11} fontFamily="monospace" allowDecimals={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0f172a",
                  borderColor: "#334155",
                  borderRadius: "8px",
                  color: "#f8fafc",
                  fontSize: "12px",
                  fontFamily: "monospace",
                }}
              />
              <Bar dataKey="findings" fill="#06b6d4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
