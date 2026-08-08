// Health check leve: faz um "select 1" no banco. Serve para (1) keep-alive —
// evitar a pausa do Supabase Free por inatividade — e (2) monitoramento de
// uptime. Sem autenticacao e sem dado sensivel: so devolve up/down.
import { NextResponse } from "next/server";
import { pool } from "../../../src/bd/pool";

export const runtime = "nodejs";
export const dynamic = "force-dynamic"; // nunca cachear: precisa tocar o banco

export async function GET() {
  try {
    await pool.query("select 1");
    return NextResponse.json({ ok: true, db: "up", ts: new Date().toISOString() });
  } catch {
    return NextResponse.json({ ok: false, db: "down" }, { status: 503 });
  }
}
