import type { CategoryScores, ConsolidatedAudit, VyRuleFinding } from "@/types/audit";

function startScore(value: number): number {
  return Math.min(100, Math.max(0, value));
}

function applyPenalty(score: number, findings: VyRuleFinding[], category: VyRuleFinding["category"]): number {
  const penalty = findings
    .filter((item) => item.category === category && item.status === "issue")
    .reduce((acc, item) => {
      if (item.severity === "critical") return acc + 20;
      if (item.severity === "high") return acc + 14;
      if (item.severity === "medium") return acc + 8;
      return acc + 4;
    }, 0);
  return Math.max(0, score - penalty);
}

export function calculateScores(input: Omit<ConsolidatedAudit, "scores">): CategoryScores {
  const perfBase = typeof input.lighthouse.performanceScore === "number" ? input.lighthouse.performanceScore : 60;
  const seoBase = typeof input.lighthouse.seoScore === "number" ? input.lighthouse.seoScore : 58;
  const accBase = typeof input.lighthouse.accessibilityScore === "number" ? input.lighthouse.accessibilityScore : 62;

  const performance = applyPenalty(startScore(perfBase), input.findings, "Performance");
  const seo = applyPenalty(startScore(seoBase), input.findings, "SEO Técnico");
  const accessibility = applyPenalty(startScore(accBase), input.findings, "Accesibilidad");
  const uxConversion = applyPenalty(startScore(72), input.findings, "UX & Conversión");
  const security = applyPenalty(startScore(input.security.https ? 78 : 40), input.findings, "Seguridad");

  const total = Math.round((performance + seo + accessibility + uxConversion + security) / 5);
  return { performance, seo, accessibility, uxConversion, security, total };
}
