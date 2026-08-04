"use client";

// Gestao de materiais-fonte (PDF) — usada pelo diretor e pelo professor.
// Upload de PDF vinculado a uma ou mais turmas + disciplina; a ingestao (extrair
// texto -> chunk -> embeddings) roda no servidor. Lista os materiais com status,
// numero de trechos e turmas. O gestor tambem gerencia o catalogo de disciplinas.
import { useState } from "react";

const inp = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7a6aa5]";
const btn = "rounded-md bg-[#3B2C63] px-3 py-2 text-sm font-medium text-white hover:bg-[#2f2350] disabled:opacity-50";
const btnGhost = "rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-grafite hover:bg-slate-50 disabled:opacity-50";

export interface TurmaOpcao { id: string; nome: string; serie: string; modoEstrito?: boolean }
export interface DisciplinaOpcao { id: string; nome: string; slug: string }
export interface Material {
  id: string; tipo: string; disciplina: string; ano: string; titulo: string;
  referencia: string | null; statusIngestao: string; trechos: number;
  turmas: { id: string; nome: string }[]; criadoEm: string;
}

const CORES_STATUS: Record<string, string> = {
  concluido: "bg-green-100 text-green-800",
  processando: "bg-amber-100 text-amber-800",
  pendente: "bg-slate-100 text-slate-700",
  erro: "bg-red-100 text-red-800",
};
const ROTULO_STATUS: Record<string, string> = {
  concluido: "Ingerido", processando: "Processando", pendente: "Pendente", erro: "Falhou",
};

export default function GestaoMateriais({
  turmas, disciplinasIniciais, materiaisIniciais, ehGestor,
}: {
  turmas: TurmaOpcao[]; disciplinasIniciais: DisciplinaOpcao[]; materiaisIniciais: Material[]; ehGestor: boolean;
}) {
  const [materiais, setMateriais] = useState<Material[]>(materiaisIniciais);
  const [disciplinas, setDisciplinas] = useState<DisciplinaOpcao[]>(disciplinasIniciais);
  const seriesDisponiveis = Array.from(new Set(turmas.map((t) => t.serie)));

  // ------- formulario de upload -------
  const [titulo, setTitulo] = useState("");
  const [disciplina, setDisciplina] = useState(disciplinasIniciais[0]?.slug ?? "");
  const [ano, setAno] = useState(seriesDisponiveis[0] ?? "6o ano");
  const [tipo, setTipo] = useState("apostila");
  const [turmasSel, setTurmasSel] = useState<string[]>([]);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState("");
  const [ok, setOk] = useState("");

  function alternarTurma(id: string) {
    setTurmasSel((atual) => atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]);
  }

  async function recarregar() {
    const r = await fetch("/api/materiais");
    if (r.ok) setMateriais((await r.json()).materiais);
  }

  async function enviar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(""); setOk("");
    if (!arquivo) { setMsg("Anexe um PDF."); return; }
    if (!disciplina) { setMsg("Selecione a disciplina."); return; }
    if (turmasSel.length === 0) { setMsg("Selecione ao menos uma turma."); return; }
    setEnviando(true);
    try {
      const fd = new FormData();
      fd.set("titulo", titulo); fd.set("disciplina", disciplina); fd.set("ano", ano);
      fd.set("tipo", tipo); fd.set("arquivo", arquivo);
      for (const t of turmasSel) fd.append("turmaIds", t);
      const r = await fetch("/api/materiais", { method: "POST", body: fd });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg(d.erro ?? "Falha ao enviar."); await recarregar(); return; }
      setOk(`"${titulo}" ingerido: ${d.trechos} trechos de ${d.paginas} páginas.`);
      setTitulo(""); setArquivo(null);
      (document.getElementById("arquivo-pdf") as HTMLInputElement | null)?.value && ((document.getElementById("arquivo-pdf") as HTMLInputElement).value = "");
      await recarregar();
    } finally {
      setEnviando(false);
    }
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este material e todos os seus trechos?")) return;
    const r = await fetch(`/api/materiais?id=${id}`, { method: "DELETE" });
    if (r.ok) setMateriais((m) => m.filter((x) => x.id !== id));
  }

  // ------- edicao de turmas de um material -------
  const [editando, setEditando] = useState<string | null>(null);
  const [turmasEdit, setTurmasEdit] = useState<string[]>([]);
  function iniciarEdicao(m: Material) {
    setEditando(m.id); setTurmasEdit(m.turmas.map((t) => t.id));
  }
  async function salvarTurmas(id: string) {
    const r = await fetch("/api/materiais", {
      method: "PATCH", headers: { "content-type": "application/json" },
      body: JSON.stringify({ materialId: id, turmaIds: turmasEdit }),
    });
    if (r.ok) { setEditando(null); await recarregar(); }
  }

  // ------- gestao de disciplinas (so gestor) -------
  const [novaDisc, setNovaDisc] = useState("");
  async function criarDisc() {
    if (!novaDisc.trim()) return;
    const r = await fetch("/api/gestor/disciplinas", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nome: novaDisc }),
    });
    if (r.ok) {
      const d = await r.json();
      setDisciplinas((ds) => ds.some((x) => x.slug === d.disciplina.slug) ? ds : [...ds, d.disciplina].sort((a, b) => a.nome.localeCompare(b.nome)));
      setNovaDisc("");
    }
  }
  async function excluirDisc(id: string) {
    if (!confirm("Excluir esta disciplina do catálogo? (os materiais já ingeridos continuam)")) return;
    const r = await fetch(`/api/gestor/disciplinas?id=${id}`, { method: "DELETE" });
    if (r.ok) setDisciplinas((ds) => ds.filter((x) => x.id !== id));
  }

  const nomeDisciplina = (slug: string) => disciplinas.find((d) => d.slug === slug)?.nome ?? slug;

  // ------- modo estrito por turma (so gestor) -------
  const [estrito, setEstrito] = useState<Record<string, boolean>>(
    Object.fromEntries(turmas.map((t) => [t.id, Boolean(t.modoEstrito)])),
  );
  async function alternarEstrito(turmaId: string) {
    const ativo = !estrito[turmaId];
    setEstrito((e) => ({ ...e, [turmaId]: ativo }));
    const r = await fetch("/api/gestor/gestao", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ acao: "modo-estrito", turmaId, ativo }),
    });
    if (!r.ok) setEstrito((e) => ({ ...e, [turmaId]: !ativo })); // reverte em falha
  }

  return (
    <div className="space-y-8">
      {/* Upload */}
      <section className="cartao p-5">
        <h2 className="text-lg font-semibold text-grafite">Adicionar material (PDF)</h2>
        <p className="mt-1 text-sm text-slate-500">
          O conteúdo do PDF fica disponível para o tutor de IA <strong>apenas nas turmas selecionadas</strong>.
        </p>
        <form onSubmit={enviar} className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-grafite">Título</label>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} required placeholder="Ex.: Apostila de frações — cap. 3" className={inp} />
          </div>
          <div>
            <label className="block text-sm font-medium text-grafite">Disciplina</label>
            <select value={disciplina} onChange={(e) => setDisciplina(e.target.value)} className={inp}>
              {disciplinas.length === 0 && <option value="">— cadastre uma disciplina —</option>}
              {disciplinas.map((d) => <option key={d.id} value={d.slug}>{d.nome}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-grafite">Série / ano</label>
            <select value={ano} onChange={(e) => setAno(e.target.value)} className={inp}>
              {seriesDisponiveis.length === 0 && <option value="6o ano">6o ano</option>}
              {seriesDisponiveis.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-grafite">Tipo</label>
            <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={inp}>
              <option value="apostila">Apostila</option>
              <option value="livro">Livro didático</option>
              <option value="material">Material de apoio</option>
              <option value="prova">Prova / lista</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-grafite">Arquivo PDF (até 20 MB)</label>
            <input id="arquivo-pdf" type="file" accept="application/pdf,.pdf"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm" />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-grafite">Turmas que terão acesso a este conteúdo</label>
            {turmas.length === 0
              ? <p className="mt-1 text-sm text-slate-500">Nenhuma turma cadastrada ainda.</p>
              : (
                <div className="mt-2 flex flex-wrap gap-2">
                  {turmas.map((t) => (
                    <label key={t.id} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm ${turmasSel.includes(t.id) ? "border-[#3B2C63] bg-[#3B2C63]/5 text-grafite" : "border-slate-300 text-slate-600"}`}>
                      <input type="checkbox" checked={turmasSel.includes(t.id)} onChange={() => alternarTurma(t.id)} className="accent-[#3B2C63]" />
                      {t.nome} <span className="text-xs text-slate-400">({t.serie})</span>
                    </label>
                  ))}
                </div>
              )}
          </div>
          <div className="sm:col-span-2 flex items-center gap-3">
            <button className={btn} disabled={enviando}>{enviando ? "Processando PDF…" : "Enviar e ingerir"}</button>
            {msg && <p className="text-sm text-red-600">{msg}</p>}
            {ok && <p className="text-sm text-green-700">{ok}</p>}
          </div>
        </form>
      </section>

      {/* Lista de materiais */}
      <section className="cartao p-5">
        <h2 className="text-lg font-semibold text-grafite">Materiais cadastrados</h2>
        {materiais.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Nenhum material ainda. Envie um PDF acima.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                  <th className="py-2 pr-3">Título</th>
                  <th className="py-2 pr-3">Disciplina</th>
                  <th className="py-2 pr-3">Série</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Trechos</th>
                  <th className="py-2 pr-3">Turmas</th>
                  <th className="py-2 pr-3"></th>
                </tr>
              </thead>
              <tbody>
                {materiais.map((m) => (
                  <tr key={m.id} className="border-b border-slate-100 align-top">
                    <td className="py-2 pr-3 font-medium text-grafite">{m.titulo}</td>
                    <td className="py-2 pr-3">{nomeDisciplina(m.disciplina)}</td>
                    <td className="py-2 pr-3">{m.ano}</td>
                    <td className="py-2 pr-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CORES_STATUS[m.statusIngestao] ?? "bg-slate-100 text-slate-700"}`}>
                        {ROTULO_STATUS[m.statusIngestao] ?? m.statusIngestao}
                      </span>
                    </td>
                    <td className="py-2 pr-3">{m.trechos}</td>
                    <td className="py-2 pr-3">
                      {editando === m.id ? (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1.5">
                            {turmas.map((t) => (
                              <label key={t.id} className={`flex cursor-pointer items-center gap-1 rounded border px-2 py-0.5 text-xs ${turmasEdit.includes(t.id) ? "border-[#3B2C63] bg-[#3B2C63]/5" : "border-slate-300 text-slate-600"}`}>
                                <input type="checkbox" checked={turmasEdit.includes(t.id)}
                                  onChange={() => setTurmasEdit((a) => a.includes(t.id) ? a.filter((x) => x !== t.id) : [...a, t.id])}
                                  className="accent-[#3B2C63]" />
                                {t.nome}
                              </label>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => salvarTurmas(m.id)} className={btnGhost}>Salvar</button>
                            <button onClick={() => setEditando(null)} className={btnGhost}>Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {m.turmas.length === 0
                            ? <span className="text-xs text-slate-400">nenhuma</span>
                            : m.turmas.map((t) => <span key={t.id} className="rounded bg-slate-100 px-1.5 py-0.5 text-xs">{t.nome}</span>)}
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <div className="flex gap-2">
                        <button onClick={() => iniciarEdicao(m)} className={btnGhost}>Turmas</button>
                        <button onClick={() => excluir(m.id)} className={`${btnGhost} text-red-600`}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Modo estrito por turma (so gestor) */}
      {ehGestor && (
        <section className="cartao p-5">
          <h2 className="text-lg font-semibold text-grafite">Modo estrito por turma</h2>
          <p className="mt-1 text-sm text-slate-500">
            Com o modo estrito ligado, o tutor responde <strong>apenas</strong> com base no material vinculado à turma. Sem
            trecho no material, ele recusa e orienta procurar o professor (não usa BNCC nem conhecimento geral).
          </p>
          {turmas.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Nenhuma turma cadastrada.</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {turmas.map((t) => (
                <label key={t.id} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-1.5 text-sm ${estrito[t.id] ? "border-[#3B2C63] bg-[#3B2C63]/5 text-grafite" : "border-slate-300 text-slate-600"}`}>
                  <input type="checkbox" checked={Boolean(estrito[t.id])} onChange={() => alternarEstrito(t.id)} className="accent-[#3B2C63]" />
                  {t.nome} <span className="text-xs text-slate-400">({t.serie})</span>
                </label>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Disciplinas (so gestor) */}
      {ehGestor && (
        <section className="cartao p-5">
          <h2 className="text-lg font-semibold text-grafite">Disciplinas</h2>
          <p className="mt-1 text-sm text-slate-500">O nome vira um identificador sem acento usado nos materiais e no tutor.</p>
          <div className="mt-3 flex gap-2">
            <input value={novaDisc} onChange={(e) => setNovaDisc(e.target.value)} placeholder="Ex.: Ciências" className={`${inp} max-w-xs`} />
            <button onClick={criarDisc} className={btn} type="button">Adicionar</button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {disciplinas.map((d) => (
              <span key={d.id} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-1.5 text-sm">
                {d.nome} <span className="text-xs text-slate-400">{d.slug}</span>
                <button onClick={() => excluirDisc(d.id)} className="text-red-500 hover:text-red-700" title="Excluir" type="button">×</button>
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
