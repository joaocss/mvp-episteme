"use client";

// Painel de inclusao de um aluno: marca se e atipico, guarda observacoes
// descritivas (usadas pela IA no plano inclusivo) e gerencia anexos (laudos/
// fotos) no Storage. Aberto sob a linha do aluno em TabelasGestao.
import { useEffect, useState } from "react";
import { Botao } from "../../componentes/ui/Botao";
import { AreaTexto } from "../../componentes/ui/Campo";
import { Icone } from "../../componentes/ui/Icone";

interface Anexo { id: string; nome: string; tipo: string | null; tamanho: number | null; criadoEm: string }

export default function PainelInclusao({
  alunoId, atipicoInicial, observacoesInicial,
}: { alunoId: string; atipicoInicial: boolean; observacoesInicial: string | null }) {
  const [atipico, setAtipico] = useState(atipicoInicial);
  const [obs, setObs] = useState(observacoesInicial ?? "");
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState("");
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [enviando, setEnviando] = useState(false);

  async function carregarAnexos() {
    const r = await fetch(`/api/gestor/alunos/anexos?alunoId=${alunoId}`);
    if (r.ok) setAnexos((await r.json()).anexos);
  }
  useEffect(() => { carregarAnexos(); }, [alunoId]);

  async function salvar() {
    setSalvando(true); setMsg("");
    try {
      const r = await fetch("/api/gestor/gestao", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ acao: "atipicidade", alunoId, atipico, observacoes: obs }),
      });
      setMsg(r.ok ? "Salvo." : "Erro ao salvar.");
    } finally { setSalvando(false); }
  }

  async function enviarAnexo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setEnviando(true); setMsg("");
    try {
      const fd = new FormData();
      fd.set("alunoId", alunoId); fd.set("arquivo", arquivo);
      const r = await fetch("/api/gestor/alunos/anexos", { method: "POST", body: fd });
      if (!r.ok) { const d = await r.json().catch(() => ({})); setMsg(d.erro ?? "Falha no upload."); return; }
      await carregarAnexos();
    } finally { setEnviando(false); e.target.value = ""; }
  }

  async function excluirAnexo(id: string) {
    if (!confirm("Excluir este anexo?")) return;
    const r = await fetch(`/api/gestor/alunos/anexos?id=${id}`, { method: "DELETE" });
    if (r.ok) setAnexos((a) => a.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-4 rounded-lg border border-borda bg-tela p-4">
      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-grafite">
        <input type="checkbox" checked={atipico} onChange={(e) => setAtipico(e.target.checked)} className="h-4 w-4 accent-roxo" />
        Aluno atípico (público-alvo da educação especial / neurodivergente)
      </label>
      <div>
        <p className="rotulo-campo mb-1">Observações sobre as características e limitações</p>
        <p className="mb-1.5 text-xs text-slate-400">Descreva o que ajuda a IA a montar um plano inclusivo (ex.: TEA nível 1, dislexia, precisa de apoio visual, tempo estendido…).</p>
        <AreaTexto value={obs} onChange={(e) => setObs(e.target.value)} rows={3}
          placeholder="Ex.: Aluno com TDAH; foco melhor com tarefas curtas e apoio visual; sensível a ruído." />
      </div>
      <div className="flex items-center gap-3">
        <Botao tamanho="pequeno" onClick={salvar} disabled={salvando}>{salvando ? "Salvando…" : "Salvar inclusão"}</Botao>
        {msg && <span className="text-xs text-slate-500">{msg}</span>}
      </div>

      <div>
        <p className="rotulo-campo mb-1.5">Anexos (laudos, relatórios, fotos)</p>
        <label className="inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-lg border border-roxo/30 bg-white px-3 py-2 text-sm font-medium text-roxo hover:bg-creme">
          <Icone nome="upload" className="h-4 w-4" />
          {enviando ? "Enviando…" : "Anexar arquivo"}
          <input type="file" className="hidden" onChange={enviarAnexo} disabled={enviando} />
        </label>
        {anexos.length > 0 && (
          <ul className="mt-2 space-y-1.5">
            {anexos.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-borda bg-white px-3 py-1.5 text-sm">
                <a href={`/api/gestor/alunos/anexos?anexoId=${a.id}`} target="_blank" rel="noreferrer"
                  className="flex min-w-0 items-center gap-2 text-roxo hover:underline">
                  <Icone nome="documento" className="h-4 w-4 shrink-0" />
                  <span className="truncate">{a.nome}</span>
                </a>
                <button onClick={() => excluirAnexo(a.id)} className="shrink-0 text-slate-400 hover:text-alerta" aria-label="Excluir anexo">
                  <Icone nome="lixeira" className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
