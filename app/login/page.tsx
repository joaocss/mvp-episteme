"use client";

import { criarClienteNavegador } from "../../lib/supabase/navegador";

export default function PaginaLogin() {
  async function entrarComGoogle() {
    const supabase = criarClienteNavegador();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // escopos minimos: nome e email (minimizacao LGPD)
        scopes: "openid email profile",
      },
    });
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 p-8">
      <h1 className="text-2xl font-bold">Episteme — Tutor 6º ano</h1>
      <p className="text-center text-slate-600">Entre com sua conta da escola para falar com o tutor.</p>
      <button
        onClick={entrarComGoogle}
        className="flex items-center gap-3 rounded-md border border-slate-300 bg-white px-5 py-3 font-medium text-slate-800 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.1 0 24 0 14.6 0 6.4 5.4 2.5 13.3l7.8 6.1C12.2 13.2 17.6 9.5 24 9.5z"/>
          <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.1 5.3-4.6 7l7.1 5.5c4.1-3.8 6.5-9.4 6.5-16z"/>
          <path fill="#FBBC05" d="M10.3 28.6c-.5-1.4-.7-2.9-.7-4.6s.3-3.2.7-4.6l-7.8-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.5 10.7l7.8-6.1z"/>
          <path fill="#34A853" d="M24 48c6.1 0 11.3-2 15-5.5l-7.1-5.5c-2 1.3-4.5 2.1-7.9 2.1-6.4 0-11.8-3.7-13.7-9l-7.8 6.1C6.4 42.6 14.6 48 24 48z"/>
        </svg>
        Entrar com Google
      </button>
    </main>
  );
}
