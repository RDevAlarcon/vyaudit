import { NextResponse } from "next/server";
import { z } from "zod";
import { runAudit } from "@/lib/audit";
import { generateVyAuditReport } from "@/lib/reportGenerator";
import { persistAudit } from "@/lib/db";
import { sendAuditReportEmail } from "@/lib/email";
import type { AuditType } from "@/types/audit";

const requestSchema = z.object({
  url: z.string().min(4),
  auditType: z.enum(["Free", "Pro", "Enterprise"]).default("Pro"),
  email: z.string().email()
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Solicitud inválida. URL requerida." }, { status: 400 });
    }

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

    try {
      await persistAudit(audit, report.reportMarkdown);
    } catch (dbError) {
      // DB is optional in MVP. We return the report even if persistence is unavailable.
      console.warn("VyAudit persistence warning:", dbError);
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno en auditoría.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
