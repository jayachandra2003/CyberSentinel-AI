"use client";

import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { Loader } from "@/components/ui/Loader";

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Loader />;
  }

  if (!isAuthenticated) {
    return (
      <div className="p-8 text-center text-slate-400">
        Authentication Required. Please log in to access security platform features.
      </div>
    );
  }

  return <>{children}</>;
};
