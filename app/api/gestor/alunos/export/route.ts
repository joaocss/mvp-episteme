// Download dos dados dos alunos em CSV — restrito ao gestor/diretor e auditado
// (LGPD: acesso a dado pessoal de menor deve deixar rastro). Exporta apenas os
// campos que a propria escola cadastra (minimizacao). BOM UTF-8 para o Excel
// abrir os acentos corretamente.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { lerToken } from "../../../../../lib/sessao";
import { listarAlunosGeral } from "../../../../../src/bd/gestao";
import { registrarAuditoria } from "../../../../../src/rag/repositorioConversas";

export const runtime = "nodejs";

function celula(valor: unknown): string {
  const s = valor === null || valor === undefined ? "" : String(valor);
  // Escapa aspas e envolve em aspas se houver separador/aspas/quebra de linha.
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET() {
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao || (sessao.papel !== "gestor" && sessao.papel !== "admin")) {
    return NextResponse.json({ erro: "acesso restrito ao diretor" }, { status: 403 });
  }

  const alunos = await listarAlunosGeral(sessao.escolaId);
  const colunas = ["Nome", "Email", "Turma", "Data de nascimento", "Endereço da família", "Estado civil dos pais", "Pais moram juntos"];
  const linhas = alunos.map((a) => [
    a.nome, a.email ?? "", a.turma ?? "", a.dataNascimento ?? "",
    a.enderecoFamilia ?? "", a.estadoCivilPais ?? "",
    a.paisMoramJuntos === null ? "" : a.paisMoramJuntos ? "Sim" : "Não",
  ].map(celula).join(";"));
  const csv = "﻿" + [colunas.join(";"), ...linhas].join("\r\n");

  // Auditoria: quem exportou, quando, quantos registros.
  await registrarAuditoria(sessao.escolaId, sessao.usuarioId, `aluno.exportar(${alunos.length})`, "usuarios", null, randomUUID())
    .catch(() => {});

  const dataArquivo = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="alunos_${dataArquivo}.csv"`,
    },
  });
}
