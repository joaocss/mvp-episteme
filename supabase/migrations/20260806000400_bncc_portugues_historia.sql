-- =====================================================================
-- Catalogo BNCC — 2a camada de grounding para Portugues (6o ano) e Historia
-- (7o ano). Ate aqui so Matematica 6o tinha habilidades cadastradas, entao o
-- tutor caia direto para "conhecimento geral" nessas disciplinas quando o livro
-- nao cobria o assunto. Com estas linhas, a busca BNCC (buscar_bncc_similar)
-- passa a ter o que classificar tambem em Portugues e Historia.
--
-- ATENCAO (curadoria): este e um conjunto CURADO das principais habilidades,
-- fiel a BNCC. NAO e a lista completa — conferir/completar contra o documento
-- oficial (base nacional comum curricular) antes de tratar como exaustivo. O
-- sistema degrada bem com lacunas (assunto sem habilidade proxima cai para o
-- fallback de conhecimento geral, avisando a origem).
--
-- Os embeddings NAO sao gravados aqui (migration nao chama a API de IA): rodar
-- `npx tsx src/rag/ingestaoBncc.ts` depois de aplicar, para etiquetar os vetores.
-- Convencao: identificadores em portugues, sem acento, snake_case.
-- =====================================================================

insert into competencias_bncc (codigo, disciplina, ano, unidade_tematica, descricao) values
  -- ---------- Portugues 6o ano (EF06LP / EF67LP) ----------
  ('EF06LP01', 'portugues', '6o ano', 'Leitura/escuta', 'Reconhecer a impossibilidade de uma neutralidade absoluta no relato de fatos e identificar diferentes graus de parcialidade/imparcialidade dados pelo recorte feito e pelos efeitos de sentido advindos de escolhas feitas pelo autor.'),
  ('EF06LP02', 'portugues', '6o ano', 'Leitura/escuta', 'Estabelecer relacao entre os diferentes generos jornalisticos, compreendendo a centralidade da noticia.'),
  ('EF06LP03', 'portugues', '6o ano', 'Leitura/escuta', 'Analisar informacoes de textos e as estrategias linguisticas usadas na constituicao de opinioes, distinguindo fato de opiniao.'),
  ('EF06LP05', 'portugues', '6o ano', 'Producao de textos', 'Identificar e utilizar os conhecimentos linguisticos e gramaticais na producao de textos, considerando o contexto de producao.'),
  ('EF06LP07', 'portugues', '6o ano', 'Analise linguistica/semiotica', 'Identificar, em textos, periodos compostos por oracoes separadas por virgula sem a utilizacao de conectivos, nomeando-os como oracoes coordenadas assindeticas.'),
  ('EF06LP11', 'portugues', '6o ano', 'Analise linguistica/semiotica', 'Utilizar, ao produzir texto, conhecimentos linguisticos e gramaticais: ortografia, regencia e concordancia nominal e verbal, modos e tempos verbais, pontuacao etc.'),
  ('EF67LP28', 'portugues', '6o ano', 'Leitura/escuta (literario)', 'Ler, de forma autonoma, e compreender textos literarios de diferentes generos e extensoes, inclusive aqueles sem ilustracoes, estabelecendo preferencias por generos, temas, autores.'),
  ('EF67LP30', 'portugues', '6o ano', 'Leitura/escuta (literario)', 'Criar narrativas ficcionais, com certa complexidade, que utilizem cenarios e personagens realistas ou de fantasia, observando os elementos da estrutura narrativa proprios ao genero pretendido.'),
  ('EF67LP32', 'portugues', '6o ano', 'Analise linguistica (literario)', 'Escrever palavras com correcao ortografica, obedecendo as convencoes da lingua escrita.'),
  ('EF67LP36', 'portugues', '6o ano', 'Analise linguistica (literario)', 'Identificar efeitos de sentido decorrentes de escolhas de palavras, tempos verbais, figuras de linguagem etc., em textos poeticos e prosaicos.'),

  -- ---------- Historia 7o ano (EF07HI) ----------
  ('EF07HI01', 'historia', '7o ano', 'A construcao da ideia de modernidade', 'Explicar o significado de "modernidade" e suas logicas de inclusao e exclusao, com base em uma concepcao europeia.'),
  ('EF07HI02', 'historia', '7o ano', 'A construcao da ideia de modernidade', 'Identificar conexoes e interacoes entre as sociedades do Novo Mundo, da Europa, da Africa e da Asia no contexto das navegacoes e indicar a complexidade e as consequencias desses contatos e interacoes.'),
  ('EF07HI03', 'historia', '7o ano', 'A construcao da ideia de modernidade', 'Identificar aspectos e processos especificos das sociedades africanas e americanas antes da chegada dos europeus, com destaque para as formas de organizacao social e o desenvolvimento de saberes e tecnicas.'),
  ('EF07HI04', 'historia', '7o ano', 'Humanismos, Renascimentos e o Novo Mundo', 'Identificar as principais caracteristicas dos Humanismos e dos Renascimentos e analisar seus significados.'),
  ('EF07HI05', 'historia', '7o ano', 'Humanismos, Renascimentos e o Novo Mundo', 'Identificar e relacionar as vinculacoes entre as reformas religiosas e os processos culturais e sociais do periodo moderno na Europa e na America.'),
  ('EF07HI06', 'historia', '7o ano', 'Humanismos, Renascimentos e o Novo Mundo', 'Comparar as visoes de mundo entre diferentes culturas e povos no contexto da expansao maritima e da colonizacao da America.'),
  ('EF07HI07', 'historia', '7o ano', 'A organizacao do poder e as dinamicas do mundo colonial americano', 'Descrever os processos de formacao e consolidacao das monarquias e suas principais caracteristicas, com vistas a compreensao das razoes da centralizacao politica.'),
  ('EF07HI08', 'historia', '7o ano', 'A organizacao do poder e as dinamicas do mundo colonial americano', 'Descrever as formas de organizacao das sociedades americanas no tempo da conquista, com vistas a compreensao dos mecanismos de alianca, confronto e resistencia.'),
  ('EF07HI10', 'historia', '7o ano', 'A organizacao do poder e as dinamicas do mundo colonial americano', 'Analisar, com base em documentos historicos, diferentes interpretacoes sobre as dinamicas das sociedades americanas no periodo colonial.'),
  ('EF07HI12', 'historia', '7o ano', 'Trabalho e formas de organizacao social e cultural', 'Identificar a distribuicao territorial da populacao brasileira em diferentes epocas, considerando a diversidade etnico-racial e etnico-cultural (indigena, africana, europeia e asiatica).'),
  ('EF07HI15', 'historia', '7o ano', 'A conquista da America e as formas de organizacao politica', 'Discutir o conceito de escravidao moderna e suas distincoes em relacao ao trabalho escravo em outros tempos e espacos.'),
  ('EF07HI16', 'historia', '7o ano', 'Trabalho e formas de organizacao social e cultural', 'Analisar os mecanismos e as dinamicas de comercio de escravizados em suas diferentes fases, identificando os agentes responsaveis pelo trafico e as regioes e zonas africanas de procedencia dos escravizados.')
  on conflict (codigo) do nothing;
