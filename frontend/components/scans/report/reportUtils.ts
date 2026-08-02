import { Scan, DnsScanResult, WhoisScanResult, SslScanResult, HeadersScanResult } from "@/services/api/scanService";

export type UnifiedModule = "DNS" | "WHOIS" | "SSL" | "Headers";
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
      /certificate expired/i,
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
      /weak signature algorithm/i,
      /self-signed certificate/i,
      /weak tls protocol/i,
      /missing.*hsts/i,
      /missing.*content-security-policy/i,
      /missing.*x-frame-options/i,
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
      /certificate expiring soon/i,
      /missing.*x-content-type-options/i,
      /missing.*referrer-policy/i,
      /weak.*directives/i,
      /csp.*report-only/i,
      /report-only mode/i,
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
      /missing.*permissions-policy/i,
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
      /ssl\/tls posture healthy/i,
      /valid ssl certificate/i,
      /http security posture healthy/i,
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

  if (lower.includes("report-only")) {
    return "Review violation telemetry logs and migrate Content-Security-Policy-Report-Only to an enforced Content-Security-Policy header.";
  }
  if (lower.includes("hsts") || lower.includes("strict-transport-security")) {
    return "Add 'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload' to web server response headers.";
  }
  if (lower.includes("content-security-policy") || lower.includes("csp")) {
    return "Implement a restrictive Content-Security-Policy header defining trusted script-src, object-src, and default-src resource origins.";
  }
  if (lower.includes("x-frame-options") || lower.includes("clickjacking")) {
    return "Set 'X-Frame-Options: DENY' or 'SAMEORIGIN' to prevent malicious Clickjacking frame embedding.";
  }
  if (lower.includes("x-content-type-options") || lower.includes("mime")) {
    return "Set 'X-Content-Type-Options: nosniff' to disable browser MIME-type sniffing.";
  }
  if (lower.includes("referrer-policy")) {
    return "Set 'Referrer-Policy: strict-origin-when-cross-origin' to restrict HTTP Referer header path disclosures.";
  }
  if (lower.includes("server") || lower.includes("powered-by")) {
    return "Configure web server or application framework to suppress version numbers and technology disclosure headers.";
  }
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
    return "Ensure domain registration auto-renewal and SSL certificate lifecycle renewal automation is enabled to prevent unplanned service outage.";
  }
  if (lower.includes("tls") || lower.includes("cipher") || lower.includes("ssl")) {
    return "Enforce modern TLS 1.2+ protocols, strong AEAD cipher suites (e.g., AES-GCM or ChaCha20-Poly1305), and ensure valid CA chain trust.";
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

  // 3. SSL Module Findings
  const ssl = scan.module_results.ssl as SslScanResult | undefined;
  if (ssl && Array.isArray(ssl.security_observations)) {
    ssl.security_observations.forEach((obs, idx) => {
      if (obs && typeof obs === "object") {
        const title = obs.title || "SSL Security Observation";
        const description = obs.description || title;
        const severity = normalizeSeverity(obs.severity);
        const recommendation = deriveRecommendation(description, severity);

        findings.push({
          id: `ssl-obs-${idx}`,
          module: "SSL",
          severity,
          title,
          description,
          recommendation,
        });
      }
    });
  }

  // 4. Headers Module Findings
  const headersModule = scan.module_results.headers as HeadersScanResult | undefined;
  if (headersModule && Array.isArray(headersModule.security_observations)) {
    headersModule.security_observations.forEach((obs, idx) => {
      if (obs && typeof obs === "object") {
        const title = obs.title || "HTTP Headers Security Observation";
        const description = obs.description || title;
        const severity = normalizeSeverity(obs.severity);
        const recommendation = deriveRecommendation(description, severity);

        findings.push({
          id: `headers-obs-${idx}`,
          module: "Headers",
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
    totalModules: 4,
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

  // Integrate WHOIS, SSL, and Headers risk scores dynamically if present
  const whois = scan.module_results?.whois as WhoisScanResult | undefined;
  const ssl = scan.module_results?.ssl as SslScanResult | undefined;
  const headersModule = scan.module_results?.headers as HeadersScanResult | undefined;

  const componentScores = [score];
  if (whois && typeof whois.whois_score === "number") {
    componentScores.push(whois.whois_score);
  }
  if (ssl && typeof ssl.risk_score === "number") {
    componentScores.push(100 - ssl.risk_score);
  }
  if (headersModule && typeof headersModule.risk_score === "number") {
    componentScores.push(100 - headersModule.risk_score);
  }

  score = Math.round(componentScores.reduce((a, b) => a + b, 0) / componentScores.length);

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

  // Count executed modules dynamically from backend scan results
  const hasDns = Boolean(scan.module_results?.dns);
  const hasWhois = Boolean(scan.module_results?.whois);
  const hasSsl = Boolean(scan.module_results?.ssl);
  const hasHeaders = Boolean(scan.module_results?.headers);

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

  if (hasSsl) {
    totalModules += 1;
    const sslStatus = (scan.module_results?.ssl as SslScanResult)?.status;
    if (sslStatus === "completed") {
      modulesPassed += 1;
    }
  }

  if (hasHeaders) {
    totalModules += 1;
    const headersStatus = (scan.module_results?.headers as HeadersScanResult)?.status;
    if (headersStatus === "completed") {
      modulesPassed += 1;
    }
  }

  if (totalModules === 0) {
    totalModules = 4;
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
