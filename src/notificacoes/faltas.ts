// Aviso de FALTA. Disparado quando o professor salva a chamada com ausencias.
// Notifica: push ao proprio aluno + e-mail (Resend) ao aluno e aos responsaveis.
// Best-effort — nunca lanca.
import { notificarUsuario } from "./push";
import { enviarEmail, layoutEmail } from "./email";
import { contatosDoAluno } from "../bd/frequencia";

export async function notificarFaltas(
  escolaId: string, _turmaId: string, data: string, alunoIds: string[],
): Promise<{ pushEnviados: number; emailsEnviados: number }> {
  let pushEnviados = 0;
  let emailsEnviados = 0;
  const dataBr = data.split("-").reverse().join("/");

  for (const alunoId of alunoIds) {
    try {
      pushEnviados += await notificarUsuario(escolaId, alunoId, {
        titulo: "Registro de ausência",
        corpo: `Você foi marcado(a) como ausente em ${dataBr}. Fale com o professor se houver engano.`,
        url: "/tutor", tag: `falta-${alunoId}-${data}`,
      });

      const c = await contatosDoAluno(escolaId, alunoId);
      const destinatarios = [...c.responsaveis, ...(c.alunoEmail ? [c.alunoEmail] : [])];
      if (destinatarios.length) {
        const html = layoutEmail(
          "Registro de ausência",
          `<p>Informamos que <strong>${c.nome}</strong> foi registrado(a) como <strong>ausente</strong> em <strong>${dataBr}</strong>.</p>
           <p>Em caso de engano ou para justificar a falta, entre em contato com a escola.</p>
           <p style="color:#6b7280;font-size:13px">Esta é uma mensagem automática do Episteme.</p>`,
        );
        const ok = await enviarEmail({
          para: destinatarios,
          assunto: `Ausência registrada — ${c.nome} (${dataBr})`,
          html, texto: `${c.nome} foi registrado(a) como ausente em ${dataBr}. Em caso de engano, contate a escola.`,
        });
        if (ok) emailsEnviados += destinatarios.length;
      }
    } catch { /* best-effort */ }
  }
  return { pushEnviados, emailsEnviados };
}
