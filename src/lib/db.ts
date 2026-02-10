import { Pool } from "pg";
import type { ConsolidatedAudit } from "@/types/audit";

let pool: Pool | null = null;

function getPool(): Pool | null {
  if (!process.env.DATABASE_URL) {
    return null;
  }
  if (!pool) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

export function getDbPool(): Pool | null {
  return getPool();
}

export async function persistAudit(audit: ConsolidatedAudit, reportMarkdown: string): Promise<number | null> {
  const db = getPool();
  if (!db) {
    return null;
  }

  const result = await db.query<{ id: number }>(
    `
      INSERT INTO audit_results (
        domain,
        target_url,
        audited_at,
        audit_type,
        total_score,
        payload_json,
        report_markdown
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
      RETURNING id
    `,
    [
      audit.domain,
      audit.normalizedUrl,
      audit.dateIso,
      audit.auditType,
      audit.scores.total,
      JSON.stringify(audit),
      reportMarkdown
    ]
  );

  return result.rows[0]?.id ?? null;
}
