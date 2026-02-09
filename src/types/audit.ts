export type AuditType = "Free" | "Pro" | "Enterprise";

export type DetectableValue = string | number | boolean | "No detectable";

export type CoreWebVitals = {
  lcp: DetectableValue;
  cls: DetectableValue;
  inp: DetectableValue;
};

export type LighthouseMetrics = {
  performanceScore: number | "No detectable";
  seoScore: number | "No detectable";
  accessibilityScore: number | "No detectable";
  firstContentfulPaint: DetectableValue;
  speedIndex: DetectableValue;
  interactive: DetectableValue;
  totalBlockingTime: DetectableValue;
  coreWebVitals: CoreWebVitals;
  raw?: unknown;
};

export type HtmlAnalysis = {
  title: string | "No detectable";
  metaDescription: string | "No detectable";
  headings: Record<"h1" | "h2" | "h3" | "h4" | "h5" | "h6", number>;
  imagesTotal: number;
  imagesWithoutAlt: number;
  linksTotal: number;
  internalLinks: number;
  externalLinks: number;
  scriptsTotal: number;
  formsTotal: number;
  hasRobotsMeta: boolean;
  hasCanonical: boolean;
  hasViewport: boolean;
  hasSitemapHint: boolean;
  hasRobotsTxtHint: boolean;
  ctaDetected: boolean;
  aboveTheFoldCTA: boolean;
  mobileIssues: string[];
};

export type SecurityAnalysis = {
  https: boolean;
  headers: {
    strictTransportSecurity: boolean;
    contentSecurityPolicy: boolean;
    xContentTypeOptions: boolean;
    xFrameOptions: boolean;
    referrerPolicy: boolean;
    permissionsPolicy: boolean;
  };
  cookiesPresent: boolean | "No detectable";
  externalScriptHosts: string[];
};

export type VyRuleFinding = {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  category: "Performance" | "SEO Técnico" | "Accesibilidad" | "UX & Conversión" | "Seguridad";
  status: "ok" | "issue";
  description: string;
  recommendation: string;
};

export type CategoryScores = {
  performance: number;
  seo: number;
  accessibility: number;
  uxConversion: number;
  security: number;
  total: number;
};

export type ConsolidatedAudit = {
  targetUrl: string;
  normalizedUrl: string;
  domain: string;
  dateIso: string;
  auditType: AuditType;
  lighthouse: LighthouseMetrics;
  html: HtmlAnalysis;
  security: SecurityAnalysis;
  findings: VyRuleFinding[];
  scores: CategoryScores;
};

export type AuditApiResponse = {
  domain: string;
  generatedAt: string;
  auditType: AuditType;
  scores: CategoryScores;
  reportMarkdown: string;
  promptUsed: string;
  reportSource?: "ai" | "fallback";
  reportDebug?: string;
  emailStatus?: "sent" | "skipped" | "failed";
  emailDetail?: string;
};
