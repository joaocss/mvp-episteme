// Pedido de redefinicao de senha. Responde SEMPRE igual ("se o email existir,
// enviamos o link") para nao revelar quais emails estao cadastrados. Cria um
// token de reset e envia o link por email (no-op ate o Resend estar configurado).
import { NextResponse } from "next/server";
import { buscarUsuariosPorEmail } from "../../../src/bd/usuarios";
import { criarTokenSenha } from "../../../src/bd/tokensSenha";
import { enviarResetSenha } from "../../../src/notificacoes/senha";

export const runtime = "nodejs";

// Throttle best-effort em memoria (fraco no serverless; o robusto — Upstash —
// fica para a fase de producao). Evita spam trivial de um mesmo email.
const ultimoPedido = new Map<string, number>();
const JANELA_MS = 60_000;

export async function POST(req: Request) {
  const corpo = await req.json().catch(() => ({}));
  const email = String(corpo?.email ?? "").trim().toLowerCase();
  const generica = NextResponse.json({ ok: true });

  if (!email || !/.+@.+\..+/.test(email)) return generica;
  const agora = Date.now();
  if ((ultimoPedido.get(email) ?? 0) + JANELA_MS > agora) return generica;
  ultimoPedido.set(email, agora);

  const origem = new URL(req.url).origin;
  const usuarios = await buscarUsuariosPorEmail(email);
  for (const u of usuarios) {
    const token = await criarTokenSenha(u.escolaId, u.id, "reset");
    await enviarResetSenha(email, u.nome, `${origem}/definir-senha?token=${token}`);
  }
  return generica;
}
