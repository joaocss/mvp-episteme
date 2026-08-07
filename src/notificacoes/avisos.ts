// Notifica um aviso a sua audiencia: push no app (a cada destinatario) + e-mail
// (batch). Best-effort — nunca lanca.
import { notificarUsuario } from "./push";
import { enviarEmail, layoutEmail } from "./email";
import { destinatariosDoAviso, type PapelAudiencia } from "../bd/avisos";

export async function notificarAviso(
  escolaId: string,
  aviso: { id: string; titulo: string; corpo: string; audiencia: PapelAudiencia[]; turmaId: string | null },
): Promise<{ push: number; emails: number }> {
  let push = 0;
  try {
    const dests = await destinatariosDoAviso(escolaId, aviso.audiencia, aviso.turmaId);
    // Push individual (best-effort, em paralelo com limite implicito do fetch).
    await Promise.all(dests.map(async (d) => {
      push += await notificarUsuario(escolaId, d.usuarioId, {
        titulo: aviso.titulo, corpo: aviso.corpo.slice(0, 140), url: "/avisos", tag: `aviso-${aviso.id}`,
      });
    }));
    // E-mail em lote.
    const emails = dests.map((d) => d.email).filter((e): e is string => !!e);
    if (emails.length) {
      const html = layoutEmail(aviso.titulo,
        `<p style="white-space:pre-wrap">${aviso.corpo.replace(/</g, "&lt;")}</p>
         <p style="color:#6b7280;font-size:13px">Comunicado da escola via Episteme.</p>`);
      await enviarEmail({ para: emails, assunto: aviso.titulo, html, texto: aviso.corpo });
      return { push, emails: emails.length };
    }
    return { push, emails: 0 };
  } catch (e) {
    console.error("[avisos] notificar:", e);
    return { push, emails: 0 };
  }
}
