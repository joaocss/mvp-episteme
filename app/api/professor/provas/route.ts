import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { lerToken } from "../../../../lib/sessao";
import {
  editarQuestao, excluirQuestao, editarProva, excluirProva, publicarProva,
} from "../../../../src/bd/provas";
import { gerarRascunhoProva } from "../../../../src/rag/provas";
import { pool } from "../../../../src/bd/pool";
import { notificarTurma } from "../../../../src/notificacoes/push";

export const runtime = "nodejs";
export const maxDuration = 60; // geracao via IA pode demorar

export async function POST(requisicao: Request) {
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao || sessao.papel !== "professor") {
    return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });
  }
  const d = await requisicao.json().catch(() => ({}));
  const esc = sessao.escolaId;
  const prof = sessao.usuarioId;

  try {
    switch (d.acao) {
      case "gerar": {
        if (!d.turmaId || !d.titulo || !d.assunto || !d.disciplina) {
          return NextResponse.json({ erro: "informe turma, disciplina, título e assunto" }, { status: 400 });
        }
        const numeroObjetivas = Number(d.numeroObjetivas) || 0;
        const numeroDissertativas = Number(d.numeroDissertativas) || 0;
        if (numeroObjetivas + numeroDissertativas < 1) {
          return NextResponse.json({ erro: "escolha ao menos 1 questão" }, { status: 400 });
        }
        const rascunho = await gerarRascunhoProva(esc, prof, {
          turmaId: d.turmaId, titulo: d.titulo, assunto: d.assunto, numeroObjetivas, numeroDissertativas,
          disciplina: d.disciplina,
        });
        return NextResponse.json({ ok: true, provaId: rascunho.provaId });
      }

      case "editar-questao":
        if (!d.id || !d.enunciado || !d.gabarito) return NextResponse.json({ erro: "dados incompletos" }, { status: 400 });
        await editarQuestao(esc, prof, d.id, d.enunciado, d.alternativas ?? null, d.gabarito, d.explicacao ?? null);
        break;

      case "excluir-questao":
        if (!d.id) return NextResponse.json({ erro: "questão não informada" }, { status: 400 });
        await excluirQuestao(esc, prof, d.id);
        break;

      case "editar-prova":
        if (!d.id || !d.titulo) return NextResponse.json({ erro: "dados incompletos" }, { status: 400 });
        await editarProva(esc, prof, d.id, d.titulo);
        break;

      case "publicar": {
        if (!d.id) return NextResponse.json({ erro: "prova não informada" }, { status: 400 });
        await publicarProva(esc, prof, d.id);
        // Avisa a turma (push) que ha uma nova prova.
        const pv = (await pool.query(`select turma_id, titulo from provas where id = $2 and escola_id = $1`, [esc, d.id])).rows[0];
        if (pv?.turma_id) {
          await notificarTurma(esc, pv.turma_id, {
            titulo: "Nova prova disponível", corpo: pv.titulo ?? "Uma nova prova foi publicada.", url: "/provas", tag: `prova-${d.id}`,
          });
        }
        break;
      }

      case "excluir-prova":
        if (!d.id) return NextResponse.json({ erro: "prova não informada" }, { status: 400 });
        await excluirProva(esc, prof, d.id);
        break;

      default:
        return NextResponse.json({ erro: "acao invalida" }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[provas/professor]", e);
    const msg = e instanceof Error && e.message ? e.message : "Falha ao salvar.";
    return NextResponse.json({ erro: msg }, { status: 400 });
  }
}
