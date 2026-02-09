import nodemailer from "nodemailer";
import { buildAuditPdfFilename, renderAuditPdfBuffer } from "@/lib/pdf";

export type EmailSendResult = {
  status: "sent" | "skipped" | "failed";
  detail: string;
};

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (!value) return fallback;
  return value.toLowerCase() === "true";
}

export async function sendAuditReportEmail(input: {
  to: string;
  domain: string;
  generatedAt: string;
  auditType: string;
  totalScore: number;
  reportMarkdown: string;
}): Promise<EmailSendResult> {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "587");
  const secure = parseBoolean(process.env.SMTP_SECURE, false);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM ?? "no-reply@vytronix.cl";

  if (!host || !user || !pass || Number.isNaN(port)) {
    return {
      status: "skipped",
      detail: "smtp_not_configured"
    };
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });

  const dateText = new Date(input.generatedAt).toLocaleString("es-CL");
  const subject = `VyAudit | Informe ${input.domain} | ${input.totalScore}/100`;
  const text = [
    "Hola,",
    "",
    `Adjuntamos tu informe VyAudit en PDF para ${input.domain}.`,
    `Fecha de emision: ${dateText}`,
    `Tipo de auditoria: ${input.auditType}`,
    `Puntaje total: ${input.totalScore}/100`,
    "",
    "Este mensaje es tu respaldo oficial.",
    "Vytronix SpA | VyAudit"
  ].join("\n");

  try {
    const pdfBuffer = await renderAuditPdfBuffer({
      domain: input.domain,
      generatedAt: input.generatedAt,
      auditType: input.auditType,
      totalScore: input.totalScore,
      reportMarkdown: input.reportMarkdown
    });

    await transporter.sendMail({
      from,
      to: input.to,
      subject,
      text,
      attachments: [
        {
          filename: buildAuditPdfFilename(input.domain),
          content: pdfBuffer,
          contentType: "application/pdf"
        }
      ]
    });
    return { status: "sent", detail: "email_sent" };
  } catch (error) {
    return {
      status: "failed",
      detail: `smtp_send_failed:${error instanceof Error ? error.message : "unknown_error"}`
    };
  }
}
