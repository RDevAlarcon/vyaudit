# VYAUDIT MVP

Auditoria inteligente de sitios web.  
Producto oficial de **Vytronix SpA**.

## 1) Estructura de carpetas

```text
vyaudit/
|- db/
|  |- schema.sql
|- docs/
|  |- mock-api-response.json
|  |- mock-report.md
|- src/
|  |- app/
|  |  |- api/
|  |  |  |- audit/route.ts
|  |  |- results/page.tsx
|  |  |- globals.css
|  |  |- layout.tsx
|  |  |- page.tsx
|  |- components/
|  |  |- ReportViewer.tsx
|  |  |- ResultsClient.tsx
|  |  |- UrlForm.tsx
|  |- lib/
|  |  |- audit.ts
|  |  |- db.ts
|  |  |- email.ts
|  |  |- html.ts
|  |  |- psi.ts
|  |  |- reportGenerator.ts
|  |  |- reportPrompt.ts
|  |  |- rules.ts
|  |  |- scoring.ts
|  |  |- tiers.ts
|  |  |- url.ts
|  |- types/
|     |- audit.ts
|- public/
|- .env.example
|- next.config.ts
|- package.json
|- postcss.config.js
|- tailwind.config.ts
|- tsconfig.json
```

## 2) Flujo funcional del MVP

1. Usuario ingresa URL y correo en `/`.
2. Se valida formato y redirige a `/results?url=...&email=...`.
3. Frontend llama `POST /api/audit`.
4. Backend:
   - Normaliza URL a HTTPS y valida dominio publico.
   - Ejecuta PSI (Performance, SEO, Accesibilidad, CWV).
   - Analiza HTML con Cheerio.
   - Aplica reglas propias VyAudit.
   - Consolida score global por categoria.
   - Genera informe en Markdown con estructura obligatoria.
   - Persiste resultado en PostgreSQL si `DATABASE_URL` existe.
   - Envia respaldo por correo si SMTP esta configurado.
5. Frontend renderiza informe + boton `Descargar PDF` (`window.print()`).

## 3) Ejecutar local

```bash
npm install
npm run dev
```

Variables:

```bash
cp .env.example .env
```

- `PSI_API_KEY`: recomendado.
- `OPENAI_API_KEY`: opcional para narrativa IA.
- `DATABASE_URL`: opcional para persistencia.
- `SMTP_*`: opcional para respaldo por correo.
- `CHROME_PATH`: opcional; si esta disponible se genera adjunto PDF browser-like (mas fiel al de `window.print()`).

## 4) Cumplimiento de reglas clave

- URL unica como entrada: OK
- Correo obligatorio para respaldo: OK
- Sin login: OK
- Sin invencion de datos: OK
- Fallback explicito `No detectable`: OK
- Estructura fija del informe VyAudit: OK
- Codigo modular y documentado: OK

## 5) IA y prompt estructurado VyAudit

- Prompt interno: `src/lib/reportPrompt.ts`
- Generacion:
  - Con IA (si hay `OPENAI_API_KEY`): narrativa ejecutiva compacta.
  - Sin IA: plantilla deterministica con la misma estructura obligatoria.

## 6) Base de datos

Aplicar `db/schema.sql` sobre PostgreSQL para guardar auditorias por dominio y fecha.

## 7) Escalabilidad por plan

Definida en `src/lib/tiers.ts`.

Modo comercial actual:
- **Pro**: plan activo para produccion (servicio pagado).

Planes de escalado:
- **Free (legacy tecnico)**: conservado solo para escenarios internos/lead magnet.
- **Pro**: multipagina, benchmark competitivo, tracking audit, mayor profundidad.
- **Enterprise**: crawling masivo, reporting ejecutivo ampliado, analitica y seguridad avanzada.
