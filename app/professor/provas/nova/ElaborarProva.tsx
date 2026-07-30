"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Botao } from "../../../componentes/ui/Botao";

interface Turma { id: string; nome: string; serie: string; anoLetivo: number; disciplina: string; }

const ROTULO_DISCIPLINA: Record<string, string> = { matematica: "Matemática", portugues: "Língua Portuguesa", historia: "História" };

export default function ElaborarProva({ turmas }: { turmas: Turma[] }) {
  const router = useRouter();
  const [combo, setCombo] = useState(turmas[0] ? `${turmas[0].id}::${turmas[0].disciplina}` : "");
  const [turmaId, disciplina] = combo.split("::");
  const [titulo, setTitulo] = useState("");
  const [assunto, setAssunto] = useState("");
  const [numeroObjetivas, setNumeroObjetivas] = useState(3);
  const [numeroDissertativas, setNumeroDissertativas] = useState(1);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  async function gerar(e: React.FormEvent) {
    e.preventDefault();
    if (numeroObjetivas + numeroDissertativas < 1) { setErro("Escolha ao menos 1 questão."); return; }
    setCarregando(true); setErro("");
    try {
      const r = await fetch("/api/professor/provas", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ acao: "gerar", turmaId, disciplina, titulo, assunto, numeroObjetivas, numeroDissertativas }),
      });
      const d = await r.json();
      if (r.ok) router.push(`/professor/provas/${d.provaId}`);
      else setErro(d.erro ?? "Não foi possível gerar a prova.");
    } catch {
      setErro("Falha de conexão.");
    } finally {
      setCarregando(false);
    }
  }

  const inp = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roxo-claro";

  return (
    <form onSubmit={gerar} className="cartao space-y-4 p-5">
      <div>
        <label className="mb-1 block text-sm font-medium text-grafite">Turma e disciplina</label>
        <select value={combo} onChange={(e) => setCombo(e.target.value)} className={inp} required>
          {turmas.map((t) => (
            <option key={`${t.id}::${t.disciplina}`} value={`${t.id}::${t.disciplina}`}>
              {t.nome} — {t.serie} ({t.anoLetivo}) · {ROTULO_DISCIPLINA[t.disciplina] ?? t.disciplina}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-grafite">Título da prova</label>
        <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={inp} placeholder="Ex.: Avaliação — Frações" required />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-grafite">Assunto</label>
        <textarea value={assunto} onChange={(e) => setAssunto(e.target.value)} className={inp} rows={3}
          placeholder="Ex.: frações equivalentes, adição e subtração de frações" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-grafite">Questões objetivas</label>
          <input type="number" min={0} max={20} value={numeroObjetivas}
            onChange={(e) => setNumeroObjetivas(Number(e.target.value))} className={inp} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-grafite">Questões dissertativas</label>
          <input type="number" min={0} max={20} value={numeroDissertativas}
            onChange={(e) => setNumeroDissertativas(Number(e.target.value))} className={inp} />
        </div>
      </div>

      {erro && <p className="text-sm text-alerta" role="alert">{erro}</p>}

      <Botao type="submit" disabled={carregando}>
        {carregando ? "Gerando… (pode levar até 1 min)" : "Gerar rascunho com IA"}
      </Botao>
    </form>
  );
}
