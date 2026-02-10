"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const urlRegex = /^https?:\/\/[^\s/$.?#].[^\s]*$/i;

type UrlFormProps = {
  accessToken?: string;
  adminBridgeToken?: string;
};

export function UrlForm({ accessToken, adminBridgeToken }: UrlFormProps) {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleaned = url.trim();
    if (!cleaned) {
      setError("Ingresa una URL pública.");
      return;
    }
    const withProtocol = cleaned.startsWith("http") ? cleaned : `https://${cleaned}`;
    if (!urlRegex.test(withProtocol)) {
      setError("La URL no tiene un formato válido.");
      return;
    }
    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Debes ingresar un correo para recibir el respaldo del informe.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError("El correo no tiene un formato válido.");
      return;
    }
    setError("");
    const params = new URLSearchParams({ url: withProtocol });
    if (cleanEmail) {
      params.set("email", cleanEmail);
    }
    if (accessToken) {
      params.set("token", accessToken);
    }
    if (adminBridgeToken) {
      params.set("bridge", adminBridgeToken);
    }
    router.push(`/results?${params.toString()}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <label className="block text-sm font-semibold text-slate-700" htmlFor="site-url">
        URL del sitio a auditar
      </label>
      <div className="flex flex-col gap-3 md:flex-row">
        <input
          id="site-url"
          type="text"
          placeholder="https://ejemplo.com"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none ring-brand-300 transition focus:ring"
        />
        <button
          type="submit"
          className="rounded-xl bg-brand-600 px-6 py-3 font-semibold text-white transition hover:bg-brand-700"
        >
          Analizar sitio
        </button>
      </div>
      {accessToken ? <input type="hidden" value={accessToken} readOnly aria-hidden="true" /> : null}
      {adminBridgeToken ? <input type="hidden" value={adminBridgeToken} readOnly aria-hidden="true" /> : null}
      <div>
        <label className="mb-1 block text-sm font-semibold text-slate-700" htmlFor="contact-email">
          Correo para respaldo del informe
        </label>
        <input
          id="contact-email"
          type="email"
          required
          placeholder="tu@correo.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none ring-brand-300 transition focus:ring"
        />
      </div>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </form>
  );
}
