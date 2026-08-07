"use client";

// Tabelas filtraveis de turmas, professores e alunos, com editar e excluir.
// Reaproveita a rota /api/gestor/gestao (acoes editar-*/excluir-*).
import { Fragment, useMemo, useState } from "react";
import { Botao } from "../../componentes/ui/Botao";
import { Selo } from "../../componentes/ui/Selo";
import PainelInclusao from "./PainelInclusao";

interface Turma { id: string; nome: string; serie: string; anoLetivo: number; alunos: number; }
interface Professor { id: string; nome: string; email: string; disciplinas: string | null; turmas: number; }
interface Aluno {
  id: string; nome: string; email: string; turma: string | null; turmaId: string | null; dataNascimento: string | null;
  enderecoFamilia: string | null; estadoCivilPais: string | null; paisMoramJuntos: boolean | null;
  atipico: boolean; observacoesAtipicidade: string | null;
}
interface Opcao { id: string; nome: string; }
interface Responsavel { id: string; nome: string; parentesco: string; telefone: string | null; email: string | null; }

async function postar(dados: Record<string, unknown>): Promise<string | null> {
  const r = await fetch("/api/gestor/gestao", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(dados),
  });
  if (r.ok) return null;
  const d = await r.json().catch(() => ({}));
  return d.erro ?? "Erro ao salvar.";
}

const inp = "w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-roxo-claro";

function BuscaFiltro({ valor, aoMudar, dica }: { valor: string; aoMudar: (v: string) => void; dica: string }) {
  return (
    <input value={valor} onChange={(e) => aoMudar(e.target.value)} placeholder={dica}
      className="mb-3 w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-roxo-claro" />
  );
}

async function acao(dados: Record<string, unknown>, aoErro: (m: string) => void) {
  const erro = await postar(dados);
  if (erro) { aoErro(erro); return; }
  window.location.reload();
}

function PainelResponsaveis({ alunoId }: { alunoId: string }) {
  const [lista, setLista] = useState<Responsavel[] | null>(null);
  const [msg, setMsg] = useState("");

  async function carregar() {
    const r = await fetch(`/api/gestor/gestao?alunoId=${alunoId}`);
    const d = await r.json().catch(() => ({}));
    setLista(d.responsaveis ?? []);
  }
  if (lista === null) { carregar(); return <p className="p-3 text-sm text-slate-400">Carregando…</p>; }

  async function adicionar(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const erro = await postar({
      acao: "responsavel", alunoId, nome: fd.get("nome"), parentesco: fd.get("parentesco"),
      telefone: fd.get("telefone"), email: fd.get("email"),
    });
    if (erro) { setMsg(erro); return; }
    (e.target as HTMLFormElement).reset();
    setLista(null);
  }

  async function excluir(id: string) {
    if (!window.confirm("Excluir este responsável?")) return;
    const erro = await postar({ acao: "excluir-responsavel", id });
    if (erro) { setMsg(erro); return; }
    setLista(null);
  }

  return (
    <div className="space-y-2 p-3">
      {msg && <p className="text-sm text-alerta">{msg}</p>}
      {lista.length === 0 && <p className="text-sm text-slate-400">Nenhum responsável cadastrado.</p>}
      {lista.map((r) => (
        <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-200 bg-white p-2 text-sm">
          <span><strong>{r.nome}</strong> ({r.parentesco}) — {r.telefone || "sem telefone"} — {r.email || "sem email"}</span>
          <Botao tamanho="pequeno" variante="perigo" onClick={() => excluir(r.id)}>Remover</Botao>
        </div>
      ))}
      <form onSubmit={adicionar} className="flex flex-wrap gap-2 pt-1">
        <input name="nome" placeholder="Nome do responsável" required className={inp + " max-w-[160px]"} />
        <select name="parentesco" required className={inp + " max-w-[130px]"}>
          <option value="">Parentesco…</option>
          <option value="mae">Mãe</option>
          <option value="pai">Pai</option>
          <option value="avo">Avô/Avó</option>
          <option value="tutor legal">Tutor legal</option>
          <option value="outro">Outro</option>
        </select>
        <input name="telefone" placeholder="Telefone" className={inp + " max-w-[140px]"} />
        <input name="email" type="email" placeholder="Email" className={inp + " max-w-[160px]"} />
        <Botao tamanho="pequeno">Adicionar</Botao>
      </form>
    </div>
  );
}

export default function TabelasGestao({ turmas, professores, alunos, turmasOpcoes }: {
  turmas: Turma[]; professores: Professor[]; alunos: Aluno[]; turmasOpcoes: Opcao[];
}) {
  const [msg, setMsg] = useState("");
  const [fTurma, setFTurma] = useState("");
  const [fProf, setFProf] = useState("");
  const [fAluno, setFAluno] = useState("");
  const [editando, setEditando] = useState<string | null>(null);
  const [familiaAberta, setFamiliaAberta] = useState<string | null>(null);
  const [inclusaoAberta, setInclusaoAberta] = useState<string | null>(null);

  const erro = (m: string) => setMsg(m);
  function excluir(dados: Record<string, unknown>, aviso: string) {
    if (!window.confirm(aviso)) return;
    setMsg("");
    acao(dados, erro);
  }

  const turmasF = useMemo(
    () => turmas.filter((t) => `${t.nome} ${t.serie}`.toLowerCase().includes(fTurma.toLowerCase())),
    [turmas, fTurma],
  );
  const profsF = useMemo(
    () => professores.filter((p) => `${p.nome} ${p.email} ${p.disciplinas ?? ""}`.toLowerCase().includes(fProf.toLowerCase())),
    [professores, fProf],
  );
  const alunosF = useMemo(
    () => alunos.filter((a) => `${a.nome} ${a.email} ${a.turma ?? ""}`.toLowerCase().includes(fAluno.toLowerCase())),
    [alunos, fAluno],
  );

  return (
    <div className="space-y-10">
      {msg && <p className="text-sm text-alerta" role="alert">{msg}</p>}

      {/* ---------------- TURMAS ---------------- */}
      <section>
        <h2 className="mb-2 font-semibold text-grafite">Turmas ({turmasF.length})</h2>
        <BuscaFiltro valor={fTurma} aoMudar={setFTurma} dica="Filtrar turmas…" />
        <div className="overflow-x-auto cartao">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr><th className="p-3">Nome</th><th className="p-3">Série</th><th className="p-3">Ano</th><th className="p-3">Alunos</th><th className="p-3 text-right">Ações</th></tr>
            </thead>
            <tbody>
              {turmasF.map((t) => (
                editando === `turma-${t.id}` ? (
                  <tr key={t.id} className="border-b border-slate-100 bg-creme/50">
                    <td className="p-2"><input id={`t-nome-${t.id}`} defaultValue={t.nome} className={inp} /></td>
                    <td className="p-2"><input id={`t-serie-${t.id}`} defaultValue={t.serie} className={inp} /></td>
                    <td className="p-2"><input id={`t-ano-${t.id}`} type="number" defaultValue={t.anoLetivo} className={inp} /></td>
                    <td className="p-2 text-slate-400">{t.alunos}</td>
                    <td className="p-2">
                      <div className="flex justify-end gap-2">
                        <Botao tamanho="pequeno" onClick={() => acao({
                          acao: "editar-turma", id: t.id,
                          nome: (document.getElementById(`t-nome-${t.id}`) as HTMLInputElement).value,
                          serie: (document.getElementById(`t-serie-${t.id}`) as HTMLInputElement).value,
                          anoLetivo: (document.getElementById(`t-ano-${t.id}`) as HTMLInputElement).value,
                        }, erro)}>Salvar</Botao>
                        <Botao tamanho="pequeno" variante="fantasma" onClick={() => setEditando(null)}>Cancelar</Botao>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={t.id} className="border-b border-slate-100">
                    <td className="p-3 font-medium text-grafite">{t.nome}</td>
                    <td className="p-3">{t.serie}</td>
                    <td className="p-3">{t.anoLetivo}</td>
                    <td className="p-3">{t.alunos}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <Botao tamanho="pequeno" variante="secundario" onClick={() => setEditando(`turma-${t.id}`)}>Editar</Botao>
                        <Botao tamanho="pequeno" variante="perigo" onClick={() => excluir(
                          { acao: "excluir-turma", id: t.id },
                          `Excluir a turma "${t.nome}"? Matrículas e vínculos serão removidos.`,
                        )}>Excluir</Botao>
                      </div>
                    </td>
                  </tr>
                )
              ))}
              {turmasF.length === 0 && <tr><td colSpan={5} className="p-3 text-slate-400">Nenhuma turma.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------------- PROFESSORES ---------------- */}
      <section>
        <h2 className="mb-2 font-semibold text-grafite">Professores ({profsF.length})</h2>
        <BuscaFiltro valor={fProf} aoMudar={setFProf} dica="Filtrar professores…" />
        <div className="overflow-x-auto cartao">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr><th className="p-3">Nome</th><th className="p-3">Email</th><th className="p-3">Disciplinas</th><th className="p-3">Turmas</th><th className="p-3 text-right">Ações</th></tr>
            </thead>
            <tbody>
              {profsF.map((p) => (
                editando === `prof-${p.id}` ? (
                  <tr key={p.id} className="border-b border-slate-100 bg-creme/50">
                    <td className="p-2"><input id={`p-nome-${p.id}`} defaultValue={p.nome} className={inp} /></td>
                    <td className="p-2"><input id={`p-email-${p.id}`} defaultValue={p.email} className={inp} /></td>
                    <td className="p-2"><input id={`p-disc-${p.id}`} defaultValue={p.disciplinas ?? ""} placeholder="Ex.: Matemática" className={inp} /></td>
                    <td className="p-2 text-slate-400">{p.turmas}</td>
                    <td className="p-2">
                      <div className="flex justify-end gap-2">
                        <Botao tamanho="pequeno" onClick={() => acao({
                          acao: "editar-usuario", id: p.id, papel: "professor",
                          nome: (document.getElementById(`p-nome-${p.id}`) as HTMLInputElement).value,
                          email: (document.getElementById(`p-email-${p.id}`) as HTMLInputElement).value,
                          disciplinas: (document.getElementById(`p-disc-${p.id}`) as HTMLInputElement).value,
                        }, erro)}>Salvar</Botao>
                        <Botao tamanho="pequeno" variante="fantasma" onClick={() => setEditando(null)}>Cancelar</Botao>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={p.id} className="border-b border-slate-100">
                    <td className="p-3 font-medium text-grafite">{p.nome}</td>
                    <td className="p-3">{p.email}</td>
                    <td className="p-3">{p.disciplinas ?? "—"}</td>
                    <td className="p-3">{p.turmas}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <Botao tamanho="pequeno" variante="secundario" onClick={() => setEditando(`prof-${p.id}`)}>Editar</Botao>
                        <Botao tamanho="pequeno" variante="perigo" onClick={() => excluir(
                          { acao: "excluir-usuario", id: p.id },
                          `Excluir o professor "${p.nome}"?`,
                        )}>Excluir</Botao>
                      </div>
                    </td>
                  </tr>
                )
              ))}
              {profsF.length === 0 && <tr><td colSpan={5} className="p-3 text-slate-400">Nenhum professor.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------------- ALUNOS ---------------- */}
      <section>
        <h2 className="mb-2 font-semibold text-grafite">Alunos ({alunosF.length})</h2>
        <BuscaFiltro valor={fAluno} aoMudar={setFAluno} dica="Filtrar alunos…" />
        <div className="overflow-x-auto cartao">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 text-slate-500">
              <tr><th className="p-3">Nome</th><th className="p-3">Email</th><th className="p-3">Nascimento</th><th className="p-3">Turma</th><th className="p-3 text-right">Ações</th></tr>
            </thead>
            <tbody>
              {alunosF.map((a) => (
                <Fragment key={a.id}>
                {editando === `aluno-${a.id}` ? (
                  <tr key={a.id} className="border-b border-slate-100 bg-creme/50 align-top">
                    <td className="p-2"><input id={`a-nome-${a.id}`} defaultValue={a.nome} className={inp} /></td>
                    <td className="p-2"><input id={`a-email-${a.id}`} defaultValue={a.email} className={inp} /></td>
                    <td className="p-2"><input id={`a-nasc-${a.id}`} type="date" defaultValue={a.dataNascimento ?? ""} className={inp} /></td>
                    <td className="p-2 space-y-1">
                      <select id={`a-turma-${a.id}`} defaultValue={a.turmaId ?? ""} className={inp}>
                        <option value="">Sem turma</option>
                        {turmasOpcoes.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                      </select>
                      <input id={`a-endereco-${a.id}`} defaultValue={a.enderecoFamilia ?? ""} placeholder="Endereço da família" className={inp} />
                      <select id={`a-estadocivil-${a.id}`} defaultValue={a.estadoCivilPais ?? ""} className={inp}>
                        <option value="">Estado civil dos pais…</option>
                        <option value="casados">Casados</option>
                        <option value="uniao estavel">União estável</option>
                        <option value="divorciados">Divorciados</option>
                        <option value="separados">Separados</option>
                        <option value="viuvo(a)">Viúvo(a)</option>
                        <option value="solteiro(a)">Solteiro(a)</option>
                      </select>
                      <select id={`a-juntos-${a.id}`} defaultValue={a.paisMoramJuntos === null ? "" : a.paisMoramJuntos ? "sim" : "nao"} className={inp}>
                        <option value="">Pais moram juntos?…</option>
                        <option value="sim">Sim</option>
                        <option value="nao">Não</option>
                      </select>
                    </td>
                    <td className="p-2">
                      <div className="flex justify-end gap-2">
                        <Botao tamanho="pequeno" onClick={() => {
                          const juntos = (document.getElementById(`a-juntos-${a.id}`) as HTMLSelectElement).value;
                          acao({
                            acao: "editar-usuario", id: a.id, papel: "aluno",
                            nome: (document.getElementById(`a-nome-${a.id}`) as HTMLInputElement).value,
                            email: (document.getElementById(`a-email-${a.id}`) as HTMLInputElement).value,
                            dataNascimento: (document.getElementById(`a-nasc-${a.id}`) as HTMLInputElement).value || null,
                            turmaId: (document.getElementById(`a-turma-${a.id}`) as HTMLSelectElement).value || null,
                            enderecoFamilia: (document.getElementById(`a-endereco-${a.id}`) as HTMLInputElement).value || null,
                            estadoCivilPais: (document.getElementById(`a-estadocivil-${a.id}`) as HTMLSelectElement).value || null,
                            paisMoramJuntos: juntos === "" ? null : juntos === "sim",
                          }, erro);
                        }}>Salvar</Botao>
                        <Botao tamanho="pequeno" variante="fantasma" onClick={() => setEditando(null)}>Cancelar</Botao>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={a.id} className="border-b border-slate-100">
                    <td className="p-3 font-medium text-grafite">
                      <span className="flex items-center gap-2">{a.nome}{a.atipico && <Selo cor="dourado">atípico</Selo>}</span>
                    </td>
                    <td className="p-3">{a.email}</td>
                    <td className="p-3">{a.dataNascimento ? new Date(a.dataNascimento).toLocaleDateString("pt-BR") : "—"}</td>
                    <td className="p-3">{a.turma ?? "sem turma"}</td>
                    <td className="p-3">
                      <div className="flex justify-end gap-2">
                        <Botao tamanho="pequeno" variante="secundario" onClick={() => setInclusaoAberta(inclusaoAberta === a.id ? null : a.id)}>
                          {inclusaoAberta === a.id ? "Fechar inclusão" : "Inclusão"}
                        </Botao>
                        <Botao tamanho="pequeno" variante="secundario" onClick={() => setFamiliaAberta(familiaAberta === a.id ? null : a.id)}>
                          {familiaAberta === a.id ? "Fechar família" : "Família"}
                        </Botao>
                        <Botao tamanho="pequeno" variante="secundario" onClick={() => setEditando(`aluno-${a.id}`)}>Editar</Botao>
                        <Botao tamanho="pequeno" variante="perigo" onClick={() => excluir(
                          { acao: "excluir-usuario", id: a.id },
                          `Excluir o aluno "${a.nome}"? Conversas e histórico serão removidos.`,
                        )}>Excluir</Botao>
                      </div>
                    </td>
                  </tr>
                )}
                {inclusaoAberta === a.id && (
                  <tr key={`${a.id}-inclusao`} className="border-b border-slate-100 bg-slate-50">
                    <td colSpan={5} className="p-2">
                      <PainelInclusao alunoId={a.id} atipicoInicial={a.atipico} observacoesInicial={a.observacoesAtipicidade} />
                    </td>
                  </tr>
                )}
                {familiaAberta === a.id && (
                  <tr key={`${a.id}-familia`} className="border-b border-slate-100 bg-slate-50">
                    <td colSpan={5}>
                      <div className="px-2 pb-1 text-xs text-slate-500">
                        Endereço: {a.enderecoFamilia ?? "não informado"} · Estado civil dos pais: {a.estadoCivilPais ?? "não informado"}
                        {a.paisMoramJuntos !== null && ` · Moram juntos: ${a.paisMoramJuntos ? "sim" : "não"}`}
                      </div>
                      <PainelResponsaveis alunoId={a.id} />
                    </td>
                  </tr>
                )}
                </Fragment>
              ))}
              {alunosF.length === 0 && <tr><td colSpan={5} className="p-3 text-slate-400">Nenhum aluno.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
