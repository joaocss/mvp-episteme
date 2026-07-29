// Modulo de planejamento: gera plano de ensino com IA a partir do livro (RAG),
// da BNCC e do perfil da turma (incluindo alunos atipicos).
import { pool } from "../bd/pool";
import { criarEmbeddings } from "../ia/fabricaEmbeddings";
import { criarLlm } from "../ia/fabricaLlm";
import { RepositorioPostgres } from "./repositorioPostgres";


export interface PlanoEnsinoResumo {
  id: string; disciplina: string; turma: string; anoLetivo: number; criadoEm: string;
}

export async function listarPlanosEnsino(professorId: string): Promise<PlanoEnsinoResumo[]> {
  const { rows } = await pool.query(
    `select id, disciplina, turma, ano_letivo, criado_em
     from planos_ensino where professor_id = $1 and ativo = true order by criado_em desc`,
    [professorId],
  );
  return rows.map((r) => ({
    id: r.id, disciplina: r.disciplina, turma: r.turma, anoLetivo: r.ano_letivo,
    criadoEm: new Date(r.criado_em).toLocaleString("pt-BR"),
  }));
}

export async function obterPlanoEnsino(escolaId: string, id: string): Promise<{ markdown: string } | null> {
  const { rows } = await pool.query(
    `select conteudo from planos_ensino where id = $1 and escola_id = $2 limit 1`,
    [id, escolaId],
  );
  if (!rows[0]) return null;
  return { markdown: rows[0].conteudo?.markdown ?? "" };
}

export async function gerarPlanoEnsino(escolaId: string, professorId: string): Promise<{ id: string; markdown: string }> {
  // Dados institucionais e da turma
  const escola = (await pool.query(`select nome from escolas where id = $1`, [escolaId])).rows[0]?.nome ?? "Escola";
  const professor = (await pool.query(`select nome from usuarios where id = $1`, [professorId])).rows[0]?.nome ?? "Professor";
  const turma = (await pool.query(
    `select t.id, t.nome, t.ano_letivo from professores_turmas pt
     join turmas t on t.id = pt.turma_id where pt.professor_id = $1 limit 1`, [professorId])).rows[0];
  if (!turma) throw new Error("Professor sem turma vinculada.");

  // Alunos (com atipicidades)
  const alunos = (await pool.query(
    `select u.nome, u.atipicidades, u.adaptacoes from usuarios u
     join matriculas m on m.aluno_id = u.id
     where m.turma_id = $1 and u.papel = 'aluno' order by u.nome`, [turma.id])).rows;

  // BNCC (6o ano matematica)
  const bncc = (await pool.query(
    `select codigo, descricao from competencias_bncc where disciplina='matematica' and ano='6o ano' order by codigo`)).rows;

  // Conteudo do livro via RAG (trechos representativos)
  const embeddings = criarEmbeddings();
  const repo = new RepositorioPostgres();
  const vetor = await embeddings.gerar(
    "conteudo de matematica do 6o ano: numeros, operacoes, fracoes, geometria, grandezas e medidas, estatistica",
  );
  const trechos = await repo.buscar(escolaId, vetor, 8);

  // Perfil dos alunos em texto
  const perfilAlunos = alunos.map((a: any) => {
    const at = Array.isArray(a.atipicidades) ? a.atipicidades : [];
    const ad = Array.isArray(a.adaptacoes) ? a.adaptacoes : [];
    return at.length
      ? `- ${a.nome}: atipicidades [${at.join(", ")}]; adaptacoes sugeridas [${ad.join(", ")}]`
      : `- ${a.nome}: sem atipicidades registradas`;
  }).join("\n");

  const habilidades = bncc.map((b: any) => `(${b.codigo}) ${b.descricao}`).join("\n");
  const conteudoLivro = trechos.map((t) => t.texto).join("\n---\n").slice(0, 6000);

  const prompt =
`Voce e um especialista em educacao brasileira, com profundo conhecimento da BNCC e de praticas pedagogicas inclusivas.

DADOS:
- Escola: ${escola}
- Professor: ${professor}
- Disciplina: Matematica
- Turma: ${turma.nome} (6o ano) — Ano letivo: ${turma.ano_letivo}

PERFIL DA TURMA (inclusao):
${perfilAlunos}

HABILIDADES BNCC (Matematica 6o ano):
${habilidades}

TRECHOS DO LIVRO DIDATICO (fonte):
${conteudoLivro}

Gere um PLANO DE ENSINO completo em Markdown, com estas secoes:
1. Dados Institucionais
2. Objetivos (gerais e especificos alinhados a BNCC)
3. Conteudos Programaticos (bimestralizados, com referencia ao livro e as habilidades BNCC)
4. Metodologias (atividades regulares e adaptadas)
5. Recursos Didaticos (priorize materiais de facil acesso e baixo custo)
6. Avaliacao (criterios e adaptacoes)
7. Cronograma (distribuicao temporal realista)
8. Adaptacoes Curriculares (uma subsecao POR aluno atipico, com estrategias especificas)

O plano deve ser pratico, exequivel e respeitar a diversidade da turma. Conecte teoria e pratica.`;

  const resposta = await criarLlm().gerar(prompt, { maxTokens: 3000 });
  const markdown = resposta.texto || "Nao foi possivel gerar o plano.";

  const ins = await pool.query(
    `insert into planos_ensino (escola_id, professor_id, disciplina, turma, ano_letivo, conteudo)
     values ($1, $2, 'matematica', $3, $4, $5::jsonb) returning id`,
    [escolaId, professorId, turma.nome, turma.ano_letivo, JSON.stringify({ markdown })],
  );
  return { id: ins.rows[0].id, markdown };
}
