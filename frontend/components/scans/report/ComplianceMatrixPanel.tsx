"use client";

import React from "react";
import { Award } from "lucide-react";
import { ReportFinding } from "./reportUtils";

interface ComplianceMatrixPanelProps {
  finding: ReportFinding;
}

export const ComplianceMatrixPanel: React.FC<ComplianceMatrixPanelProps> = ({ finding }) => {
  const title = finding?.title ?? "Security Observation";

  const complianceStandards = [
    {
      framework: "ISO 27001:2022",
      req: "A.8.24 / A.8.9",
      name: "Use of Cryptography & Configuration Management",
      status: "Non-Compliant",
      explanation: `Missing defensive configuration (${title}) violates technical control requirements for endpoint hardening.`,
    },
    {
      framework: "SOC 2 Type II",
      req: "CC6.6 / CC6.7",
      name: "Boundary Defense & Data Transmission",
      status: "Gap Identified",
      explanation: "Security control failure impacts SOC 2 Trust Services Criteria for Confidentiality and Integrity.",
    },
    {
      framework: "PCI DSS v4.0",
      req: "Req 6.4.3 / 4.1",
      name: "Web Header Protection & Encryption in Transit",
      status: "Action Required",
      explanation: "Mandates defensive header configuration and TLS protocol enforcement across payment processing boundaries.",
    },
    {
      framework: "HIPAA Security",
      req: "45 CFR §164.312",
      name: "Technical Safeguards & Transmission Security",
      status: "Audit Review",
      explanation: "Requires encryption in transit and safeguards against unauthorized eavesdropping of ePHI.",
    },
    {
      framework: "GDPR Article 32",
      req: "Art. 32(1)(a)",
      name: "Security of Processing & Data Protection",
      status: "Control Deficient",
      explanation: "Technical measures must ensure ongoing confidentiality, integrity, availability, and resilience.",
    },
    {
      framework: "NIST CSF v2.0",
      req: "PR.DS-02 / PR.IR-01",
      name: "Data-at-Rest & Data-in-Transit Protection",
      status: "Non-Compliant",
      explanation: "Insecure transport or missing browser protections expose communications to adversary interception.",
    },
    {
      framework: "CIS Controls v8",
      req: "Control 3.10 / 9.2",
      name: "Data Protection & Web Browser Protections",
      status: "Control Missing",
      explanation: "Requires enforcing anti-exploitation controls, HTTP security headers, and strong TLS configurations.",
    },
  ];

  return (
    <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 space-y-2.5 font-mono text-[11.5px]">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2 text-purple-400 font-bold text-[13px]">
          <Award className="h-4 w-4" />
          <span>Enterprise Regulatory Compliance Matrix</span>
        </div>
        <span className="text-[11px] text-slate-400">7 Global Frameworks</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-slate-300">
        {complianceStandards.map((std, idx) => (
          <div key={idx} className="p-2.5 rounded bg-slate-900 border border-slate-800 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-purple-300 font-bold text-[11px]">{std.framework}</span>
              <span className="px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[10px] font-bold">
                {std.status}
              </span>
            </div>
            <div className="text-slate-400 text-[10.5px]">
              <strong className="text-slate-300">{std.req}:</strong> {std.name}
            </div>
            <p className="text-slate-400 text-[10px] leading-tight font-sans pt-0.5">
              {std.explanation}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};
