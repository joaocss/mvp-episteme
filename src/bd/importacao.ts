// Importacao de alunos por planilha (CSV). Parser proprio (sem dependencia) que
// lida com aspas, campos com separador dentro de aspas e delimitador ; ou ,.
// Colunas reconhecidas (cabecalho, sem acento/maiusculas indiferente):
//   nome (obrigatorio), email, senha, turma (nome da turma), data_nascimento.
import { pool } from "./pool";
import { criarUsuario, matricularAluno } from "./gestao";

export interface ResultadoImport {
  criados: number;
  erros: { linha: number; motivo: string }[];
  senhaPadraoUsada: boolean;
}

const SENHA_PADRAO = "episteme123"; // piloto: aluno sem senha na planilha recebe esta (trocar antes de dados reais)

// Detecta o delimitador dominante na primeira linha (; tem prioridade, padrao BR/Excel).
function detectarDelimitador(cabecalho: string): string {
  const ponto = (cabecalho.match(/;/g) || []).length;
  const virgula = (cabecalho.match(/,/g) || []).length;
  return ponto >= virgula ? ";" : ",";
}

// Parser de CSV linha a linha, respeitando aspas e quebras dentro de aspas.
function parsearCsv(texto: string, delim: string): string[][] {
  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let dentroAspas = false;
  const t = texto.replace(/^﻿/, ""); // remove BOM
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (dentroAspas) {
      if (c === '"') {
        if (t[i + 1] === '"') { campo += '"'; i++; } else dentroAspas = false;
      } else campo += c;
    } else if (c === '"') {
      dentroAspas = true;
    } else if (c === delim) {
      linha.push(campo); campo = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      linha.push(campo); campo = "";
      if (linha.some((x) => x.trim() !== "")) linhas.push(linha);
      linha = [];
    } else campo += c;
  }
  if (campo !== "" || linha.length) { linha.push(campo); if (linha.some((x) => x.trim() !== "")) linhas.push(linha); }
  return linhas;
}

function normalizarCabecalho(h: string): string {
  return h.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/\s+/g, "_");
}

export async function importarAlunosCsv(escolaId: string, conteudo: string): Promise<ResultadoImport> {
  const primeiraLinha = conteudo.split(/\r?\n/)[0] ?? "";
  const delim = detectarDelimitador(primeiraLinha);
  const linhas = parsearCsv(conteudo, delim);
  if (linhas.length < 2) return { criados: 0, erros: [{ linha: 0, motivo: "planilha vazia ou sem dados" }], senhaPadraoUsada: false };

  const cabecalho = linhas[0].map(normalizarCabecalho);
  const idx = (nome: string) => cabecalho.indexOf(nome);
  const iNome = idx("nome");
  const iEmail = idx("email");
  const iSenha = idx("senha");
  const iTurma = idx("turma");
  const iNasc = iNome >= 0 ? (idx("data_de_nascimento") >= 0 ? idx("data_de_nascimento") : idx("data_nascimento")) : -1;
  if (iNome < 0) return { criados: 0, erros: [{ linha: 1, motivo: "falta a coluna 'nome' no cabecalho" }], senhaPadraoUsada: false };

  // Mapa nome-da-turma -> id (case-insensitive), para matricular por nome.
  const { rows: turmas } = await pool.query(`select id, nome from turmas where escola_id = $1`, [escolaId]);
  const mapaTurma = new Map<string, string>(turmas.map((t: any) => [String(t.nome).toLowerCase().trim(), t.id]));

  const erros: ResultadoImport["erros"] = [];
  let criados = 0;
  let senhaPadraoUsada = false;

  for (let i = 1; i < linhas.length; i++) {
    const l = linhas[i];
    const nome = (l[iNome] ?? "").trim();
    if (!nome) { erros.push({ linha: i + 1, motivo: "nome vazio" }); continue; }
    const email = iEmail >= 0 ? (l[iEmail] ?? "").trim() : "";
    let senha = iSenha >= 0 ? (l[iSenha] ?? "").trim() : "";
    if (!senha) { senha = SENHA_PADRAO; senhaPadraoUsada = true; }
    const nomeTurma = iTurma >= 0 ? (l[iTurma] ?? "").trim() : "";
    const dataNasc = iNasc >= 0 ? (l[iNasc] ?? "").trim() : "";

    let turmaId: string | undefined;
    if (nomeTurma) {
      turmaId = mapaTurma.get(nomeTurma.toLowerCase());
      if (!turmaId) { erros.push({ linha: i + 1, motivo: `turma "${nomeTurma}" nao encontrada` }); continue; }
    }
    try {
      const alunoId = await criarUsuario(escolaId, "aluno", nome, email, senha, {
        dataNascimento: dataNasc || null,
      });
      if (turmaId) await matricularAluno(escolaId, alunoId, turmaId);
      criados++;
    } catch (e: any) {
      const dup = /duplicate key|unique/i.test(String(e?.message));
      erros.push({ linha: i + 1, motivo: dup ? "email ja cadastrado" : "falha ao criar" });
    }
  }
  return { criados, erros, senhaPadraoUsada };
}
