"use client";

// Reenturmacao em lote (virada de ano): o diretor filtra alunos por turma de
// origem, seleciona quais mover e escolhe a turma destino. Usa a acao
// "reenturmar" da API de gestao (transacao no servidor).
import { useMemo, useState } from "react";

const inp = "rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7a6aa5]";
const btn = "rounded-md bg-[#3B2C63] px-3 py-2 text-sm font-medium text-white hover:bg-[#2f2350] disabled:opacity-50";

export interface AlunoRe { id: string; nome: string; turma: string | null; turmaId: string | null }
export interface TurmaRe { id: string; nome: string; serie: string }

export default function ReenturmarAlunos({ alunos, turmas }: { alunos: AlunoRe[]; turmas: TurmaRe[] }) {
  const [lista, setLista] = useState<AlunoRe[]>(alunos);
  const [origem, setOrigem] = useState<string>("todas");
  const [destino, setDestino] = useState<string>("");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");
  const [enviando, setEnviando] = useState(false);

  const filtrados = useMemo(() => {
    if (origem === "todas") return lista;
    if (origem === "sem") return lista.filter((a) => !a.turmaId);
    return lista.filter((a) => a.turmaId === origem);
  }, [lista, origem]);

  function alternar(id: string) {
    setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function marcarTodos() {
    setSel((s) => s.size === filtrados.length ? new Set() : new Set(filtrados.map((a) => a.id)));
  }

  async function mover() {
    setMsg(""); setOk("");
    if (sel.size === 0) { setMsg("Selecione ao menos um aluno."); return; }
    if (!destino) { setMsg("Escolha a turma destino."); return; }
    const alunoIds = [...sel];
    setEnviando(true);
    try {
      const r = await fetch("/api/gestor/gestao", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ acao: "reenturmar", alunoIds, turmaDestinoId: destino === "sem" ? null : destino }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(d.erro ?? "Falha ao mover."); return; }
      const turmaDest = turmas.find((t) => t.id === destino);
      const nomeDest = destino === "sem" ? "Sem turma" : (turmaDest?.nome ?? "");
      setLista((atual) => atual.map((a) => alunoIds.includes(a.id)
        ? { ...a, turmaId: destino === "sem" ? null : destino, turma: destino === "sem" ? null : nomeDest }
        : a));
      setSel(new Set());
      setOk(`${d.movidos} aluno(s) movido(s) para "${nomeDest}".`);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="cartao flex flex-wrap items-end gap-4 p-4">
        <div>
          <label className="block text-xs font-medium text-slate-500">Turma de origem</label>
          <select value={origem} onChange={(e) => { setOrigem(e.target.value); setSel(new Set()); }} className={`${inp} mt-1`}>
            <option value="todas">Todas</option>
            <option value="sem">Sem turma</option>
            {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome} ({t.serie})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-500">Mover para</label>
          <select value={destino} onChange={(e) => setDestino(e.target.value)} className={`${inp} mt-1`}>
            <option value="">— turma destino —</option>
            {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome} ({t.serie})</option>)}
            <option value="sem">Sem turma (desmatricular)</option>
          </select>
        </div>
        <button onClick={mover} className={btn} disabled={enviando}>
          {enviando ? "Movendo…" : `Mover selecionados (${sel.size})`}
        </button>
        {msg && <p className="text-sm text-red-600">{msg}</p>}
        {ok && <p className="text-sm text-green-700">{ok}</p>}
      </div>

      <div className="cartao p-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-sm text-slate-500">{filtrados.length} aluno(s)</p>
          <button onClick={marcarTodos} className="text-sm text-roxo hover:underline" type="button">
            {sel.size === filtrados.length && filtrados.length > 0 ? "Desmarcar todos" : "Selecionar todos"}
          </button>
        </div>
        <div className="max-h-[28rem] overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="sticky top-0 border-b border-slate-200 bg-white text-left text-xs uppercase text-slate-500">
                <th className="py-2 pr-3 w-8"></th>
                <th className="py-2 pr-3">Aluno</th>
                <th className="py-2 pr-3">Turma atual</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((a) => (
                <tr key={a.id} className="border-b border-slate-100">
                  <td className="py-1.5 pr-3">
                    <input type="checkbox" checked={sel.has(a.id)} onChange={() => alternar(a.id)} className="accent-[#3B2C63]" />
                  </td>
                  <td className="py-1.5 pr-3 font-medium text-grafite">{a.nome}</td>
                  <td className="py-1.5 pr-3 text-slate-600">{a.turma ?? <span className="text-slate-400">sem turma</span>}</td>
                </tr>
              ))}
              {filtrados.length === 0 && (
                <tr><td colSpan={3} className="py-4 text-center text-slate-400">Nenhum aluno neste filtro.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
