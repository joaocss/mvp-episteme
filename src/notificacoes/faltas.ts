// Aviso de FALTA. Disparado quando o professor salva a chamada com ausencias.
// Frente 4: notificacao push para o proprio aluno. Frente 5 acrescentara o
// e-mail ao responsavel e ao aluno. Best-effort — nunca lanca.
import { notificarUsuario } from "./push";

export async function notificarFaltas(
  escolaId: string, _turmaId: string, data: string, alunoIds: string[],
): Promise<{ pushEnviados: number }> {
  let pushEnviados = 0;
  const dataBr = data.split("-").reverse().join("/");
  for (const alunoId of alunoIds) {
    try {
      pushEnviados += await notificarUsuario(escolaId, alunoId, {
        titulo: "Registro de ausência",
        corpo: `Você foi marcado(a) como ausente em ${dataBr}. Fale com o professor se houver engano.`,
        url: "/tutor", tag: `falta-${alunoId}-${data}`,
      });
    } catch { /* best-effort */ }
  }
  // TODO Frente 5: e-mail ao responsavel + ao aluno (infra a definir).
  return { pushEnviados };
}
