export type Role = "SUPER_ADMIN" | "ADMIN" | "ANALYST" | "AUDITOR" | "USER";

export interface User {
  id: number;
  email: string;
  full_name: string | null;
  role: Role;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export type ScanStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";

export type Severity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface Scan {
  id: number;
  target_id: number;
  user_id: number;
  status: ScanStatus;
  scan_type: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface Vulnerability {
  id: number;
  scan_id: number;
  title: string;
  description: string;
  severity: Severity;
  cve_id: string | null;
  remediation_guidance: string | null;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: string | null;
  meta: {
    timestamp: string;
    version: string;
  };
}
