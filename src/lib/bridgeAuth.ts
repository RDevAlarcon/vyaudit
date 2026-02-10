import { createHmac, timingSafeEqual } from "node:crypto";

type BridgePayload = {
  sub?: string;
  email?: string;
  role?: string;
  roles?: string[];
  iss?: string;
  exp?: number;
};

function decodeBase64Url(input: string): string {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = normalized.length % 4 === 0 ? "" : "=".repeat(4 - (normalized.length % 4));
  return Buffer.from(normalized + pad, "base64").toString("utf8");
}

function encodeBase64Url(buffer: Buffer): string {
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function hasAdminRole(payload: BridgePayload): boolean {
  if (payload.role?.toLowerCase() === "admin") return true;
  return (payload.roles ?? []).some((r) => r.toLowerCase() === "admin");
}

export function verifyAdminBridgeToken(token: string): { ok: true } | { ok: false; reason: string } {
  const secret = process.env.BRIDGE_SHARED_SECRET;
  if (!secret) {
    return { ok: false, reason: "bridge_secret_not_configured" };
  }

  const parts = token.trim().split(".");
  if (parts.length !== 3) {
    return { ok: false, reason: "bridge_token_invalid_format" };
  }

  const [headerPart, payloadPart, signaturePart] = parts;
  const signingInput = `${headerPart}.${payloadPart}`;
  const expected = createHmac("sha256", secret).update(signingInput).digest();
  const received = Buffer.from(signaturePart.replace(/-/g, "+").replace(/_/g, "/"), "base64");

  if (expected.length !== received.length || !timingSafeEqual(expected, received)) {
    return { ok: false, reason: "bridge_token_bad_signature" };
  }

  try {
    const payload = JSON.parse(decodeBase64Url(payloadPart)) as BridgePayload;
    const issuer = process.env.BRIDGE_ISSUER;

    if (issuer && payload.iss !== issuer) {
      return { ok: false, reason: "bridge_token_invalid_issuer" };
    }

    if (typeof payload.exp === "number" && payload.exp < Math.floor(Date.now() / 1000)) {
      return { ok: false, reason: "bridge_token_expired" };
    }

    if (!hasAdminRole(payload)) {
      return { ok: false, reason: "bridge_token_not_admin" };
    }

    return { ok: true };
  } catch {
    return { ok: false, reason: "bridge_token_invalid_payload" };
  }
}

// Helper for local testing from trusted backend scripts.
export function signBridgeTokenForAdmin(payload: Omit<BridgePayload, "role"> & { role?: string; roles?: string[] }): string {
  const secret = process.env.BRIDGE_SHARED_SECRET;
  if (!secret) {
    throw new Error("bridge_secret_not_configured");
  }

  const header = { alg: "HS256", typ: "JWT" };
  const body: BridgePayload = {
    role: payload.role ?? "admin",
    roles: payload.roles,
    sub: payload.sub,
    email: payload.email,
    iss: payload.iss,
    exp: payload.exp
  };

  const headerPart = encodeBase64Url(Buffer.from(JSON.stringify(header), "utf8"));
  const payloadPart = encodeBase64Url(Buffer.from(JSON.stringify(body), "utf8"));
  const signingInput = `${headerPart}.${payloadPart}`;
  const signature = createHmac("sha256", secret).update(signingInput).digest();
  const signaturePart = encodeBase64Url(signature);
  return `${signingInput}.${signaturePart}`;
}
