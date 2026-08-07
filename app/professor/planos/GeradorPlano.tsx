"use client";

// Gera plano de ensino da turma OU plano inclusivo individual (aluno atipico),
// com IA. Renderiza o resultado formatado (markdown) e linka o documento
// imprimivel. Nao mostra mais markdown cru.
import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { Cartao } from "../../componentes/ui/Cartao";
import { Botao } from "../../componentes/ui/Botao";
import { Selecao } from "../../componentes/ui/Campo";
import { Icone } from "../../componentes/ui/Icone";

interface AlunoAtipico { id: string; nome: string }

export default function GeradorPlano({ alunosAtipicos = [] }: { alunosAtipicos?: AlunoAtipico[] }) {
  const [carregando, setCarregando] = useState("");
  const [erro, setErro] = useState("");
  const [resultado, setResultado] = useState<{ id: string; markdown: string; inclusivo: boolean } | null>(null);
  const [alunoId, setAlunoId] = useState(alunosAtipicos[0]?.id ?? "");

  async function gerar(inclusivo: boolean) {
    setCarregando(inclusivo ? "inclusivo" : "turma"); setErro(""); setResultado(null);
    try {
      const r = await fetch("/api/professor/plano-ensino", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(inclusivo ? { alunoId } : {}),
      });
      const d = await r.json();
      if (r.ok) setResultado({ id: d.id, markdown: d.markdown ?? "", inclusivo });
      else setErro(d.erro ?? "Não foi possível gerar.");
    } catch {
      setErro("Falha de conexão.");
    } finally {
      setCarregando("");
    }
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Cartao className="p-5">
          <h3 className="font-semibold text-grafite">Plano de ensino da turma</h3>
          <p className="mt-1 text-sm text-slate-500">Gera o plano alinhado à BNCC e ao material da turma, com adaptações por aluno atípico.</p>
          <Botao className="mt-3" onClick={() => gerar(false)} disabled={!!carregando}>
            {carregando === "turma" ? "Gerando… (até 1 min)" : "Gerar plano da turma"}
          </Botao>
        </Cartao>

        <Cartao className="p-5">
          <h3 className="font-semibold text-grafite">Plano inclusivo individual</h3>
          <p className="mt-1 text-sm text-slate-500">Plano especializado para um aluno atípico, com base nas observações e nos anexos.</p>
          {alunosAtipicos.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">Nenhum aluno atípico registrado. Marque a atipicidade em Cadastros → Inclusão.</p>
          ) : (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Selecao value={alunoId} onChange={(e) => setAlunoId(e.target.value)} className="max-w-[220px]">
                {alunosAtipicos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </Selecao>
              <Botao variante="secundario" onClick={() => gerar(true)} disabled={!!carregando || !alunoId}>
                {carregando === "inclusivo" ? "Gerando…" : "Gerar plano inclusivo"}
              </Botao>
            </div>
          )}
        </Cartao>
      </div>

      {erro && <p className="text-sm text-alerta">{erro}</p>}

      {resultado && (
        <Cartao className="p-5 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-grafite">{resultado.inclusivo ? "Plano inclusivo gerado" : "Plano de ensino gerado"}</h3>
            <Link href={`/professor/planos/${resultado.id}`}>
              <Botao tamanho="pequeno" variante="secundario"><Icone nome="documento" className="h-4 w-4" /> Abrir documento</Botao>
            </Link>
          </div>
          <div className="prose-tutor mt-4 max-w-none">
            <ReactMarkdown>{resultado.markdown}</ReactMarkdown>
          </div>
        </Cartao>
      )}
    </div>
  );
}
