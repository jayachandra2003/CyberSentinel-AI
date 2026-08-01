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
// Scan types
// ────────────────────────────────────────────────────────────────────────────

export type ScanStatus = "Pending" | "Queued" | "Running" | "Completed" | "Failed";

export interface ModuleResults {
  dns?: DnsScanResult;
  whois?: WhoisScanResult;
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
