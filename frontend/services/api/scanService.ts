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
// Scan types
// ────────────────────────────────────────────────────────────────────────────

export type ScanStatus = "Pending" | "Queued" | "Running" | "Completed" | "Failed";

export interface ModuleResults {
  dns?: DnsScanResult;
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
