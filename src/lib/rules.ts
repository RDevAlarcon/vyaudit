import type { HtmlAnalysis, LighthouseMetrics, SecurityAnalysis, VyRuleFinding } from "@/types/audit";

export function runVyAuditRules(input: {
  html: HtmlAnalysis;
  lighthouse: LighthouseMetrics;
  security: SecurityAnalysis;
}): VyRuleFinding[] {
  const { html, lighthouse, security } = input;
  const findings: VyRuleFinding[] = [];

  findings.push({
    id: "h1_presence",
    title: "Presencia de H1",
    severity: html.headings.h1 === 0 ? "high" : "low",
    category: "SEO Técnico",
    status: html.headings.h1 === 0 ? "issue" : "ok",
    description: html.headings.h1 === 0 ? "No se detectó un H1 principal." : "Se detectó al menos un H1.",
    recommendation:
      html.headings.h1 === 0
        ? "Agregar un único H1 descriptivo y alineado con la intención principal de búsqueda."
        : "Mantener una jerarquía de headings consistente."
  });

  findings.push({
    id: "cta_above_fold",
    title: "CTA above-the-fold",
    severity: !html.ctaDetected || !html.aboveTheFoldCTA ? "high" : "low",
    category: "UX & Conversión",
    status: !html.ctaDetected || !html.aboveTheFoldCTA ? "issue" : "ok",
    description:
      !html.ctaDetected || !html.aboveTheFoldCTA
        ? "CTA no visible en secciones iniciales del sitio."
        : "CTA visible en zona inicial.",
    recommendation:
      !html.ctaDetected || !html.aboveTheFoldCTA
        ? "Incluir CTA claro al inicio con valor y acción explícita."
        : "Optimizar copy del CTA para mejorar conversión."
  });

  findings.push({
    id: "images_alt",
    title: "Imágenes sin texto alternativo",
    severity: html.imagesWithoutAlt > 0 ? "medium" : "low",
    category: "Accesibilidad",
    status: html.imagesWithoutAlt > 0 ? "issue" : "ok",
    description:
      html.imagesWithoutAlt > 0
        ? `Se detectaron ${html.imagesWithoutAlt} imágenes sin atributo alt.`
        : "No se detectaron imágenes sin atributo alt.",
    recommendation:
      html.imagesWithoutAlt > 0
        ? "Agregar atributos alt descriptivos para accesibilidad y SEO semántico."
        : "Mantener estándar alt para nuevas imágenes."
  });

  findings.push({
    id: "meta_tags",
    title: "Meta tags esenciales",
    severity: html.title === "No detectable" || html.metaDescription === "No detectable" ? "high" : "low",
    category: "SEO Técnico",
    status: html.title === "No detectable" || html.metaDescription === "No detectable" ? "issue" : "ok",
    description:
      html.title === "No detectable" || html.metaDescription === "No detectable"
        ? "Faltan title y/o meta description."
        : "Title y meta description presentes.",
    recommendation:
      html.title === "No detectable" || html.metaDescription === "No detectable"
        ? "Definir title y meta description únicos por página."
        : "Revisar longitud y relevancia de los metadatos."
  });

  findings.push({
    id: "mobile_basic",
    title: "Señales de mobile UX",
    severity: html.mobileIssues[0] !== "No detectable" ? "medium" : "low",
    category: "UX & Conversión",
    status: html.mobileIssues[0] !== "No detectable" ? "issue" : "ok",
    description:
      html.mobileIssues[0] !== "No detectable"
        ? `Se detectaron potenciales problemas mobile: ${html.mobileIssues.join(" ")}`
        : "No se detectaron señales mobile críticas a nivel básico.",
    recommendation:
      html.mobileIssues[0] !== "No detectable"
        ? "Corregir viewport, jerarquía visual y legibilidad en pantallas pequeñas."
        : "Validar UX mobile con pruebas de usuario."
  });

  const missingSecurityHeaders = Object.values(security.headers).filter((present) => !present).length;
  findings.push({
    id: "security_headers",
    title: "Headers de seguridad",
    severity: missingSecurityHeaders >= 3 ? "high" : missingSecurityHeaders > 0 ? "medium" : "low",
    category: "Seguridad",
    status: missingSecurityHeaders > 0 ? "issue" : "ok",
    description:
      missingSecurityHeaders > 0
        ? `Faltan ${missingSecurityHeaders} headers de seguridad recomendados.`
        : "Headers de seguridad básicos presentes.",
    recommendation:
      missingSecurityHeaders > 0
        ? "Configurar CSP, HSTS, X-Frame-Options, Referrer-Policy y headers complementarios."
        : "Mantener política de seguridad activa y monitoreo continuo."
  });

  findings.push({
    id: "lcp_health",
    title: "Estado de LCP",
    severity:
      typeof lighthouse.coreWebVitals.lcp === "string" && lighthouse.coreWebVitals.lcp.includes("No detectable")
        ? "medium"
        : "low",
    category: "Performance",
    status:
      typeof lighthouse.coreWebVitals.lcp === "string" && lighthouse.coreWebVitals.lcp.includes("No detectable")
        ? "issue"
        : "ok",
    description:
      lighthouse.coreWebVitals.lcp === "No detectable"
        ? "No fue posible detectar LCP desde PSI."
        : `LCP reportado: ${lighthouse.coreWebVitals.lcp}.`,
    recommendation:
      lighthouse.coreWebVitals.lcp === "No detectable"
        ? "Reintentar con API key PSI y validar bloqueo por bot/firewall."
        : "Optimizar recursos del contenido principal para reducir LCP."
  });

  return findings;
}
