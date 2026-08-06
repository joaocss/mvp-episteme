"use client";

// Gestao de treinos (Modo Treinador) — professor. Cria um desafio para uma turma
// (a IA depois acompanha o aluno com pistas, sem dar a resposta) e acompanha o
// processo de cada aluno. Visual sobre os tokens da marca.
import { useState } from "react";
import Link from "next/link";
import { Cartao } from "./ui/Cartao";
import { Botao } from "./ui/Botao";
import { GrupoCampo, Entrada, AreaTexto, Selecao } from "./ui/Campo";
import { Selo } from "./ui/Selo";
import { Icone } from "./ui/Icone";
import { EstadoVazio } from "./ui/EstadoVazio";

export interface TurmaDisc { turmaId: string; turma: string; serie: string; disciplina: string }
export interface TreinoItem {
  id: string; turmaId: string; turmaNome?: string; disciplina: string; titulo: string;
  enunciado: string; objetivo: string | null; status: string; criadoEm: string; sessoes: number; concluidos: number;
}

const ROTULO_DISC: Record<string, string> = { matematica: "Matematica", portugues: "Lingua Portuguesa", historia: "Historia" };
const disc = (s: string) => ROTULO_DISC[s] ?? s;

export default function GestaoTreinos({
  turmas, treinosIniciais,
}: { turmas: TurmaDisc[]; treinosIniciais: TreinoItem[] }) {
  const [treinos, setTreinos] = useState<TreinoItem[]>(treinosIniciais);
  const [alvo, setAlvo] = useState<string>(turmas[0] ? `${turmas[0].turmaId}|${turmas[0].disciplina}` : "");
  const [titulo, setTitulo] = useState("");
  const [enunciado, setEnunciado] = useState("");
  const [objetivo, setObjetivo] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState("");

  async function recarregar() {
    const r = await fetch("/api/treinos");
    if (r.ok) setTreinos((await r.json()).treinos);
  }

  async function criar(e: React.FormEvent<HTMLFormElement>, publicar: boolean) {
    e.preventDefault();
    setMsg("");
    const [turmaId, disciplina] = alvo.split("|");
    if (!turmaId || !disciplina) { setMsg("Selecione a turma."); return; }
    if (!titulo.trim() || !enunciado.trim()) { setMsg("Preencha titulo e enunciado."); return; }
    setEnviando(true);
    try {
      const r = await fetch("/api/treinos", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ turmaId, disciplina, titulo, enunciado, objetivo, publicar }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(d.erro ?? "Falha ao criar."); return; }
      setTitulo(""); setEnunciado(""); setObjetivo("");
      await recarregar();
    } finally {
      setEnviando(false);
    }
  }

  async function mudarStatus(treinoId: string, status: string) {
    const r = await fetch("/api/treinos", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ treinoId, status }),
    });
    if (r.ok) await recarregar();
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este treino e todo o processo registrado dos alunos?")) return;
    const r = await fetch(`/api/treinos?id=${id}`, { method: "DELETE" });
    if (r.ok) setTreinos((t) => t.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-6">
      <Cartao className="p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-roxo-suave text-roxo">
            <Icone nome="treino" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-grafite">Novo treino</h2>
            <p className="text-sm text-slate-500">
              Proponha um desafio. A IA acompanha o aluno com <strong>pistas</strong>, sem entregar a resposta, e registra o processo dele.
            </p>
          </div>
        </div>

        {turmas.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Voce ainda nao leciona em nenhuma turma.</p>
        ) : (
          <form onSubmit={(e) => criar(e, true)} className="mt-5 grid gap-4 sm:grid-cols-2">
            <GrupoCampo rotulo="Turma e disciplina" className="sm:col-span-2">
              <Selecao value={alvo} onChange={(e) => setAlvo(e.target.value)}>
                {turmas.map((t) => (
                  <option key={`${t.turmaId}|${t.disciplina}`} value={`${t.turmaId}|${t.disciplina}`}>
                    {t.turma} — {disc(t.disciplina)} ({t.serie})
                  </option>
                ))}
              </Selecao>
            </GrupoCampo>
            <GrupoCampo rotulo="Titulo" className="sm:col-span-2">
              <Entrada value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Desafio das fracoes equivalentes" />
            </GrupoCampo>
            <GrupoCampo rotulo="Enunciado do desafio" className="sm:col-span-2" dica="O problema que o aluno vai resolver. A IA nunca revela a resposta dele.">
              <AreaTexto value={enunciado} onChange={(e) => setEnunciado(e.target.value)}
                placeholder="Descreva o problema/tarefa que o aluno deve resolver passo a passo." />
            </GrupoCampo>
            <GrupoCampo rotulo="Objetivo de aprendizagem (opcional)" className="sm:col-span-2">
              <Entrada value={objetivo} onChange={(e) => setObjetivo(e.target.value)} placeholder="Ex.: reconhecer fracoes equivalentes" />
            </GrupoCampo>
            <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
              <Botao disabled={enviando}>{enviando ? "Salvando…" : "Publicar treino"}</Botao>
              <Botao type="button" variante="secundario" disabled={enviando} onClick={(e) => criar(e as any, false)}>
                Salvar rascunho
              </Botao>
              {msg && <p className="text-sm text-alerta">{msg}</p>}
            </div>
          </form>
        )}
      </Cartao>

      <Cartao className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-grafite">Treinos criados</h2>
        {treinos.length === 0 ? (
          <div className="mt-4"><EstadoVazio icone="treino" titulo="Nenhum treino ainda" descricao="Crie um desafio acima para a sua turma." /></div>
        ) : (
          <div className="mt-4 space-y-3">
            {treinos.map((t) => (
              <div key={t.id} className="rounded-xl border border-borda p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-grafite">{t.titulo}</h3>
                      <Selo cor={t.status === "publicado" ? "sucesso" : t.status === "arquivado" ? "neutro" : "aviso"}>
                        {t.status === "publicado" ? "Publicado" : t.status === "arquivado" ? "Arquivado" : "Rascunho"}
                      </Selo>
                    </div>
                    <p className="mt-0.5 text-sm text-slate-500">
                      {t.turmaNome} · {disc(t.disciplina)} · {t.sessoes} aluno(s), {t.concluidos} concluído(s)
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Link href={`/professor/treinos/${t.id}`}>
                      <Botao tamanho="pequeno" variante="secundario">Ver processo</Botao>
                    </Link>
                    {t.status !== "publicado" && (
                      <Botao tamanho="pequeno" onClick={() => mudarStatus(t.id, "publicado")}>Publicar</Botao>
                    )}
                    {t.status === "publicado" && (
                      <Botao tamanho="pequeno" variante="secundario" onClick={() => mudarStatus(t.id, "arquivado")}>Arquivar</Botao>
                    )}
                    <Botao tamanho="pequeno" variante="fantasma" className="text-alerta hover:bg-red-50"
                      onClick={() => excluir(t.id)} aria-label={`Excluir ${t.titulo}`}>
                      <Icone nome="lixeira" className="h-4 w-4" />
                    </Botao>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Cartao>
    </div>
  );
}
