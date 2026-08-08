// Definir/redefinir senha via token (convite ou reset). GET valida sem consumir
// (para a pagina mostrar "link invalido/expirado"); POST consome e grava a senha.
import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { verificarTokenSenha, consumirTokenSenha } from "../../../src/bd/tokensSenha";
import { definirSenha } from "../../../src/bd/usuarios";
import { registrarAuditoria } from "../../../src/rag/repositorioConversas";

export const runtime = "nodejs";

const MIN_SENHA = 8;

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const info = await verificarTokenSenha(token);
  return NextResponse.json({ valido: Boolean(info), tipo: info?.tipo ?? null });
}

export async function POST(req: Request) {
  const corpo = await req.json().catch(() => ({}));
  const senha = String(corpo?.senha ?? "");
  const token = String(corpo?.token ?? "");

  if (senha.length < MIN_SENHA) {
    return NextResponse.json(
      { erro: `A senha precisa de ao menos ${MIN_SENHA} caracteres.` }, { status: 400 },
    );
  }
  const alvo = await consumirTokenSenha(token);
  if (!alvo) {
    return NextResponse.json(
      { erro: "Link invalido ou expirado. Peca um novo." }, { status: 400 },
    );
  }
  await definirSenha(alvo.usuarioId, senha);
  await registrarAuditoria(
    alvo.escolaId, alvo.usuarioId, "senha.definida", "usuarios", alvo.usuarioId, randomUUID(),
  );
  return NextResponse.json({ ok: true });
}
