// Estado dos modulos opcionais por escola. O catalogo em si vive no codigo
// (src/modulos/registro.ts); aqui so lemos/gravamos quais opcionais a escola
// desligou. Convencao: ausencia de linha = habilitado (padrao ligado).
//
// Deploy-safe: se a tabela modulos_escola ainda nao existe (migration nao
// aplicada), tudo e tratado como habilitado — a app nao quebra antes da
// migration rodar. Todas as escritas filtram por escola_id (isolamento).
import { pool } from "./pool";
import { MODULOS_ESSENCIAIS, MODULOS_OPCIONAIS } from "../modulos/registro";

// Postgres: relacao inexistente.
const ERRO_TABELA_AUSENTE = "42P01";

// Conjunto de ids de modulos habilitados na escola (essenciais + opcionais que
// nao foram explicitamente desligados). Usado para montar a navegacao.
export async function modulosHabilitados(escolaId: string): Promise<Set<string>> {
  const habilitados = new Set<string>(MODULOS_ESSENCIAIS);
  // Opcionais entram por padrao; removemos os desligados na tabela.
  for (const m of MODULOS_OPCIONAIS) habilitados.add(m.id);
  try {
    const { rows } = await pool.query(
      `select modulo_id, habilitado from modulos_escola where escola_id = $1`,
      [escolaId],
    );
    for (const r of rows) {
      if (r.habilitado === false && !MODULOS_ESSENCIAIS.has(r.modulo_id)) {
        habilitados.delete(r.modulo_id);
      }
    }
  } catch (e: any) {
    // Migration ainda nao aplicada: mantem tudo habilitado (comportamento legado).
    if (e?.code !== ERRO_TABELA_AUSENTE) throw e;
  }
  return habilitados;
}

// Estado de cada modulo opcional para o painel do gestor (ligado/desligado).
export interface EstadoModulo {
  id: string;
  nome: string;
  descricao: string;
  habilitado: boolean;
}

export async function listarEstadoModulos(escolaId: string): Promise<EstadoModulo[]> {
  const habilitados = await modulosHabilitados(escolaId);
  return MODULOS_OPCIONAIS.map((m) => ({
    id: m.id,
    nome: m.nome,
    descricao: m.descricao,
    habilitado: habilitados.has(m.id),
  }));
}

// Liga/desliga um modulo opcional para a escola. Essenciais sao ignorados
// (nunca desligaveis). Upsert por (escola_id, modulo_id).
export async function definirModulo(
  escolaId: string,
  moduloId: string,
  habilitado: boolean,
): Promise<void> {
  if (MODULOS_ESSENCIAIS.has(moduloId)) return; // essencial: sempre ligado
  if (!MODULOS_OPCIONAIS.some((m) => m.id === moduloId)) return; // id desconhecido
  await pool.query(
    `insert into modulos_escola (escola_id, modulo_id, habilitado)
       values ($1, $2, $3)
     on conflict (escola_id, modulo_id)
       do update set habilitado = excluded.habilitado, atualizado_em = now()`,
    [escolaId, moduloId, habilitado],
  );
}
