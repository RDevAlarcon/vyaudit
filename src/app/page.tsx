export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col justify-center px-4 py-16 md:px-8">
      <section className="rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm md:p-12">
        <p className="text-sm font-semibold uppercase tracking-wider text-brand-700">Producto oficial de Vytronix SpA</p>
        <h1 className="mt-3 text-3xl font-black text-slate-900 md:text-4xl">VYAUDIT</h1>
        <p className="mt-4 text-slate-700">Acceso privado por enlace unico. Si ya realizaste el pago, usa el link recibido por correo para ejecutar tu auditoria.</p>
        <p className="mt-3 text-sm text-slate-600">Si necesitas soporte comercial, contacta a Vytronix SpA.</p>
      </section>
    </main>
  );
}
