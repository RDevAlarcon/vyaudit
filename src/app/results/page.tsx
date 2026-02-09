import { Suspense } from "react";
import { ResultsClient } from "@/components/ResultsClient";

export default function ResultsPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-10 md:px-8">
          <section className="rounded-2xl border border-slate-200 bg-white p-8">
            <p className="text-slate-700">Cargando resultados...</p>
          </section>
        </main>
      }
    >
      <ResultsClient />
    </Suspense>
  );
}
