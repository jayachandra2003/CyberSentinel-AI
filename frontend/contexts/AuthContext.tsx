"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { authService, UserResponse } from "@/services/api/authService";
import { LoginFormData } from "@/lib/validation/authSchemas";
import { tokenStorage } from "@/lib/auth/tokenStorage";

interface AuthContextType {
  user: UserResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  rememberDevice: boolean;
  login: (data: LoginFormData) => Promise<boolean>;
  logout: (reason?: string) => Promise<void>;
  refreshSession: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [rememberDevice, setRememberDevice] = useState<boolean>(false);

  // Restore Session on App Load / Page Refresh
  const restoreSession = useCallback(async () => {
    setIsLoading(true);
    if (typeof window !== "undefined") {
      const token = tokenStorage.getAccessToken();
      const refreshToken = tokenStorage.getRefreshToken();
      setRememberDevice(false);

      if (token) {
        try {
          // Fetch GET /api/v1/auth/me to populate user globally
          const res = await authService.getCurrentUser();
          if (res.success && res.data) {
            setUser(res.data);
            setIsAuthenticated(true);
            setIsLoading(false);
            return;
          }
        } catch (err) {
          // Attempt refresh if access token expired
          if (refreshToken) {
            try {
              const refreshRes = await authService.refreshToken(refreshToken);
              if (refreshRes.success && refreshRes.data.access_token) {
                tokenStorage.setTokens(refreshRes.data.access_token, refreshRes.data.refresh_token);
                const meRes = await authService.getCurrentUser();
                if (meRes.success && meRes.data) {
                  setUser(meRes.data);
                  setIsAuthenticated(true);
                  setIsLoading(false);
                  return;
                }
              }
            } catch (rErr) {
              // Refresh failed — clear tokens cleanly
              tokenStorage.clearTokens();
            }
          } else {
            tokenStorage.clearTokens();
          }
        }
      } else {
        tokenStorage.clearTokens();
      }
    }
    setUser(null);
    setIsAuthenticated(false);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  const login = async (data: LoginFormData): Promise<boolean> => {
    try {
      const res = await authService.loginUser(data);
      if (res.success && res.data.access_token) {
        tokenStorage.setTokens(res.data.access_token, res.data.refresh_token);
        setRememberDevice(false);

        setUser(res.data.user);
        setIsAuthenticated(true);
        return true;
      }
    } catch (err) {
      throw err;
    }
    return false;
  };

  const logout = async (reason?: string) => {
    try {
      await authService.logoutUser();
    } catch (err) {
      // Ignore backend logout errors
    } finally {
      if (typeof window !== "undefined") {
        tokenStorage.clearTokens();
        if (reason) {
          sessionStorage.setItem("logout_reason", reason);
        }
      }
      setUser(null);
      setIsAuthenticated(false);
      setRememberDevice(false);
    }
  };

  const refreshSession = async (): Promise<boolean> => {
    await restoreSession();
    return isAuthenticated;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        rememberDevice,
        login,
        logout,
        refreshSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
