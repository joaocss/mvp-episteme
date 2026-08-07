"use client";

// Visao da estrutura academica: por TURMA, quais disciplinas ela tem e quem
// leciona cada uma. Os alunos matriculados na turma herdam essas disciplinas e
// professores. O gestor pode desvincular um professor de uma disciplina aqui.
import { Cartao } from "../../componentes/ui/Cartao";
import { Selo } from "../../componentes/ui/Selo";
import { Icone } from "../../componentes/ui/Icone";
import { EstadoVazio } from "../../componentes/ui/EstadoVazio";

interface DisciplinaDaTurma { disciplina: string; professorId: string | null; professorNome: string | null }
interface EstruturaTurma { turmaId: string; turma: string; serie: string; alunos: number; disciplinas: DisciplinaDaTurma[] }

export default function EstruturaAcademica({
  estrutura, nomeDisciplina,
}: {
  estrutura: EstruturaTurma[];
  disciplinas: { slug: string; nome: string }[];
  nomeDisciplina: Record<string, string>;
}) {
  async function desvincular(turmaId: string, professorId: string, disciplina: string) {
    if (!confirm("Remover este professor desta disciplina na turma?")) return;
    const r = await fetch("/api/gestor/gestao", {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ acao: "desvincular", professorId, turmaId, disciplina }),
    });
    if (r.ok) window.location.reload();
  }

  const disc = (slug: string) => nomeDisciplina[slug] ?? slug;

  if (estrutura.length === 0) {
    return <EstadoVazio icone="cadastros" titulo="Nenhuma turma ainda" descricao="Crie turmas e vincule disciplinas/professores acima." />;
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {estrutura.map((t) => (
        <Cartao key={t.turmaId} className="p-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="font-semibold text-grafite">{t.turma}</h3>
              <p className="text-xs text-slate-500">{t.serie} · {t.alunos} aluno(s)</p>
            </div>
            <Selo cor="neutro">{t.disciplinas.length} disciplina(s)</Selo>
          </div>
          {t.disciplinas.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">Sem disciplinas vinculadas. Use &quot;Vincular professor a disciplina da turma&quot; acima.</p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {t.disciplinas.map((d, i) => (
                <li key={`${d.disciplina}-${i}`} className="flex items-center justify-between gap-2 rounded-lg border border-borda px-3 py-1.5 text-sm">
                  <span className="min-w-0">
                    <span className="font-medium text-grafite">{disc(d.disciplina)}</span>
                    <span className="text-slate-400"> · {d.professorNome ?? "sem professor"}</span>
                  </span>
                  {d.professorId && (
                    <button onClick={() => desvincular(t.turmaId, d.professorId!, d.disciplina)}
                      className="shrink-0 text-slate-400 transition hover:text-alerta" title="Desvincular" aria-label="Desvincular">
                      <Icone nome="fechar" className="h-3.5 w-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Cartao>
      ))}
    </div>
  );
}
