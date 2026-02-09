import type { LighthouseMetrics } from "@/types/audit";

type PsiCategoryScore = {
  score?: number;
};

type PsiMetric = {
  percentile?: number;
};

type PsiResponse = {
  lighthouseResult?: {
    categories?: {
      performance?: PsiCategoryScore;
      seo?: PsiCategoryScore;
      accessibility?: PsiCategoryScore;
    };
    audits?: Record<string, { numericValue?: number; displayValue?: string }>;
  };
  loadingExperience?: {
    metrics?: Record<string, PsiMetric>;
  };
  originLoadingExperience?: {
    metrics?: Record<string, PsiMetric>;
  };
};

function formatMs(value?: number): string | "No detectable" {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "No detectable";
  }
  return `${Math.round(value)} ms`;
}

function safeScore(input?: number): number | "No detectable" {
  if (typeof input !== "number" || Number.isNaN(input)) {
    return "No detectable";
  }
  return Math.round(input * 100);
}

function metricPercentile(response: PsiResponse, key: string): number | undefined {
  return (
    response.loadingExperience?.metrics?.[key]?.percentile ??
    response.originLoadingExperience?.metrics?.[key]?.percentile
  );
}

async function requestPsi(url: string, strategy: "mobile" | "desktop", apiKey?: string): Promise<PsiResponse | null> {
  const endpoint = new URL("https://www.googleapis.com/pagespeedonline/v5/runPagespeed");
  endpoint.searchParams.set("url", url);
  endpoint.searchParams.set("strategy", strategy);
  endpoint.searchParams.set("category", "performance");
  endpoint.searchParams.append("category", "seo");
  endpoint.searchParams.append("category", "accessibility");
  if (apiKey) {
    endpoint.searchParams.set("key", apiKey);
  }

  try {
    const response = await fetch(endpoint.toString(), { next: { revalidate: 0 } });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as PsiResponse;
  } catch {
    return null;
  }
}

function mapPsiToMetrics(source: PsiResponse): LighthouseMetrics {
  const audits = source.lighthouseResult?.audits ?? {};

  const lcpFromCrux = metricPercentile(source, "LARGEST_CONTENTFUL_PAINT_MS");
  const clsFromCrux = metricPercentile(source, "CUMULATIVE_LAYOUT_SHIFT_SCORE");
  const inpFromCrux = metricPercentile(source, "INTERACTION_TO_NEXT_PAINT");

  return {
    performanceScore: safeScore(source.lighthouseResult?.categories?.performance?.score),
    seoScore: safeScore(source.lighthouseResult?.categories?.seo?.score),
    accessibilityScore: safeScore(source.lighthouseResult?.categories?.accessibility?.score),
    firstContentfulPaint: audits["first-contentful-paint"]?.displayValue ?? "No detectable",
    speedIndex: audits["speed-index"]?.displayValue ?? "No detectable",
    interactive: audits["interactive"]?.displayValue ?? "No detectable",
    totalBlockingTime: audits["total-blocking-time"]?.displayValue ?? "No detectable",
    coreWebVitals: {
      lcp: formatMs(audits["largest-contentful-paint"]?.numericValue ?? lcpFromCrux),
      cls: audits["cumulative-layout-shift"]?.numericValue ?? clsFromCrux ?? "No detectable",
      inp: formatMs(audits["interaction-to-next-paint"]?.numericValue ?? inpFromCrux)
    },
    raw: source
  };
}

function hasUsefulPsiData(input: LighthouseMetrics): boolean {
  return (
    typeof input.performanceScore === "number" ||
    typeof input.seoScore === "number" ||
    typeof input.accessibilityScore === "number" ||
    input.coreWebVitals.lcp !== "No detectable" ||
    input.coreWebVitals.inp !== "No detectable" ||
    input.coreWebVitals.cls !== "No detectable"
  );
}

export async function analyzeWithPsi(url: string): Promise<LighthouseMetrics> {
  const apiKey = process.env.PSI_API_KEY;

  const defaultValue: LighthouseMetrics = {
    performanceScore: "No detectable",
    seoScore: "No detectable",
    accessibilityScore: "No detectable",
    firstContentfulPaint: "No detectable",
    speedIndex: "No detectable",
    interactive: "No detectable",
    totalBlockingTime: "No detectable",
    coreWebVitals: {
      lcp: "No detectable",
      cls: "No detectable",
      inp: "No detectable"
    }
  };

  const mobileResponse = await requestPsi(url, "mobile", apiKey);
  if (mobileResponse) {
    const mobileMetrics = mapPsiToMetrics(mobileResponse);
    if (hasUsefulPsiData(mobileMetrics)) {
      return mobileMetrics;
    }
  }

  const desktopResponse = await requestPsi(url, "desktop", apiKey);
  if (desktopResponse) {
    const desktopMetrics = mapPsiToMetrics(desktopResponse);
    if (hasUsefulPsiData(desktopMetrics)) {
      return desktopMetrics;
    }
  }

  return defaultValue;
}
