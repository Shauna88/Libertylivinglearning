import { NextResponse } from "next/server";
import { healthCheck } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public health check — confirms the app can reach Postgres and that content
 * has seeded. Handy right after deploy. Returns no secrets.
 */
export async function GET() {
  try {
    const h = await healthCheck();
    return NextResponse.json({ status: "ok", ...h });
  } catch (err) {
    return NextResponse.json(
      { status: "error", message: err instanceof Error ? err.message : "unknown" },
      { status: 500 }
    );
  }
}
