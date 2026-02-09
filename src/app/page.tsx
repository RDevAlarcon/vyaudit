import { UrlForm } from "@/components/UrlForm";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-4 py-16 md:px-8">
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm md:p-12">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">
          Producto oficial de Vytronix SpA
        </p>
        <h1 className="mt-3 text-3xl font-black text-slate-900 md:text-4xl">
          VYAUDIT
          <span className="block text-xl font-semibold text-slate-700 md:text-2xl">
            Auditoría inteligente de sitios web
          </span>
        </h1>
        <p className="mt-4 max-w-3xl text-slate-600">
          Recibe un informe profesional con rendimiento, SEO técnico, accesibilidad, UX/conversión y seguridad
          básica ingresando solo una URL pública.
        </p>

        <div className="mt-8">
          <UrlForm />
        </div>
      </section>
    </main>
  );
}
