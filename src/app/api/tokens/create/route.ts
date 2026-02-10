import { NextResponse } from "next/server";
import { z } from "zod";
import { createAccessToken } from "@/lib/accessTokens";

const requestSchema = z.object({
  customerEmail: z.string().email(),
  allowedDomain: z.string().optional(),
  expiresAt: z.string().datetime().optional()
});

function isAdminAuthorized(request: Request): boolean {
  const expected = process.env.ADMIN_ACCESS_KEY;
  if (!expected) return false;
  const received = request.headers.get("x-admin-key") ?? "";
  return received.length > 0 && received === expected;
}

export async function POST(request: Request) {
  try {
    if (!isAdminAuthorized(request)) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const body = await request.json();
    const parsed = requestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Solicitud invalida." }, { status: 400 });
    }

    const tokenData = await createAccessToken(parsed.data);
    return NextResponse.json(tokenData);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
