"use client";

// Revisao/edicao das questoes geradas por IA, no mesmo padrao de app/gestor/gestao/TabelasGestao.tsx:
// edicao inline via document.getElementById (nao controlado), postar()+reload.
import { useState } from "react";
import { Botao } from "../../../componentes/ui/Botao";

type TipoQuestao = "objetiva" | "dissertativa";
interface Alternativa { letra: string; texto: string; }
interface Questao {
  id: string; ordem: number; tipo: TipoQuestao; enunciado: string;
  alternativas: Alternativa[] | null; gabarito: string; explicacao: string | null;
}
interface Prova {
  id: string; titulo: string; assunto: string; status: "rascunho" | "publicada" | "encerrada"; turma: string;
  questoes: Questao[];
}

const LETRAS = ["A", "B", "C", "D"];

async function postar(dados: Record<string, unknown>): Promise<string | null> {
  const r = await fetch("/api/professor/provas", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(dados),
  });
  if (r.ok) return null;
  const d = await r.json().catch(() => ({}));
  return d.erro ?? "Erro ao salvar.";
}

async function acao(dados: Record<string, unknown>, aoErro: (m: string) => void) {
  const erro = await postar(dados);
  if (erro) { aoErro(erro); return; }
  window.location.reload();
}

const inp = "w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-roxo-claro";

export default function EditorQuestoes({ prova }: { prova: Prova }) {
  const [msg, setMsg] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const erro = (m: string) => setMsg(m);

  function excluirQuestao(q: Questao) {
    if (!window.confirm(`Excluir a questão ${q.ordem}?`)) return;
    setMsg("");
    acao({ acao: "excluir-questao", id: q.id }, erro);
  }

  function salvarQuestao(q: Questao) {
    const enunciado = (document.getElementById(`q-enun-${q.id}`) as HTMLTextAreaElement).value;
    const explicacao = (document.getElementById(`q-expl-${q.id}`) as HTMLTextAreaElement).value || null;
    if (q.tipo === "objetiva") {
      const alternativas = LETRAS.map((letra) => ({
        letra, texto: (document.getElementById(`q-alt-${q.id}-${letra}`) as HTMLInputElement).value,
      }));
      const gabarito = (document.getElementById(`q-gab-${q.id}`) as HTMLSelectElement).value;
      acao({ acao: "editar-questao", id: q.id, enunciado, alternativas, gabarito, explicacao }, erro);
    } else {
      const gabarito = (document.getElementById(`q-gab-${q.id}`) as HTMLTextAreaElement).value;
      acao({ acao: "editar-questao", id: q.id, enunciado, alternativas: null, gabarito, explicacao }, erro);
    }
  }

  function publicar() {
    if (!window.confirm("Publicar esta prova para a turma? Os alunos poderão respondê-la.")) return;
    setMsg("");
    acao({ acao: "publicar", id: prova.id }, erro);
  }

  return (
    <div className="space-y-6">
      {msg && <p className="text-sm text-alerta" role="alert">{msg}</p>}

      {prova.questoes.map((q) => (
        <div key={q.id} className="cartao p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-medium text-roxo">
              Questão {q.ordem} — {q.tipo === "objetiva" ? "Objetiva" : "Dissertativa"}
            </span>
            <div className="flex gap-2">
              {editando === q.id ? (
                <>
                  <Botao tamanho="pequeno" onClick={() => salvarQuestao(q)}>Salvar</Botao>
                  <Botao tamanho="pequeno" variante="fantasma" onClick={() => setEditando(null)}>Cancelar</Botao>
                </>
              ) : (
                <>
                  <Botao tamanho="pequeno" variante="secundario" onClick={() => setEditando(q.id)}>Editar</Botao>
                  <Botao tamanho="pequeno" variante="perigo" onClick={() => excluirQuestao(q)}>Excluir</Botao>
                </>
              )}
            </div>
          </div>

          {editando === q.id ? (
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Enunciado</label>
                <textarea id={`q-enun-${q.id}`} defaultValue={q.enunciado} className={inp} rows={2} />
              </div>

              {q.tipo === "objetiva" ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    {LETRAS.map((letra) => (
                      <div key={letra} className="flex items-center gap-2">
                        <span className="text-sm font-medium text-grafite">{letra})</span>
                        <input id={`q-alt-${q.id}-${letra}`} className={inp}
                          defaultValue={q.alternativas?.find((a) => a.letra === letra)?.texto ?? ""} />
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-slate-500">Gabarito</label>
                    <select id={`q-gab-${q.id}`} defaultValue={q.gabarito} className={inp}>
                      {LETRAS.map((letra) => <option key={letra} value={letra}>{letra}</option>)}
                    </select>
                  </div>
                </>
              ) : (
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-500">Resolução esperada (gabarito)</label>
                  <textarea id={`q-gab-${q.id}`} defaultValue={q.gabarito} className={inp} rows={3} />
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-500">Explicação / dica didática</label>
                <textarea id={`q-expl-${q.id}`} defaultValue={q.explicacao ?? ""} className={inp} rows={2} />
              </div>
            </div>
          ) : (
            <div className="text-sm text-slate-700">
              <p>{q.enunciado}</p>
              {q.tipo === "objetiva" && q.alternativas && (
                <ul className="mt-2 space-y-1">
                  {q.alternativas.map((a) => (
                    <li key={a.letra} className={a.letra === q.gabarito ? "font-medium text-green-700" : ""}>
                      {a.letra}) {a.texto}
                    </li>
                  ))}
                </ul>
              )}
              {q.tipo === "dissertativa" && (
                <p className="mt-2 text-slate-500"><span className="font-medium">Gabarito:</span> {q.gabarito}</p>
              )}
              {q.explicacao && <p className="mt-1 text-slate-500"><span className="font-medium">Explicação:</span> {q.explicacao}</p>}
            </div>
          )}
        </div>
      ))}

      <div className="pt-2">
        <Botao onClick={publicar} disabled={prova.status !== "rascunho"}>
          {prova.status === "rascunho" ? "Publicar prova" : "Prova já publicada"}
        </Botao>
      </div>
    </div>
  );
}
