import { createHash, randomBytes } from "node:crypto";
import { URL } from "node:url";
import { getDbPool } from "@/lib/db";

export type TokenClaim =
  | { ok: true; tokenId: number }
  | { ok: false; status: 400 | 403 | 404 | 409 | 500; message: string };

type CreateTokenInput = {
  customerEmail: string;
  allowedDomain?: string;
  expiresAt?: string;
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function normalizeDomain(value: string): string {
  return value.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "").replace(/\/$/, "");
}

function extractDomainFromUrl(rawUrl: string): string {
  const candidate = rawUrl.trim().startsWith("http") ? rawUrl.trim() : `https://${rawUrl.trim()}`;
  const parsed = new URL(candidate);
  return normalizeDomain(parsed.hostname);
}

function buildRunUrl(token: string): string {
  const base = (process.env.APP_BASE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}/run/${token}`;
}

export async function createAccessToken(input: CreateTokenInput): Promise<{
  token: string;
  runUrl: string;
  expiresAt: string | null;
}> {
  const db = getDbPool();
  if (!db) {
    throw new Error("DATABASE_URL no configurada");
  }

  const token = randomBytes(24).toString("base64url");
  const tokenHash = hashToken(token);
  const allowedDomain = input.allowedDomain ? normalizeDomain(input.allowedDomain) : null;
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;

  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    throw new Error("expiresAt inválido");
  }

  await db.query(
    `
      INSERT INTO audit_access_tokens (
        token_hash,
        status,
        customer_email,
        allowed_domain,
        remaining_uses,
        expires_at
      )
      VALUES ($1, 'pending', $2, $3, 1, $4)
    `,
    [tokenHash, input.customerEmail.trim().toLowerCase(), allowedDomain, expiresAt?.toISOString() ?? null]
  );

  return {
    token,
    runUrl: buildRunUrl(token),
    expiresAt: expiresAt ? expiresAt.toISOString() : null
  };
}

export async function claimAccessTokenForAudit(token: string, targetUrl: string): Promise<TokenClaim> {
  const db = getDbPool();
  if (!db) {
    return { ok: false, status: 500, message: "DB no disponible" };
  }

  const tokenHash = hashToken(token.trim());
  let requestedDomain: string;
  try {
    requestedDomain = extractDomainFromUrl(targetUrl);
  } catch {
    return { ok: false, status: 400, message: "URL objetivo invalida." };
  }
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query<{
      id: number;
      status: "pending" | "running" | "used" | "expired";
      allowed_domain: string | null;
      remaining_uses: number;
      expires_at: string | null;
    }>(
      `
        SELECT id, status, allowed_domain, remaining_uses, expires_at
        FROM audit_access_tokens
        WHERE token_hash = $1
        FOR UPDATE
      `,
      [tokenHash]
    );

    const row = result.rows[0];
    if (!row) {
      await client.query("ROLLBACK");
      return { ok: false, status: 404, message: "Token no válido." };
    }

    if (row.status !== "pending") {
      await client.query("ROLLBACK");
      return { ok: false, status: 409, message: "Este enlace ya fue utilizado." };
    }

    if (row.remaining_uses <= 0) {
      await client.query("ROLLBACK");
      return { ok: false, status: 409, message: "Este enlace ya consumió sus usos." };
    }

    if (row.expires_at && new Date(row.expires_at).getTime() < Date.now()) {
      await client.query(
        `UPDATE audit_access_tokens SET status = 'expired' WHERE id = $1`,
        [row.id]
      );
      await client.query("COMMIT");
      return { ok: false, status: 403, message: "Este enlace expiró." };
    }

    if (row.allowed_domain && normalizeDomain(row.allowed_domain) !== requestedDomain) {
      await client.query("ROLLBACK");
      return { ok: false, status: 403, message: "Este enlace está restringido a otro dominio." };
    }

    await client.query(
      `
        UPDATE audit_access_tokens
        SET status = 'running',
            remaining_uses = remaining_uses - 1,
            last_used_at = NOW(),
            last_error = NULL
        WHERE id = $1
      `,
      [row.id]
    );

    await client.query("COMMIT");
    return { ok: true, tokenId: row.id };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function completeTokenAudit(tokenId: number, auditResultId: number | null): Promise<void> {
  const db = getDbPool();
  if (!db) return;

  await db.query(
    `
      UPDATE audit_access_tokens
      SET status = 'used',
          used_at = NOW(),
          audit_result_id = $2
      WHERE id = $1
    `,
    [tokenId, auditResultId]
  );
}

export async function releaseTokenAfterFailure(tokenId: number, reason: string): Promise<void> {
  const db = getDbPool();
  if (!db) return;

  await db.query(
    `
      UPDATE audit_access_tokens
      SET status = 'pending',
          remaining_uses = remaining_uses + 1,
          last_error = $2
      WHERE id = $1 AND status = 'running'
    `,
    [tokenId, reason.slice(0, 500)]
  );
}
