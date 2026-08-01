"use client";

import React, { createContext, useContext } from "react";

interface ToastContextType {
  toast: (msg: string, type?: "success" | "error" | "info") => void;
}

const ToastContext = createContext<ToastContextType>({
  toast: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const toast = (msg: string, type = "info") => {
    console.log(`[TOAST - ${type.toUpperCase()}]: ${msg}`);
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
