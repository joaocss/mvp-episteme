// Conexao Postgres compartilhada. SSL automatico quando o host nao e local
// (Supabase Cloud exige SSL). Pool pequeno, adequado a ambiente serverless.
import pg from "pg";

const url = process.env.DATABASE_URL ?? "";
const ehLocal = /localhost|127\.0\.0\.1/.test(url);

const globalPg = globalThis as unknown as { __poolPg?: pg.Pool };

export const pool: pg.Pool =
  globalPg.__poolPg ??
  new pg.Pool({
    connectionString: url,
    ssl: url && !ehLocal ? { rejectUnauthorized: false } : undefined,
    max: 5,
  });

if (process.env.NODE_ENV !== "production") globalPg.__poolPg = pool;
