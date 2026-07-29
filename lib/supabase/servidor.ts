import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function criarClienteServidor() {
  const armazemCookies = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return armazemCookies.getAll();
        },
        setAll(cookiesParaDefinir) {
          try {
            cookiesParaDefinir.forEach(({ name, value, options }) =>
              armazemCookies.set(name, value, options),
            );
          } catch {
            // chamado de um Server Component: ignorar (o middleware renova a sessao)
          }
        },
      },
    },
  );
}
