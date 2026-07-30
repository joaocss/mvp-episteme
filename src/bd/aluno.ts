// Histórico de conversas do próprio aluno (Postgres direto).
import { pool } from "./pool";

// Serie (ano) da turma do aluno — usada para escopar a busca do tutor
// (Fase 7: multi-serie/multi-disciplina). Aluno sem turma cai no padrao.
export async function serieDoAluno(escolaId: string, alunoId: string): Promise<string> {
  const { rows } = await pool.query(
    `select t.serie from matriculas m join turmas t on t.id = m.turma_id
     where m.escola_id = $1 and m.aluno_id = $2 limit 1`,
    [escolaId, alunoId],
  );
  return rows[0]?.serie ?? "6o ano";
}

export interface DisciplinaDisponivel { disciplina: string; }

// Disciplinas com material efetivamente ingerido (ha chunks gravados) para a
// serie do aluno naquela escola. Nao usa status_ingestao: os scripts de
// ingestao nunca atualizam essa coluna, entao o sinal real e ter chunks.
export async function disciplinasDisponiveis(escolaId: string, serie: string): Promise<string[]> {
  const { rows } = await pool.query(
    `select distinct m.disciplina from materiais_fonte m
     where m.escola_id = $1 and m.ano = $2
       and exists (select 1 from material_chunks c where c.material_id = m.id)
     order by m.disciplina`,
    [escolaId, serie],
  );
  return rows.map((r) => r.disciplina);
}


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

export interface MensagemAluno { autor: string; conteudo: string; anexoImagem: string | null; }
export interface ConversaAluno { disciplina: string; mensagens: MensagemAluno[]; }

export async function conversaDoAluno(alunoId: string, sessaoId: string): Promise<ConversaAluno | null> {
  const dono = await pool.query(
    `select disciplina from sessoes_tutor where id = $1 and aluno_id = $2`,
    [sessaoId, alunoId],
  );
  if (!dono.rows[0]) return null;
  const { rows } = await pool.query(
    `select autor, conteudo, anexo_imagem from interacoes where sessao_id = $1 order by criado_em asc`,
    [sessaoId],
  );
  return {
    disciplina: dono.rows[0].disciplina ?? "matematica",
    mensagens: rows.map((r) => ({ autor: r.autor, conteudo: r.conteudo, anexoImagem: r.anexo_imagem ?? null })),
  };
}
