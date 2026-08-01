import { Scan, DnsScanResult, WhoisScanResult } from "@/services/api/scanService";

export type UnifiedModule = "DNS" | "WHOIS";
export type SeverityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "WARNING" | "INFO";

export interface FindingItem {
  id: string;
  module: UnifiedModule;
  severity: SeverityLevel;
  title: string;
  description: string;
  recommendation: string;
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
      /domain expired/i,
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
      /domain status hold/i,
      /registered < 7 days/i,
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
      /expires soon/i,
      /recently registered/i,
      /connection timeout/i,
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
      /missing domain creation date/i,
    ],
  },
  {
    severity: "INFO",
    regexes: [
      /spf record.*found/i,
      /dnssec.*enabled/i,
      /no dnssec/i,
      /ipv6.*configured/i,
      /dmarc.*found/i,
      /configured correctly/i,
      /redundant/i,
      /long-lived/i,
      /privacy protection/i,
    ],
  },
];

export function classifyObservationSeverity(text: string): SeverityLevel {
  for (const group of PATTERNS) {
    if (group.regexes.some((r) => r.test(text))) {
      return group.severity;
    }
  }
  return "WARNING";
}

export function normalizeSeverity(rawSeverity?: string | null): SeverityLevel {
  if (!rawSeverity) return "INFO";
  const upper = rawSeverity.toUpperCase().trim();
  if (upper === "CRITICAL") return "CRITICAL";
  if (upper === "HIGH") return "HIGH";
  if (upper === "MEDIUM") return "MEDIUM";
  if (upper === "WARNING") return "WARNING";
  if (upper === "LOW" || upper === "INFO") return "INFO";
  return "INFO";
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
  if (lower.includes("expired") || lower.includes("expires")) {
    return "Ensure domain registration auto-renewal is enabled at your registrar to prevent unplanned service expiration.";
  }
  if (severity === "CRITICAL" || severity === "HIGH") {
    return "Immediate remediation required. Review infrastructure configuration to eliminate high-risk vulnerabilities.";
  }
  return "Follow industry hardening standards and monitor security posture regularly.";
}

export function extractReportFindings(scan?: Scan | null): FindingItem[] {
  const findings: FindingItem[] = [];

  if (!scan || !scan.module_results) {
    return findings;
  }

  // 1. DNS Module Findings
  const dns = scan.module_results.dns as DnsScanResult | undefined;
  if (dns && Array.isArray(dns.security_observations)) {
    dns.security_observations.forEach((obs, idx) => {
      if (typeof obs === "string" && obs.trim()) {
        const severity = classifyObservationSeverity(obs);
        findings.push({
          id: `dns-obs-${idx}`,
          module: "DNS",
          severity,
          title: obs,
          description: obs,
          recommendation: deriveRecommendation(obs, severity),
        });
      }
    });
  }

  // 2. WHOIS Module Findings
  const whois = scan.module_results.whois as WhoisScanResult | undefined;
  if (whois && Array.isArray(whois.security_observations)) {
    whois.security_observations.forEach((obs, idx) => {
      if (obs && typeof obs === "object") {
        const title = obs.title || "WHOIS Security Observation";
        const description = obs.description || title;
        const severity = normalizeSeverity(obs.severity);
        const recommendation =
          obs.recommendation || deriveRecommendation(description, severity);

        findings.push({
          id: `whois-obs-${idx}`,
          module: "WHOIS",
          severity,
          title,
          description,
          recommendation,
        });
      }
    });
  }

  return findings;
}

export function calculateSecurityMetrics(scan?: Scan | null): SecurityReportMetrics {
  const emptyMetrics: SecurityReportMetrics = {
    score: 100,
    riskLevel: "LOW",
    modulesPassed: 0,
    totalModules: 2,
    findingsCount: { critical: 0, high: 0, medium: 0, warning: 0, info: 0, total: 0 },
    duration: null,
  };

  if (!scan) {
    return emptyMetrics;
  }

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
      default:
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

  // Integrate WHOIS score if present
  const whois = scan.module_results?.whois as WhoisScanResult | undefined;
  if (whois && typeof whois.whois_score === "number") {
    score = Math.round((score + whois.whois_score) / 2);
  }

  if (score < 0) score = 0;
  if (score > 100) score = 100;

  let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
  if (score < 50 || critical > 0) {
    riskLevel = "CRITICAL";
  } else if (score < 75 || high > 0) {
    riskLevel = "HIGH";
  } else if (score < 90 || medium > 0) {
    riskLevel = "MEDIUM";
  }

  // Count executed modules safely
  const hasDns = Boolean(scan.module_results?.dns);
  const hasWhois = Boolean(scan.module_results?.whois);
  
  let totalModules = 0;
  let modulesPassed = 0;

  if (hasDns) {
    totalModules += 1;
    const dnsStatus = (scan.module_results?.dns as DnsScanResult)?.status;
    if (dnsStatus === "completed" || dnsStatus === "ok") {
      modulesPassed += 1;
    }
  }

  if (hasWhois) {
    totalModules += 1;
    const whoisStatus = (scan.module_results?.whois as WhoisScanResult)?.status;
    if (whoisStatus === "completed") {
      modulesPassed += 1;
    }
  }

  if (totalModules === 0) {
    totalModules = 2; // Default planned Phase 3 modules
  }

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
