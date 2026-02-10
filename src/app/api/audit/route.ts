import { NextResponse } from "next/server";
import { z } from "zod";
import { runAudit } from "@/lib/audit";
import { generateVyAuditReport } from "@/lib/reportGenerator";
import { persistAudit } from "@/lib/db";
import { sendAuditReportEmail } from "@/lib/email";
import { claimAccessTokenForAudit, completeTokenAudit, releaseTokenAfterFailure } from "@/lib/accessTokens";
import { verifyAdminBridgeToken } from "@/lib/bridgeAuth";
import type { AuditType } from "@/types/audit";

const requestSchema = z.object({
  url: z.string().min(4),
  auditType: z.enum(["Free", "Pro", "Enterprise"]).default("Pro"),
  email: z.string().email(),
  accessToken: z.string().min(16).optional(),
  adminBridgeToken: z.string().min(16).optional()
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Solicitud invalida." }, { status: 400 });
    }

    const isAdmin = (() => {
      if (!parsed.data.adminBridgeToken) return false;
      return verifyAdminBridgeToken(parsed.data.adminBridgeToken).ok;
    })();

    if (!isAdmin && !parsed.data.accessToken) {
      return NextResponse.json({ error: "Token de acceso requerido." }, { status: 403 });
    }

    const claim = isAdmin
      ? null
      : await claimAccessTokenForAudit(parsed.data.accessToken as string, parsed.data.url);

    if (claim && !claim.ok) {
      return NextResponse.json({ error: claim.message }, { status: claim.status });
    }

    try {
      const audit = await runAudit(parsed.data.url, parsed.data.auditType as AuditType);
      const report = await generateVyAuditReport(audit);

      const emailResult = await sendAuditReportEmail({
        to: parsed.data.email,
        domain: audit.domain,
        generatedAt: audit.dateIso,
        auditType: audit.auditType,
        totalScore: audit.scores.total,
        reportMarkdown: report.reportMarkdown
      });

      let auditResultId: number | null = null;
      try {
        auditResultId = await persistAudit(audit, report.reportMarkdown);
      } catch (dbError) {
        console.warn("VyAudit persistence warning:", dbError);
      }

      if (claim && claim.ok) {
        await completeTokenAudit(claim.tokenId, auditResultId);
      }

      return NextResponse.json({
        domain: audit.domain,
        generatedAt: audit.dateIso,
        auditType: audit.auditType,
        scores: audit.scores,
        reportMarkdown: report.reportMarkdown,
        promptUsed: report.promptUsed,
        reportSource: report.source,
        reportDebug: report.debug,
        emailStatus: emailResult.status,
        emailDetail: emailResult.detail
      });
    } catch (auditError) {
      if (claim && claim.ok) {
        const reason = auditError instanceof Error ? auditError.message : "unknown_audit_error";
        await releaseTokenAfterFailure(claim.tokenId, reason);
      }
      throw auditError;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno en auditoria.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
