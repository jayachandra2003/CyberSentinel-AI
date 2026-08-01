import { Scan, DnsScanResult } from "@/services/api/scanService";

export type SeverityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "WARNING" | "INFO";

export interface FindingItem {
  id: string;
  severity: SeverityLevel;
  title: string;
  description: string;
  recommendation: string;
  module: string;
}

export interface SecurityReportMetrics {
  score: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  modulesPassed: number;
  totalModules: number;
  findingsCount: {
    critical: number;
    high: number;
    medium: number;
    warning: number;
    info: number;
    total: number;
  };
  duration: number | null;
}

const PATTERNS: { severity: SeverityLevel; regexes: RegExp[] }[] = [
  {
    severity: "CRITICAL",
    regexes: [
      /zone transfer/i,
      /open resolver/i,
      /dangling cname/i,
      /\+all/i,
      /dnssec.*validation failed/i,
      /critical misconfiguration/i,
    ],
  },
  {
    severity: "HIGH",
    regexes: [
      /wildcard.*mx/i,
      /expired certificate/i,
      /unencrypted protocol/i,
      /sql injection/i,
      /xss/i,
    ],
  },
  {
    severity: "MEDIUM",
    regexes: [
      /missing dmarc/i,
      /dmarc.*missing/i,
      /no dmarc/i,
      /weak cipher/i,
      /missing hsts/i,
    ],
  },
  {
    severity: "WARNING",
    regexes: [
      /missing spf/i,
      /spf.*missing/i,
      /no spf/i,
      /no ipv6/i,
      /missing ipv6/i,
      /long ttl/i,
      /single nameserver/i,
    ],
  },
  {
    severity: "INFO",
    regexes: [
      /spf record.*found/i,
      /dnssec.*enabled/i,
      /ipv6.*configured/i,
      /dmarc.*found/i,
      /configured correctly/i,
      /redundant/i,
    ],
  },
];

export function classifyObservationSeverity(text: string): SeverityLevel {
  for (const group of PATTERNS) {
    if (group.regexes.some((r) => r.test(text))) {
      return group.severity;
    }
  }
  return "WARNING"; // default fallback for unclassified observations
}

export function deriveRecommendation(text: string, severity: SeverityLevel): string {
  const lower = text.toLowerCase();

  if (lower.includes("dmarc")) {
    return "Publish a DMARC policy record (e.g. 'v=DMARC1; p=reject; rua=mailto:dmarc@yourdomain.com') to prevent email spoofing and domain impersonation.";
  }
  if (lower.includes("spf")) {
    if (severity === "INFO") {
      return "Maintain SPF record accuracy and ensure all authorized outbound mail servers remain explicitly declared.";
    }
    return "Create a valid SPF record with strict enforcement (~all or -all) to specify authorized mail senders for your domain.";
  }
  if (lower.includes("ipv6") || lower.includes("aaaa")) {
    return "Configure IPv6 (AAAA records) across primary DNS nameservers for dual-stack accessibility compliance and global reachability.";
  }
  if (lower.includes("nameserver") || lower.includes("ns")) {
    return "Ensure at least 2 geographically distributed, redundant nameservers are configured for high availability and fault tolerance.";
  }
  if (severity === "CRITICAL" || severity === "HIGH") {
    return "Immediate remediation required. Review infrastructure configuration to eliminate high-risk vulnerabilities.";
  }
  return "Follow industry hardening standards and monitor security posture regularly.";
}

export function extractReportFindings(scan: Scan): FindingItem[] {
  const dns = scan.module_results?.dns as DnsScanResult | undefined;
  const observations = dns?.security_observations ?? [];

  return observations.map((obs, idx) => {
    const severity = classifyObservationSeverity(obs);
    return {
      id: `dns-obs-${idx}`,
      severity,
      title: obs,
      description: obs,
      recommendation: deriveRecommendation(obs, severity),
      module: "DNS Scanner",
    };
  });
}

export function calculateSecurityMetrics(scan: Scan): SecurityReportMetrics {
  const findings = extractReportFindings(scan);

  let critical = 0;
  let high = 0;
  let medium = 0;
  let warning = 0;
  let info = 0;

  findings.forEach((f) => {
    switch (f.severity) {
      case "CRITICAL":
        critical++;
        break;
      case "HIGH":
        high++;
        break;
      case "MEDIUM":
        medium++;
        break;
      case "WARNING":
        warning++;
        break;
      case "INFO":
        info++;
        break;
    }
  });

  // Calculate dynamic security score (100 base)
  let score = 100;
  score -= critical * 25;
  score -= high * 15;
  score -= medium * 10;
  score -= warning * 5;

  if (score < 0) score = 0;
  if (score > 100) score = 100;

  // Determine Risk Level based on score
  let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
  if (score < 50 || critical > 0) {
    riskLevel = "CRITICAL";
  } else if (score < 75 || high > 0) {
    riskLevel = "HIGH";
  } else if (score < 90 || medium > 0) {
    riskLevel = "MEDIUM";
  }

  // Count modules: DNS scanner is 1 total module currently
  const totalModules = 1;
  const modulesPassed = critical === 0 && high === 0 ? 1 : 0;

  return {
    score,
    riskLevel,
    modulesPassed,
    totalModules,
    findingsCount: {
      critical,
      high,
      medium,
      warning,
      info,
      total: findings.length,
    },
    duration: scan.duration ?? null,
  };
}
