"use client";

import React, { useState } from "react";
import {
  Check,
  Bookmark,
  CheckCircle2,
  EyeOff,
  Ticket,
  FileCode,
} from "lucide-react";
import { ReportFinding } from "./reportUtils";
import { cn } from "@/lib/utils";

interface FindingActionsBarProps {
  finding: ReportFinding;
}

export const FindingActionsBar: React.FC<FindingActionsBarProps> = ({ finding }) => {
  const [copiedAction, setCopiedAction] = useState<string | null>(null);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isResolved, setIsResolved] = useState(false);
  const [isSuppressed, setIsSuppressed] = useState(false);
  const [ticketToast, setTicketToast] = useState(false);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(finding, null, 2));
    setCopiedAction("json");
    setTimeout(() => setCopiedAction(null), 2000);
  };

  const handleCreateTicket = () => {
    setTicketToast(true);
    setTimeout(() => setTicketToast(false), 3000);
  };

  return (
    <div className="p-2 px-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-2 flex-wrap text-[11px] font-mono">
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          onClick={handleCopyJson}
          className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 flex items-center gap-1 transition-colors"
        >
          {copiedAction === "json" ? <Check className="h-3 w-3 text-emerald-400" /> : <FileCode className="h-3 w-3 text-cyan-400" />}
          {copiedAction === "json" ? "Copied" : "Copy JSON"}
        </button>

        <button
          onClick={() => setIsBookmarked(!isBookmarked)}
          className={cn(
            "px-2 py-1 rounded border flex items-center gap-1 transition-colors",
            isBookmarked
              ? "bg-amber-500/20 text-amber-400 border-amber-500/40 font-bold"
              : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
          )}
        >
          <Bookmark className="h-3 w-3" />
          {isBookmarked ? "Bookmarked" : "Bookmark"}
        </button>

        <button
          onClick={() => setIsResolved(!isResolved)}
          className={cn(
            "px-2 py-1 rounded border flex items-center gap-1 transition-colors",
            isResolved
              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 font-bold"
              : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
          )}
        >
          <CheckCircle2 className="h-3 w-3" />
          {isResolved ? "Resolved ✓" : "Mark Resolved"}
        </button>

        <button
          onClick={() => setIsSuppressed(!isSuppressed)}
          className={cn(
            "px-2 py-1 rounded border flex items-center gap-1 transition-colors",
            isSuppressed
              ? "bg-rose-500/20 text-rose-400 border-rose-500/40 font-bold"
              : "bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800"
          )}
        >
          <EyeOff className="h-3 w-3" />
          {isSuppressed ? "Suppressed" : "Suppress (FP)"}
        </button>
      </div>

      <div className="flex items-center gap-1.5">
        <button
          onClick={handleCreateTicket}
          className="px-2.5 py-1 rounded bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 font-bold flex items-center gap-1 transition-colors"
        >
          <Ticket className="h-3 w-3" /> Create Jira Ticket
        </button>

        {ticketToast && (
          <span className="text-emerald-400 text-[10px] animate-pulse font-bold">
            Ticket #SEC-{(finding?.id || "001").replace(/[^0-9]/g, "")} Created!
          </span>
        )}
      </div>
    </div>
  );
};
