import { UrlForm } from "@/components/UrlForm";

type RunTokenPageProps = {
  params: Promise<{ token: string }>;
};

export default async function RunTokenPage({ params }: RunTokenPageProps) {
  const { token } = await params;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-4 py-16 md:px-8">
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm md:p-12">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Acceso habilitado</p>
        <h1 className="mt-3 text-3xl font-black text-slate-900 md:text-4xl">Ejecutar auditoria VyAudit</h1>
        <p className="mt-4 max-w-3xl text-slate-600">
          Este enlace es de uso unico. Completa URL y correo para generar tu informe.
        </p>

        <div className="mt-8">
          <UrlForm accessToken={token} />
        </div>
      </section>
    </main>
  );
}
