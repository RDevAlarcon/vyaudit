import { inflateSync, deflateSync } from "node:zlib";
import { readFileSync, existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";

type FontName = "F1" | "F2";
type IconKind = "ok" | "warn" | "bad" | "lock" | "up" | "down" | "green" | "yellow" | "red" | "info" | "star" | "rocket";

type PdfPage = {
  commands: string[];
};

type PngRgbData = {
  width: number;
  height: number;
  rgb: Buffer;
  alpha?: Buffer;
};

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN_X = 36;
const MARGIN_TOP = 36;
const MARGIN_BOTTOM = 36;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

let cachedLogo: PngRgbData | null = null;
let cachedLogoDataUrl: string | null = null;

function cleanLine(line: string): string {
  return line
    .replace(/^#+\s*/, "")
    .replace(/^\-\s*/, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .trim();
}

function toSafeFilename(input: string): string {
  return input.replace(/[^a-z0-9.-]/gi, "_");
}

export function buildAuditPdfFilename(domain: string): string {
  return `Informe-VyAudit-${toSafeFilename(domain)}.pdf`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function markdownToHtml(markdown: string): string {
  const escaped = escapeHtml(markdown);
  return escaped
    .replace(/^### (.*$)/gim, "<h3>$1</h3>")
    .replace(/^## (.*$)/gim, "<h2>$1</h2>")
    .replace(/^# (.*$)/gim, "<h1>$1</h1>")
    .replace(/\*\*(.*?)\*\*/gim, "<strong>$1</strong>")
    .replace(/^\|(.+)\|$/gim, "<tr><td>$1</td></tr>")
    .replace(/^- (.*$)/gim, "<li>$1</li>")
    .replace(/\n\n/gim, "<br /><br />")
    .replace(/\n/gim, "<br />");
}

function getLogoDataUrl(): string {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;
  const file = readFileSync(join(process.cwd(), "public", "logo-transparent.png"));
  cachedLogoDataUrl = `data:image/png;base64,${file.toString("base64")}`;
  return cachedLogoDataUrl;
}

function buildBrowserPdfHtml(input: {
  domain: string;
  generatedAt: string;
  auditType: string;
  totalScore: number;
  reportMarkdown: string;
}): string {
  const logo = getLogoDataUrl();
  const html = markdownToHtml(input.reportMarkdown);
  const dateLabel = new Date(input.generatedAt).toLocaleString("es-CL");
  const reportId = `VYA-${input.domain.replace(/\./g, "-").toUpperCase()}-${new Date(input.generatedAt).getTime()}`;

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Informe VyAudit</title>
  <style>
    :root { color-scheme: light; }
    body { margin: 0; color: #0f172a; background: #fff; font-family: Arial, sans-serif; font-size: 10.5pt; line-height: 1.25; }
    .pdf-brand-strip { background: linear-gradient(90deg, #0a3e73 0%, #148aff 100%); padding: 0.55rem 0.75rem; color: #fff; }
    .pdf-brand-title { margin: 0; font-weight: 700; font-size: 0.9rem; }
    .pdf-brand-meta { margin: 0.1rem 0 0 0; font-size: 0.72rem; opacity: 0.9; }
    .pdf-cover { break-inside: avoid; margin: 0.45rem 0.6rem; padding: 0.55rem 0.65rem; border: 1px solid #e2e8f0; border-radius: 0.75rem; background: #f8fbff; }
    .pdf-cover-title { margin: 0; color: #0a3e73; font-size: 0.9rem; font-weight: 700; }
    .pdf-cover-grid { margin-top: 0.5rem; display: grid; gap: 0.35rem; }
    .pdf-cover-grid p { margin: 0; font-size: 0.78rem; line-height: 1.18; color: #1e293b; }
    .prose-vyaudit { padding: 0.5rem 0.75rem 0.65rem 0.75rem; font-size: 0.78rem; line-height: 1.25; color: #1f2937; }
    .prose-vyaudit h1, .prose-vyaudit h2, .prose-vyaudit h3 { color: #06223d; }
    .prose-vyaudit h1 { margin: 0.72rem 0 0.26rem 0; font-size: 0.95rem; line-height: 1.2; }
    .prose-vyaudit h2, .prose-vyaudit h3 { margin: 0.3rem 0 0.15rem 0; font-size: 0.86rem; line-height: 1.2; }
    .prose-vyaudit li { margin: 0.08rem 0 0.12rem 0; }
    .prose-vyaudit table { width: 100%; border-collapse: collapse; margin: 0.25rem 0; font-size: 0.74rem; }
    .prose-vyaudit th, .prose-vyaudit td { border: 1px solid #d1d5db; padding: 0.2rem 0.24rem; text-align: left; vertical-align: top; line-height: 1.2; }
    .pdf-footer { border-top: 1px solid #e2e8f0; padding: 0.45rem 0.75rem 0.55rem 0.75rem; font-size: 0.68rem; color: #475569; }
    .pdf-footer p { margin: 0.08rem 0; }
    @page { size: A4; margin: 8mm; }
  </style>
</head>
<body>
  <article>
    <div class="pdf-brand-strip">
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
        <div>
          <p class="pdf-brand-title">VyAudit | Producto oficial de Vytronix SpA</p>
          <p class="pdf-brand-meta">Informe profesional de auditoria web</p>
        </div>
        <img src="${logo}" alt="Vytronix" style="height:56px; width:auto; object-fit:contain;" />
      </div>
    </div>
    <section class="pdf-cover">
      <div style="margin-bottom:0.5rem; display:flex; align-items:center; justify-content:space-between; gap:12px;">
        <h3 class="pdf-cover-title">Informe Final</h3>
        <img src="${logo}" alt="Vytronix" style="height:58px; width:auto; object-fit:contain;" />
      </div>
      <div class="pdf-cover-grid">
        <p><strong>Dominio:</strong> ${escapeHtml(input.domain)}</p>
        <p><strong>Fecha de emision:</strong> ${escapeHtml(dateLabel)}</p>
        <p><strong>Tipo de auditoria:</strong> ${escapeHtml(input.auditType)}</p>
        <p><strong>ID de informe:</strong> ${escapeHtml(reportId)}</p>
        <p><strong>Puntaje total:</strong> ${input.totalScore}/100</p>
      </div>
    </section>
    <section class="prose-vyaudit"><div>${html}</div></section>
    <footer class="pdf-footer">
      <p>Vytronix SpA | VyAudit</p>
      <p>Este informe corresponde a una medicion puntual automatizada.</p>
    </footer>
  </article>
</body>
</html>`;
}

function resolveChromeBinary(): string | null {
  const fromEnv = process.env.CHROME_PATH;
  if (fromEnv && existsSync(fromEnv)) return fromEnv;

  const candidates =
    process.platform === "win32"
      ? [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
          "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
        ]
      : ["/usr/bin/google-chrome-stable", "/usr/bin/google-chrome", "/usr/bin/chromium-browser", "/usr/bin/chromium"];

  return candidates.find((path) => existsSync(path)) ?? null;
}

async function renderBrowserLikePdf(input: {
  domain: string;
  generatedAt: string;
  auditType: string;
  totalScore: number;
  reportMarkdown: string;
}): Promise<Buffer | null> {
  const chrome = resolveChromeBinary();
  if (!chrome) return null;

  const tempDir = await mkdtemp(join(tmpdir(), "vyaudit-pdf-"));
  const htmlPath = join(tempDir, "report.html");
  const pdfPath = join(tempDir, "report.pdf");

  try {
    await writeFile(htmlPath, buildBrowserPdfHtml(input), "utf8");
    const fileUrl = pathToFileURL(htmlPath).href;
    const args = [
      "--headless=new",
      "--disable-gpu",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--print-to-pdf-no-header",
      `--print-to-pdf=${pdfPath}`,
      fileUrl
    ];

    await new Promise<void>((resolve, reject) => {
      const child = spawn(chrome, args, { stdio: "ignore" });
      const timer = setTimeout(() => {
        child.kill();
        reject(new Error("chrome_print_timeout"));
      }, 20000);
      child.on("error", reject);
      child.on("close", (code) => {
        clearTimeout(timer);
        if (code === 0) resolve();
        else reject(new Error(`chrome_print_failed:${code ?? "unknown"}`));
      });
    });

    return await readFile(pdfPath);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

function normalizePdfText(input: string): string {
  const withFallbackIcons = input
    .replace(/✅/g, "[OK] ")
    .replace(/❌/g, "[X] ")
    .replace(/⚠️?/g, "[!] ")
    .replace(/🔒/g, "[LOCK] ")
    .replace(/🔓/g, "[UNLOCK] ")
    .replace(/📈/g, "[UP] ")
    .replace(/📉/g, "[DOWN] ")
    .replace(/🟢/g, "[GREEN] ")
    .replace(/🟡/g, "[YELLOW] ")
    .replace(/🔴/g, "[RED] ")
    .replace(/ℹ️?/g, "[INFO] ")
    .replace(/⭐/g, "[STAR] ")
    .replace(/🚀/g, "[GO] ");

  return withFallbackIcons
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function wrapTextByWidth(text: string, fontSize: number, maxWidth: number): string[] {
  const normalized = normalizePdfText(text);
  if (!normalized) return [""];

  const approxCharWidth = fontSize * 0.52;
  const maxChars = Math.max(12, Math.floor(maxWidth / approxCharWidth));
  if (normalized.length <= maxChars) return [normalized];

  const words = normalized.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length > maxChars) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }

  if (current) lines.push(current);
  return lines.length ? lines : [normalized.slice(0, maxChars)];
}

function fillRgb(r: number, g: number, b: number): string {
  return `${r} ${g} ${b} rg`;
}

function strokeRgb(r: number, g: number, b: number): string {
  return `${r} ${g} ${b} RG`;
}

function addText(page: PdfPage, input: {
  x: number;
  y: number;
  text: string;
  size?: number;
  font?: FontName;
  color?: [number, number, number];
}) {
  const size = input.size ?? 10;
  const font = input.font ?? "F1";
  const safe = normalizePdfText(input.text);
  const [r, g, b] = input.color ?? [0.08, 0.11, 0.16];

  page.commands.push("BT");
  page.commands.push(`/${font} ${size} Tf`);
  page.commands.push(fillRgb(r, g, b));
  page.commands.push(`${input.x.toFixed(2)} ${input.y.toFixed(2)} Td`);
  page.commands.push(`(${safe}) Tj`);
  page.commands.push("ET");
}

function addRect(page: PdfPage, input: {
  x: number;
  y: number;
  w: number;
  h: number;
  stroke?: [number, number, number];
}) {
  const [r, g, b] = input.stroke ?? [0.77, 0.82, 0.91];
  page.commands.push(strokeRgb(r, g, b));
  page.commands.push(`${input.x.toFixed(2)} ${input.y.toFixed(2)} ${input.w.toFixed(2)} ${input.h.toFixed(2)} re S`);
}

function addFilledRect(page: PdfPage, input: {
  x: number;
  y: number;
  w: number;
  h: number;
  fill: [number, number, number];
}) {
  page.commands.push(fillRgb(input.fill[0], input.fill[1], input.fill[2]));
  page.commands.push(`${input.x.toFixed(2)} ${input.y.toFixed(2)} ${input.w.toFixed(2)} ${input.h.toFixed(2)} re f`);
}

function createPage(): PdfPage {
  return { commands: [] };
}

function paethPredictor(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function decodePngToRgb(buffer: Buffer): PngRgbData {
  if (buffer.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") {
    throw new Error("png_invalid_signature");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idatParts: Buffer[] = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    offset += 4;
    const type = buffer.subarray(offset, offset + 4).toString("ascii");
    offset += 4;
    const data = buffer.subarray(offset, offset + length);
    offset += length;
    offset += 4; // crc

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    } else if (type === "IDAT") {
      idatParts.push(data);
    } else if (type === "IEND") {
      break;
    }
  }

  if (!width || !height) throw new Error("png_missing_ihdr");
  if (interlace !== 0) throw new Error("png_interlaced_not_supported");
  if (bitDepth !== 8) throw new Error("png_bitdepth_not_supported");

  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 0 ? 1 : 0;
  if (!channels) throw new Error("png_colortype_not_supported");

  const bytesPerPixel = channels;
  const stride = width * bytesPerPixel;
  const inflated = inflateSync(Buffer.concat(idatParts));
  const unfiltered = Buffer.alloc(height * stride);

  let src = 0;
  let dst = 0;

  for (let row = 0; row < height; row += 1) {
    const filterType = inflated[src++];
    for (let x = 0; x < stride; x += 1) {
      const raw = inflated[src++];
      const left = x >= bytesPerPixel ? unfiltered[dst + x - bytesPerPixel] : 0;
      const up = row > 0 ? unfiltered[dst + x - stride] : 0;
      const upLeft = row > 0 && x >= bytesPerPixel ? unfiltered[dst + x - stride - bytesPerPixel] : 0;

      let value = raw;
      if (filterType === 1) value = (raw + left) & 255;
      if (filterType === 2) value = (raw + up) & 255;
      if (filterType === 3) value = (raw + Math.floor((left + up) / 2)) & 255;
      if (filterType === 4) value = (raw + paethPredictor(left, up, upLeft)) & 255;
      unfiltered[dst + x] = value;
    }
    dst += stride;
  }

  const rgb = Buffer.alloc(width * height * 3);
  let alpha: Buffer | undefined;

  if (colorType === 2) {
    for (let i = 0, j = 0; i < unfiltered.length; i += 3, j += 3) {
      rgb[j] = unfiltered[i];
      rgb[j + 1] = unfiltered[i + 1];
      rgb[j + 2] = unfiltered[i + 2];
    }
  } else if (colorType === 6) {
    alpha = Buffer.alloc(width * height);
    for (let i = 0, j = 0; i < unfiltered.length; i += 4, j += 3) {
      const r = unfiltered[i];
      const g = unfiltered[i + 1];
      const b = unfiltered[i + 2];
      const a = unfiltered[i + 3];
      rgb[j] = r;
      rgb[j + 1] = g;
      rgb[j + 2] = b;
      alpha[j / 3] = a;
    }
  } else {
    for (let i = 0, j = 0; i < unfiltered.length; i += 1, j += 3) {
      const v = unfiltered[i];
      rgb[j] = v;
      rgb[j + 1] = v;
      rgb[j + 2] = v;
    }
  }

  return { width, height, rgb, alpha };
}

function loadLogoPng(): PngRgbData {
  if (cachedLogo) return cachedLogo;
  const file = readFileSync(join(process.cwd(), "public", "logo-transparent.png"));
  cachedLogo = decodePngToRgb(file);
  return cachedLogo;
}

function toHexAscii(buffer: Buffer): string {
  return `${buffer.toString("hex").toUpperCase()}>`;
}

function addLogoCommand(page: PdfPage, x: number, yTop: number, width: number, height: number) {
  page.commands.push("q");
  page.commands.push(`${width.toFixed(2)} 0 0 ${height.toFixed(2)} ${x.toFixed(2)} ${(yTop - height).toFixed(2)} cm`);
  page.commands.push("/ImLogo Do");
  page.commands.push("Q");
}

export async function renderAuditPdfBuffer(input: {
  domain: string;
  generatedAt: string;
  auditType: string;
  totalScore: number;
  reportMarkdown: string;
}): Promise<Buffer> {
  const browserLike = await renderBrowserLikePdf(input).catch(() => null);
  if (browserLike) {
    return browserLike;
  }

  const pages: PdfPage[] = [createPage()];
  let page = pages[0];
  let y = PAGE_HEIGHT - MARGIN_TOP;

  const line = (size: number) => size * 1.35;

  const ensureSpace = (required: number) => {
    if (y - required < MARGIN_BOTTOM) {
      page = createPage();
      pages.push(page);
      y = PAGE_HEIGHT - MARGIN_TOP;
    }
  };

  const writeParagraph = (text: string, options?: {
    size?: number;
    font?: FontName;
    color?: [number, number, number];
    indent?: number;
    gapAfter?: number;
  }) => {
    const size = options?.size ?? 10;
    const indent = options?.indent ?? 0;
    const lines = wrapTextByWidth(text, size, CONTENT_WIDTH - indent);
    for (const ln of lines) {
      ensureSpace(line(size));
      addText(page, {
        x: MARGIN_X + indent,
        y,
        text: ln,
        size,
        font: options?.font,
        color: options?.color
      });
      y -= line(size);
    }
    y -= options?.gapAfter ?? 2;
  };

  const iconStyle = (icon: IconKind): { fill: [number, number, number]; mark: string } => {
    switch (icon) {
      case "ok":
      case "green":
        return { fill: [0.13, 0.73, 0.45], mark: "v" };
      case "warn":
      case "yellow":
        return { fill: [0.96, 0.72, 0.2], mark: "!" };
      case "bad":
      case "red":
        return { fill: [0.91, 0.3, 0.34], mark: "x" };
      case "lock":
        return { fill: [0.2, 0.48, 0.9], mark: "L" };
      case "up":
        return { fill: [0.13, 0.73, 0.45], mark: "^" };
      case "down":
        return { fill: [0.91, 0.3, 0.34], mark: "v" };
      case "info":
        return { fill: [0.15, 0.55, 0.95], mark: "i" };
      case "star":
        return { fill: [0.98, 0.78, 0.22], mark: "*" };
      case "rocket":
        return { fill: [0.55, 0.36, 0.95], mark: "R" };
      default:
        return { fill: [0.13, 0.73, 0.45], mark: "v" };
    }
  };

  const parseIconToken = (token: string): IconKind | null => {
    if (token === "✅") return "ok";
    if (token === "❌") return "bad";
    if (/^⚠/.test(token)) return "warn";
    if (token === "🔒" || token === "🔓") return "lock";
    if (token === "📈") return "up";
    if (token === "📉") return "down";
    if (token === "🟢") return "green";
    if (token === "🟡") return "yellow";
    if (token === "🔴") return "red";
    if (/^ℹ/.test(token)) return "info";
    if (token === "⭐") return "star";
    if (token === "🚀") return "rocket";
    return null;
  };

  const writeBulletWithIcon = (icon: IconKind, text: string) => {
    const marker =
      icon === "ok" || icon === "green"
        ? "[OK]"
        : icon === "warn" || icon === "yellow"
          ? "[!]"
          : icon === "bad" || icon === "red"
            ? "[X]"
            : icon === "lock"
              ? "[LOCK]"
              : icon === "up"
                ? "[UP]"
                : icon === "down"
                  ? "[DOWN]"
                  : icon === "info"
                    ? "[INFO]"
                    : icon === "star"
                      ? "[STAR]"
                      : "[GO]";

    writeParagraph(`- ${marker} ${text}`, {
      size: 10,
      indent: 8,
      gapAfter: 1
    });
  };

  const writeBulletWithInlineIcons = (text: string) => {
    const normalized = text
      .replace(/✅/g, "[OK]")
      .replace(/❌/g, "[X]")
      .replace(/⚠️?/g, "[!]")
      .replace(/🔒/g, "[LOCK]")
      .replace(/🔓/g, "[UNLOCK]")
      .replace(/📈/g, "[UP]")
      .replace(/📉/g, "[DOWN]")
      .replace(/🟢/g, "[GREEN]")
      .replace(/🟡/g, "[YELLOW]")
      .replace(/🔴/g, "[RED]")
      .replace(/ℹ️?/g, "[INFO]")
      .replace(/⭐/g, "[STAR]")
      .replace(/🚀/g, "[GO]");

    writeParagraph(`- ${normalized}`, {
      size: 10,
      indent: 8,
      gapAfter: 1
    });
  };

  const dateText = new Date(input.generatedAt).toLocaleString("es-CL");
  const reportId = `VYA-${input.domain.replace(/\./g, "-").toUpperCase()}-${new Date(input.generatedAt).getTime()}`;

  writeParagraph("Resultado de auditoria VyAudit", {
    size: 19,
    font: "F2",
    color: [0.02, 0.12, 0.32],
    gapAfter: 0
  });
  writeParagraph(`Analisis para: https://${input.domain}`, {
    size: 10,
    color: [0.35, 0.42, 0.52],
    gapAfter: 14
  });

  let logoData: PngRgbData | null = null;
  try {
    logoData = loadLogoPng();
  } catch {
    logoData = null;
  }

  ensureSpace(52);
  const stripTopY = y;
  const stripHeight = 38;
  addFilledRect(page, {
    x: MARGIN_X,
    y: stripTopY - stripHeight,
    w: CONTENT_WIDTH,
    h: stripHeight,
    fill: [0.04, 0.45, 0.93]
  });
  addText(page, {
    x: MARGIN_X + 12,
    y: stripTopY - 14,
    text: "VyAudit | Producto oficial de Vytronix SpA",
    size: 10,
    font: "F2",
    color: [1, 1, 1]
  });
  addText(page, {
    x: MARGIN_X + 12,
    y: stripTopY - 27,
    text: "Informe profesional de auditoria web",
    size: 8.5,
    color: [0.91, 0.96, 1]
  });
  if (logoData) {
    const w = 70;
    const h = (logoData.height * w) / logoData.width;
    addLogoCommand(page, PAGE_WIDTH - MARGIN_X - w - 22, stripTopY - 2, w, h);
  }
  y = stripTopY - stripHeight - 12;

  ensureSpace(170);
  const cardTopY = y;
  const cardHeight = 132;
  addFilledRect(page, {
    x: MARGIN_X,
    y: cardTopY - cardHeight,
    w: CONTENT_WIDTH,
    h: cardHeight,
    fill: [0.975, 0.988, 1]
  });
  addRect(page, {
    x: MARGIN_X,
    y: cardTopY - cardHeight,
    w: CONTENT_WIDTH,
    h: cardHeight,
    stroke: [0.77, 0.82, 0.91]
  });

  y -= 24;
  addText(page, {
    x: MARGIN_X + 12,
    y,
    text: "Informe Final",
    size: 12.5,
    font: "F2",
    color: [0.02, 0.2, 0.46]
  });
  y -= 24;

  const coverLines = [
    `Dominio: ${input.domain}`,
    `Fecha de emision: ${dateText}`,
    `Tipo de auditoria: ${input.auditType}`,
    `ID de informe: ${reportId}`,
    `Puntaje total: ${input.totalScore}/100`
  ];

  for (const row of coverLines) {
    addText(page, {
      x: MARGIN_X + 12,
      y,
      text: row,
      size: 10,
      font: row.startsWith("Puntaje") ? "F2" : "F1",
      color: [0.1, 0.14, 0.22]
    });
    y -= 15;
  }

  if (logoData) {
    const w = 76;
    const h = (logoData.height * w) / logoData.width;
    addLogoCommand(page, PAGE_WIDTH - MARGIN_X - w - 12, cardTopY - 10, w, h);
  }

  y = cardTopY - cardHeight - 16;

  const rows = input.reportMarkdown.split(/\r?\n/);
  for (const raw of rows) {
    const row = raw.trim();

    if (!row) {
      y -= 6;
      continue;
    }

    if (/^#\s+\d+\./.test(row)) {
      writeParagraph(cleanLine(row), {
        size: 11.2,
        font: "F2",
        color: [0.02, 0.12, 0.32],
        gapAfter: 4
      });
      continue;
    }

    if (row.startsWith("# ")) {
      writeParagraph(cleanLine(row), {
        size: 10.4,
        font: "F2",
        color: [0.02, 0.12, 0.32],
        gapAfter: 3
      });
      continue;
    }

    if (row.startsWith("- ")) {
      const bullet = cleanLine(row);
      if (/(✅|❌|⚠️?|🔒|🔓|📈|📉|🟢|🟡|🔴|ℹ️?|⭐|🚀)/.test(bullet) && !/^(✅|❌|⚠️?|🔒|🔓|📈|📉|🟢|🟡|🔴|ℹ️?|⭐|🚀)/.test(bullet)) {
        writeBulletWithInlineIcons(bullet);
      } else if (parseIconToken(bullet.split(/\s+/)[0] ?? "")) {
        const firstToken = bullet.split(/\s+/)[0] ?? "";
        const icon = parseIconToken(firstToken) ?? "ok";
        writeBulletWithIcon(icon, bullet.replace(/^(✅|❌|⚠️?|🔒|🔓|📈|📉|🟢|🟡|🔴|ℹ️?|⭐|🚀)\s*/, ""));
      } else {
        writeParagraph(`- ${bullet}`, {
          size: 10,
          indent: 8,
          gapAfter: 1
        });
      }
      continue;
    }

    if (row.startsWith("|")) {
      writeParagraph(cleanLine(row).replace(/\|/g, " | "), {
        size: 9,
        color: [0.2, 0.24, 0.32],
        gapAfter: 1
      });
      continue;
    }

    writeParagraph(cleanLine(row), {
      size: 10,
      gapAfter: 1
    });
  }

  ensureSpace(28);
  addText(page, {
    x: MARGIN_X,
    y: MARGIN_BOTTOM + 12,
    text: "Vytronix SpA | VyAudit",
    size: 9,
    color: [0.42, 0.47, 0.55]
  });
  addText(page, {
    x: MARGIN_X,
    y: MARGIN_BOTTOM + 2,
    text: "Este informe corresponde a una medicion puntual automatizada.",
    size: 8,
    color: [0.5, 0.54, 0.6]
  });

  const objects = new Map<number, string>();
  const pageObjectNumbers: number[] = [];
  const regularFontObject = 3;
  const boldFontObject = 4;
  const logoObjectNumber = 5;
  const logoMaskObjectNumber = 6;
  let objectNumber = 7;

  for (const pg of pages) {
    const pageObjectNumber = objectNumber++;
    const contentObjectNumber = objectNumber++;
    pageObjectNumbers.push(pageObjectNumber);

    const contentStream = pg.commands.join("\n");
    objects.set(
      contentObjectNumber,
      `${contentObjectNumber} 0 obj\n<< /Length ${Buffer.byteLength(contentStream, "utf8")} >>\nstream\n${contentStream}\nendstream\nendobj`
    );

    const xObjectPart = logoData ? `/XObject << /ImLogo ${logoObjectNumber} 0 R >>` : "";
    objects.set(
      pageObjectNumber,
      `${pageObjectNumber} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 ${regularFontObject} 0 R /F2 ${boldFontObject} 0 R >> ${xObjectPart} >> /Contents ${contentObjectNumber} 0 R >>\nendobj`
    );
  }

  objects.set(1, "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj");
  objects.set(
    2,
    `2 0 obj\n<< /Type /Pages /Kids [${pageObjectNumbers.map((n) => `${n} 0 R`).join(" ")}] /Count ${pageObjectNumbers.length} >>\nendobj`
  );
  objects.set(regularFontObject, `${regularFontObject} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`);
  objects.set(boldFontObject, `${boldFontObject} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj`);

  if (logoData) {
    const compressed = deflateSync(logoData.rgb);
    const hex = toHexAscii(compressed);
    let smaskPart = "";
    if (logoData.alpha) {
      const alphaCompressed = deflateSync(logoData.alpha);
      const alphaHex = toHexAscii(alphaCompressed);
      objects.set(
        logoMaskObjectNumber,
        `${logoMaskObjectNumber} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${logoData.width} /Height ${logoData.height} /ColorSpace /DeviceGray /BitsPerComponent 8 /Filter [/ASCIIHexDecode /FlateDecode] /Length ${alphaHex.length} >>\nstream\n${alphaHex}\nendstream\nendobj`
      );
      smaskPart = ` /SMask ${logoMaskObjectNumber} 0 R`;
    }
    objects.set(
      logoObjectNumber,
      `${logoObjectNumber} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${logoData.width} /Height ${logoData.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /FlateDecode] /Length ${hex.length}${smaskPart} >>\nstream\n${hex}\nendstream\nendobj`
    );
  }

  const maxObjectNumber = objectNumber - 1;

  let pdf = "%PDF-1.4\n";
  const xrefPositions: number[] = new Array(maxObjectNumber + 1).fill(0);

  for (let i = 1; i <= maxObjectNumber; i += 1) {
    const obj = objects.get(i);
    if (!obj) throw new Error(`pdf_object_missing:${i}`);
    xrefPositions[i] = Buffer.byteLength(pdf, "utf8");
    pdf += `${obj}\n`;
  }

  const xrefStart = Buffer.byteLength(pdf, "utf8");
  pdf += `xref\n0 ${maxObjectNumber + 1}\n`;
  pdf += "0000000000 65535 f \n";

  for (let i = 1; i <= maxObjectNumber; i += 1) {
    const pos = String(xrefPositions[i]).padStart(10, "0");
    pdf += `${pos} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${maxObjectNumber + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  return Buffer.from(pdf, "utf8");
}


