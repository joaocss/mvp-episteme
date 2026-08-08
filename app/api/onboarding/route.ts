// Onboarding self-service (PUBLICO): uma escola se cadastra sozinha. Cria a
// escola + o gestor e dispara o convite para o gestor definir a senha.
//
// Seguranca: rota publica de ESCRITA, entao (1) valida entrada, (2) throttle por
// IP (best-effort em memoria), (3) recusa email ja usado. Sem Resend configurado,
// devolvemos o link do convite na resposta para o fluxo funcionar; COM Resend, o
// link vai so por email (nao expomos na resposta).
import { NextResponse } from "next/server";
import { emailJaUsado, criarEscolaComGestor } from "../../../src/bd/onboarding";
import { criarTokenSenha } from "../../../src/bd/tokensSenha";
import { enviarConviteSenha } from "../../../src/notificacoes/senha";

export const runtime = "nodejs";

const ultimoPorIp = new Map<string, number>();
const JANELA_MS = 60_000;

export async function POST(requisicao: Request) {
  let corpo: { nomeEscola?: unknown; nomeGestor?: unknown; email?: unknown };
  try {
    corpo = await requisicao.json();
  } catch {
    return NextResponse.json({ erro: "Requisicao invalida." }, { status: 400 });
  }

  const nomeEscola = String(corpo?.nomeEscola ?? "").trim();
  const nomeGestor = String(corpo?.nomeGestor ?? "").trim();
  const email = String(corpo?.email ?? "").trim().toLowerCase();
  if (nomeEscola.length < 2 || nomeGestor.length < 2 || !/.+@.+\..+/.test(email)) {
    return NextResponse.json(
      { erro: "Preencha o nome da escola, seu nome e um email valido." },
      { status: 400 },
    );
  }

  const ip = requisicao.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const agora = Date.now();
  if ((ultimoPorIp.get(ip) ?? 0) + JANELA_MS > agora) {
    return NextResponse.json({ erro: "Aguarde um minuto antes de tentar de novo." }, { status: 429 });
  }
  ultimoPorIp.set(ip, agora);

  if (await emailJaUsado(email)) {
    return NextResponse.json(
      { erro: "Ja existe uma conta com esse email. Use 'Esqueci minha senha' na tela de login." },
      { status: 409 },
    );
  }

  let escolaId: string, gestorId: string;
  try {
    ({ escolaId, gestorId } = await criarEscolaComGestor(nomeEscola, nomeGestor, email));
  } catch (e) {
    console.error("[onboarding]", e);
    return NextResponse.json({ erro: "Nao foi possivel criar a escola agora." }, { status: 500 });
  }

  const token = await criarTokenSenha(escolaId, gestorId, "convite");
  const link = `${new URL(requisicao.url).origin}/definir-senha?token=${token}`;
  const emailEnviado = await enviarConviteSenha(email, nomeGestor, link);

  // Com email configurado, o link vai so por email (nao expomos). Sem email,
  // devolvemos o link para o fluxo nao morrer no piloto.
  return NextResponse.json(emailEnviado ? { ok: true, emailEnviado: true } : { ok: true, link });
}
