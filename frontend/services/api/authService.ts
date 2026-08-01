import { apiClient } from "./client";
import { LoginFormData } from "@/lib/validation/authSchemas";

export interface UserResponse {
  id: number;
  email: string;
  full_name?: string;
  role: string;
  is_active: boolean;
  is_verified: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: UserResponse;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string | null;
  meta?: {
    timestamp: string;
    version: string;
  };
}

export const authService = {
  async registerUser(data: {
    email: string;
    password: string;
    full_name?: string;
  }): Promise<ApiResponse<UserResponse>> {
    const res = await apiClient.post<ApiResponse<UserResponse>>("/auth/register", {
      email: data.email,
      password: data.password,
      full_name: data.full_name || undefined,
    });
    return res.data;
  },

  async loginUser(data: LoginFormData): Promise<ApiResponse<TokenResponse>> {
    const res = await apiClient.post<ApiResponse<TokenResponse>>("/auth/login", {
      email: data.email,
      password: data.password,
    });
    return res.data;
  },

  async refreshToken(refreshToken: string): Promise<ApiResponse<TokenResponse>> {
    const res = await apiClient.post<ApiResponse<TokenResponse>>("/auth/refresh", {
      refresh_token: refreshToken,
    });
    return res.data;
  },

  async logoutUser(): Promise<ApiResponse<{ message: string }>> {
    const res = await apiClient.post<ApiResponse<{ message: string }>>("/auth/logout");
    return res.data;
  },

  async getCurrentUser(): Promise<ApiResponse<UserResponse>> {
    const res = await apiClient.get<ApiResponse<UserResponse>>("/auth/me");
    return res.data;
  },

  async getHealth(): Promise<ApiResponse<{ status: string }>> {
    const res = await apiClient.get("/health");
    return res.data;
  },
};
