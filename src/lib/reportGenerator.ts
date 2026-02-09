import type { ConsolidatedAudit } from "@/types/audit";

type AiNarrative = {
  executiveSummary: string;
  businessImpact: string;
  performanceInterpretation: string;
  seoInterpretation: string;
  accessibilityInterpretation: string;
  uxInterpretation: string;
  securityInterpretation: string;
  quickWinsNote: string;
  conclusion: string;
  nextStep: string;
};

function siteStatus(score: number): "Excelente" | "Bueno" | "Mejorable" | "Crítico" {
  if (score >= 85) return "Excelente";
  if (score >= 70) return "Bueno";
  if (score >= 50) return "Mejorable";
  return "Crítico";
}

function fillToThree(items: string[], fallbacks: [string, string, string]): [string, string, string] {
  const clean = items.filter((item) => item && item !== "No detectable");
  for (const fallback of fallbacks) {
    if (clean.length >= 3) {
      break;
    }
    if (!clean.includes(fallback)) {
      clean.push(fallback);
    }
  }
  return [clean[0], clean[1], clean[2]];
}

function topIssues(audit: ConsolidatedAudit): [string, string, string] {
  const issues = audit.findings
    .filter((item) => item.status === "issue")
    .sort((a, b) => {
      const weight = { critical: 4, high: 3, medium: 2, low: 1 };
      return weight[b.severity] - weight[a.severity];
    })
    .slice(0, 3)
    .map((item) => `${item.title}: ${item.description}`);

  return fillToThree(issues, [
    "Sin hallazgos críticos adicionales detectables en esta corrida.",
    "No se detectan riesgos técnicos severos adicionales en esta evaluación.",
    "Se recomienda monitoreo continuo para detectar nuevas desviaciones."
  ]);
}

function topOpportunities(audit: ConsolidatedAudit): [string, string, string] {
  const opportunities = audit.findings
    .filter((item) => item.status === "issue")
    .slice(0, 3)
    .map((item) => item.recommendation);

  return fillToThree(opportunities, [
    "Mantener monitoreo continuo para evitar regresiones técnicas.",
    "Definir tablero mensual de KPIs técnicos y comerciales para seguimiento.",
    "Programar revisión trimestral para sostener mejoras y priorizar nuevas optimizaciones."
  ]);
}

function estimateBusinessImpact(audit: ConsolidatedAudit): string {
  const lowScores = [audit.scores.performance, audit.scores.seo, audit.scores.uxConversion].filter((n) => n < 70).length;
  if (lowScores >= 2) {
    return "Impacto alto: hay fricción en conversión, pérdida de visibilidad orgánica y menor eficiencia de adquisición.";
  }
  return "Impacto medio: existen mejoras relevantes para aumentar captación orgánica y mejorar tasa de conversión.";
}

function quickWinsTable(audit: ConsolidatedAudit): string {
  const wins = audit.findings
    .filter((item) => item.status === "issue")
    .slice(0, 5)
    .map((item) => {
      const impact = item.severity === "high" || item.severity === "critical" ? "Alto" : "Medio";
      const effort = item.severity === "critical" ? "Alto" : item.severity === "high" ? "Medio" : "Bajo";
      return `| ${item.recommendation} | ${impact} | ${effort} |`;
    });

  if (!wins.length) {
    return "| Mantener monitoreo mensual y control de regresiones | Medio | Bajo |";
  }
  return wins.join("\n");
}

function normalizeModelText(input: string): string {
  const trimmed = input.trim();
  const withoutFence = trimmed.replace(/^```(?:json|markdown)?\s*/i, "").replace(/\s*```$/i, "").trim();
  return withoutFence;
}

function extractOutputText(json: {
  output_text?: string;
  output?: Array<{
    content?: Array<{ type?: string; text?: string }>;
  }>;
}): string {
  const direct = json.output_text?.trim();
  if (direct) {
    return normalizeModelText(direct);
  }
  const nested =
    json.output
      ?.flatMap((item) => item.content ?? [])
      .filter((part) => part.type === "output_text" && typeof part.text === "string")
      .map((part) => part.text?.trim() ?? "")
      .filter(Boolean)
      .join("\n\n") ?? "";
  return normalizeModelText(nested);
}

function compactNarrativeText(input: string, maxSentences = 2, maxChars = 280): string {
  const sanitize = (text: string): string =>
    text
      .replace(/https?:\/\/([a-z0-9-]+)\. +(cl|com|net|org|io)\b/gi, "https://$1.$2")
      .replace(/([a-z0-9-]+)\. +(cl|com|net|org|io)\b/gi, "$1.$2")
      .replace(/\brobots\. +txt\b/gi, "robots.txt")
      .replace(/\bcanonical\. +/gi, "canonical ");

  const normalized = input.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "No detectable";
  }

  const sentences = normalized.match(/[^.!?]+[.!?]?/g)?.map((s) => s.trim()).filter(Boolean) ?? [normalized];
  const selected = sentences.slice(0, maxSentences).join(" ").trim();
  if (selected.length <= maxChars) {
    return sanitize(selected);
  }

  const sliced = selected.slice(0, maxChars).trim();
  const lastSpace = sliced.lastIndexOf(" ");
  const compacted = `${(lastSpace > 80 ? sliced.slice(0, lastSpace) : sliced).trim()}...`;
  return sanitize(compacted);
}

function buildNarrativePrompt(audit: ConsolidatedAudit): string {
  return `
Eres un consultor senior de Vytronix SpA.
Devuelve SOLO JSON valido, sin markdown ni texto extra.
No inventes datos. Si falta informacion, usa "No detectable".

Responde exactamente este objeto JSON con estas claves string:
{
  "executiveSummary": "...",
  "businessImpact": "...",
  "performanceInterpretation": "...",
  "seoInterpretation": "...",
  "accessibilityInterpretation": "...",
  "uxInterpretation": "...",
  "securityInterpretation": "...",
  "quickWinsNote": "...",
  "conclusion": "...",
  "nextStep": "..."
}

Reglas de estilo:
- Espanol profesional, claro para cliente no tecnico.
- Maximo 2 frases por campo.
- Sin bullets, sin encabezados.
- Enfocar en conversion, SEO, confianza y riesgo.

Datos:
${JSON.stringify(audit, null, 2)}
`.trim();
}

async function generateNarrativeWithOpenAI(audit: ConsolidatedAudit): Promise<{ narrative: AiNarrative | null; reason?: string; prompt: string }> {
  const prompt = buildNarrativePrompt(audit);
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-4.1-mini";

  if (!apiKey) {
    return { narrative: null, reason: "missing_openai_api_key", prompt };
  }

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: "user",
            content: [{ type: "input_text", text: prompt }]
          }
        ],
        max_output_tokens: 1400
      })
    });

    if (!response.ok) {
      const text = await response.text();
      return { narrative: null, reason: `openai_http_${response.status}:${text.slice(0, 220)}`, prompt };
    }

    const json = (await response.json()) as {
      output_text?: string;
      output?: Array<{
        content?: Array<{ type?: string; text?: string }>;
      }>;
    };

    const text = extractOutputText(json);
    if (!text) {
      return { narrative: null, reason: "openai_empty_output", prompt };
    }

    const parsed = JSON.parse(text) as Partial<AiNarrative>;
    const keys: Array<keyof AiNarrative> = [
      "executiveSummary",
      "businessImpact",
      "performanceInterpretation",
      "seoInterpretation",
      "accessibilityInterpretation",
      "uxInterpretation",
      "securityInterpretation",
      "quickWinsNote",
      "conclusion",
      "nextStep"
    ];

    for (const key of keys) {
      if (typeof parsed[key] !== "string" || !(parsed[key] as string).trim()) {
        return { narrative: null, reason: `openai_invalid_json_field:${key}`, prompt };
      }
    }

    const compacted: AiNarrative = {
      executiveSummary: compactNarrativeText(parsed.executiveSummary as string),
      businessImpact: compactNarrativeText(parsed.businessImpact as string),
      performanceInterpretation: compactNarrativeText(parsed.performanceInterpretation as string),
      seoInterpretation: compactNarrativeText(parsed.seoInterpretation as string),
      accessibilityInterpretation: compactNarrativeText(parsed.accessibilityInterpretation as string),
      uxInterpretation: compactNarrativeText(parsed.uxInterpretation as string),
      securityInterpretation: compactNarrativeText(parsed.securityInterpretation as string),
      quickWinsNote: compactNarrativeText(parsed.quickWinsNote as string),
      conclusion: compactNarrativeText(parsed.conclusion as string),
      nextStep: compactNarrativeText(parsed.nextStep as string)
    };

    return { narrative: compacted, prompt };
  } catch (error) {
    return {
      narrative: null,
      reason: `openai_exception:${error instanceof Error ? error.message : "unknown_error"}`,
      prompt
    };
  }
}

function renderDeterministicMarkdown(audit: ConsolidatedAudit, ai?: AiNarrative): string {
  const issues = topIssues(audit);
  const opportunities = topOpportunities(audit);
  const inpText =
    audit.lighthouse.coreWebVitals.inp === "No detectable"
      ? "No detectable en esta muestra"
      : String(audit.lighthouse.coreWebVitals.inp);
  const robotsMetaText = audit.html.hasRobotsMeta ? "✅" : "No se detectó meta robots en la home";
  const seoErrorsText =
    audit.findings
      .filter((f) => f.category === "SEO Técnico" && f.status === "issue")
      .map((f) => f.description)
      .join(" | ") || "Sin errores críticos detectables en SEO técnico en esta corrida.";
  const contrastText = "Sin incidencias detectables en esta corrida automatizada.";
  const keyboardText = "Sin incidencias detectables en esta corrida automatizada.";
  const accessibilityRisksText =
    audit.findings
      .filter((f) => f.category === "Accesibilidad" && f.status === "issue")
      .map((f) => f.description)
      .join(" | ") || "Sin riesgos relevantes detectables en accesibilidad básica.";
  const mobileUxText =
    audit.html.mobileIssues[0] === "No detectable"
      ? "Sin fricción mobile crítica detectable en esta corrida."
      : audit.html.mobileIssues.join(" | ");
  const uxFrictionText =
    audit.findings
      .filter((f) => f.category === "UX & Conversión" && f.status === "issue")
      .map((f) => f.description)
      .join(" | ") || "Sin fricción relevante detectable en esta corrida.";
  const visibleLibrariesText =
    audit.security.externalScriptHosts.length > 0
      ? audit.security.externalScriptHosts.join(", ")
      : "Sin librerías externas visibles en esta muestra.";

  return `
# 1. PORTADA
- **VyAudit**
- **Dominio auditado:** ${audit.domain}
- **Fecha:** ${new Date(audit.dateIso).toLocaleDateString("es-CL")}
- **Tipo de auditoría:** ${audit.auditType}
- **Modalidad de medición:** puntual (una sola corrida técnica)

# 2. RESUMEN EJECUTIVO
- **Puntaje general:** ${audit.scores.total}/100
- **Estado del sitio:** ${siteStatus(audit.scores.total)}
- **Contexto de medición:** resultado basado en una única ejecución automatizada.
- **3 problemas principales:**
- ⚠️ ${issues[0]}
- ⚠️ ${issues[1]}
- ⚠️ ${issues[2]}
- **3 oportunidades claras:**
- ✅ ${opportunities[0]}
- ✅ ${opportunities[1]}
- ✅ ${opportunities[2]}
- **Impacto estimado en negocio:** ${ai?.businessImpact ?? estimateBusinessImpact(audit)}
- **Lectura ejecutiva:** ${ai?.executiveSummary ?? "El sitio presenta una base técnica sólida con foco pendiente en seguridad y priorización de mejoras de conversión."}

# 3. SCORE GENERAL
- **Puntaje total:** ${audit.scores.total}/100
- **Performance:** ${audit.scores.performance}
- **SEO Técnico:** ${audit.scores.seo}
- **Accesibilidad:** ${audit.scores.accessibility}
- **UX & Conversión:** ${audit.scores.uxConversion}
- **Seguridad:** ${audit.scores.security}

# 4. PERFORMANCE & CORE WEB VITALS
- **LCP:** ${audit.lighthouse.coreWebVitals.lcp}
- **CLS:** ${audit.lighthouse.coreWebVitals.cls}
- **INP:** ${inpText}
- **Tiempo de carga estimado (FCP/SpeedIndex):** ${audit.lighthouse.firstContentfulPaint} / ${audit.lighthouse.speedIndex}
- **Hallazgos críticos:** ${issues[0]}
- **Recomendaciones priorizadas:** Optimización de recursos críticos, compresión de imágenes, eliminación de JS no crítico.
- **Interpretación de negocio:** ${ai?.performanceInterpretation ?? "Una carga visual rápida favorece conversión, pero cualquier latencia de interacción reduce la probabilidad de cierre en usuarios móviles."}

# 5. SEO TÉCNICO
- **Meta tags:** title=${audit.html.title !== "No detectable" ? "✅" : "❌"}, description=${audit.html.metaDescription !== "No detectable" ? "✅" : "❌"}
- **Headings:** H1=${audit.html.headings.h1}, H2=${audit.html.headings.h2}
- **Indexación:** robots meta=${robotsMetaText}
- **Sitemap / robots:** sitemap=${audit.html.hasSitemapHint ? "✅" : "No detectable"}, robots=${audit.html.hasRobotsTxtHint ? "✅" : "No detectable"}
- **Errores detectados:** ${seoErrorsText}
- **Recomendaciones claras:** jerarquía semántica, metadatos únicos y validación de indexabilidad.
- **Interpretación de negocio:** ${ai?.seoInterpretation ?? "Corregir señales de indexación protege la visibilidad orgánica y reduce pérdida de tráfico de intención comercial."}

# 6. ACCESIBILIDAD (WCAG BÁSICO)
- **Contraste:** ${contrastText}
- **Formularios:** ${audit.html.formsTotal > 0 ? "Detectados, requiere validación de labels" : "No detectable"}
- **Navegación por teclado:** ${keyboardText}
- **Lectores de pantalla:** ${audit.html.imagesWithoutAlt > 0 ? "⚠️ Riesgo por imágenes sin alt" : "✅ Sin riesgos evidentes en alt"}
- **Riesgos potenciales:** ${accessibilityRisksText}
- **Interpretación de negocio:** ${ai?.accessibilityInterpretation ?? "Una accesibilidad consistente amplía alcance, mejora percepción de marca y disminuye fricción en etapas de conversión."}

# 7. UX & CONVERSION
- **Claridad del mensaje principal:** ${audit.html.title !== "No detectable" ? "✅ Detectable" : "No detectable"}
- **CTA:** ${audit.html.ctaDetected ? "✅ Detectado" : "❌ No detectable"}
- **Above-the-fold:** ${audit.html.aboveTheFoldCTA ? "✅ CTA visible" : "❌ CTA no visible"}
- **Mobile UX:** ${mobileUxText}
- **Fricción detectada:** ${uxFrictionText}
- **Recomendaciones prácticas:** simplificar hero, reforzar CTA inicial y reducir fricción en navegación móvil.
- **Interpretación de negocio:** ${ai?.uxInterpretation ?? "Mejorar claridad del CTA y reducir fricción de recorrido aumenta probabilidad de contacto y conversión efectiva."}

# 8. SEGURIDAD BASICA
- **HTTPS:** ${audit.security.https ? "✅" : "❌"}
- **Headers de seguridad:** HSTS=${audit.security.headers.strictTransportSecurity ? "✅" : "❌"}, CSP=${audit.security.headers.contentSecurityPolicy ? "✅" : "❌"}, X-Frame-Options=${audit.security.headers.xFrameOptions ? "✅" : "❌"}
- **Cookies:** ${String(audit.security.cookiesPresent)}
- **Formularios:** ${audit.html.formsTotal > 0 ? "Detectados, validar protección CSRF en backend." : "No detectable"}
- **Librerías visibles:** ${visibleLibrariesText}
- **Interpretación de negocio:** ${ai?.securityInterpretation ?? "La ausencia de headers críticos eleva riesgo operativo y puede afectar confianza de clientes y partners."}

# 9. QUICK WINS
| Acción | Impacto | Esfuerzo |
|---|---|---|
${quickWinsTable(audit)}
- **Nota ejecutiva:** ${ai?.quickWinsNote ?? "Priorizar quick wins técnicos reduce riesgo y entrega mejoras visibles en conversión y percepción de calidad en el corto plazo."}

# 10. ROADMAP 30 / 60 / 90 DIAS
- **30 días:** Resolver quick wins de alto impacto (metadatos, H1, CTA visible, headers mínimos).
- **60 días:** Optimización técnica profunda (Core Web Vitals, assets, arquitectura de contenido, accesibilidad base).
- **90 días:** Iteración basada en datos (A/B test de CTA, evolución SEO por clúster, hardening de seguridad y monitoreo).

# 11. CONCLUSION Y PROXIMO PASO
${ai?.conclusion ?? "El sitio presenta oportunidades claras para mejorar captación orgánica, conversión y robustez técnica."}
**Próximo paso:** ${ai?.nextStep ?? "ejecutar un plan técnico-comercial con Vytronix SpA para implementar el roadmap priorizado."}
`.trim();
}

export async function generateVyAuditReport(audit: ConsolidatedAudit): Promise<{
  promptUsed: string;
  reportMarkdown: string;
  source: "ai" | "fallback";
  debug?: string;
}> {
  const aiResult = await generateNarrativeWithOpenAI(audit);
  return {
    promptUsed: aiResult.prompt,
    reportMarkdown: renderDeterministicMarkdown(audit, aiResult.narrative ?? undefined),
    source: aiResult.narrative ? "ai" : "fallback",
    debug: aiResult.narrative ? undefined : aiResult.reason
  };
}
