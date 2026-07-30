"use client";

import { useState } from "react";

interface Aluno { id: string; nome: string; }
interface Turma { turmaId: string; turma: string; alunos: Aluno[]; }
interface Nota { id: string; aluno: string; alunoId: string; descricao: string; valor: number; notaMaxima: number; data: string; }
interface Falta { id: string; aluno: string; alunoId: string; data: string; situacao: "justificada" | "nao_justificada"; motivo: string | null; }

const inp = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7a6aa5]";
const btn = "rounded-md bg-[#3B2C63] px-3 py-2 text-sm font-medium text-white hover:bg-[#2f2350] disabled:opacity-50";

async function postar(dados: Record<string, unknown>): Promise<string | null> {
  const r = await fetch("/api/professor/notas", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(dados),
  });
  if (r.ok) return null;
  const d = await r.json().catch(() => ({}));
  return d.erro ?? "Erro ao salvar.";
}

export default function DesempenhoTurma({ turmas, notaMaxima }: { turmas: Turma[]; notaMaxima: number }) {
  const [turmaId, setTurmaId] = useState(turmas[0]?.turmaId ?? "");
  const [notas, setNotas] = useState<Nota[] | null>(null);
  const [faltas, setFaltas] = useState<Falta[] | null>(null);
  const [msg, setMsg] = useState("");

  async function carregar(id: string) {
    setTurmaId(id); setNotas(null); setFaltas(null);
    if (!id) return;
    const r = await fetch(`/api/professor/notas?turmaId=${id}`);
    const d = await r.json().catch(() => ({}));
    setNotas(d.notas ?? []); setFaltas(d.faltas ?? []);
  }

  const turma = turmas.find((t) => t.turmaId === turmaId);

  async function lancarNota(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const erro = await postar({
      acao: "lancar-nota", turmaId, alunoId: fd.get("alunoId"), descricao: fd.get("descricao"),
      valor: fd.get("valor"), notaMaxima,
    });
    if (erro) { setMsg(erro); return; }
    (e.target as HTMLFormElement).reset();
    carregar(turmaId);
  }

  async function lancarFalta(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const erro = await postar({
      acao: "lancar-falta", turmaId, alunoId: fd.get("alunoId"), data: fd.get("data"),
      situacao: fd.get("situacao"), motivo: fd.get("motivo"),
    });
    if (erro) { setMsg(erro); return; }
    (e.target as HTMLFormElement).reset();
    carregar(turmaId);
  }

  async function excluirNota(id: string) {
    if (!window.confirm("Excluir esta nota?")) return;
    const erro = await postar({ acao: "excluir-nota", id });
    if (erro) { setMsg(erro); return; }
    carregar(turmaId);
  }

  async function excluirFalta(id: string) {
    if (!window.confirm("Excluir esta falta?")) return;
    const erro = await postar({ acao: "excluir-falta", id });
    if (erro) { setMsg(erro); return; }
    carregar(turmaId);
  }

  return (
    <div>
      <select value={turmaId} onChange={(e) => carregar(e.target.value)} className={inp + " max-w-xs"}>
        {turmas.map((t) => <option key={t.turmaId} value={t.turmaId}>{t.turma}</option>)}
      </select>
      {msg && <p className="mt-2 text-sm text-red-600">{msg}</p>}

      {turma && (
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <section>
            <h3 className="font-semibold text-slate-800">Lançar nota (escala 0–{notaMaxima})</h3>
            <form onSubmit={lancarNota} className="mt-2 space-y-2 rounded-lg border border-slate-200 bg-white p-3">
              <select name="alunoId" required className={inp}>
                <option value="">Aluno…</option>
                {turma.alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
              <input name="descricao" placeholder="Descrição (ex.: Trabalho em grupo)" required className={inp} />
              <input name="valor" type="number" min={0} max={notaMaxima} step="0.1" placeholder="Valor" required className={inp} />
              <button className={btn}>Lançar nota</button>
            </form>
            <ul className="mt-3 space-y-1">
              {(notas ?? []).map((n) => (
                <li key={n.id} className="flex items-center justify-between rounded-md border border-slate-100 bg-white px-3 py-2 text-sm">
                  <span>{n.aluno} — {n.descricao}: <strong>{n.valor}/{n.notaMaxima}</strong> ({n.data})</span>
                  <button onClick={() => excluirNota(n.id)} className="text-xs text-red-600 hover:underline">remover</button>
                </li>
              ))}
              {notas && notas.length === 0 && <li className="text-sm text-slate-400">Nenhuma nota lançada.</li>}
            </ul>
          </section>

          <section>
            <h3 className="font-semibold text-slate-800">Lançar falta</h3>
            <form onSubmit={lancarFalta} className="mt-2 space-y-2 rounded-lg border border-slate-200 bg-white p-3">
              <select name="alunoId" required className={inp}>
                <option value="">Aluno…</option>
                {turma.alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
              <input name="data" type="date" required className={inp} />
              <select name="situacao" className={inp}>
                <option value="nao_justificada">Não justificada</option>
                <option value="justificada">Justificada</option>
              </select>
              <input name="motivo" placeholder="Motivo (opcional)" className={inp} />
              <button className={btn}>Lançar falta</button>
            </form>
            <ul className="mt-3 space-y-1">
              {(faltas ?? []).map((f) => (
                <li key={f.id} className="flex items-center justify-between rounded-md border border-slate-100 bg-white px-3 py-2 text-sm">
                  <span>{f.aluno} — {f.data} — {f.situacao === "justificada" ? "justificada" : "não justificada"}{f.motivo ? ` (${f.motivo})` : ""}</span>
                  <button onClick={() => excluirFalta(f.id)} className="text-xs text-red-600 hover:underline">remover</button>
                </li>
              ))}
              {faltas && faltas.length === 0 && <li className="text-sm text-slate-400">Nenhuma falta registrada.</li>}
            </ul>
          </section>
        </div>
      )}
    </div>
  );
}
