// Cria o cliente Supabase para o backend usando as variaveis de ambiente.
// A service_role so existe no backend; nunca no frontend.
import { createClient, SupabaseClient } from "@supabase/supabase-js";

export function criarClienteBackend(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) throw new Error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, chave, { auth: { persistSession: false } });
}
