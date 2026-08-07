// Envio de e-mail transacional via Resend (API por fetch, sem dependencia).
// No-op se RESEND_API_KEY nao estiver configurada (nao quebra a app; o e-mail
// simplesmente nao e enviado — igual ao push sem VAPID). Nunca lanca.
//
// Env: RESEND_API_KEY (backend), EMAIL_REMETENTE (ex.: "Episteme <avisos@seu-dominio>";
// para testes, o dominio onboarding do Resend "onboarding@resend.dev" funciona).

export interface Email { para: string | string[]; assunto: string; html: string; texto?: string }

let avisado = false;

export async function enviarEmail(email: Email): Promise<boolean> {
  const chave = process.env.RESEND_API_KEY;
  const remetente = process.env.EMAIL_REMETENTE || "Episteme <onboarding@resend.dev>";
  if (!chave) {
    if (!avisado) { console.warn("[email] RESEND_API_KEY ausente — e-mails desativados."); avisado = true; }
    return false;
  }
  const para = Array.isArray(email.para) ? email.para : [email.para];
  const destinatarios = para.filter((e) => e && /.+@.+\..+/.test(e));
  if (destinatarios.length === 0) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "authorization": `Bearer ${chave}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: remetente, to: destinatarios, subject: email.assunto,
        html: email.html, text: email.texto,
      }),
    });
    if (!r.ok) { console.error("[email] falha:", r.status, await r.text().catch(() => "")); return false; }
    return true;
  } catch (e) {
    console.error("[email] erro:", e);
    return false;
  }
}

// Wrapper HTML simples e consistente para os e-mails do Episteme.
export function layoutEmail(titulo: string, corpoHtml: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#2A2540">
    <div style="background:#3B2C63;color:#fff;padding:16px 20px;border-radius:10px 10px 0 0">
      <strong style="font-size:18px">Episteme</strong>
      <div style="font-size:12px;opacity:.8">inteligência que ensina a pensar</div>
    </div>
    <div style="border:1px solid #E7E5EE;border-top:none;border-radius:0 0 10px 10px;padding:20px">
      <h2 style="margin:0 0 10px;font-size:18px;color:#3B2C63">${titulo}</h2>
      ${corpoHtml}
    </div>
  </div>`;
}
