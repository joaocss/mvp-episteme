"use client";

import { useState } from "react";

interface Opcao { id: string; nome: string; }

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
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="font-semibold text-slate-800">{titulo}</h3>
      <div className="mt-3 space-y-2">{children}</div>
    </div>
  );
}

const inp = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#7a6aa5]";
const btn = "rounded-md bg-[#3B2C63] px-3 py-2 text-sm font-medium text-white hover:bg-[#2f2350] disabled:opacity-50";

export default function FormulariosGestao({ turmas, professores }: { turmas: Opcao[]; professores: Opcao[] }) {
  const [msg, setMsg] = useState("");

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

      <Cartao titulo="Vincular professor a turma">
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
          <select name="disciplina" defaultValue="matematica" required className={inp}>
            <option value="matematica">Matemática</option>
            <option value="portugues">Língua Portuguesa</option>
            <option value="historia">História</option>
          </select>
          <button className={btn}>Vincular</button>
        </form>
      </Cartao>

      <Cartao titulo="Novo professor">
        <form onSubmit={useForm((fd) => ({ acao: "professor", nome: fd.get("nome"), email: fd.get("email"), senha: fd.get("senha"), turmaId: fd.get("turmaId") || undefined }))} className="space-y-2">
          <input name="nome" placeholder="Nome" required className={inp} />
          <input name="email" type="email" placeholder="Email" required className={inp} />
          <input name="senha" type="text" placeholder="Senha inicial" required className={inp} />
          <select name="turmaId" className={inp}>
            <option value="">Vincular a turma (opcional)…</option>
            {turmas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </select>
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
