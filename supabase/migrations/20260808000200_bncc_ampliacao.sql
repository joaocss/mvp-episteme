-- =====================================================================
-- Ampliacao do catalogo BNCC: Ciencias (6o), Geografia (6o) e Matematica (7o).
-- Ate aqui a 2a camada de grounding (buscar_bncc_similar) so cobria Matematica
-- 6o, Portugues 6o e Historia 7o. Como os alunos do piloto estao em series
-- diferentes, ampliar disciplinas/anos melhora direto o tutor nessas materias.
--
-- ATENCAO (curadoria): subconjunto CURADO das principais habilidades, com
-- codigos reais da BNCC. NAO e exaustivo — conferir/completar contra o documento
-- oficial (base nacional comum curricular) antes de tratar como completo. O
-- sistema degrada bem com lacunas (assunto sem habilidade proxima cai para o
-- fallback de conhecimento geral, sempre avisando a origem).
--
-- Os embeddings NAO sao gravados aqui: rodar `npx tsx src/rag/ingestaoBncc.ts`
-- depois de aplicar (so as habilidades novas, sem embedding, sao vetorizadas).
-- Convencao: identificadores em portugues, sem acento, snake_case.
-- =====================================================================

insert into competencias_bncc (codigo, disciplina, ano, unidade_tematica, descricao) values
  -- ---------- Ciencias 6o ano (EF06CI) ----------
  ('EF06CI01', 'ciencias', '6o ano', 'Materia e energia', 'Classificar como homogenea ou heterogenea a mistura de dois ou mais materiais (agua e sal, agua e oleo, agua e areia etc.).'),
  ('EF06CI02', 'ciencias', '6o ano', 'Materia e energia', 'Identificar evidencias de transformacoes quimicas a partir do resultado de misturas de materiais que originam produtos diferentes dos que foram misturados.'),
  ('EF06CI05', 'ciencias', '6o ano', 'Vida e evolucao', 'Explicar a organizacao basica das celulas e seu papel como unidade estrutural e funcional dos seres vivos.'),
  ('EF06CI06', 'ciencias', '6o ano', 'Vida e evolucao', 'Concluir, com base na analise de ilustracoes e/ou modelos, que os organismos sao um complexo arranjo de sistemas com diferentes niveis de organizacao.'),
  ('EF06CI07', 'ciencias', '6o ano', 'Vida e evolucao', 'Justificar o papel do sistema nervoso na coordenacao das acoes motoras e sensoriais do corpo, com base na analise de suas estruturas basicas e respectivas funcoes.'),
  ('EF06CI11', 'ciencias', '6o ano', 'Terra e Universo', 'Identificar as diferentes camadas que estruturam o planeta Terra (da estrutura interna a atmosfera) e suas principais caracteristicas.'),
  ('EF06CI12', 'ciencias', '6o ano', 'Terra e Universo', 'Identificar diferentes tipos de rocha, relacionando a formacao de fosseis a rochas sedimentares em diferentes periodos geologicos.'),

  -- ---------- Geografia 6o ano (EF06GE) ----------
  ('EF06GE01', 'geografia', '6o ano', 'O sujeito e seu lugar no mundo', 'Comparar modificacoes das paisagens nos lugares de vivencia e os usos desses lugares em diferentes tempos.'),
  ('EF06GE02', 'geografia', '6o ano', 'O sujeito e seu lugar no mundo', 'Analisar modificacoes de paisagens por diferentes tipos de sociedade, com destaque para os povos originarios.'),
  ('EF06GE03', 'geografia', '6o ano', 'Conexoes e escalas', 'Descrever os movimentos do planeta e sua relacao com a circulacao geral da atmosfera, o tempo atmosferico e os padroes climaticos.'),
  ('EF06GE05', 'geografia', '6o ano', 'Conexoes e escalas', 'Relacionar padroes climaticos, tipos de solo, relevo e formacoes vegetais.'),
  ('EF06GE07', 'geografia', '6o ano', 'Mundo do trabalho', 'Explicar as mudancas na interacao humana com a natureza a partir do surgimento das cidades.'),
  ('EF06GE11', 'geografia', '6o ano', 'Natureza, ambientes e qualidade de vida', 'Analisar distintas interacoes das sociedades com a natureza, com base na distribuicao dos componentes fisico-naturais, incluindo as transformacoes da biodiversidade local e do mundo.'),

  -- ---------- Matematica 7o ano (EF07MA) ----------
  ('EF07MA01', 'matematica', '7o ano', 'Numeros', 'Resolver e elaborar problemas com numeros naturais, envolvendo as nocoes de divisor e de multiplo, podendo incluir maximo divisor comum ou minimo multiplo comum, por meio de estrategias diversas.'),
  ('EF07MA04', 'matematica', '7o ano', 'Numeros', 'Resolver e elaborar problemas que envolvam operacoes com numeros inteiros.'),
  ('EF07MA09', 'matematica', '7o ano', 'Numeros', 'Utilizar, na resolucao de problemas, a associacao entre razao e fracao, entre fracao e porcentagem, entre fracao e numero decimal.'),
  ('EF07MA13', 'matematica', '7o ano', 'Algebra', 'Resolver e elaborar problemas que envolvam variacao de proporcionalidade direta e de proporcionalidade inversa entre duas grandezas.'),
  ('EF07MA17', 'matematica', '7o ano', 'Grandezas e medidas', 'Resolver e elaborar problemas que envolvam a razao entre duas grandezas, incluindo escala, velocidade e outras.'),
  ('EF07MA18', 'matematica', '7o ano', 'Algebra', 'Resolver e elaborar problemas que possam ser representados por equacoes polinomiais de 1o grau, redutiveis a forma ax + b = c, fazendo uso das propriedades da igualdade.'),
  ('EF07MA26', 'matematica', '7o ano', 'Probabilidade e estatistica', 'Aplicar calculos de probabilidade em situacoes-problema simples, usando a razao entre o numero de casos favoraveis e o total de casos possiveis em um espaco amostral equiprovavel.')
  on conflict (codigo) do nothing;
