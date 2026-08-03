"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Scan, DnsScanResult, WhoisScanResult, SslScanResult, HeadersScanResult, CookieScanResult } from "@/services/api/scanService";
import { ReportHeader, ReportTab } from "./report/ReportHeader";
import { OverviewTab } from "./report/OverviewTab";
import { DnsTab } from "./report/DnsTab";
import { WhoisTab } from "./report/WhoisTab";
import { SslTab } from "./report/SslTab";
import { HeadersTab } from "./report/HeadersTab";
import { CookiesTab } from "./report/CookiesTab";
import { SecurityTab } from "./report/SecurityTab";
import { RawJsonTab } from "./report/RawJsonTab";
import { Database, FileText, Lock, Shield, Cookie } from "lucide-react";

interface ScanDetailModalProps {
  scan: Scan | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ScanDetailModal: React.FC<ScanDetailModalProps> = ({
  scan,
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<ReportTab>("overview");

  if (!scan) return null;

  const dns = scan.module_results?.dns as DnsScanResult | undefined;
  const hasDns = Boolean(dns && Object.keys(dns.results ?? {}).length > 0);
  const dnsRecordCount = dns?.total_records_found ?? 0;

  const whois = scan.module_results?.whois as WhoisScanResult | undefined;
  const hasWhois = Boolean(whois && (whois.status === "completed" || whois.domain || whois.registrar));
  const whoisObsCount = whois?.security_observations?.length ?? 0;

  const ssl = scan.module_results?.ssl as SslScanResult | undefined;
  const hasSsl = Boolean(ssl && (ssl.status === "completed" || ssl.certificate || ssl.protocol));
  const sslObsCount = ssl?.security_observations?.length ?? 0;

  const headersModule = scan.module_results?.headers as HeadersScanResult | undefined;
  const hasHeaders = Boolean(headersModule && (headersModule.status === "completed" || headersModule.headers_count > 0));
  const headersObsCount = headersModule?.security_observations?.length ?? 0;

  const cookiesModule = scan.module_results?.cookies as CookieScanResult | undefined;
  const hasCookies = Boolean(cookiesModule && (cookiesModule.status === "completed" || cookiesModule.cookies_count >= 0));
  const cookiesObsCount = cookiesModule?.security_observations?.length ?? 0;

  const totalObsCount =
    (dns?.security_observations?.length ?? 0) +
    whoisObsCount +
    sslObsCount +
    headersObsCount +
    cookiesObsCount;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Target Security Console — ${scan.target_domain}`}
      size="report"
    >
      <div className="flex flex-col h-full overflow-hidden space-y-4">
        {/* Report Header & Tab Bar */}
        <ReportHeader
          scan={scan}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          dnsRecordCount={dnsRecordCount}
          whoisRecordCount={whoisObsCount}
          sslObsCount={sslObsCount}
          headersObsCount={headersObsCount}
          cookiesObsCount={cookiesObsCount}
          securityObsCount={totalObsCount}
        />

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-4 scrollbar-thin">
          {activeTab === "overview" && (
            <OverviewTab
              scan={scan}
              dns={hasDns ? dns : undefined}
              whois={hasWhois ? whois : undefined}
              ssl={hasSsl ? ssl : undefined}
              headersModule={hasHeaders ? headersModule : undefined}
              cookiesModule={hasCookies ? cookiesModule : undefined}
            />
          )}

          {activeTab === "dns" && (
            hasDns ? (
              <DnsTab dns={dns!} />
            ) : (
              <EmptyStatePlaceholder
                icon={<Database className="h-8 w-8 text-slate-500 mx-auto" />}
                title="DNS Module Results Unavailable"
                description={
                  scan.status === "Completed"
                    ? "No DNS record data was returned during this scan."
                    : "DNS lookup module is currently executing. Results will populate automatically upon completion."
                }
              />
            )
          )}

          {activeTab === "whois" && (
            hasWhois ? (
              <WhoisTab whois={whois!} />
            ) : (
              <EmptyStatePlaceholder
                icon={<FileText className="h-8 w-8 text-slate-500 mx-auto" />}
                title="WHOIS Intelligence Unavailable"
                description={
                  scan.status === "Completed"
                    ? "WHOIS query did not return domain registration data for this target."
                    : "WHOIS intelligence module is currently querying TLD registrars. Results will populate upon completion."
                }
              />
            )
          )}

          {activeTab === "ssl" && (
            hasSsl ? (
              <SslTab ssl={ssl!} />
            ) : (
              <EmptyStatePlaceholder
                icon={<Lock className="h-8 w-8 text-slate-500 mx-auto" />}
                title="SSL / TLS Analysis Unavailable"
                description={
                  scan.status === "Completed"
                    ? "No SSL certificate or handshake data was returned during this scan."
                    : "SSL/TLS security analysis module is currently executing. Results will populate upon completion."
                }
              />
            )
          )}

          {activeTab === "headers" && (
            hasHeaders ? (
              <HeadersTab headers={headersModule!} />
            ) : (
              <EmptyStatePlaceholder
                icon={<Shield className="h-8 w-8 text-slate-500 mx-auto" />}
                title="HTTP Security Headers Analysis Unavailable"
                description={
                  scan.status === "Completed"
                    ? "No HTTP response headers were captured during this scan."
                    : "HTTP Security Headers module is currently inspecting target endpoints. Results will populate upon completion."
                }
              />
            )
          )}

          {activeTab === "cookies" && (
            hasCookies ? (
              <CookiesTab cookies={cookiesModule!} />
            ) : (
              <EmptyStatePlaceholder
                icon={<Cookie className="h-8 w-8 text-slate-500 mx-auto" />}
                title="Cookie Security Analysis Unavailable"
                description={
                  scan.status === "Completed"
                    ? "No Set-Cookie response headers were captured during this scan."
                    : "Cookie Security Analysis module is currently inspecting target response headers. Results will populate upon completion."
                }
              />
            )
          )}

          {activeTab === "security" && <SecurityTab scan={scan} />}

          {activeTab === "json" && <RawJsonTab scan={scan} />}
        </div>
      </div>
    </Modal>
  );
};

function EmptyStatePlaceholder({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-12 rounded-xl border border-dashed border-slate-300 dark:border-slate-800 text-center space-y-3">
      {icon}
      <h4 className="text-sm font-bold font-mono text-slate-900 dark:text-white">
        {title}
      </h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 font-mono max-w-md mx-auto leading-relaxed">
        {description}
      </p>
    </div>
  );
}
