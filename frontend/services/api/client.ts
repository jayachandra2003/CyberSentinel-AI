import axios, { InternalAxiosRequestConfig } from "axios";
import { env } from "@/config/env";
import { tokenStorage } from "@/lib/auth/tokenStorage";

export const apiClient = axios.create({
  baseURL: env.NEXT_PUBLIC_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000,
});

// Request Interceptor: Automatically attach JWT access token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token = tokenStorage.getAccessToken();
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else if (token) {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Response Interceptor: Catch 401 & attempt token refresh once
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Avoid infinite loop on auth endpoints (/auth/login, /auth/refresh)
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes("/auth/login") &&
      !originalRequest.url?.includes("/auth/refresh")
    ) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`;
            return apiClient(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      if (typeof window !== "undefined") {
        const refreshToken = tokenStorage.getRefreshToken();

        if (refreshToken) {
          try {
            const res = await axios.post(
              `${env.NEXT_PUBLIC_API_BASE_URL}/auth/refresh`,
              { refresh_token: refreshToken },
              { headers: { "Content-Type": "application/json" } }
            );

            if (res.data?.success && res.data?.data?.access_token) {
              const newAccessToken = res.data.data.access_token;
              const newRefreshToken = res.data.data.refresh_token || refreshToken;

              tokenStorage.setTokens(newAccessToken, newRefreshToken);

              apiClient.defaults.headers.common["Authorization"] = `Bearer ${newAccessToken}`;
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;

              processQueue(null, newAccessToken);
              return apiClient(originalRequest);
            }
          } catch (refreshErr) {
            processQueue(refreshErr, null);
            tokenStorage.clearTokens();
            if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
              window.location.href = "/login";
            }
            return Promise.reject(refreshErr);
          } finally {
            isRefreshing = false;
          }
        }
      }

      // No refresh token available
      if (typeof window !== "undefined") {
        tokenStorage.clearTokens();
      }
    }

    return Promise.reject(error);
  }
);
