"use client";

import React, { useState, useCallback } from "react";
import {
  FileText,
  Calendar,
  ShieldCheck,
  Building,
  Globe,
  Clock,
  UserCheck,
  Mail,
  Phone,
  Server,
  Copy,
  Check,
  Download,
  AlertTriangle,
  Lock,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  Award,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { WhoisScanResult } from "@/services/api/scanService";
import { cn } from "@/lib/utils";

interface WhoisTabProps {
  whois: WhoisScanResult;
}

export const WhoisTab: React.FC<WhoisTabProps> = ({ whois }) => {
  const [copiedRaw, setCopiedRaw] = useState(false);
  const [exported, setExported] = useState(false);
  const [showRaw, setShowRaw] = useState(false);

  const handleCopyRaw = useCallback(async () => {
    if (!whois.raw_whois) return;
    try {
      await navigator.clipboard.writeText(whois.raw_whois);
      setCopiedRaw(true);
      setTimeout(() => setCopiedRaw(false), 1800);
    } catch {
      // Fail silently
    }
  }, [whois.raw_whois]);

  const handleExportJson = useCallback(() => {
    const blob = new Blob([JSON.stringify(whois, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `whois_intelligence_${whois.target.replace(/\./g, "_")}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 2000);
  }, [whois]);

  // Expiration / Timeline status color helper
  const expiryDays = whois.days_until_expiration;
  const ageDays = whois.domain_age_days;

  const getTimelineStatusColor = () => {
    if (expiryDays !== null && expiryDays !== undefined) {
      if (expiryDays < 0) return { label: "Expired", bg: "bg-rose-500/10 border-rose-500/30 text-rose-400" };
      if (expiryDays < 30) return { label: "Expires Soon", bg: "bg-orange-500/10 border-orange-500/30 text-orange-400" };
      if (expiryDays < 180) return { label: "Renewal Pending", bg: "bg-amber-500/10 border-amber-500/30 text-amber-400" };
    }
    if (ageDays !== null && ageDays !== undefined && ageDays < 7) {
      return { label: "Very New Domain", bg: "bg-rose-500/10 border-rose-500/30 text-rose-400" };
    }
    return { label: "Active & Valid", bg: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" };
  };

  const timelineStatus = getTimelineStatusColor();

  return (
    <div className="space-y-4 py-1">
      {/* Top Toolbar — Sentence Case 18px Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40">
        <div className="flex items-center gap-2.5">
          <FileText className="h-4.5 w-4.5 text-cyan-400" />
          <span className="text-[18px] font-semibold text-slate-900 dark:text-white">
            WHOIS Intelligence Module
          </span>
          <span className={cn("px-2.5 py-0.5 rounded-full border font-medium text-[12px]", timelineStatus.bg)}>
            {timelineStatus.label}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyRaw}
            disabled={!whois.raw_whois}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-all",
              copiedRaw
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 hover:border-cyan-500/40 hover:text-cyan-400"
            )}
          >
            {copiedRaw ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copiedRaw ? "Copied Raw" : "Copy Raw WHOIS"}</span>
          </button>

          <button
            onClick={handleExportJson}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[13px] font-medium transition-all",
              exported
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
                : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/80 text-slate-700 dark:text-slate-200 hover:border-cyan-500/40 hover:text-cyan-400"
            )}
          >
            {exported ? <Check className="h-3.5 w-3.5" /> : <Download className="h-3.5 w-3.5" />}
            <span>{exported ? "Exported" : "Export JSON"}</span>
          </button>
        </div>
      </div>

      {/* Overview Cards Grid — Score, Risk Level, Registrar, Age, Expiration */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <WhoisMetricCard
          label="WHOIS Trust Score"
          value={`${whois.whois_score} / 100`}
          subtext={whois.whois_score >= 80 ? "Established Reputation" : "Posture Review Needed"}
          icon={<Award className="h-4 w-4 text-cyan-400" />}
          variant="cyan"
        />
        <WhoisMetricCard
          label="WHOIS Risk Level"
          value={whois.risk_level}
          subtext={whois.risk_level === "LOW" ? "Minimal Risk" : "Elevated Risk Flags"}
          icon={<ShieldCheck className="h-4 w-4 text-emerald-400" />}
          variant={whois.risk_level === "LOW" ? "emerald" : whois.risk_level === "MEDIUM" ? "amber" : "rose"}
        />
        <WhoisMetricCard
          label="Sponsoring Registrar"
          value={whois.registrar || "N/A"}
          subtext={whois.registrar_iana_id ? `IANA ID #${whois.registrar_iana_id}` : "Unlisted IANA ID"}
          icon={<Building className="h-4 w-4 text-purple-400" />}
          variant="purple"
        />
        <WhoisMetricCard
          label="Domain Age"
          value={ageDays !== null && ageDays !== undefined ? `${ageDays} Days` : "Unknown"}
          subtext={ageDays !== null && ageDays !== undefined ? `~${(ageDays / 365).toFixed(1)} Years Active` : "Unlisted Creation"}
          icon={<Clock className="h-4 w-4 text-blue-400" />}
          variant="blue"
        />
        <WhoisMetricCard
          label="Days Remaining"
          value={expiryDays !== null && expiryDays !== undefined ? `${expiryDays} Days` : "Unknown"}
          subtext={whois.expiration_date ? `Expires ${whois.expiration_date.substring(0, 10)}` : "Unlisted Expiration"}
          icon={<Calendar className="h-4 w-4 text-amber-400" />}
          variant={expiryDays !== null && expiryDays !== undefined && expiryDays < 30 ? "amber" : "emerald"}
        />
      </div>

      {/* Registration Timeline Visualization Bar */}
      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2.5">
        <div className="flex items-center justify-between text-[14px] font-semibold text-slate-900 dark:text-white">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-cyan-500" />
            <span>Registration Lifecycle Timeline</span>
          </div>
          <span className="text-[13px] font-normal text-slate-500 dark:text-slate-400">
            {whois.creation_date ? `Registered: ${whois.creation_date.substring(0, 10)}` : "Creation Date Unlisted"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2 text-[13px]">
          <TimelineBlock
            label="Created Date"
            dateStr={whois.creation_date}
            sub={ageDays !== null ? `${ageDays} days ago` : undefined}
          />
          <TimelineBlock
            label="Last Updated Date"
            dateStr={whois.updated_date}
            sub="Registry Update"
          />
          <TimelineBlock
            label="Registry Expiration"
            dateStr={whois.expiration_date || whois.registry_expiry}
            sub={expiryDays !== null ? `${expiryDays} days remaining` : undefined}
            highlight={expiryDays !== null && expiryDays < 30}
          />
          <TimelineBlock
            label="DNSSEC Delegation"
            dateStr={whois.dnssec || "unsigned"}
            sub="Cryptographic Signatures"
          />
        </div>
      </div>

      {/* Two Column Grid: Domain & Registrar Specs / Registrant & Contact Details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Left Column: Domain & Registrar Information */}
        <div className="lg:col-span-6 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
          <div className="flex items-center gap-2 text-[18px] font-semibold text-slate-900 dark:text-white">
            <Globe className="h-4.5 w-4.5 text-cyan-500" />
            <span>Domain & Registrar Details</span>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden divide-y divide-slate-200 dark:divide-slate-800 text-[14px]">
            <DetailRow label="Target Domain" value={whois.domain || whois.target} isMono highlight />
            <DetailRow label="Sponsoring Registrar" value={whois.registrar || "N/A"} />
            <DetailRow label="Registrar IANA ID" value={whois.registrar_iana_id || "N/A"} isMono />
            <DetailRow label="WHOIS Server" value={whois.whois_server || "N/A"} isMono />
            <DetailRow label="Referral URL" value={whois.referral_url || "N/A"} />
            <DetailRow label="DNSSEC Status" value={whois.dnssec || "unsigned"} isMono />
            <DetailRow label="Abuse Contact Email" value={whois.abuse_contact_email || "N/A"} isMono />
            <DetailRow label="Abuse Contact Phone" value={whois.abuse_contact_phone || "N/A"} isMono />
            <DetailRow label="Last Database Update" value={whois.last_whois_update || "N/A"} isMono />
          </div>
        </div>

        {/* Right Column: Registrant & Contacts */}
        <div className="lg:col-span-6 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
          <div className="flex items-center gap-2 text-[18px] font-semibold text-slate-900 dark:text-white">
            <UserCheck className="h-4.5 w-4.5 text-emerald-500" />
            <span>Registrant & Contacts</span>
          </div>

          <div className="space-y-2.5">
            {/* Registrant Primary Organization & Location */}
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-950/40 space-y-1.5 text-[14px]">
              <div className="flex items-center justify-between font-medium">
                <span className="text-slate-500 dark:text-slate-400 text-[13px]">Registrant Organization</span>
                <span className="text-slate-900 dark:text-slate-100 font-semibold truncate">
                  {whois.registrant_organization || "Privacy Protected / Unlisted"}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-200 dark:border-slate-800 text-[13px]">
                <div>
                  <span className="text-slate-400 block text-[11px]">Country</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200">{whois.registrant_country || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">State / Prov</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 truncate block">{whois.registrant_state || "N/A"}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">City</span>
                  <span className="font-mono text-slate-800 dark:text-slate-200 truncate block">{whois.registrant_city || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Contacts Cards (Admin, Tech, Billing) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[13px]">
              <ContactCard label="Admin Contact" info={whois.admin_contact} />
              <ContactCard label="Tech Contact" info={whois.tech_contact} />
              <ContactCard label="Billing Contact" info={whois.billing_contact} />
            </div>
          </div>
        </div>
      </div>

      {/* Domain Status Flags & Delegated Nameservers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Domain Statuses */}
        <div className="lg:col-span-6 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
          <div className="flex items-center gap-2 text-[16px] font-semibold text-slate-900 dark:text-white">
            <Lock className="h-4 w-4 text-purple-400" />
            <span>Domain EPP Status Flags ({whois.domain_status?.length || 0})</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {whois.domain_status && whois.domain_status.length > 0 ? (
              whois.domain_status.map((status, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-950/60 font-mono text-[12px] text-slate-700 dark:text-slate-300"
                >
                  {status}
                </span>
              ))
            ) : (
              <span className="text-[13px] text-slate-500 italic">No domain status flags listed.</span>
            )}
          </div>
        </div>

        {/* Name Servers */}
        <div className="lg:col-span-6 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-2">
          <div className="flex items-center gap-2 text-[16px] font-semibold text-slate-900 dark:text-white">
            <Server className="h-4 w-4 text-blue-400" />
            <span>Delegated WHOIS Nameservers ({whois.name_servers?.length || 0})</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {whois.name_servers && whois.name_servers.length > 0 ? (
              whois.name_servers.map((ns, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg border border-blue-500/20 bg-blue-500/5 font-mono text-[13px] text-blue-400 font-medium"
                >
                  {ns}
                </span>
              ))
            ) : (
              <span className="text-[13px] text-slate-500 italic">No nameservers returned in WHOIS response.</span>
            )}
          </div>
        </div>
      </div>

      {/* Security Observations */}
      <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[18px] font-semibold text-slate-900 dark:text-white">
            <AlertTriangle className="h-4.5 w-4.5 text-amber-400" />
            <span>WHOIS Security Observations ({whois.security_observations?.length || 0})</span>
          </div>
        </div>

        <div className="space-y-2.5">
          {whois.security_observations && whois.security_observations.length > 0 ? (
            whois.security_observations.map((obs, idx) => (
              <div
                key={idx}
                className={cn(
                  "p-3 rounded-xl border space-y-1 text-[14px]",
                  obs.severity === "HIGH"
                    ? "border-rose-500/30 bg-rose-500/5"
                    : obs.severity === "MEDIUM"
                    ? "border-amber-500/30 bg-amber-500/5"
                    : "border-slate-200 dark:border-slate-800 bg-white/40 dark:bg-slate-950/40"
                )}
              >
                <div className="flex items-center justify-between gap-2 font-medium">
                  <span className="text-slate-900 dark:text-white font-semibold">{obs.title}</span>
                  <span
                    className={cn(
                      "px-2 py-0.2 rounded-full text-[11px] font-mono uppercase tracking-wider",
                      obs.severity === "HIGH"
                        ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                        : obs.severity === "MEDIUM"
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                        : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    )}
                  >
                    {obs.severity}
                  </span>
                </div>
                <p className="text-[14px] text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                  {obs.description}
                </p>
                {obs.recommendation && (
                  <p className="text-[13px] text-cyan-600 dark:text-cyan-400 font-normal mt-1">
                    <span className="font-semibold">Recommendation:</span> {obs.recommendation}
                  </p>
                )}
              </div>
            ))
          ) : (
            <div className="text-[13px] text-slate-500 italic p-2">
              No critical security observations flagged for domain WHOIS metadata.
            </div>
          )}
        </div>
      </div>

      {/* Raw WHOIS Record Inspector Accordion */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900/40">
        <button
          onClick={() => setShowRaw((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 bg-slate-100/50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors text-left"
        >
          <div className="flex items-center gap-2 font-semibold text-[15px] text-slate-900 dark:text-white">
            <FileText className="h-4 w-4 text-cyan-400" />
            <span>Raw WHOIS Server Payload</span>
            <span className="text-[12px] text-slate-400 font-normal">
              ({whois.raw_whois ? `${(new Blob([whois.raw_whois]).size / 1024).toFixed(1)} KB` : "0 KB"})
            </span>
          </div>

          <div className="flex items-center gap-2 text-slate-400">
            <span className="text-[12px]">{showRaw ? "Collapse" : "Expand"}</span>
            {showRaw ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </div>
        </button>

        <AnimatePresence initial={false}>
          {showRaw && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-slate-200 dark:border-slate-800 p-4 bg-slate-950"
            >
              <pre className="text-cyan-400/90 font-mono text-[13px] leading-relaxed whitespace-pre-wrap break-all max-h-[350px] overflow-auto select-text scrollbar-thin">
                {whois.raw_whois || "Raw WHOIS payload unavailable."}
              </pre>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

function DetailRow({
  label,
  value,
  isMono,
  highlight,
}: {
  label: string;
  value: string;
  isMono?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-white/40 dark:bg-slate-950/20">
      <span className="text-slate-500 dark:text-slate-400 text-[13px] font-normal">{label}</span>
      <span
        className={cn(
          "text-[14px] font-medium truncate max-w-[260px]",
          isMono && "font-mono",
          highlight ? "text-cyan-400 font-semibold" : "text-slate-900 dark:text-slate-200"
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ContactCard({
  label,
  info,
}: {
  label: string;
  info?: { name?: string | null; organization?: string | null; email?: string | null } | null;
}) {
  return (
    <div className="p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/30 space-y-1">
      <span className="text-slate-400 font-medium text-[11px] uppercase tracking-wider block">{label}</span>
      <div className="font-semibold text-slate-900 dark:text-slate-200 truncate text-[13px]">
        {info?.name || info?.organization || "Redacted / Privacy"}
      </div>
      <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate">
        {info?.email || "No Email"}
      </div>
    </div>
  );
}

function TimelineBlock({
  label,
  dateStr,
  sub,
  highlight,
}: {
  label: string;
  dateStr?: string | null;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "p-2 px-3 rounded-lg border space-y-0.5",
        highlight
          ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
          : "border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/40"
      )}
    >
      <span className="text-slate-400 text-[11px] block font-medium">{label}</span>
      <span className="font-mono font-semibold text-slate-900 dark:text-slate-100 text-[13px] block truncate">
        {dateStr ? dateStr.substring(0, 10) : "N/A"}
      </span>
      {sub && <span className="text-[11px] text-slate-500 dark:text-slate-400 block truncate">{sub}</span>}
    </div>
  );
}

function WhoisMetricCard({
  label,
  value,
  subtext,
  icon,
  variant = "cyan",
}: {
  label: string;
  value: string;
  subtext?: string;
  icon: React.ReactNode;
  variant?: "cyan" | "emerald" | "amber" | "rose" | "blue" | "purple";
}) {
  const colorMap = {
    cyan: "border-cyan-500/20 bg-cyan-500/5 text-cyan-400",
    emerald: "border-emerald-500/20 bg-emerald-500/5 text-emerald-400",
    amber: "border-amber-500/20 bg-amber-500/5 text-amber-400",
    rose: "border-rose-500/20 bg-rose-500/5 text-rose-400",
    blue: "border-blue-500/20 bg-blue-500/5 text-blue-400",
    purple: "border-purple-500/20 bg-purple-500/5 text-purple-400",
  };

  return (
    <div className={cn("p-3 px-3.5 rounded-xl border space-y-1 transition-all flex flex-col justify-between h-full min-h-[85px]", colorMap[variant])}>
      <div className="flex items-center justify-between text-[13px] font-medium text-slate-500 dark:text-slate-400">
        <span className="truncate">{label}</span>
        {icon}
      </div>
      <div>
        <div className="text-[28px] font-semibold font-mono tracking-tight text-slate-900 dark:text-white leading-tight truncate">
          {value}
        </div>
        {subtext && <div className="text-[13px] font-normal text-slate-500 dark:text-slate-400 truncate mt-0.5">{subtext}</div>}
      </div>
    </div>
  );
}
