"use client";

import React, { useState } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code,
  Shield,
  Copy,
  Check,
  Target,
} from "lucide-react";
import { ReportFinding } from "./reportUtils";
import { Scan } from "@/services/api/scanService";
import { AIRecommendationCard } from "./AIRecommendationCard";
import { AssetInfoPanel } from "./AssetInfoPanel";
import { ExploitabilityPanel } from "./ExploitabilityPanel";
import { RemediationPriorityCard } from "./RemediationPriorityCard";
import { EvidenceViewer } from "./EvidenceViewer";
import { ComplianceMatrixPanel } from "./ComplianceMatrixPanel";
import { FindingActionsBar } from "./FindingActionsBar";
import { cn } from "@/lib/utils";

interface FindingErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface FindingErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class FindingErrorBoundary extends React.Component<FindingErrorBoundaryProps, FindingErrorBoundaryState> {
  constructor(props: FindingErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): FindingErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("FindingRemediationPanel caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-500/5 space-y-2 text-[13px]">
          <div className="flex items-center gap-2 font-mono text-rose-400 font-bold">
            <AlertTriangle className="h-4 w-4" />
            <span>Observation Render Fallback</span>
          </div>
          <p className="text-slate-300 font-mono text-[12px]">
            {this.props.fallbackTitle || "An observation item could not be formatted cleanly."}
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

interface FindingRemediationPanelProps {
  finding?: ReportFinding;
  scan?: Scan | null;
  forceExpand?: boolean;
}

export const FindingRemediationPanel: React.FC<FindingRemediationPanelProps> = ({
  finding,
  scan,
  forceExpand,
}) => {
  const [isExpandedLocal, setIsExpandedLocal] = useState(false);
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"nginx" | "apache" | "express" | "iis" | "node" | "cloudflare">("nginx");

  if (!finding) return null;

  const isExpanded = forceExpand !== undefined ? forceExpand : isExpandedLocal;

  const severity = finding?.severity ?? "INFO";
  const id = finding?.id ?? "TCK-000";
  const title = finding?.title ?? "Security Observation";
  const description = finding?.description ?? "No description available.";
  const recommendation = finding?.recommendation ?? "Follow standard web security posture hardening guidelines.";

  // CVSS derivation
  const cvssScore = finding?.cvss?.score ?? (severity === "CRITICAL" ? 9.1 : severity === "HIGH" ? 7.5 : severity === "MEDIUM" ? 5.3 : 3.1);
  const cvssRating = finding?.cvss?.rating ?? (cvssScore >= 9.0 ? "Critical" : cvssScore >= 7.0 ? "High" : cvssScore >= 4.0 ? "Medium" : "Low");

  const confidenceScore = finding?.confidence?.score ?? 98;
  const confidenceLabel = finding?.confidence?.label ?? (confidenceScore >= 90 ? "Verified" : confidenceScore >= 75 ? "Likely" : "Possible");
  const statusLabel = finding?.status ?? "Active";

  // Step-by-Step Remediation
  const remediationSteps: string[] = finding?.remediationSteps ?? [
    `Step 1: Inspect server configurations for missing ${title} directives.`,
    `Step 2: Apply the framework-specific fix snippet below to web server or application proxy.`,
    `Step 3: Reload web server daemon and verify header response using cURL or CyberSentinel re-scan.`,
  ];

  // Framework Snippets
  const getFrameworkSnippet = () => {
    const customFixes = finding?.frameworkFixes;
    if (customFixes && typeof customFixes === "object" && customFixes[activeTab]) {
      return customFixes[activeTab];
    }

    if (id.includes("HSTS") || title.includes("HSTS")) {
      switch (activeTab) {
        case "nginx":
          return `add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;`;
        case "apache":
          return `Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"`;
        case "iis":
          return `<add name="Strict-Transport-Security" value="max-age=31536000; includeSubDomains; preload" />`;
        case "express":
          return `app.use(helmet.hsts({ maxAge: 31536000, includeSubDomains: true, preload: true }));`;
        case "node":
          return `res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');`;
        case "cloudflare":
          return `Cloudflare Dashboard -> SSL/TLS -> Edge Certificates -> Enable HSTS (max-age 12 months).`;
      }
    }

    switch (activeTab) {
      case "nginx":
        return `# /etc/nginx/nginx.conf\nadd_header Content-Security-Policy "default-src 'self';" always;\nadd_header X-Frame-Options "SAMEORIGIN" always;\nserver_tokens off;`;
      case "apache":
        return `# /etc/apache2/conf-available/security.conf\nHeader always set Content-Security-Policy "default-src 'self';"\nHeader always set X-Frame-Options "SAMEORIGIN"\nServerTokens Prod`;
      case "express":
        return `// Node.js Express (Helmet)\nconst helmet = require('helmet');\napp.use(helmet());`;
      case "iis":
        return `<!-- web.config -->\n<system.webServer>\n  <httpProtocol>\n    <customHeaders>\n      <add name="X-Frame-Options" value="SAMEORIGIN" />\n    </customHeaders>\n  </httpProtocol>\n</system.webServer>`;
      case "node":
        return `res.setHeader('X-Frame-Options', 'SAMEORIGIN');`;
      case "cloudflare":
        return `Cloudflare Transform Rules -> Modify Response Header -> Add Security Headers.`;
      default:
        return "Configure web server or proxy to set strict defensive security headers.";
    }
  };

  const handleCopyCode = () => {
    const code = getFrameworkSnippet();
    navigator.clipboard.writeText(code);
    setCopiedTab(activeTab);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  return (
    <div
      className={cn(
        "rounded-xl border transition-all space-y-3 p-4 shadow-sm",
        severity === "CRITICAL"
          ? "border-rose-500/40 bg-rose-950/20"
          : severity === "HIGH"
          ? "border-orange-500/40 bg-orange-950/20"
          : severity === "MEDIUM"
          ? "border-amber-500/40 bg-amber-950/20"
          : "border-slate-800 bg-slate-900/60"
      )}
    >
      {/* Header Row */}
      <div
        className="flex items-start justify-between gap-3 cursor-pointer select-none"
        onClick={() => setIsExpandedLocal(!isExpandedLocal)}
      >
        <div className="flex items-start gap-3 min-w-0">
          {severity === "CRITICAL" ? (
            <ShieldAlert className="h-5 w-5 text-rose-400 flex-shrink-0 mt-0.5" />
          ) : severity === "HIGH" ? (
            <AlertTriangle className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
          ) : severity === "MEDIUM" ? (
            <AlertTriangle className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="h-5 w-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          )}

          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap font-mono text-[12px]">
              {/* Vulnerability ID */}
              <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-400 font-bold border border-slate-700">
                {id}
              </span>

              {/* CVSS Badge */}
              <span
                className={cn(
                  "px-2 py-0.5 rounded-full font-bold border text-[11px]",
                  cvssScore >= 9.0
                    ? "bg-rose-500/20 text-rose-400 border-rose-500/40"
                    : cvssScore >= 7.0
                    ? "bg-orange-500/20 text-orange-400 border-orange-500/40"
                    : cvssScore >= 4.0
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                    : "bg-blue-500/20 text-blue-400 border-blue-500/40"
                )}
              >
                CVSS {cvssScore.toFixed(1)} ({cvssRating})
              </span>

              {/* Confidence Badge */}
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 text-[11px]">
                {confidenceLabel} ({confidenceScore}%)
              </span>

              {/* Status Chip */}
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-semibold">
                Status: {statusLabel}
              </span>
            </div>

            {/* Title */}
            <h4 className="text-[16px] font-bold text-slate-900 dark:text-white font-mono leading-snug">
              {title}
            </h4>
          </div>
        </div>

        <button className="p-1 text-slate-400 hover:text-white transition-colors flex-shrink-0 mt-1">
          {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
        </button>
      </div>

      {/* Expanded Enterprise 2-Column Responsive Layout */}
      {isExpanded && (
        <div className="pt-3 border-t border-slate-800 space-y-4">
          {/* Top SOC Action Toolbar */}
          <FindingActionsBar finding={finding} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 text-[13px]">
            {/* LEFT COLUMN (Span 2) */}
            <div className="lg:col-span-2 space-y-4">
              {/* 1. CyberSentinel AI SOC Recommendation */}
              <AIRecommendationCard finding={finding} targetDomain={scan?.target_domain} />

              {/* 2. Technical Description */}
              <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 space-y-1.5 font-normal">
                <div className="flex items-center gap-1.5 font-bold font-mono text-slate-200 text-[13px]">
                  <Target className="h-4 w-4 text-cyan-400" />
                  <span>Technical Description & Vulnerability Mechanics</span>
                </div>
                <p className="text-slate-300 leading-relaxed text-[12.5px]">
                  {description}
                </p>
              </div>

              {/* 3. Interactive Scan Evidence Viewer */}
              <EvidenceViewer finding={finding} scan={scan} />

              {/* 4. Actionable Step-by-Step Remediation */}
              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 space-y-2.5">
                <div className="flex items-center gap-2 font-bold font-mono text-emerald-400 text-[13px]">
                  <Shield className="h-4 w-4" />
                  <span>Actionable Remediation Guidance & Steps</span>
                </div>
                <p className="text-slate-200 text-[12.5px] leading-relaxed font-sans">
                  {recommendation}
                </p>
                <ul className="space-y-1.5 text-slate-200 font-mono text-[12px]">
                  {remediationSteps.map((step, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-emerald-400 font-bold">•</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* 5. Framework-Specific Fix Snippets */}
              <div className="space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2 font-mono">
                  <span className="text-[12px] font-semibold text-slate-200 flex items-center gap-1.5">
                    <Code className="h-4 w-4 text-purple-400" /> Enterprise Configuration Fix Snippets
                  </span>

                  <div className="flex items-center gap-1">
                    {(["nginx", "apache", "express", "iis", "node", "cloudflare"] as const).map((fw) => (
                      <button
                        key={fw}
                        onClick={() => setActiveTab(fw)}
                        className={cn(
                          "px-2.5 py-1 text-[11px] font-mono rounded transition-colors uppercase font-medium",
                          activeTab === fw
                            ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 font-bold"
                            : "bg-slate-800 text-slate-400 hover:text-slate-200"
                        )}
                      >
                        {fw}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative group">
                  <pre className="p-3.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[12px] text-purple-300 overflow-x-auto leading-relaxed">
                    {getFrameworkSnippet()}
                  </pre>

                  <button
                    onClick={handleCopyCode}
                    className="absolute top-2.5 right-2.5 px-2.5 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-[11px] font-mono flex items-center gap-1.5 transition-colors"
                  >
                    {copiedTab === activeTab ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Copy Snippet
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN (Span 1) */}
            <div className="space-y-4">
              {/* 1. Exploitability Metrics Panel */}
              <ExploitabilityPanel finding={finding} />

              {/* 2. Affected Infrastructure Asset Panel */}
              <AssetInfoPanel finding={finding} scan={scan} />

              {/* 3. SOC Remediation Planning & SLA */}
              <RemediationPriorityCard finding={finding} />

              {/* 4. Enterprise Compliance Matrix */}
              <ComplianceMatrixPanel finding={finding} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
