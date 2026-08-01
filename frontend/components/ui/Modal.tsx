"use client";

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "default" | "report";
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  size = "default",
}) => {
  const isReport = size === "report";

  // Lock background body scroll whenever the modal console is open
  useEffect(() => {
    if (isOpen) {
      const originalStyle = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-3 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/75 dark:bg-black/85 backdrop-blur-md"
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: isReport ? 0.98 : 0.95, y: isReport ? 10 : 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: isReport ? 0.98 : 0.95, y: isReport ? 10 : 30 }}
            transition={{ type: "spring", stiffness: 350, damping: 32 }}
            className={[
              "relative z-10",
              "border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950",
              "shadow-2xl text-slate-900 dark:text-white flex flex-col overflow-hidden",
              isReport
                ? "w-[96vw] h-[94vh] max-w-none max-h-none rounded-xl md:rounded-2xl p-3 sm:p-4 md:p-5"
                : "w-full rounded-t-2xl max-h-[90vh] md:rounded-2xl md:max-w-lg p-4 md:p-6",
            ].join(" ")}
          >
            {/* Header with Breadcrumb Navigation */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2 mb-3 md:pb-2.5 md:mb-3 flex-shrink-0">
              <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-400 font-normal overflow-x-auto scrollbar-none">
                <span className="text-slate-400 dark:text-slate-500">Dashboard</span>
                <span className="text-slate-600 dark:text-slate-600">&gt;</span>
                <span className="text-slate-400 dark:text-slate-500">Scans</span>
                <span className="text-slate-600 dark:text-slate-600">&gt;</span>
                <span className="font-mono text-cyan-600 dark:text-cyan-400 font-medium truncate">{title.replace("Target Security Console — ", "")}</span>
                <span className="text-slate-600 dark:text-slate-600">&gt;</span>
                <span className="text-slate-700 dark:text-slate-300 font-medium">Assessment Report</span>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-2 flex-shrink-0"
                aria-label="Close console"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};


