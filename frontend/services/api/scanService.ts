import { apiClient } from "./client";

export type ScanStatus = "Pending" | "Queued" | "Running" | "Completed" | "Failed";

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
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string | null;
}

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
