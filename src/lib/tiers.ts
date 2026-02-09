import type { AuditType } from "@/types/audit";

export type TierConfig = {
  name: AuditType;
  maxPages: number;
  includeAiNarrativeDepth: "base" | "extended" | "executive-plus";
  includeCompetitorBenchmarks: boolean;
  includeAdvancedSecurityScan: boolean;
  includeTrackingAudit: boolean;
};

export const tierConfig: Record<AuditType, TierConfig> = {
  Free: {
    name: "Free",
    maxPages: 1,
    includeAiNarrativeDepth: "base",
    includeCompetitorBenchmarks: false,
    includeAdvancedSecurityScan: false,
    includeTrackingAudit: false
  },
  Pro: {
    name: "Pro",
    maxPages: 30,
    includeAiNarrativeDepth: "extended",
    includeCompetitorBenchmarks: true,
    includeAdvancedSecurityScan: true,
    includeTrackingAudit: true
  },
  Enterprise: {
    name: "Enterprise",
    maxPages: 500,
    includeAiNarrativeDepth: "executive-plus",
    includeCompetitorBenchmarks: true,
    includeAdvancedSecurityScan: true,
    includeTrackingAudit: true
  }
};
