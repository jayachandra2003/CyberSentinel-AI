/**
 * Token Storage Helper — Secure Session Storage Management.
 * Uses sessionStorage so closing the browser window/tab automatically terminates the session.
 * Clears both sessionStorage and localStorage to clean legacy state.
 */

export const tokenStorage = {
  getAccessToken(): string | null {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("token") || localStorage.getItem("token");
  },

  getRefreshToken(): string | null {
    if (typeof window === "undefined") return null;
    return sessionStorage.getItem("refresh_token") || localStorage.getItem("refresh_token");
  },

  setTokens(accessToken: string, refreshToken?: string): void {
    if (typeof window === "undefined") return;
    sessionStorage.setItem("token", accessToken);
    if (refreshToken) {
      sessionStorage.setItem("refresh_token", refreshToken);
    }
    // Clean up legacy localStorage tokens
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("remember_device");
  },

  clearTokens(): void {
    if (typeof window === "undefined") return;
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("refresh_token");
    sessionStorage.removeItem("logout_reason");
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("remember_device");
  },
};
