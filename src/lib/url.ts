export type NormalizedUrlResult = {
  normalizedUrl: string;
  domain: string;
};

const localhostRegex = /^(localhost|127\.0\.0\.1|0\.0\.0\.0)$/i;

export function normalizeAndValidateUrl(rawUrl: string): NormalizedUrlResult {
  const cleaned = rawUrl.trim();
  if (!cleaned) {
    throw new Error("La URL está vacía.");
  }

  const candidate = cleaned.startsWith("http") ? cleaned : `https://${cleaned}`;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error("La URL ingresada no es válida.");
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Solo se admiten URLs HTTP/HTTPS.");
  }
  if (!parsed.hostname || localhostRegex.test(parsed.hostname)) {
    throw new Error("Debes ingresar un dominio público.");
  }
  if (!parsed.hostname.includes(".")) {
    throw new Error("Debes ingresar un dominio público válido.");
  }

  // Preferimos HTTPS para la auditoría, manteniendo path/query del recurso.
  parsed.protocol = "https:";
  parsed.hash = "";

  return {
    normalizedUrl: parsed.toString(),
    domain: parsed.hostname.toLowerCase()
  };
}
