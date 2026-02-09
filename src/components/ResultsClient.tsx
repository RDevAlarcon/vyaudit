"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ReportViewer } from "@/components/ReportViewer";
import type { AuditApiResponse } from "@/types/audit";

export function ResultsClient() {
  const params = useSearchParams();
  const url = params.get("url") ?? "";
  const email = params.get("email") ?? "";
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState<AuditApiResponse | null>(null);

  useEffect(() => {
    let active = true;

    async function runAudit() {
      if (!url) {
        setError("No se recibio una URL para analizar.");
        setLoading(false);
        return;
      }
      if (!email) {
        setError("No se recibio un correo para respaldo del informe.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const response = await fetch("/api/audit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url, auditType: "Pro", email })
        });

        const json = (await response.json()) as AuditApiResponse | { error: string };
        if (!response.ok || "error" in json) {
          throw new Error("error" in json ? json.error : "No fue posible completar la auditoria.");
        }

        if (active) {
          setPayload(json);
        }
      } catch (caught) {
        if (active) {
          setError(caught instanceof Error ? caught.message : "Error desconocido en la auditoria.");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void runAudit();
    return () => {
      active = false;
    };
  }, [url, email]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-10 md:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900 md:text-3xl">Resultado de auditoria VyAudit</h1>
        <p className="text-sm text-slate-600">Analisis para: {url || "No detectable"}</p>
      </div>

      {loading ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-8">
          <div className="grid gap-6 md:grid-cols-[220px_1fr] md:items-center">
            <div className="rounded-2xl border border-brand-100 bg-brand-50 p-6">
              <div className="mx-auto mb-4 h-16 w-16 animate-spin rounded-full border-4 border-brand-200 border-t-brand-600" />
              <div className="space-y-2">
                <div className="h-2 w-full animate-pulse rounded-full bg-brand-200" />
                <div className="h-2 w-4/5 animate-pulse rounded-full bg-brand-300 [animation-delay:120ms]" />
                <div className="h-2 w-3/5 animate-pulse rounded-full bg-brand-200 [animation-delay:240ms]" />
              </div>
            </div>

            <div>
              <p className="text-base font-semibold text-slate-900">Analizando sitio en tiempo real</p>
              <p className="mt-1 text-sm text-slate-600">Esto puede tardar entre 20 y 60 segundos.</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                <li className="flex items-center gap-2">
                  <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-brand-500" />
                  Ejecutando metricas PSI (Performance, SEO, Accesibilidad)
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-brand-500 [animation-delay:120ms]" />
                  Procesando HTML y reglas de VyAudit
                </li>
                <li className="flex items-center gap-2">
                  <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-brand-500 [animation-delay:240ms]" />
                  Generando informe profesional
                </li>
              </ul>
            </div>
          </div>
        </section>
      ) : null}

      {!loading && error ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-8">
          <p className="font-semibold text-red-800">No se pudo generar la auditoria.</p>
          <p className="text-sm text-red-700">{error}</p>
        </section>
      ) : null}

      {!loading && payload ? <ReportViewer payload={payload} /> : null}

      {!loading && payload?.emailStatus && email ? (
        <section className="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-700">
          <p>
            Respaldo por correo:{" "}
            <strong>
              {payload.emailStatus === "sent"
                ? "Enviado"
                : payload.emailStatus === "failed"
                  ? "Fallido"
                  : "No enviado"}
            </strong>
          </p>
          {payload.emailStatus !== "sent" ? <p className="text-xs text-slate-500">Detalle: {payload.emailDetail}</p> : null}
        </section>
      ) : null}
    </main>
  );
}
