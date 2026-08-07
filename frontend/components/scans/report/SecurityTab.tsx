"use client";

import React, { useState } from "react";
import {
  ShieldCheck,
  Filter,
  Search,
  FileCode,
  FileSpreadsheet,
  FileText,
  Printer,
} from "lucide-react";
import { Scan } from "@/services/api/scanService";
import { extractReportFindings, calculateSecurityMetrics, ReportFinding } from "./reportUtils";
import { FindingRemediationPanel, FindingErrorBoundary } from "./FindingRemediationPanel";
import { RiskSummaryPanel } from "./RiskSummaryPanel";
import { cn } from "@/lib/utils";

interface SecurityTabProps {
  scan: Scan;
}

export const SecurityTab: React.FC<SecurityTabProps> = ({ scan }) => {
  const [filterSeverity, setFilterSeverity] = useState<string>("ALL");
  const [filterModule, setFilterModule] = useState<string>("ALL");
  const [filterCvss, setFilterCvss] = useState<string>("ALL");
  const [filterConfidence, setFilterConfidence] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [allExpanded, setAllExpanded] = useState(false);

  const findings: ReportFinding[] = extractReportFindings(scan);
  const metrics = calculateSecurityMetrics(scan);

  const criticalCount = findings.filter((f) => f.severity === "CRITICAL").length;
  const highCount = findings.filter((f) => f.severity === "HIGH").length;
  const mediumCount = findings.filter((f) => f.severity === "MEDIUM").length;
  const infoCount = findings.filter((f) => f.severity === "INFO" || f.severity === "WARNING").length;

  const filteredFindings = (findings ?? []).filter((f) => {
    if (!f) return false;
    const severity = f.severity ?? "INFO";
    const moduleName = f.module ?? "General";
    const cvssScore = f.cvss?.score ?? (severity === "CRITICAL" ? 9.1 : severity === "HIGH" ? 7.5 : severity === "MEDIUM" ? 5.3 : 3.1);
    const confidenceScore = f.confidence?.score ?? 98;

    const matchesSeverity = filterSeverity === "ALL" || severity === filterSeverity;
    const matchesModule = filterModule === "ALL" || moduleName.toUpperCase() === filterModule.toUpperCase();

    let matchesCvss = true;
    if (filterCvss === "CRITICAL") matchesCvss = cvssScore >= 9.0;
    if (filterCvss === "HIGH") matchesCvss = cvssScore >= 7.0 && cvssScore < 9.0;
    if (filterCvss === "MEDIUM") matchesCvss = cvssScore >= 4.0 && cvssScore < 7.0;

    let matchesConfidence = true;
    if (filterConfidence === "VERIFIED") matchesConfidence = confidenceScore >= 90;
    if (filterConfidence === "LIKELY") matchesConfidence = confidenceScore >= 75 && confidenceScore < 90;

    const title = f.title ?? "";
    const description = f.description ?? "";
    const recommendation = f.recommendation ?? "";
    const cwe = f.cwe?.name ?? "";
    const owasp = f.owasp?.name ?? "";
    const mitre = f.mitre?.name ?? "";

    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !query ||
      title.toLowerCase().includes(query) ||
      description.toLowerCase().includes(query) ||
      recommendation.toLowerCase().includes(query) ||
      cwe.toLowerCase().includes(query) ||
      owasp.toLowerCase().includes(query) ||
      mitre.toLowerCase().includes(query);

    return matchesSeverity && matchesModule && matchesCvss && matchesConfidence && matchesSearch;
  });

  // Export handlers
  const exportAsJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(findings, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `cybersentinel_findings_${scan.target_domain}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const exportAsSarif = () => {
    const sarifData = {
      $schema: "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
      version: "2.1.0",
      runs: [
        {
          tool: { driver: { name: "CyberSentinel AI Engine", version: "v1.7.0" } },
          results: findings.map((f) => ({
            ruleId: f.code || f.id,
            message: { text: f.title },
            locations: [{ physicalLocation: { artifactLocation: { uri: scan.target_domain } } }],
          })),
        },
      ],
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sarifData, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `cybersentinel_report_${scan.target_domain}.sarif`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const exportAsMarkdown = () => {
    const mdContent = `# CyberSentinel AI Security Report for ${scan.target_domain}\n\n` +
      `**Generated:** ${new Date().toUTCString()}\n` +
      `**Security Score:** ${metrics.score}/100\n` +
      `**Overall Risk:** ${metrics.riskLevel}\n\n` +
      `## Vulnerability Observations (${findings.length})\n\n` +
      findings.map((f) => `### [${f.severity}] ${f.title}\n- **ID:** ${f.code || f.id}\n- **Module:** ${f.module}\n- **Recommendation:** ${f.recommendation}\n`).join("\n");

    const blob = new Blob([mdContent], { type: "text/markdown;charset=utf-8;" });
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", URL.createObjectURL(blob));
    downloadAnchor.setAttribute("download", `cybersentinel_report_${scan.target_domain}.md`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-4 py-1">
      {/* 1. Executive Risk Summary Panel */}
      <RiskSummaryPanel
        metrics={metrics}
        allExpanded={allExpanded}
        onToggleExpandAll={() => setAllExpanded(!allExpanded)}
      />

      {/* 2. Top Multi-Facet Filter & Search Toolbar */}
      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Filter className="h-4.5 w-4.5 text-cyan-400" />
            <span className="text-[17px] font-semibold text-slate-900 dark:text-white font-mono">
              Vulnerability Inventory ({filteredFindings.length} / {findings.length})
            </span>
          </div>

          {/* Export Dropdown Group */}
          <div className="flex items-center gap-1.5 font-mono text-[11px] flex-wrap">
            <span className="text-slate-400 text-[10px] uppercase font-bold mr-1">Export:</span>
            <button
              onClick={exportAsJson}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 transition-colors"
            >
              <FileCode className="h-3.5 w-3.5 text-cyan-400" /> JSON
            </button>
            <button
              onClick={exportAsSarif}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 transition-colors"
            >
              <FileText className="h-3.5 w-3.5 text-purple-400" /> SARIF
            </button>
            <button
              onClick={exportAsMarkdown}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1 transition-colors"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" /> Markdown
            </button>
            <button
              onClick={() => window.print()}
              className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 flex items-center gap-1 transition-colors font-bold"
            >
              <Printer className="h-3.5 w-3.5" /> PDF / Print
            </button>
          </div>
        </div>

        {/* Dropdown Filters Row */}
        <div className="flex items-center gap-2 flex-wrap pt-1 font-mono text-[12px]">
          {/* Module Filter Dropdown */}
          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Modules</option>
            <option value="DNS">DNS Scanner</option>
            <option value="WHOIS">WHOIS Intelligence</option>
            <option value="SSL">SSL / TLS</option>
            <option value="HEADERS">HTTP Headers</option>
            <option value="COOKIES">Cookie Security</option>
            <option value="TECH">Tech Stack</option>
          </select>

          {/* CVSS Filter Dropdown */}
          <select
            value={filterCvss}
            onChange={(e) => setFilterCvss(e.target.value)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All CVSS Scores</option>
            <option value="CRITICAL">CVSS &gt;= 9.0 (Critical)</option>
            <option value="HIGH">CVSS 7.0 - 8.9 (High)</option>
            <option value="MEDIUM">CVSS 4.0 - 6.9 (Medium)</option>
          </select>

          {/* Confidence Filter Dropdown */}
          <select
            value={filterConfidence}
            onChange={(e) => setFilterConfidence(e.target.value)}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="ALL">All Confidence Levels</option>
            <option value="VERIFIED">Verified (&gt;= 90%)</option>
            <option value="LIKELY">Likely (75% - 89%)</option>
          </select>

          {/* Instant Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Filter by title, CWE, OWASP, or MITRE code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-1.5 pl-8 text-[12px] font-mono rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Severity Pills */}
        <div className="flex items-center gap-1.5 flex-wrap pt-1">
          <FilterPill
            label="All Severity"
            count={findings.length}
            isActive={filterSeverity === "ALL"}
            onClick={() => setFilterSeverity("ALL")}
          />
          <FilterPill
            label="Critical"
            count={criticalCount}
            variant="rose"
            isActive={filterSeverity === "CRITICAL"}
            onClick={() => setFilterSeverity("CRITICAL")}
          />
          <FilterPill
            label="High"
            count={highCount}
            variant="orange"
            isActive={filterSeverity === "HIGH"}
            onClick={() => setFilterSeverity("HIGH")}
          />
          <FilterPill
            label="Medium"
            count={mediumCount}
            variant="amber"
            isActive={filterSeverity === "MEDIUM"}
            onClick={() => setFilterSeverity("MEDIUM")}
          />
          <FilterPill
            label="Info / Warning"
            count={infoCount}
            variant="emerald"
            isActive={filterSeverity === "INFO"}
            onClick={() => setFilterSeverity("INFO")}
          />
        </div>
      </div>

      {/* 3. Findings List */}
      {filteredFindings.length === 0 ? (
        <div className="p-8 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-2 font-mono">
          <ShieldCheck className="h-8 w-8 text-emerald-400 mx-auto" />
          <h4 className="text-[16px] font-semibold text-slate-900 dark:text-white">
            No Matching Security Observations
          </h4>
          <p className="text-[13px] text-slate-500 dark:text-slate-400">
            No vulnerability findings match your current filter and search criteria.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {(filteredFindings ?? []).map((item, idx) => {
            const stableKey = `${item?.module || "mod"}-${item?.id || item?.code || "item"}-${idx}`;
            return (
              <FindingErrorBoundary key={stableKey} fallbackTitle={item?.title}>
                <FindingRemediationPanel finding={item} scan={scan} forceExpand={allExpanded ? true : undefined} />
              </FindingErrorBoundary>
            );
          })}
        </div>
      )}
    </div>
  );
};

function FilterPill({
  label,
  count,
  variant = "slate",
  isActive,
  onClick,
}: {
  label: string;
  count: number;
  variant?: "slate" | "rose" | "orange" | "amber" | "yellow" | "emerald";
  isActive: boolean;
  onClick: () => void;
}) {
  const variantStyles = {
    slate: isActive ? "border-cyan-500/40 bg-cyan-500/10 text-cyan-400 font-semibold" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-medium",
    rose: isActive ? "border-rose-500/40 bg-rose-500/10 text-rose-400 font-semibold" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-medium",
    orange: isActive ? "border-orange-500/40 bg-orange-500/10 text-orange-400 font-semibold" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-medium",
    amber: isActive ? "border-amber-500/40 bg-amber-500/10 text-amber-400 font-semibold" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-medium",
    yellow: isActive ? "border-amber-500/40 bg-amber-500/10 text-amber-300 font-semibold" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-medium",
    emerald: isActive ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400 font-semibold" : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 font-medium",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[12px] font-mono transition-all",
        variantStyles[variant]
      )}
    >
      <span>{label}</span>
      <span className="px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-800 text-[10px] font-mono font-medium">
        {count}
      </span>
    </button>
  );
}
