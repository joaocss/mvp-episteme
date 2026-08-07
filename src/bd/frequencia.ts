// Frequencia / chamada. O professor marca presenca/ausencia da turma numa data.
// Uma linha por (turma, aluno, data). Escritas pelo pool privilegiado; sempre
// filtrar por escola_id.
import { pool } from "./pool";

export interface AlunoRoster { alunoId: string; nome: string }
export interface ItemChamada { alunoId: string; presente: boolean; justificada?: boolean; motivo?: string | null }

// Alunos matriculados na turma (a lista da chamada).
export async function alunosDaTurma(escolaId: string, turmaId: string): Promise<AlunoRoster[]> {
  const { rows } = await pool.query(
    `select u.id, u.nome from matriculas m join usuarios u on u.id = m.aluno_id
     where m.escola_id = $1 and m.turma_id = $2 and u.papel = 'aluno' order by u.nome`,
    [escolaId, turmaId],
  );
  return rows.map((r) => ({ alunoId: r.id, nome: r.nome }));
}

// Chamada ja registrada de uma turma numa data (mapa aluno -> estado).
export async function obterChamada(
  escolaId: string, turmaId: string, data: string,
): Promise<Record<string, { presente: boolean; justificada: boolean }>> {
  const { rows } = await pool.query(
    `select aluno_id, presente, justificada from presencas
     where escola_id = $1 and turma_id = $2 and data = $3`,
    [escolaId, turmaId, data],
  );
  const mapa: Record<string, { presente: boolean; justificada: boolean }> = {};
  for (const r of rows) mapa[r.aluno_id] = { presente: r.presente, justificada: r.justificada };
  return mapa;
}

// Salva/atualiza a chamada. Retorna os alunos marcados como AUSENTES (para o
// gatilho de aviso ao responsavel, Frente 5).
export async function salvarChamada(
  escolaId: string, turmaId: string, professorId: string, data: string, itens: ItemChamada[],
): Promise<{ alunoId: string; justificada: boolean }[]> {
  const ausentes: { alunoId: string; justificada: boolean }[] = [];
  const cliente = await pool.connect();
  try {
    await cliente.query("begin");
    for (const i of itens) {
      const justificada = i.presente ? false : Boolean(i.justificada);
      await cliente.query(
        `insert into presencas (escola_id, turma_id, aluno_id, professor_id, data, presente, justificada, motivo)
         values ($1,$2,$3,$4,$5,$6,$7,$8)
         on conflict (turma_id, aluno_id, data) do update set
           presente = excluded.presente, justificada = excluded.justificada,
           motivo = excluded.motivo, professor_id = excluded.professor_id, atualizado_em = now()`,
        [escolaId, turmaId, i.alunoId, professorId, data, i.presente, justificada, i.motivo ?? null],
      );
      if (!i.presente) ausentes.push({ alunoId: i.alunoId, justificada });
    }
    await cliente.query("commit");
  } catch (e) {
    await cliente.query("rollback");
    throw e;
  } finally {
    cliente.release();
  }
  return ausentes;
}

// Resumo de frequencia de um aluno (para o painel do responsavel/desempenho).
export async function resumoFrequenciaAluno(
  escolaId: string, alunoId: string,
): Promise<{ presentes: number; ausencias: number; justificadas: number }> {
  const { rows } = await pool.query(
    `select
       count(*) filter (where presente) as presentes,
       count(*) filter (where not presente) as ausencias,
       count(*) filter (where not presente and justificada) as justificadas
     from presencas where escola_id = $1 and aluno_id = $2`,
    [escolaId, alunoId],
  );
  const r = rows[0] ?? {};
  return {
    presentes: Number(r.presentes) || 0,
    ausencias: Number(r.ausencias) || 0,
    justificadas: Number(r.justificadas) || 0,
  };
}
