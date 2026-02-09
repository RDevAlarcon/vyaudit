"use client";

import { useMemo } from "react";
import type { AuditApiResponse } from "@/types/audit";

type ReportViewerProps = {
  payload: AuditApiResponse;
};

function markdownToHtml(markdown: string): string {
  // Lightweight renderer for MVP. It supports headings, lists, tables and emphasis.
  return markdown
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
    .replace(/^\|(.+)\|$/gim, "<tr><td>$1</td></tr>")
    .replace(/^- (.*$)/gim, "<li>$1</li>")
    .replace(/\n\n/gim, "<br /><br />")
    .replace(/\n/gim, "<br />");
}

export function ReportViewer({ payload }: ReportViewerProps) {
  const html = useMemo(() => markdownToHtml(payload.reportMarkdown), [payload.reportMarkdown]);
  const dateLabel = new Date(payload.generatedAt).toLocaleString("es-CL");
  const reportId = `VYA-${payload.domain.replace(/\./g, "-").toUpperCase()}-${new Date(payload.generatedAt).getTime()}`;

  return (
    <section className="space-y-4">
      <header className="no-print flex flex-col items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:flex-row md:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Informe VyAudit</h2>
          <p className="text-sm text-slate-600">
            Dominio auditado: <strong>{payload.domain}</strong>
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg border border-brand-600 px-4 py-2 text-sm font-semibold text-brand-700 transition hover:bg-brand-50"
        >
          Descargar PDF
        </button>
      </header>

      <article className="pdf-report rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="pdf-brand-strip">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="pdf-brand-title">VyAudit | Producto oficial de Vytronix SpA</p>
              <p className="pdf-brand-meta">Informe profesional de auditoria web</p>
            </div>
            <img src="/logo-transparent.png" alt="Vytronix" className="h-14 w-auto object-contain" />
          </div>
        </div>

        <section className="pdf-cover">
          <div className="mb-3 flex items-center justify-between gap-4">
            <h3 className="pdf-cover-title">Informe Final</h3>
            <img src="/logo-transparent.png" alt="Vytronix" className="h-16 w-auto object-contain" />
          </div>
          <div className="pdf-cover-grid">
            <p>
              <strong>Dominio:</strong> {payload.domain}
            </p>
            <p>
              <strong>Fecha de emision:</strong> {dateLabel}
            </p>
            <p>
              <strong>Tipo de auditoria:</strong> {payload.auditType}
            </p>
            <p>
              <strong>ID de informe:</strong> {reportId}
            </p>
            <p>
              <strong>Puntaje total:</strong> {payload.scores.total}/100
            </p>
          </div>
        </section>

        <section className="prose-vyaudit px-6 pb-6 text-sm leading-relaxed text-slate-800 md:px-8 md:pb-8">
          <div dangerouslySetInnerHTML={{ __html: html }} />
        </section>

        <footer className="pdf-footer">
          <p>Vytronix SpA | VyAudit</p>
          <p>Este informe corresponde a una medicion puntual automatizada.</p>
        </footer>
      </article>

      <aside className="no-print rounded-xl bg-brand-50 p-4">
        <p className="text-sm text-brand-900">
          Quieres una implementacion completa del roadmap 30/60/90? Agenda una sesion con Vytronix SpA.
        </p>
      </aside>
    </section>
  );
}
