// Modulo de planejamento: gera plano de ensino com IA a partir do livro (RAG),
// da BNCC e do perfil da turma (incluindo alunos atipicos).
import { pool } from "../bd/pool";
import { criarEmbeddings } from "../ia/fabricaEmbeddings";
import { criarLlm } from "../ia/fabricaLlm";
import { RepositorioPostgres } from "./repositorioPostgres";
import { rotuloDisciplina } from "./tutor";
import { resumoAnexosParaIa } from "../bd/anexos";


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

// Alunos atipicos das turmas do professor (para o plano inclusivo individual).
export async function alunosAtipicosDoProfessor(
  escolaId: string, professorId: string,
): Promise<{ id: string; nome: string }[]> {
  const { rows } = await pool.query(
    `select distinct u.id, u.nome
     from professores_turmas pt
     join matriculas m on m.turma_id = pt.turma_id
     join usuarios u on u.id = m.aluno_id
     where pt.escola_id = $1 and pt.professor_id = $2 and u.papel = 'aluno' and u.atipico = true
     order by u.nome`,
    [escolaId, professorId],
  );
  return rows.map((r) => ({ id: r.id, nome: r.nome }));
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
  const escola = (await pool.query(`select nome from escolas where id = $1`, [escolaId])).rows[0]?.nome ?? "Escola";
  const professor = (await pool.query(`select nome from usuarios where id = $1`, [professorId])).rows[0]?.nome ?? "Professor";
  // Turma + DISCIPLINA + serie reais do vinculo (nao mais Matematica 6o fixo).
  const turma = (await pool.query(
    `select t.id, t.nome, t.serie, t.ano_letivo, pt.disciplina from professores_turmas pt
     join turmas t on t.id = pt.turma_id where pt.professor_id = $1 order by t.nome limit 1`, [professorId])).rows[0];
  if (!turma) throw new Error("Professor sem turma/disciplina vinculada.");
  const disciplina: string = turma.disciplina;
  const serie: string = turma.serie ?? "6o ano";
  const materia = rotuloDisciplina(disciplina);

  // Alunos, com atipicidade (Frente 2: flag + observacoes descritivas).
  const alunos = (await pool.query(
    `select u.nome, u.atipico, u.observacoes_atipicidade from usuarios u
     join matriculas m on m.aluno_id = u.id
     where m.turma_id = $1 and u.papel = 'aluno' order by u.nome`, [turma.id])).rows;

  const bncc = (await pool.query(
    `select codigo, descricao from competencias_bncc where disciplina=$1 and ano=$2 order by codigo`,
    [disciplina, serie])).rows;

  const embeddings = criarEmbeddings();
  const repo = new RepositorioPostgres();
  const vetor = await embeddings.gerar(`conteudo e habilidades de ${materia} do ${serie}`);
  const trechos = await repo.buscar(escolaId, vetor, 8, { disciplina, ano: serie, papel: "professor" });

  const atipicos = alunos.filter((a: any) => a.atipico);
  const perfilAlunos = atipicos.length
    ? atipicos.map((a: any) => `- ${a.nome} (atipico): ${a.observacoes_atipicidade || "sem observacoes registradas"}`).join("\n")
    : "Nenhum aluno atipico registrado nesta turma.";

  const habilidades = bncc.length ? bncc.map((b: any) => `(${b.codigo}) ${b.descricao}`).join("\n") : "(sem habilidades BNCC cadastradas para esta disciplina/serie)";
  const conteudoLivro = trechos.length ? trechos.map((t) => t.texto).join("\n---\n").slice(0, 6000) : "(sem material didatico ingerido para esta turma)";

  const prompt =
`Voce e um especialista em educacao brasileira, com profundo conhecimento da BNCC e de praticas pedagogicas inclusivas.

DADOS:
- Escola: ${escola}
- Professor: ${professor}
- Disciplina: ${materia}
- Turma: ${turma.nome} (${serie}) — Ano letivo: ${turma.ano_letivo}

PERFIL DA TURMA (inclusao):
${perfilAlunos}

HABILIDADES BNCC (${materia}, ${serie}):
${habilidades}

TRECHOS DO MATERIAL DIDATICO (fonte):
${conteudoLivro}

Gere um PLANO DE ENSINO completo e BEM FORMATADO em Markdown, com titulos (##), subtitulos (###),
listas e tabelas quando ajudar, nestas secoes:
1. Dados Institucionais
2. Objetivos (gerais e especificos alinhados a BNCC)
3. Conteudos Programaticos (bimestralizados, com referencia ao material e as habilidades BNCC)
4. Metodologias (atividades regulares e adaptadas)
5. Recursos Didaticos (priorize materiais de facil acesso e baixo custo)
6. Avaliacao (criterios e adaptacoes)
7. Cronograma (distribuicao temporal realista)
8. Adaptacoes Curriculares (uma subsecao POR aluno atipico, com estrategias especificas)

O plano deve ser pratico, exequivel e respeitar a diversidade da turma.`;

  const resposta = await criarLlm().gerar(prompt, { maxTokens: 3000 });
  const markdown = resposta.texto || "Nao foi possivel gerar o plano.";

  const ins = await pool.query(
    `insert into planos_ensino (escola_id, professor_id, disciplina, turma, ano_letivo, conteudo)
     values ($1, $2, $3, $4, $5, $6::jsonb) returning id`,
    [escolaId, professorId, disciplina, turma.nome, turma.ano_letivo, JSON.stringify({ markdown })],
  );
  return { id: ins.rows[0].id, markdown };
}

// Plano de aula INCLUSIVO e especifico para UM aluno atipico, profundo e
// especializado com base nas caracteristicas/limitacoes (observacoes + anexos).
export async function gerarPlanoInclusivoAluno(
  escolaId: string, professorId: string, alunoId: string,
): Promise<{ id: string; markdown: string }> {
  const escola = (await pool.query(`select nome from escolas where id = $1`, [escolaId])).rows[0]?.nome ?? "Escola";
  const aluno = (await pool.query(
    `select u.nome, u.atipico, u.observacoes_atipicidade, t.nome as turma, t.serie
     from usuarios u
     left join matriculas m on m.aluno_id = u.id
     left join turmas t on t.id = m.turma_id
     where u.id = $2 and u.escola_id = $1 and u.papel = 'aluno'`, [escolaId, alunoId])).rows[0];
  if (!aluno) throw new Error("Aluno nao encontrado.");
  // Disciplina do professor nessa turma (ou a primeira dele).
  const vinc = (await pool.query(
    `select pt.disciplina from professores_turmas pt join turmas t on t.id = pt.turma_id
     where pt.professor_id = $1 and t.nome = $2 limit 1`, [professorId, aluno.turma])).rows[0]
    ?? (await pool.query(`select disciplina from professores_turmas where professor_id = $1 limit 1`, [professorId])).rows[0];
  const disciplina = vinc?.disciplina ?? "geral";
  const serie = aluno.serie ?? "";
  const materia = rotuloDisciplina(disciplina);
  const anexos = await resumoAnexosParaIa(escolaId, alunoId);

  const prompt =
`Voce e um especialista em EDUCACAO INCLUSIVA e Atendimento Educacional Especializado (AEE) no Brasil.

Monte um PLANO DE AULA INDIVIDUALIZADO, profundo e especializado, para o aluno abaixo, de forma a
promover INCLUSAO real, respeitando suas caracteristicas e limitacoes.

ALUNO:
- Nome: ${aluno.nome}
- Turma/serie: ${aluno.turma ?? "-"} ${serie ? `(${serie})` : ""}
- Disciplina: ${materia}
- Caracteristicas e limitacoes (observacoes do professor/gestor): ${aluno.observacoes_atipicidade || "nao detalhadas"}
- ${anexos || "Sem documentos anexados."}

Gere em Markdown BEM FORMATADO (titulos ##, subtitulos ###, listas), com:
1. Sintese do perfil e das necessidades especificas
2. Objetivos de aprendizagem adaptados (o que e realista alcancar)
3. Estrategias e adaptacoes de ENSINO (como apresentar o conteudo)
4. Adaptacoes de ATIVIDADES e MATERIAIS (com exemplos concretos e de baixo custo)
5. Adaptacoes de AVALIACAO (formas justas de avaliar)
6. Recursos de acessibilidade e apoio (ex.: apoio visual, tempo estendido, tecnologia assistiva)
7. Rotina e mediacao em sala (passo a passo pratico para o professor)
8. Sinais de progresso a observar

IMPORTANTE: se as observacoes forem insuficientes, deixe claro o que precisa ser avaliado por um
especialista (nao invente diagnostico). Foque em estrategias pedagogicas praticas e humanas.`;

  const resposta = await criarLlm().gerar(prompt, { maxTokens: 2500 });
  const markdown = resposta.texto || "Nao foi possivel gerar o plano.";

  const ins = await pool.query(
    `insert into planos_ensino (escola_id, professor_id, disciplina, turma, ano_letivo, conteudo)
     values ($1, $2, $3, $4, extract(year from now())::int, $5::jsonb) returning id`,
    [escolaId, professorId, disciplina, `${aluno.turma ?? ""} — ${aluno.nome} (inclusivo)`, JSON.stringify({ markdown })],
  );
  return { id: ins.rows[0].id, markdown };
}
