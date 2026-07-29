import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { lerToken } from "../../../lib/sessao";
import {
  listarProvasDisponiveis, proximaQuestao, registrarResposta, consultarGabarito, resultadoProva,
} from "../../../src/bd/provas";
import { feedbackQuestaoObjetiva, passoAPassoDissertativa, feedbackRespostaDissertativa } from "../../../src/rag/provas";

export const runtime = "nodejs";
export const maxDuration = 60; // feedback/correcao via IA pode demorar

export async function GET() {
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao || sessao.papel !== "aluno") return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });

  const provas = await listarProvasDisponiveis(sessao.escolaId, sessao.usuarioId);
  return NextResponse.json({ provas });
}

export async function POST(requisicao: Request) {
  const armazem = await cookies();
  const sessao = lerToken(armazem.get("sessao_aluno")?.value);
  if (!sessao || sessao.papel !== "aluno") return NextResponse.json({ erro: "acesso restrito" }, { status: 403 });

  const d = await requisicao.json().catch(() => ({}));
  const esc = sessao.escolaId;
  const aluno = sessao.usuarioId;

  try {
    switch (d.acao) {
      case "proxima-questao": {
        if (!d.provaId) return NextResponse.json({ erro: "prova não informada" }, { status: 400 });
        const questao = await proximaQuestao(esc, aluno, d.provaId);
        return NextResponse.json({ questao });
      }

      case "responder": {
        if (!d.questaoId || typeof d.resposta !== "string" || !d.resposta.trim()) {
          return NextResponse.json({ erro: "informe a resposta" }, { status: 400 });
        }
        const r = await registrarResposta(esc, aluno, d.questaoId, d.resposta.trim());
        return NextResponse.json(r);
      }

      case "gabarito": {
        if (!d.questaoId) return NextResponse.json({ erro: "questão não informada" }, { status: 400 });
        const g = await consultarGabarito(esc, aluno, d.questaoId);
        return NextResponse.json(g);
      }

      case "feedback-questao": {
        if (!d.questaoId) return NextResponse.json({ erro: "questão não informada" }, { status: 400 });
        const f = await feedbackQuestaoObjetiva(esc, aluno, d.questaoId);
        return NextResponse.json(f);
      }

      case "passo-a-passo": {
        if (!d.questaoId) return NextResponse.json({ erro: "questão não informada" }, { status: 400 });
        const p = await passoAPassoDissertativa(esc, d.questaoId);
        return NextResponse.json(p);
      }

      case "feedback-resposta": {
        if (!d.questaoId || typeof d.resposta !== "string" || !d.resposta.trim()) {
          return NextResponse.json({ erro: "informe a resposta" }, { status: 400 });
        }
        const f = await feedbackRespostaDissertativa(esc, aluno, d.questaoId, d.resposta.trim());
        return NextResponse.json(f);
      }

      case "resultado": {
        if (!d.provaId) return NextResponse.json({ erro: "prova não informada" }, { status: 400 });
        const resultado = await resultadoProva(esc, aluno, d.provaId);
        return NextResponse.json({ resultado });
      }

      default:
        return NextResponse.json({ erro: "acao invalida" }, { status: 400 });
    }
  } catch (e: any) {
    console.error("[provas/aluno]", e);
    const msg = e instanceof Error && e.message ? e.message : "Falha ao processar.";
    return NextResponse.json({ erro: msg }, { status: 400 });
  }
}
