"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, Clock, LogOut, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { SESSION_CONFIG } from "@/config/sessionConfig";
import { Button } from "@/components/ui/Button";

export const SessionTimeoutHandler: React.FC = () => {
  const { isAuthenticated, rememberDevice, logout, refreshSession } = useAuth();
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(SESSION_CONFIG.WARNING_BEFORE_LOGOUT_SECONDS);

  // Store last activity timestamp
  const lastActivityRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Compute total idle duration based on Remember Device checkbox
  const totalIdleSeconds = rememberDevice
    ? SESSION_CONFIG.REMEMBER_IDLE_TIMEOUT_MINUTES * 60
    : SESSION_CONFIG.IDLE_TIMEOUT_MINUTES * 60;

  const warningThresholdSeconds = totalIdleSeconds - SESSION_CONFIG.WARNING_BEFORE_LOGOUT_SECONDS;

  // Throttled User Activity Listener (Resets Timer)
  const handleUserActivity = useCallback(() => {
    const now = Date.now();
    // Throttle activity updates to once per second
    if (now - lastActivityRef.current >= SESSION_CONFIG.ACTIVITY_THROTTLE_MS) {
      lastActivityRef.current = now;
      // If warning modal is NOT showing, reset idle clock
      if (!showWarningModal) {
        setSecondsRemaining(SESSION_CONFIG.WARNING_BEFORE_LOGOUT_SECONDS);
      }
    }
  }, [showWarningModal]);

  // Handle "Stay Logged In" action
  const handleStayLoggedIn = useCallback(async () => {
    setShowWarningModal(false);
    lastActivityRef.current = Date.now();
    setSecondsRemaining(SESSION_CONFIG.WARNING_BEFORE_LOGOUT_SECONDS);
    try {
      await refreshSession();
    } catch {
      // Ignore background ping error if network fluctuates
    }
  }, [refreshSession]);

  // Handle Immediate Sign Out
  const handleSignOut = useCallback(() => {
    setShowWarningModal(false);
    logout("inactivity");
  }, [logout]);

  // Attach global DOM activity event listeners
  useEffect(() => {
    if (!isAuthenticated) return;

    const events: (keyof WindowEventMap)[] = ["mousemove", "mousedown", "keydown", "scroll", "touchstart"];

    events.forEach((ev) => {
      window.addEventListener(ev, handleUserActivity, { passive: true });
    });

    return () => {
      events.forEach((ev) => {
        window.removeEventListener(ev, handleUserActivity);
      });
    };
  }, [isAuthenticated, handleUserActivity]);

  // Main Idle Inspection Loop (Fires every second)
  useEffect(() => {
    if (!isAuthenticated) {
      setShowWarningModal(false);
      return;
    }

    timerRef.current = setInterval(() => {
      const idleElapsedSeconds = Math.floor((Date.now() - lastActivityRef.current) / 1000);

      if (idleElapsedSeconds >= totalIdleSeconds) {
        // Timeout expired — execute automatic logout
        if (timerRef.current) clearInterval(timerRef.current);
        setShowWarningModal(false);
        logout("inactivity");
      } else if (idleElapsedSeconds >= warningThresholdSeconds) {
        // Warning threshold reached — show modal & countdown
        const remaining = totalIdleSeconds - idleElapsedSeconds;
        setSecondsRemaining(Math.max(0, remaining));
        setShowWarningModal(true);
      } else {
        setShowWarningModal(false);
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isAuthenticated, totalIdleSeconds, warningThresholdSeconds, logout]);

  if (!isAuthenticated) return null;

  return (
    <AnimatePresence>
      {showWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-950/80 dark:bg-black/85 backdrop-blur-md"
          />

          {/* Warning Modal Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 350, damping: 30 }}
            className="relative z-10 w-full max-w-md p-6 rounded-2xl border border-amber-500/30 bg-white dark:bg-slate-950 shadow-2xl space-y-5 text-slate-900 dark:text-white"
          >
            {/* Header Icon & Title */}
            <div className="flex items-start gap-3.5">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex-shrink-0">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Session Expiring
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-normal">
                  Your session will expire due to inactivity.
                </p>
              </div>
            </div>

            {/* Inactivity Countdown Timer Banner */}
            <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-600 dark:text-slate-400 font-medium">
                <Clock className="h-4 w-4 text-amber-500" />
                <span>Automatic logout in:</span>
              </div>
              <div className="text-lg font-bold font-mono text-amber-500 leading-none">
                {secondsRemaining}s
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                variant="primary"
                onClick={handleStayLoggedIn}
                className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-sm"
              >
                <CheckCircle2 className="h-4 w-4 mr-1.5" />
                Stay Logged In
              </Button>
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="py-2.5 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-sm"
              >
                <LogOut className="h-4 w-4 mr-1.5" />
                Sign Out
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
