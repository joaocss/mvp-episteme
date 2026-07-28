// Utilidades de texto compartilhadas.

export function normalizar(texto: string): string {
  return texto
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // remove acentos
    .toLowerCase();
}

export function tokenizar(texto: string): string[] {
  return normalizar(texto).match(/[a-z0-9]+/g) ?? [];
}

export function similaridadeCosseno(a: number[], b: number[]): number {
  let produto = 0;
  let normaA = 0;
  let normaB = 0;
  for (let i = 0; i < a.length; i++) {
    produto += a[i] * b[i];
    normaA += a[i] * a[i];
    normaB += b[i] * b[i];
  }
  if (normaA === 0 || normaB === 0) return 0;
  return produto / (Math.sqrt(normaA) * Math.sqrt(normaB));
}
