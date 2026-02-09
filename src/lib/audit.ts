import type { AuditType, ConsolidatedAudit } from "@/types/audit";
import { normalizeAndValidateUrl } from "@/lib/url";
import { analyzeWithPsi } from "@/lib/psi";
import { analyzeHtmlAndSecurity } from "@/lib/html";
import { runVyAuditRules } from "@/lib/rules";
import { calculateScores } from "@/lib/scoring";

export async function runAudit(rawUrl: string, auditType: AuditType): Promise<ConsolidatedAudit> {
  const { normalizedUrl, domain } = normalizeAndValidateUrl(rawUrl);

  const [lighthouse, htmlAndSecurity] = await Promise.all([
    analyzeWithPsi(normalizedUrl),
    analyzeHtmlAndSecurity(normalizedUrl)
  ]);

  const findings = runVyAuditRules({
    html: htmlAndSecurity.html,
    lighthouse,
    security: htmlAndSecurity.security
  });

  const preScoreAudit = {
    targetUrl: rawUrl,
    normalizedUrl,
    domain,
    dateIso: new Date().toISOString(),
    auditType,
    lighthouse,
    html: htmlAndSecurity.html,
    security: htmlAndSecurity.security,
    findings
  };

  const scores = calculateScores(preScoreAudit);
  return {
    ...preScoreAudit,
    scores
  };
}
