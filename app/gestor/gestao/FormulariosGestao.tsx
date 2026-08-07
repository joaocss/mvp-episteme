"use client";

import { useState } from "react";

interface Opcao { id: string; nome: string; }
interface DisciplinaOpcao { id: string; nome: string; slug: string }

async function enviar(dados: Record<string, unknown>): Promise<string | null> {
  const r = await fetch("/api/gestor/gestao", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(dados),
  });
  if (r.ok) return null;
  const d = await r.json().catch(() => ({}));
  return d.erro ?? "Erro ao salvar.";
}

function Cartao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-borda bg-superficie p-4 shadow-cartao">
      <h3 className="font-semibold text-grafite">{titulo}</h3>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

const inp = "campo";
const btn = "btn-primario w-full";

export default function FormulariosGestao({ turmas, professores, disciplinas }: {
  turmas: Opcao[]; professores: Opcao[]; disciplinas: DisciplinaOpcao[];
}) {
  const [msg, setMsg] = useState("");

  async function criarDisciplina(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg("");
    const fd = new FormData(e.currentTarget);
    const r = await fetch("/api/gestor/disciplinas", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nome: fd.get("nome") }),
    });
    if (!r.ok) { const d = await r.json().catch(() => ({})); setMsg(d.erro ?? "Erro ao criar disciplina."); return; }
    window.location.reload();
  }

  function useForm(construir: (fd: FormData) => Record<string, unknown>) {
    return async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      setMsg("");
      const fd = new FormData(e.currentTarget);
      const erro = await enviar(construir(fd));
      if (erro) { setMsg(erro); return; }
      window.location.reload();
    };
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {msg && <p className="sm:col-span-2 text-sm text-red-600">{msg}</p>}

      <Cartao titulo="Nova turma">
        <form onSubmit={useForm((fd) => ({ acao: "turma", nome: fd.get("nome"), serie: fd.get("serie"), anoLetivo: fd.get("ano") }))} className="space-y-2">
          <input name="nome" placeholder="Nome (ex.: 6º B)" required className={inp} />
          <input name="serie" placeholder="Série (ex.: 6o ano)" defaultValue="6o ano" required className={inp} />
          <input name="ano" type="number" placeholder="Ano letivo" defaultValue="2026" className={inp} />
          <button className={btn}>Criar turma</button>
        </form>
      </Cartao>

      <Cartao titulo="Nova disciplina">
        <p className="-mt-1 text-xs text-slate-500">Serve para qualquer curso — fundamental, médio, técnico ou superior.</p>
        <form onSubmit={criarDisciplina} className="space-y-2">
          <input name="nome" placeholder="Ex.: Contabilidade, Biologia, Redação…" required className={inp} />
          <button className={btn}>Criar disciplina</button>
        </form>
        {disciplinas.length > 0 && (
          <p className="text-xs text-slate-500">Já cadastradas: {disciplinas.map((d) => d.nome).join(", ")}.</p>
        )}
      </Cartao>

      <Cartao titulo="Vincular professor a disciplina da turma">
        <p className="-mt-1 text-xs text-slate-500">O professor passa a lecionar essa disciplina na turma; os alunos da turma a herdam.</p>
        <form onSubmit={useForm((fd) => ({
          acao: "vinculo", professorId: fd.get("professorId"), turmaId: fd.get("turmaId"), disciplina: fd.get("disciplina"),
        }))} className="space-y-2">
          <select name="professorId" required className={inp}>
            <option value="">Professor…</option>
            {professores.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
          </select>
          <select name="turmaId" required className={inp}>
            <option value="">Turma…</option>
            {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
          <select name="disciplina" required defaultValue="" className={inp}>
            <option value="" disabled>Disciplina…</option>
            {disciplinas.length === 0 && <option value="" disabled>— cadastre uma disciplina primeiro —</option>}
            {disciplinas.map((d) => <option key={d.id} value={d.slug}>{d.nome}</option>)}
          </select>
          <button className={btn}>Vincular</button>
        </form>
      </Cartao>

      <Cartao titulo="Novo professor">
        <p className="-mt-1 text-xs text-slate-500">Crie o professor e depois vincule-o às disciplinas/turmas no card ao lado. Um professor pode lecionar várias disciplinas.</p>
        <form onSubmit={useForm((fd) => ({ acao: "professor", nome: fd.get("nome"), email: fd.get("email"), senha: fd.get("senha") }))} className="space-y-2">
          <input name="nome" placeholder="Nome" required className={inp} />
          <input name="email" type="email" placeholder="Email" required className={inp} />
          <input name="senha" type="text" placeholder="Senha inicial" required className={inp} />
          <button className={btn}>Criar professor</button>
        </form>
      </Cartao>

      <Cartao titulo="Novo aluno">
        <form onSubmit={useForm((fd) => ({
          acao: "aluno", nome: fd.get("nome"), email: fd.get("email"), senha: fd.get("senha"),
          turmaId: fd.get("turmaId") || undefined, dataNascimento: fd.get("dataNascimento") || undefined,
          enderecoFamilia: fd.get("enderecoFamilia") || undefined, estadoCivilPais: fd.get("estadoCivilPais") || undefined,
          paisMoramJuntos: fd.get("paisMoramJuntos") === "" ? undefined : fd.get("paisMoramJuntos") === "sim",
        }))} className="space-y-2">
          <input name="nome" placeholder="Nome" required className={inp} />
          <input name="email" type="email" placeholder="Email" required className={inp} />
          <input name="senha" type="text" placeholder="Senha inicial" required className={inp} />
          <input name="dataNascimento" type="date" className={inp} />
          <select name="turmaId" className={inp}>
            <option value="">Matricular em turma (opcional)…</option>
            {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
          <input name="enderecoFamilia" placeholder="Endereço da família (opcional)" className={inp} />
          <select name="estadoCivilPais" defaultValue="" className={inp}>
            <option value="">Estado civil dos pais (opcional)…</option>
            <option value="casados">Casados</option>
            <option value="uniao estavel">União estável</option>
            <option value="divorciados">Divorciados</option>
            <option value="separados">Separados</option>
            <option value="viuvo(a)">Viúvo(a)</option>
            <option value="solteiro(a)">Solteiro(a)</option>
          </select>
          <select name="paisMoramJuntos" defaultValue="" className={inp}>
            <option value="">Pais moram juntos? (opcional)…</option>
            <option value="sim">Sim</option>
            <option value="nao">Não</option>
          </select>
          <button className={btn}>Criar aluno</button>
        </form>
      </Cartao>
    </div>
  );
}
