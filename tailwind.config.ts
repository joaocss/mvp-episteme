import type { Config } from "tailwindcss";

// Tokens da identidade visual do Episteme (ver docs/Identidade_Visual.md).
// Nomes em portugues para manter a convencao do projeto.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        roxo: {
          DEFAULT: "#3B2C63", // primaria: marca, botoes, titulos
          escuro: "#2F2350",  // hover / estados pressionados
          profundo: "#241B3D", // fundo da barra lateral (gradiente)
          claro: "#7A6AA5",   // aneis de foco, detalhes suaves
          suave: "#EFEBF6",   // fundo de destaque, chips, item ativo claro
        },
        grafite: "#2A2540",   // texto principal, wordmark
        dourado: {
          DEFAULT: "#C79A3B", // acento pontual (a bussola)
          escuro: "#A87F2A",
          suave: "#F6ECD4",   // fundo de selo/destaque dourado
        },
        creme: "#F3EFDD",     // fundos suaves, telas de entrada
        // Superficies e neutros do produto (SaaS): base fria e clara.
        tela: "#F7F7FB",      // fundo da area de conteudo
        superficie: "#FFFFFF", // cartoes e paineis
        borda: "#E7E5EE",     // divisorias e contornos suaves
        alerta: "#B91C1C",    // alertas de seguranca
        sucesso: "#15803D",   // confirmacoes
        aviso: "#B45309",     // atencao
      },
      fontFamily: {
        titulo: ['Georgia', '"Times New Roman"', "serif"],
      },
      borderRadius: {
        xl: "0.9rem",
        "2xl": "1.15rem",
      },
      boxShadow: {
        cartao: "0 1px 2px rgba(42, 37, 64, 0.06), 0 4px 12px rgba(42, 37, 64, 0.05)",
        elevado: "0 8px 30px rgba(42, 37, 64, 0.12)",
        lateral: "2px 0 24px rgba(36, 27, 61, 0.18)",
      },
      backgroundImage: {
        "gradiente-roxo": "linear-gradient(160deg, #3B2C63 0%, #241B3D 100%)",
        "gradiente-marca": "linear-gradient(120deg, #3B2C63 0%, #5B4791 55%, #241B3D 100%)",
      },
      keyframes: {
        surgir: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        surgir: "surgir 0.35s ease-out both",
      },
    },
  },
  plugins: [],
};

export default config;
