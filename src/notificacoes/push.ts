// Envio de Web Push (VAPID) via a lib web-push. Configura as chaves do ambiente
// e envia um payload JSON para uma lista de inscricoes, removendo as mortas
// (410/404). Se as chaves VAPID nao estiverem configuradas, vira no-op (nao
// quebra a app — o push simplesmente nao e enviado).
import webpush from "web-push";
import { inscricoesDosAlunosDaTurma, removerInscricao, type InscricaoPush } from "../bd/push";

let configurado: boolean | null = null;
function garantirConfig(): boolean {
  if (configurado !== null) return configurado;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:contato@episteme.local";
  if (pub && priv) {
    webpush.setVapidDetails(subject, pub, priv);
    configurado = true;
  } else {
    console.warn("[push] VAPID nao configurado — notificacoes desativadas.");
    configurado = false;
  }
  return configurado;
}

export interface PayloadPush { titulo: string; corpo: string; url?: string; tag?: string }

async function enviarParaInscricoes(inscricoes: InscricaoPush[], payload: PayloadPush): Promise<number> {
  if (!garantirConfig() || inscricoes.length === 0) return 0;
  const dados = JSON.stringify(payload);
  let enviados = 0;
  await Promise.all(inscricoes.map(async (i) => {
    try {
      await webpush.sendNotification(
        { endpoint: i.endpoint, keys: { p256dh: i.p256dh, auth: i.auth } },
        dados,
      );
      enviados++;
    } catch (e: any) {
      // 410 Gone / 404: inscricao morta -> remover.
      if (e?.statusCode === 410 || e?.statusCode === 404) {
        await removerInscricao(i.endpoint).catch(() => {});
      } else {
        console.error("[push] falha ao enviar:", e?.statusCode ?? e?.message ?? e);
      }
    }
  }));
  return enviados;
}

// Notifica os alunos de uma turma (best-effort; nunca lanca para nao derrubar o
// fluxo que a disparou).
export async function notificarTurma(
  escolaId: string, turmaId: string, payload: PayloadPush,
): Promise<void> {
  try {
    const inscricoes = await inscricoesDosAlunosDaTurma(escolaId, turmaId);
    await enviarParaInscricoes(inscricoes, payload);
  } catch (e) {
    console.error("[push] notificarTurma:", e);
  }
}
