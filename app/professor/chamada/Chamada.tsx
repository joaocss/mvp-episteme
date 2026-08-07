"use client";

// Chamada da turma: escolhe turma + data, carrega o roster (default TODOS
// presentes ou o que ja foi salvo), e marca presença/ausência com um toque.
// Ausentes podem ser justificados. Salvar dispara o aviso ao aluno/responsável.
import { useState } from "react";
import { Cartao } from "../../componentes/ui/Cartao";
import { Botao } from "../../componentes/ui/Botao";
import { GrupoCampo, Selecao, Entrada } from "../../componentes/ui/Campo";
import { Selo } from "../../componentes/ui/Selo";
import { EstadoVazio } from "../../componentes/ui/EstadoVazio";
import { cn } from "../../../lib/utils";

interface Turma { id: string; nome: string }
interface LinhaAluno { alunoId: string; nome: string; presente: boolean; justificada: boolean }

function hojeISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Chamada({ turmas }: { turmas: Turma[] }) {
  const [turmaId, setTurmaId] = useState(turmas[0]?.id ?? "");
  const [data, setData] = useState(hojeISO());
  const [linhas, setLinhas] = useState<LinhaAluno[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");

  async function carregar() {
    if (!turmaId || !data) return;
    setCarregando(true); setMsg("");
    try {
      const r = await fetch(`/api/professor/chamada?turmaId=${turmaId}&data=${data}`);
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(d.erro ?? "Falha ao carregar."); setCarregado(false); return; }
      const existente: Record<string, { presente: boolean; justificada: boolean }> = d.existente ?? {};
      setLinhas((d.roster ?? []).map((a: { alunoId: string; nome: string }) => ({
        alunoId: a.alunoId, nome: a.nome,
        presente: existente[a.alunoId]?.presente ?? true,
        justificada: existente[a.alunoId]?.justificada ?? false,
      })));
      setCarregado(true);
    } finally {
      setCarregando(false);
    }
  }

  function alternarPresenca(alunoId: string) {
    setLinhas((ls) => ls.map((l) => l.alunoId === alunoId ? { ...l, presente: !l.presente, justificada: false } : l));
  }
  function alternarJustificada(alunoId: string) {
    setLinhas((ls) => ls.map((l) => l.alunoId === alunoId ? { ...l, justificada: !l.justificada } : l));
  }
  function todosPresentes() {
    setLinhas((ls) => ls.map((l) => ({ ...l, presente: true, justificada: false })));
  }

  async function salvar() {
    setSalvando(true); setMsg("");
    try {
      const r = await fetch("/api/professor/chamada", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ turmaId, data, itens: linhas.map((l) => ({ alunoId: l.alunoId, presente: l.presente, justificada: l.justificada })) }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(d.erro ?? "Falha ao salvar."); return; }
      const aus = d.ausentes ?? 0;
      setMsg(`Chamada salva. ${aus} ausência(s)${aus > 0 ? " — avisos enviados." : "."}`);
    } finally {
      setSalvando(false);
    }
  }

  const ausentes = linhas.filter((l) => !l.presente).length;

  return (
    <div className="space-y-5">
      <Cartao className="p-5">
        <div className="flex flex-wrap items-end gap-3">
          <GrupoCampo rotulo="Turma" className="min-w-[180px]">
            <Selecao value={turmaId} onChange={(e) => { setTurmaId(e.target.value); setCarregado(false); }}>
              {turmas.length === 0 && <option value="">Nenhuma turma</option>}
              {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </Selecao>
          </GrupoCampo>
          <GrupoCampo rotulo="Data">
            <Entrada type="date" value={data} onChange={(e) => { setData(e.target.value); setCarregado(false); }} />
          </GrupoCampo>
          <Botao onClick={carregar} disabled={carregando || !turmaId}>{carregando ? "Carregando…" : "Abrir chamada"}</Botao>
        </div>
      </Cartao>

      {carregado && (
        linhas.length === 0 ? (
          <EstadoVazio icone="alunos" titulo="Turma sem alunos" descricao="Matricule alunos na turma para fazer a chamada." />
        ) : (
          <Cartao className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-grafite">{linhas.length} aluno(s)</h2>
                <Selo cor={ausentes > 0 ? "aviso" : "sucesso"}>{ausentes} ausente(s)</Selo>
              </div>
              <Botao tamanho="pequeno" variante="secundario" onClick={todosPresentes}>Marcar todos presentes</Botao>
            </div>

            <ul className="mt-4 space-y-2">
              {linhas.map((l) => (
                <li key={l.alunoId} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-borda px-3 py-2">
                  <span className="font-medium text-grafite">{l.nome}</span>
                  <div className="flex items-center gap-2">
                    {!l.presente && (
                      <label className="flex cursor-pointer items-center gap-1.5 text-xs text-slate-500">
                        <input type="checkbox" checked={l.justificada} onChange={() => alternarJustificada(l.alunoId)} className="h-3.5 w-3.5 accent-roxo" />
                        justificada
                      </label>
                    )}
                    <button
                      onClick={() => alternarPresenca(l.alunoId)}
                      className={cn(
                        "min-h-[36px] rounded-lg px-4 text-sm font-medium transition",
                        l.presente ? "bg-green-50 text-sucesso ring-1 ring-sucesso/30" : "bg-red-50 text-alerta ring-1 ring-alerta/30",
                      )}
                    >
                      {l.presente ? "Presente" : "Ausente"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-center gap-3">
              <Botao onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Salvar chamada"}</Botao>
              {msg && <span className="text-sm text-slate-600">{msg}</span>}
            </div>
          </Cartao>
        )
      )}
      {!carregado && msg && <p className="text-sm text-alerta">{msg}</p>}
    </div>
  );
}
