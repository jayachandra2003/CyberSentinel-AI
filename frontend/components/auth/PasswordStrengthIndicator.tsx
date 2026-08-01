"use client";

import React from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password?: string;
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({
  password = "",
}) => {
  const criteria = [
    { label: "At least 8 characters", met: password.length >= 8 },
    { label: "One uppercase letter", met: /[A-Z]/.test(password) },
    { label: "One lowercase letter", met: /[a-z]/.test(password) },
    { label: "One number (0-9)", met: /[0-9]/.test(password) },
  ];

  const score = criteria.filter((c) => c.met).length;

  const strengthConfig = [
    { label: "Very Weak", color: "bg-slate-300 dark:bg-slate-800", textColor: "text-slate-500", width: "w-0" },
    { label: "Weak", color: "bg-rose-500", textColor: "text-rose-500", width: "w-1/4" },
    { label: "Fair", color: "bg-amber-500", textColor: "text-amber-500", width: "w-2/4" },
    { label: "Good", color: "bg-cyan-500", textColor: "text-cyan-500", width: "w-3/4" },
    { label: "Strong", color: "bg-emerald-500", textColor: "text-emerald-500", width: "w-full" },
  ];

  const current = strengthConfig[score] || strengthConfig[0];

  return (
    <div className="space-y-3 pt-1">
      {/* Progress Bar & Label */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs font-semibold">
          <span className="text-slate-600 dark:text-slate-400">Password Strength</span>
          <span className={current.textColor}>{current.label}</span>
        </div>
        <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: "0%" }}
            animate={{ width: `${(score / 4) * 100}%` }}
            transition={{ duration: 0.3 }}
            className={`h-full ${current.color}`}
          />
        </div>
      </div>

      {/* Criteria Checklist */}
      <div className="grid grid-cols-2 gap-1.5 text-[11px]">
        {criteria.map((item, idx) => (
          <div key={idx} className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
            {item.met ? (
              <Check className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
            ) : (
              <X className="h-3.5 w-3.5 text-slate-400 dark:text-slate-600 flex-shrink-0" />
            )}
            <span className={item.met ? "text-slate-900 dark:text-slate-200 font-medium" : ""}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
