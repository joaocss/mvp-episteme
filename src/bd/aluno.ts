// Histórico de conversas do próprio aluno (Postgres direto).
import pg from "pg";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

export interface ResumoSessaoAluno { sessaoId: string; perguntas: number; iniciada: string; }

export async function listarSessoesAluno(alunoId: string, limite = 20): Promise<ResumoSessaoAluno[]> {
  const { rows } = await pool.query(
    `select s.id as sessao_id,
            count(i.id) filter (where i.autor = 'aluno') as perguntas,
            s.iniciada_em
     from sessoes_tutor s
     left join interacoes i on i.sessao_id = s.id
     where s.aluno_id = $1
     group by s.id, s.iniciada_em
     order by s.iniciada_em desc
     limit $2`,
    [alunoId, limite],
  );
  return rows.map((r) => ({
    sessaoId: r.sessao_id,
    perguntas: Number(r.perguntas) || 0,
    iniciada: new Date(r.iniciada_em).toLocaleString("pt-BR"),
  }));
}

export interface MensagemAluno { autor: string; conteudo: string; }

export async function conversaDoAluno(alunoId: string, sessaoId: string): Promise<MensagemAluno[] | null> {
  const dono = await pool.query(
    `select 1 from sessoes_tutor where id = $1 and aluno_id = $2`,
    [sessaoId, alunoId],
  );
  if (!dono.rows[0]) return null;
  const { rows } = await pool.query(
    `select autor, conteudo from interacoes where sessao_id = $1 order by criado_em asc`,
    [sessaoId],
  );
  return rows.map((r) => ({ autor: r.autor, conteudo: r.conteudo }));
}
