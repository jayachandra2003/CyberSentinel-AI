"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { SessionLoadingScreen } from "@/components/ui/SessionLoadingScreen";

const protectedRoutes = [
  "/dashboard",
  "/scans",
  "/reports",
  "/settings",
  "/profile",
  "/api-keys",
];

const publicAuthRoutes = ["/login", "/register"];

export const RouteGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isProtectedRoute = protectedRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  );
  const isPublicAuthRoute = publicAuthRoutes.includes(pathname);

  useEffect(() => {
    if (!isLoading) {
      if (isProtectedRoute && !isAuthenticated) {
        router.replace("/login");
      } else if (isPublicAuthRoute && isAuthenticated) {
        router.replace("/dashboard");
      }
    }
  }, [isLoading, isAuthenticated, isProtectedRoute, isPublicAuthRoute, router]);

  // Render Loading Screen during session restoration to prevent flashing content
  if (isLoading && (isProtectedRoute || isPublicAuthRoute)) {
    return <SessionLoadingScreen />;
  }

  // Prevent flash of protected content before redirect finishes
  if (!isLoading && isProtectedRoute && !isAuthenticated) {
    return <SessionLoadingScreen />;
  }

  // Prevent flash of public auth forms if user is already logged in
  if (!isLoading && isPublicAuthRoute && isAuthenticated) {
    return <SessionLoadingScreen />;
  }

  return <>{children}</>;
};
