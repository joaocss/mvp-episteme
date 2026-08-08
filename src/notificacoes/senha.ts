// E-mails de convite (definir a 1a senha) e de redefinicao (reset). Usam o
// enviarEmail/layoutEmail existentes — no-op ate o Resend estar configurado.
import { enviarEmail, layoutEmail } from "./email";

function escapar(texto: string): string {
  return texto.replace(/[<>&"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c] ?? c));
}

function botao(link: string, rotulo: string): string {
  return `<p style="margin:20px 0"><a href="${link}"
    style="background:#3B2C63;color:#fff;padding:11px 20px;border-radius:8px;text-decoration:none;display:inline-block">
    ${rotulo}</a></p>
    <p style="font-size:12px;color:#8a8397">Se o botao nao funcionar, copie e cole no navegador:<br>
    <span style="color:#3B2C63;word-break:break-all">${link}</span></p>`;
}

export async function enviarConviteSenha(
  para: string, nome: string, link: string,
): Promise<boolean> {
  const corpo = `
    <p>Ola, ${escapar(nome)}.</p>
    <p>Sua conta no Episteme foi criada. Para comecar, defina sua senha de acesso:</p>
    ${botao(link, "Definir minha senha")}
    <p style="font-size:13px;color:#6b647d">Este link expira em 7 dias. Se voce nao esperava este convite, ignore este email.</p>`;
  return enviarEmail({
    para, assunto: "Bem-vindo ao Episteme — defina sua senha",
    html: layoutEmail("Defina sua senha", corpo),
    texto: `Ola, ${nome}. Defina sua senha de acesso ao Episteme: ${link} (expira em 7 dias).`,
  });
}

export async function enviarResetSenha(
  para: string, nome: string, link: string,
): Promise<boolean> {
  const corpo = `
    <p>Ola, ${escapar(nome)}.</p>
    <p>Recebemos um pedido para redefinir sua senha no Episteme. Clique abaixo:</p>
    ${botao(link, "Redefinir senha")}
    <p style="font-size:13px;color:#6b647d">Este link expira em 1 hora. Se voce nao pediu isso, ignore este email — sua senha continua a mesma.</p>`;
  return enviarEmail({
    para, assunto: "Redefinir sua senha — Episteme",
    html: layoutEmail("Redefinir senha", corpo),
    texto: `Ola, ${nome}. Para redefinir sua senha no Episteme: ${link} (expira em 1 hora). Se nao foi voce, ignore.`,
  });
}
