# VYAUDIT MVP

Auditoría inteligente de sitios web.  
Producto oficial de **Vytronix SpA**.

## 1) Estructura de carpetas

```text
vyaudit/
├─ db/
│  └─ schema.sql
├─ docs/
│  ├─ mock-api-response.json
│  └─ mock-report.md
├─ src/
│  ├─ app/
│  │  ├─ api/
│  │  │  └─ audit/route.ts
│  │  ├─ results/page.tsx
│  │  ├─ globals.css
│  │  ├─ layout.tsx
│  │  └─ page.tsx
│  ├─ components/
│  │  ├─ ReportViewer.tsx
│  │  └─ UrlForm.tsx
│  ├─ lib/
│  │  ├─ audit.ts
│  │  ├─ db.ts
│  │  ├─ html.ts
│  │  ├─ psi.ts
│  │  ├─ reportGenerator.ts
│  │  ├─ reportPrompt.ts
│  │  ├─ rules.ts
│  │  ├─ scoring.ts
│  │  ├─ tiers.ts
│  │  └─ url.ts
│  └─ types/
│     └─ audit.ts
├─ .env.example
├─ next.config.ts
├─ package.json
├─ postcss.config.js
├─ tailwind.config.ts
└─ tsconfig.json
```

## 2) Flujo funcional del MVP

1. Usuario ingresa URL en `/`.
2. Se valida formato y redirige a `/results?url=...`.
3. Frontend llama `POST /api/audit`.
4. Backend:
   - Normaliza URL a HTTPS y valida dominio público.
   - Ejecuta PSI (Performance, SEO, Accesibilidad, CWV).
   - Analiza HTML con Cheerio.
   - Aplica reglas propias VyAudit.
   - Consolida score global por categoría.
   - Genera informe en Markdown siguiendo estructura obligatoria.
   - Persiste resultado en PostgreSQL si `DATABASE_URL` existe.
5. Frontend renderiza informe + botón "Descargar PDF" (`window.print()`).

## 3) Ejecutar local

```bash
npm install
npm run dev
```

Variables:

```bash
cp .env.example .env
```

- `PSI_API_KEY`: opcional, recomendado para mayor estabilidad.
- `OPENAI_API_KEY`: opcional, si existe usa IA para redactar informe.
- `DATABASE_URL`: opcional, habilita persistencia de auditorías.

## 4) Cumplimiento de reglas clave

- URL única como entrada: ✅
- Sin login: ✅
- Sin invención de datos: ✅
- Fallback explícito `"No detectable"`: ✅
- Estructura fija del informe VyAudit: ✅
- Base escalable Free/Pro/Enterprise: ✅ (`src/lib/tiers.ts`)
- Código modular y documentado: ✅

## 5) IA y prompt estructurado VyAudit

- Prompt interno: `src/lib/reportPrompt.ts`
- Generación:
  - Con IA (si hay `OPENAI_API_KEY`): `src/lib/reportGenerator.ts`
  - Sin IA: plantilla determinística con la misma estructura obligatoria.

## 6) Base de datos (preparada)

Aplicar `db/schema.sql` sobre PostgreSQL para guardar auditorías por dominio y fecha.

## 7) Escalabilidad por plan

Definida en `src/lib/tiers.ts`:

- **Free**: 1 URL principal, reporte base (lead magnet).
- **Pro**: multipágina, benchmark competitivo, tracking audit, mayor profundidad.
- **Enterprise**: crawling masivo, reporting ejecutivo ampliado, analítica y seguridad avanzada.
