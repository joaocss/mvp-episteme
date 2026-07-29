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
          claro: "#7A6AA5",   // aneis de foco, detalhes suaves
        },
        grafite: "#2A2540",   // texto principal, wordmark
        dourado: {
          DEFAULT: "#C79A3B", // acento pontual (a bussola)
          escuro: "#A87F2A",
        },
        creme: "#F3EFDD",     // fundos suaves, telas de entrada
        alerta: "#B91C1C",    // alertas de seguranca
      },
      fontFamily: {
        titulo: ['Georgia', '"Times New Roman"', "serif"],
      },
      boxShadow: {
        cartao: "0 1px 2px rgba(42, 37, 64, 0.06), 0 4px 12px rgba(42, 37, 64, 0.05)",
      },
    },
  },
  plugins: [],
};

export default config;
