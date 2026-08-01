"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Scan, DnsScanResult } from "@/services/api/scanService";
import { ReportHeader, ReportTab } from "./report/ReportHeader";
import { OverviewTab } from "./report/OverviewTab";
import { DnsTab } from "./report/DnsTab";
import { SecurityTab } from "./report/SecurityTab";
import { RawJsonTab } from "./report/RawJsonTab";
import { Database } from "lucide-react";

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
  const hasDns = dns && Object.keys(dns.results ?? {}).length > 0;

  const dnsRecordCount = dns?.total_records_found ?? 0;
  const securityObsCount = dns?.security_observations.length ?? 0;

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
          securityObsCount={securityObsCount}
        />

        {/* Tab Content Container */}
        <div className="flex-1 overflow-y-auto min-h-0 pr-1 space-y-4 scrollbar-thin">
          {activeTab === "overview" && <OverviewTab scan={scan} dns={hasDns ? dns : undefined} />}

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
