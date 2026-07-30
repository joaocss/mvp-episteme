-- Fase 7: persiste a imagem enviada pelo aluno na interacao, para que ela
-- volte a aparecer no chat quando a conversa e reaberta (antes so existia em
-- memoria no navegador durante a sessao ativa, entao "sumia" ao recarregar).
alter table interacoes add column if not exists anexo_imagem text;
