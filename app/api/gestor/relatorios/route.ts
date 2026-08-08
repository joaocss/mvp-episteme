// Relatorio de desempenho com filtros (gestor). GET retorna JSON; com
// ?formato=csv baixa a tabela por aluno (filtrada) como CSV.
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { lerSessaoPermitida } from "../../../../lib/sessao";
import { gerarRelatorio, FiltroRelatorio } from "../../../../src/bd/relatorios";
import { registrarAuditoria } from "../../../../src/rag/repositorioConversas";

export const runtime = "nodejs";

function filtroDaUrl(url: URL): FiltroRelatorio {
  const p = url.searchParams;
  const v = (k: string) => { const s = p.get(k); return s && s.trim() ? s.trim() : null; };
  return { turmaId: v("turmaId"), disciplina: v("disciplina"), dataInicio: v("dataInicio"), dataFim: v("dataFim") };
}

function celula(valor: unknown): string {
  const s = valor === null || valor === undefined ? "" : String(valor);
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(requisicao: Request) {
  const armazem = await cookies();
  const sessao = lerSessaoPermitida((n) => armazem.get(n)?.value, ["gestor", "admin"]);
  if (!sessao || (sessao.papel !== "gestor" && sessao.papel !== "admin")) {
    return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });
  }
  const url = new URL(requisicao.url);
  const filtro = filtroDaUrl(url);
  const relatorio = await gerarRelatorio(sessao.escolaId, filtro);

  if (url.searchParams.get("formato") === "csv") {
    const colunas = ["Aluno", "Turma", "Disciplina", "Média (%)", "Avaliações"];
    const linhas = relatorio.porAluno.map((a) =>
      [a.aluno, a.turma, a.disciplina, a.media, a.avaliacoes].map(celula).join(";"));
    const csv = "﻿" + [colunas.join(";"), ...linhas].join("\r\n");
    await registrarAuditoria(sessao.escolaId, sessao.usuarioId, "relatorio.exportar", "notas", null, randomUUID()).catch(() => {});
    return new NextResponse(csv, {
      status: 200,
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="relatorio_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({ relatorio });
}
