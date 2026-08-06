"use client";

// Gestao de materiais-fonte (PDF) — usada pelo diretor e pelo professor.
// Upload de PDF vinculado a uma ou mais turmas + disciplina; a ingestao (extrair
// texto -> chunk -> embeddings) roda no servidor. Lista os materiais com status,
// numero de trechos e turmas. O gestor tambem gerencia o catalogo de disciplinas
// e o modo estrito por turma. Visual 100% sobre os tokens da marca (Cartao,
// Botao, Campo, Selo) — sem hex hardcoded.
import { useState } from "react";
import { cn } from "../../lib/utils";
import { Cartao } from "./ui/Cartao";
import { Botao } from "./ui/Botao";
import { GrupoCampo, Entrada, Selecao } from "./ui/Campo";
import { Selo, variantesSelo } from "./ui/Selo";
import { Icone } from "./ui/Icone";
import { EstadoVazio } from "./ui/EstadoVazio";
import type { VariantProps } from "class-variance-authority";

type CorSelo = NonNullable<VariantProps<typeof variantesSelo>["cor"]>;

export interface TurmaOpcao { id: string; nome: string; serie: string; modoEstrito?: boolean }
export interface DisciplinaOpcao { id: string; nome: string; slug: string }
export interface Material {
  id: string; tipo: string; disciplina: string; ano: string; titulo: string;
  referencia: string | null; statusIngestao: string; trechos: number;
  turmas: { id: string; nome: string }[]; criadoEm: string;
}

const COR_STATUS: Record<string, CorSelo> = {
  concluido: "sucesso", processando: "aviso", pendente: "neutro", erro: "alerta",
};
const ROTULO_STATUS: Record<string, string> = {
  concluido: "Ingerido", processando: "Processando", pendente: "Pendente", erro: "Falhou",
};

// Chip selecionavel de turma, reusado no upload e na edicao de vinculos.
function ChipTurma({
  ativo, onClick, children, pequeno,
}: { ativo: boolean; onClick: () => void; children: React.ReactNode; pequeno?: boolean }) {
  return (
    <label
      onClick={onClick}
      className={cn(
        "flex cursor-pointer select-none items-center gap-2 rounded-lg border transition",
        pequeno ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
        ativo
          ? "border-roxo bg-roxo-suave text-roxo"
          : "border-borda text-slate-600 hover:border-roxo/40",
      )}
    >
      <span
        className={cn(
          "inline-flex h-4 w-4 items-center justify-center rounded border",
          ativo ? "border-roxo bg-roxo text-white" : "border-slate-300",
        )}
      >
        {ativo && <Icone nome="verificado" className="h-3 w-3" />}
      </span>
      {children}
    </label>
  );
}

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
      setOk(`"${titulo}" ingerido: ${d.trechos} trechos de ${d.paginas} paginas.`);
      setTitulo(""); setArquivo(null); setTurmasSel([]);
      const input = document.getElementById("arquivo-pdf") as HTMLInputElement | null;
      if (input) input.value = "";
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
    if (!confirm("Excluir esta disciplina do catalogo? (os materiais ja ingeridos continuam)")) return;
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
    <div className="space-y-6">
      {/* Upload */}
      <Cartao className="p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-roxo-suave text-roxo">
            <Icone nome="upload" className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-grafite">Adicionar material (PDF)</h2>
            <p className="text-sm text-slate-500">
              O conteudo fica disponivel para o tutor de IA <strong>apenas nas turmas selecionadas</strong>.
            </p>
          </div>
        </div>

        <form onSubmit={enviar} className="mt-5 grid gap-4 sm:grid-cols-2">
          <GrupoCampo rotulo="Titulo" className="sm:col-span-2">
            <Entrada value={titulo} onChange={(e) => setTitulo(e.target.value)} required
              placeholder="Ex.: Apostila de fracoes — cap. 3" />
          </GrupoCampo>
          <GrupoCampo rotulo="Disciplina">
            <Selecao value={disciplina} onChange={(e) => setDisciplina(e.target.value)}>
              {disciplinas.length === 0 && <option value="">— cadastre uma disciplina —</option>}
              {disciplinas.map((d) => <option key={d.id} value={d.slug}>{d.nome}</option>)}
            </Selecao>
          </GrupoCampo>
          <GrupoCampo rotulo="Serie / ano">
            <Selecao value={ano} onChange={(e) => setAno(e.target.value)}>
              {seriesDisponiveis.length === 0 && <option value="6o ano">6o ano</option>}
              {seriesDisponiveis.map((s) => <option key={s} value={s}>{s}</option>)}
            </Selecao>
          </GrupoCampo>
          <GrupoCampo rotulo="Tipo">
            <Selecao value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="apostila">Apostila</option>
              <option value="livro">Livro didatico</option>
              <option value="material">Material de apoio</option>
              <option value="prova">Prova / lista</option>
            </Selecao>
          </GrupoCampo>
          <GrupoCampo rotulo="Arquivo PDF (ate 20 MB)" dica="PDF com texto selecionavel (nao escaneado como imagem).">
            <input id="arquivo-pdf" type="file" accept="application/pdf,.pdf"
              onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
              className="block w-full cursor-pointer rounded-lg border border-borda text-sm text-slate-600 file:mr-3 file:cursor-pointer file:border-0 file:bg-roxo-suave file:px-4 file:py-2.5 file:text-sm file:font-medium file:text-roxo hover:file:bg-roxo/15" />
          </GrupoCampo>
          <div className="sm:col-span-2">
            <p className="rotulo-campo mb-1.5">Turmas que terao acesso a este conteudo</p>
            {turmas.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma turma cadastrada ainda.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {turmas.map((t) => (
                  <ChipTurma key={t.id} ativo={turmasSel.includes(t.id)} onClick={() => alternarTurma(t.id)}>
                    {t.nome} <span className="text-xs text-slate-400">({t.serie})</span>
                  </ChipTurma>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <Botao disabled={enviando}>
              {enviando ? "Processando PDF…" : "Enviar e ingerir"}
            </Botao>
            {msg && <p className="text-sm text-alerta">{msg}</p>}
            {ok && <p className="text-sm text-sucesso">{ok}</p>}
          </div>
        </form>
      </Cartao>

      {/* Lista de materiais */}
      <Cartao className="p-5 sm:p-6">
        <h2 className="text-lg font-semibold text-grafite">Materiais cadastrados</h2>
        {materiais.length === 0 ? (
          <div className="mt-4">
            <EstadoVazio titulo="Nenhum material ainda" descricao="Envie um PDF acima para o tutor usar como fonte." />
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-borda text-left text-xs uppercase tracking-wide text-slate-400">
                  <th className="py-2.5 pr-3 font-medium">Titulo</th>
                  <th className="py-2.5 pr-3 font-medium">Disciplina</th>
                  <th className="py-2.5 pr-3 font-medium">Serie</th>
                  <th className="py-2.5 pr-3 font-medium">Status</th>
                  <th className="py-2.5 pr-3 font-medium">Trechos</th>
                  <th className="py-2.5 pr-3 font-medium">Turmas</th>
                  <th className="py-2.5 pr-3"></th>
                </tr>
              </thead>
              <tbody>
                {materiais.map((m) => (
                  <tr key={m.id} className="border-b border-borda/70 align-top">
                    <td className="py-3 pr-3 font-medium text-grafite">{m.titulo}</td>
                    <td className="py-3 pr-3 text-slate-600">{nomeDisciplina(m.disciplina)}</td>
                    <td className="py-3 pr-3 text-slate-600">{m.ano}</td>
                    <td className="py-3 pr-3">
                      <Selo cor={COR_STATUS[m.statusIngestao] ?? "neutro"}>
                        {ROTULO_STATUS[m.statusIngestao] ?? m.statusIngestao}
                      </Selo>
                    </td>
                    <td className="py-3 pr-3 tabular-nums text-slate-600">{m.trechos}</td>
                    <td className="py-3 pr-3">
                      {editando === m.id ? (
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1.5">
                            {turmas.map((t) => (
                              <ChipTurma key={t.id} pequeno ativo={turmasEdit.includes(t.id)}
                                onClick={() => setTurmasEdit((a) => a.includes(t.id) ? a.filter((x) => x !== t.id) : [...a, t.id])}>
                                {t.nome}
                              </ChipTurma>
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <Botao tamanho="pequeno" onClick={() => salvarTurmas(m.id)}>Salvar</Botao>
                            <Botao tamanho="pequeno" variante="secundario" onClick={() => setEditando(null)}>Cancelar</Botao>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {m.turmas.length === 0
                            ? <span className="text-xs text-slate-400">nenhuma</span>
                            : m.turmas.map((t) => <Selo key={t.id} cor="roxo">{t.nome}</Selo>)}
                        </div>
                      )}
                    </td>
                    <td className="py-3 pr-1">
                      <div className="flex justify-end gap-1.5">
                        <Botao tamanho="pequeno" variante="secundario" onClick={() => iniciarEdicao(m)}>Turmas</Botao>
                        <Botao tamanho="pequeno" variante="fantasma" className="text-alerta hover:bg-red-50"
                          onClick={() => excluir(m.id)} aria-label={`Excluir ${m.titulo}`}>
                          <Icone nome="lixeira" className="h-4 w-4" />
                        </Botao>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Cartao>

      {/* Modo estrito por turma (so gestor) */}
      {ehGestor && (
        <Cartao className="p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-grafite">Modo estrito por turma</h2>
          <p className="mt-1 text-sm text-slate-500">
            Com o modo estrito ligado, o tutor responde <strong>apenas</strong> com base no material vinculado a turma. Sem
            trecho no material, ele recusa e orienta procurar o professor (nao usa BNCC nem conhecimento geral).
          </p>
          {turmas.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Nenhuma turma cadastrada.</p>
          ) : (
            <div className="mt-4 flex flex-wrap gap-2">
              {turmas.map((t) => (
                <ChipTurma key={t.id} ativo={Boolean(estrito[t.id])} onClick={() => alternarEstrito(t.id)}>
                  {t.nome} <span className="text-xs text-slate-400">({t.serie})</span>
                </ChipTurma>
              ))}
            </div>
          )}
        </Cartao>
      )}

      {/* Disciplinas (so gestor) */}
      {ehGestor && (
        <Cartao className="p-5 sm:p-6">
          <h2 className="text-lg font-semibold text-grafite">Disciplinas</h2>
          <p className="mt-1 text-sm text-slate-500">O nome vira um identificador sem acento usado nos materiais e no tutor.</p>
          <div className="mt-4 flex gap-2">
            <Entrada value={novaDisc} onChange={(e) => setNovaDisc(e.target.value)} placeholder="Ex.: Ciencias" className="max-w-xs" />
            <Botao onClick={criarDisc} type="button">Adicionar</Botao>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {disciplinas.map((d) => (
              <span key={d.id} className="flex items-center gap-2 rounded-lg border border-borda px-3 py-1.5 text-sm text-grafite">
                {d.nome} <span className="text-xs text-slate-400">{d.slug}</span>
                <button onClick={() => excluirDisc(d.id)} className="text-slate-400 transition hover:text-alerta"
                  title="Excluir" type="button" aria-label={`Excluir disciplina ${d.nome}`}>
                  <Icone nome="fechar" className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        </Cartao>
      )}
    </div>
  );
}
