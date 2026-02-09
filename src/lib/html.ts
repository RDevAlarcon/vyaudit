import * as cheerio from "cheerio";
import type { Element } from "domhandler";
import type { HtmlAnalysis, SecurityAnalysis } from "@/types/audit";

const ctaRegex =
  /(contacta|agenda|cotiza|cotizar|compra|suscribete|suscribirse|demo|probar|hablemos|solicita|empezar|comenzar|llamar|whatsapp|get started|book|quote|pricing|contact)/i;

function normalizeText(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function extractCtaSignal($: cheerio.CheerioAPI, element: Element): string {
  const node = $(element);
  const text = node.text().trim();
  const ariaLabel = node.attr("aria-label") ?? "";
  const title = node.attr("title") ?? "";
  const value = node.attr("value") ?? "";
  const href = node.attr("href") ?? "";
  const className = node.attr("class") ?? "";
  const id = node.attr("id") ?? "";
  return [text, ariaLabel, title, value, href, className, id].join(" ");
}

async function fetchDocument(url: string): Promise<{ ok: boolean; body: string }> {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "VyAuditBot/1.0 (+https://vytronix.cl)" },
      next: { revalidate: 0 }
    });
    if (!response.ok) {
      return { ok: false, body: "" };
    }
    return { ok: true, body: await response.text() };
  } catch {
    return { ok: false, body: "" };
  }
}

function extractScriptHosts($: cheerio.CheerioAPI): string[] {
  const hosts = new Set<string>();
  $("script[src]").each((_, element) => {
    const src = $(element).attr("src");
    if (!src) {
      return;
    }
    try {
      const parsed = new URL(src, "https://placeholder.local");
      if (parsed.hostname && parsed.hostname !== "placeholder.local") {
        hosts.add(parsed.hostname.toLowerCase());
      }
    } catch {
      // Ignore malformed script URLs.
    }
  });
  return Array.from(hosts.values());
}

function countHeading($: cheerio.CheerioAPI, level: 1 | 2 | 3 | 4 | 5 | 6): number {
  return $(`h${level}`).length;
}

export async function analyzeHtmlAndSecurity(url: string): Promise<{
  html: HtmlAnalysis;
  security: SecurityAnalysis;
}> {
  const fallbackHtml: HtmlAnalysis = {
    title: "No detectable",
    metaDescription: "No detectable",
    headings: { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 },
    imagesTotal: 0,
    imagesWithoutAlt: 0,
    linksTotal: 0,
    internalLinks: 0,
    externalLinks: 0,
    scriptsTotal: 0,
    formsTotal: 0,
    hasRobotsMeta: false,
    hasCanonical: false,
    hasViewport: false,
    hasSitemapHint: false,
    hasRobotsTxtHint: false,
    ctaDetected: false,
    aboveTheFoldCTA: false,
    mobileIssues: ["No detectable"]
  };

  const fallbackSecurity: SecurityAnalysis = {
    https: url.startsWith("https://"),
    headers: {
      strictTransportSecurity: false,
      contentSecurityPolicy: false,
      xContentTypeOptions: false,
      xFrameOptions: false,
      referrerPolicy: false,
      permissionsPolicy: false
    },
    cookiesPresent: "No detectable",
    externalScriptHosts: []
  };

  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: { "User-Agent": "VyAuditBot/1.0 (+https://vytronix.cl)" },
      next: { revalidate: 0 }
    });
    const body = await response.text();
    const $ = cheerio.load(body);
    const parsedUrl = new URL(url);

    let internalLinks = 0;
    let externalLinks = 0;
    $("a[href]").each((_, element) => {
      const href = $(element).attr("href");
      if (!href) {
        return;
      }
      try {
        const target = new URL(href, parsedUrl.origin);
        if (target.hostname === parsedUrl.hostname) {
          internalLinks += 1;
        } else {
          externalLinks += 1;
        }
      } catch {
        // Ignore malformed URLs in links.
      }
    });

    const ctaCandidates = $("a, button, input[type='submit'], [role='button']");
    let ctaDetected = false;
    let aboveFoldCTA = false;
    ctaCandidates.each((index, element) => {
      const ctaSignal = normalizeText(extractCtaSignal($, element));
      if (!ctaSignal) {
        return;
      }
      if (ctaRegex.test(ctaSignal)) {
        ctaDetected = true;

        const inHeroLikeZone =
          $(element).closest("header, nav, [id*='hero'], [class*='hero'], main section:first-of-type").length > 0;

        // Heuristic: early DOM order or hero/header zone are treated as likely above-the-fold.
        if (index < 40 || inHeroLikeZone) {
          aboveFoldCTA = true;
        }
      }
    });

    const images = $("img");
    let imagesWithoutAlt = 0;
    images.each((_, element) => {
      const alt = $(element).attr("alt");
      if (!alt || !alt.trim()) {
        imagesWithoutAlt += 1;
      }
    });

    const mobileIssues: string[] = [];
    if ($("meta[name='viewport']").length === 0) {
      mobileIssues.push("Falta meta viewport.");
    }
    if ($("body").text().length > 3000 && $("main").length === 0) {
      mobileIssues.push("Estructura extensa sin contenedor semantico principal.");
    }

    const robotsUrl = new URL("/robots.txt", parsedUrl.origin).toString();
    const robotsDocument = await fetchDocument(robotsUrl);
    const robotsFound = robotsDocument.ok && robotsDocument.body.length > 0;

    const sitemapFromRobots = robotsFound && /sitemap:/i.test(robotsDocument.body);
    const sitemapUrl = new URL("/sitemap.xml", parsedUrl.origin).toString();
    const sitemapDocument = await fetchDocument(sitemapUrl);
    const sitemapFound =
      sitemapDocument.ok &&
      (/<urlset/i.test(sitemapDocument.body) ||
        /<sitemapindex/i.test(sitemapDocument.body) ||
        sitemapDocument.body.length > 80);

    const html: HtmlAnalysis = {
      title: $("title").first().text().trim() || "No detectable",
      metaDescription: $("meta[name='description']").attr("content")?.trim() || "No detectable",
      headings: {
        h1: countHeading($, 1),
        h2: countHeading($, 2),
        h3: countHeading($, 3),
        h4: countHeading($, 4),
        h5: countHeading($, 5),
        h6: countHeading($, 6)
      },
      imagesTotal: images.length,
      imagesWithoutAlt,
      linksTotal: $("a[href]").length,
      internalLinks,
      externalLinks,
      scriptsTotal: $("script").length,
      formsTotal: $("form").length,
      hasRobotsMeta: $("meta[name='robots']").length > 0,
      hasCanonical: $("link[rel='canonical']").length > 0,
      hasViewport: $("meta[name='viewport']").length > 0,
      hasSitemapHint: sitemapFound || sitemapFromRobots || /sitemap/i.test(body),
      hasRobotsTxtHint: robotsFound || /robots\.txt/i.test(body),
      ctaDetected,
      aboveTheFoldCTA: aboveFoldCTA,
      mobileIssues: mobileIssues.length ? mobileIssues : ["No detectable"]
    };

    const headers = response.headers;
    const security: SecurityAnalysis = {
      https: response.url.startsWith("https://"),
      headers: {
        strictTransportSecurity: Boolean(headers.get("strict-transport-security")),
        contentSecurityPolicy: Boolean(headers.get("content-security-policy")),
        xContentTypeOptions: Boolean(headers.get("x-content-type-options")),
        xFrameOptions: Boolean(headers.get("x-frame-options")),
        referrerPolicy: Boolean(headers.get("referrer-policy")),
        permissionsPolicy: Boolean(headers.get("permissions-policy"))
      },
      cookiesPresent: headers.has("set-cookie"),
      externalScriptHosts: extractScriptHosts($)
    };

    return { html, security };
  } catch {
    return {
      html: fallbackHtml,
      security: fallbackSecurity
    };
  }
}

