import { UrlForm } from "@/components/UrlForm";

type AdminRunPageProps = {
  searchParams: Promise<{ bridge?: string }>;
};

export default async function AdminRunPage({ searchParams }: AdminRunPageProps) {
  const { bridge } = await searchParams;

  if (!bridge) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-4 py-16 md:px-8">
        <section className="rounded-3xl border border-red-200 bg-red-50 p-8 shadow-sm md:p-12">
          <h1 className="text-2xl font-black text-red-900">Acceso no autorizado</h1>
          <p className="mt-3 text-red-800">
            Falta token de puente admin. Ingresa desde la aplicacion principal autenticada.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-4 py-16 md:px-8">
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm md:p-12">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Modo administrador</p>
        <h1 className="mt-3 text-3xl font-black text-slate-900 md:text-4xl">Ejecutar auditoria ilimitada</h1>
        <p className="mt-4 max-w-3xl text-slate-600">
          Acceso habilitado por rol admin desde la aplicacion principal.
        </p>

        <div className="mt-8">
          <UrlForm adminBridgeToken={bridge} />
        </div>
      </section>
    </main>
  );
}
