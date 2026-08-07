"use client";

// Gestor cria comunicados escolhendo a AUDIENCIA (alunos/professores/gestao),
// opcionalmente restrito a uma turma. Ao publicar, dispara push + e-mail.
import { useState } from "react";
import { Cartao } from "./ui/Cartao";
import { Botao } from "./ui/Botao";
import { GrupoCampo, Entrada, AreaTexto, Selecao } from "./ui/Campo";
import { Selo } from "./ui/Selo";
import { Icone } from "./ui/Icone";
import { EstadoVazio } from "./ui/EstadoVazio";

interface Turma { id: string; nome: string }
export interface AvisoUI {
  id: string; titulo: string; corpo: string; audiencia: string[]; turmaId: string | null;
  turmaNome?: string | null; autorNome?: string | null; criadoEm: string;
}

const ROTULO_PAPEL: Record<string, string> = { aluno: "Alunos", professor: "Professores", gestor: "Gestão" };
const OPCOES: { chave: "aluno" | "professor" | "gestor"; rotulo: string }[] = [
  { chave: "aluno", rotulo: "Alunos" }, { chave: "professor", rotulo: "Professores" }, { chave: "gestor", rotulo: "Gestão / Coordenação" },
];

export default function GestaoAvisos({ turmas, avisosIniciais }: { turmas: Turma[]; avisosIniciais: AvisoUI[] }) {
  const [avisos, setAvisos] = useState<AvisoUI[]>(avisosIniciais);
  const [titulo, setTitulo] = useState("");
  const [corpo, setCorpo] = useState("");
  const [audiencia, setAudiencia] = useState<string[]>(["aluno"]);
  const [turmaId, setTurmaId] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState("");

  function alternarPapel(p: string) {
    setAudiencia((a) => a.includes(p) ? a.filter((x) => x !== p) : [...a, p]);
  }
  async function recarregar() {
    const r = await fetch("/api/gestor/avisos");
    if (r.ok) setAvisos((await r.json()).avisos);
  }
  async function publicar(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    if (!titulo.trim() || !corpo.trim()) { setMsg("Preencha título e mensagem."); return; }
    if (audiencia.length === 0) { setMsg("Escolha ao menos uma audiência."); return; }
    setEnviando(true);
    try {
      const r = await fetch("/api/gestor/avisos", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ titulo, corpo, audiencia, turmaId: turmaId || null }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(d.erro ?? "Falha ao publicar."); return; }
      const e2 = d.entregas ?? {};
      setMsg(`Aviso publicado. ${e2.push ?? 0} notificação(ões), ${e2.emails ?? 0} e-mail(s).`);
      setTitulo(""); setCorpo("");
      await recarregar();
    } finally { setEnviando(false); }
  }
  async function excluir(id: string) {
    if (!confirm("Excluir este aviso?")) return;
    const r = await fetch(`/api/gestor/avisos?id=${id}`, { method: "DELETE" });
    if (r.ok) setAvisos((a) => a.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-6">
      <Cartao className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-grafite">Novo comunicado</h2>
        <form onSubmit={publicar} className="mt-4 space-y-4">
          <GrupoCampo rotulo="Título"><Entrada value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Reunião de pais dia 20" /></GrupoCampo>
          <GrupoCampo rotulo="Mensagem"><AreaTexto value={corpo} onChange={(e) => setCorpo(e.target.value)} rows={4} placeholder="Escreva o comunicado…" /></GrupoCampo>
          <div>
            <p className="rotulo-campo mb-1.5">Quem recebe (push + e-mail)</p>
            <div className="flex flex-wrap gap-2">
              {OPCOES.map((o) => (
                <label key={o.chave} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${audiencia.includes(o.chave) ? "border-roxo bg-roxo-suave text-roxo" : "border-borda text-slate-600"}`}>
                  <input type="checkbox" checked={audiencia.includes(o.chave)} onChange={() => alternarPapel(o.chave)} className="h-4 w-4 accent-roxo" />
                  {o.rotulo}
                </label>
              ))}
            </div>
          </div>
          <GrupoCampo rotulo="Restringir a uma turma (opcional)" dica="Vale só para os alunos; deixe em branco para toda a escola.">
            <Selecao value={turmaId} onChange={(e) => setTurmaId(e.target.value)} className="max-w-xs">
              <option value="">Todas as turmas</option>
              {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </Selecao>
          </GrupoCampo>
          <div className="flex items-center gap-3">
            <Botao disabled={enviando}>{enviando ? "Publicando…" : "Publicar comunicado"}</Botao>
            {msg && <span className="text-sm text-slate-600">{msg}</span>}
          </div>
        </form>
      </Cartao>

      <Cartao className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-grafite">Comunicados publicados</h2>
        {avisos.length === 0 ? (
          <div className="mt-4"><EstadoVazio icone="logs" titulo="Nenhum comunicado ainda" descricao="Publique um comunicado acima." /></div>
        ) : (
          <ul className="mt-4 space-y-3">
            {avisos.map((a) => (
              <li key={a.id} className="rounded-xl border border-borda p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-grafite">{a.titulo}</h3>
                    <p className="mt-0.5 whitespace-pre-wrap text-sm text-slate-600">{a.corpo}</p>
                  </div>
                  <button onClick={() => excluir(a.id)} className="shrink-0 text-slate-400 hover:text-alerta" aria-label="Excluir"><Icone nome="lixeira" className="h-4 w-4" /></button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {a.audiencia.map((p) => <Selo key={p} cor="roxo">{ROTULO_PAPEL[p] ?? p}</Selo>)}
                  {a.turmaNome && <Selo cor="dourado">{a.turmaNome}</Selo>}
                  <span className="text-xs text-slate-400">· {new Date(a.criadoEm).toLocaleString("pt-BR")}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Cartao>
    </div>
  );
}
