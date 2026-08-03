import { apiClient } from "./client";

// ────────────────────────────────────────────────────────────────────────────
// DNS result types (mirror backend dns_models.py)
// ────────────────────────────────────────────────────────────────────────────

export type DnsLookupStatus = "ok" | "nxdomain" | "no_answer" | "timeout" | "error";

export interface DnsRecordResult {
  record_type: string;
  status: DnsLookupStatus;
  records: Record<string, unknown>[];
  error?: string | null;
  query_time_ms?: number | null;
}

export interface DnsScanResult {
  module_id: "dns";
  status: string;
  target: string;
  results: {
    A?: DnsRecordResult;
    AAAA?: DnsRecordResult;
    MX?: DnsRecordResult;
    NS?: DnsRecordResult;
    TXT?: DnsRecordResult;
    CNAME?: DnsRecordResult;
  };
  total_records_found: number;
  failed_lookups: string[];
  security_observations: string[];
}

// ────────────────────────────────────────────────────────────────────────────
// WHOIS result types (mirror backend whois_models.py)
// ────────────────────────────────────────────────────────────────────────────

export interface WhoisContactInfo {
  name?: string | null;
  organization?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
}

export interface WhoisObservationItem {
  title: string;
  description: string;
  severity: "INFO" | "LOW" | "MEDIUM" | "HIGH";
  recommendation: string;
}

export interface WhoisScanResult {
  module_id: "whois";
  status: string;
  target: string;
  domain?: string | null;
  registrar?: string | null;
  registrar_iana_id?: string | null;
  whois_server?: string | null;
  referral_url?: string | null;
  creation_date?: string | null;
  updated_date?: string | null;
  expiration_date?: string | null;
  registry_expiry?: string | null;
  domain_age_days?: number | null;
  days_until_expiration?: number | null;
  registrant_country?: string | null;
  registrant_organization?: string | null;
  registrant_state?: string | null;
  registrant_city?: string | null;
  registrant_email?: string | null;
  registrant_phone?: string | null;
  admin_contact?: WhoisContactInfo | null;
  tech_contact?: WhoisContactInfo | null;
  billing_contact?: WhoisContactInfo | null;
  domain_status: string[];
  name_servers: string[];
  dnssec?: string | null;
  abuse_contact_email?: string | null;
  abuse_contact_phone?: string | null;
  last_whois_update?: string | null;
  raw_whois?: string | null;
  whois_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH";
  security_observations: WhoisObservationItem[];
}

// ────────────────────────────────────────────────────────────────────────────
// SSL result types (mirror backend ssl_models.py)
// ────────────────────────────────────────────────────────────────────────────

export interface SslCertificateInfo {
  subject_cn?: string | null;
  issuer_cn?: string | null;
  issuer_organization?: string | null;
  serial_number?: string | null;
  version?: number | null;
  signature_algorithm?: string | null;
  valid_from?: string | null;
  valid_to?: string | null;
  days_until_expiration?: number | null;
  is_expired: boolean;
  is_self_signed: boolean;
  subject_alternative_names: string[];
}

export interface SslProtocolInfo {
  protocol_version?: string | null;
  cipher_name?: string | null;
  cipher_version?: string | null;
  cipher_bits?: number | null;
  handshake_time_ms?: number | null;
}

export interface SslObservationItem {
  code: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  description: string;
}

export interface SslScanResult {
  module_id: "ssl";
  status: string;
  target: string;
  is_valid: boolean;
  error_message?: string | null;
  certificate?: SslCertificateInfo | null;
  protocol?: SslProtocolInfo | null;
  risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  security_observations: SslObservationItem[];
}

// ────────────────────────────────────────────────────────────────────────────
// HTTP Headers result types (mirror backend headers_models.py)
// ────────────────────────────────────────────────────────────────────────────

export interface HeaderAnalysisItem {
  header_name: string;
  header_value?: string | null;
  status: "configured" | "missing" | "weak" | "info" | "report_only";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  description: string;
  recommendation: string;
}

export interface HeadersObservationItem {
  code: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  description: string;
}

export interface HeadersScanResult {
  module_id: "headers";
  status: string;
  target: string;
  effective_url?: string | null;
  status_code?: number | null;
  headers_count: number;
  risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  analyzed_headers: HeaderAnalysisItem[];
  raw_headers: Record<string, string>;
  security_observations: HeadersObservationItem[];
}

// ────────────────────────────────────────────────────────────────────────────
// Cookie Security result types (mirror backend cookie_models.py)
// ────────────────────────────────────────────────────────────────────────────

export interface ScoreBreakdownItem {
  label: string;
  points: number;
  category: string;
}

export interface CookieAnalysisItem {
  name: string;
  value?: string | null;
  domain?: string | null;
  path?: string | null;
  is_secure: boolean;
  is_httponly: boolean;
  samesite?: string | null;
  is_host_prefix: boolean;
  is_secure_prefix: boolean;
  is_partitioned: boolean;
  max_age?: number | null;
  expires?: string | null;
  category: string;
  category_label: string;
  weight: number;
  finding_id?: string | null;
  status: "configured" | "missing" | "weak" | "info";
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  description: string;
  recommendation: string;
}

export interface CookieObservationItem {
  code: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  description: string;
}

export interface CookieScanResult {
  module_id: "cookies";
  status: string;
  target: string;
  effective_url?: string | null;
  cookies_count: number;
  risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  analyzed_cookies: CookieAnalysisItem[];
  raw_cookies: Record<string, unknown>[];
  security_observations: CookieObservationItem[];
  score_breakdown?: ScoreBreakdownItem[];
}

// ────────────────────────────────────────────────────────────────────────────
// Technology Stack result types (mirror backend tech_models.py)
// ────────────────────────────────────────────────────────────────────────────

export interface DetectedTechnology {
  name: string;
  category: string;
  category_label: string;
  version?: string | null;
  confidence: number;
  evidence: string;
  description: string;
}

export interface TechObservationItem {
  code: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  title: string;
  description: string;
}

export interface TechScanResult {
  module_id: "tech";
  status: string;
  target: string;
  effective_url?: string | null;
  tech_count: number;
  risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  detected_technologies: DetectedTechnology[];
  security_observations: TechObservationItem[];
}

// ────────────────────────────────────────────────────────────────────────────
// Scan types
// ────────────────────────────────────────────────────────────────────────────

export type ScanStatus = "Pending" | "Queued" | "Running" | "Completed" | "Failed";

export interface ModuleResults {
  dns?: DnsScanResult;
  whois?: WhoisScanResult;
  ssl?: SslScanResult;
  headers?: HeadersScanResult;
  cookies?: CookieScanResult;
  tech?: TechScanResult;
  [key: string]: unknown;
}

export interface Scan {
  id: number;
  user_id: number;
  target_domain: string;
  scan_type: string;
  status: ScanStatus;
  progress: number;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
  duration?: number;
  summary?: string;
  module_results?: ModuleResults;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string | null;
}

// ────────────────────────────────────────────────────────────────────────────
// Service
// ────────────────────────────────────────────────────────────────────────────

export const scanService = {
  async createScan(data: { target_domain: string; scan_type: string }): Promise<ApiResponse<Scan>> {
    const res = await apiClient.post<ApiResponse<Scan>>("/scans/", data);
    return res.data;
  },

  async getScans(): Promise<ApiResponse<Scan[]>> {
    const res = await apiClient.get<ApiResponse<Scan[]>>("/scans/");
    return res.data;
  },

  async getScanById(id: number): Promise<ApiResponse<Scan>> {
    const res = await apiClient.get<ApiResponse<Scan>>(`/scans/${id}`);
    return res.data;
  },

  async deleteScan(id: number): Promise<ApiResponse<{ message: string }>> {
    const res = await apiClient.delete<ApiResponse<{ message: string }>>(`/scans/${id}`);
    return res.data;
  },
};
