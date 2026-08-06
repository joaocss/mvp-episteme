"use client";

// Botao de opt-in de notificacoes push. Pede permissao, inscreve no PushManager
// com a chave VAPID publica e envia a inscricao ao servidor. Some quando ja
// concedido/negado ou quando o navegador nao suporta.
import { useEffect, useState } from "react";
import { Botao } from "./ui/Botao";
import { Icone } from "./ui/Icone";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

// base64url -> Uint8Array (formato exigido por applicationServerKey).
function chaveParaBytes(base64: string): Uint8Array {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const bruto = atob(b64);
  const bytes = new Uint8Array(bruto.length);
  for (let i = 0; i < bruto.length; i++) bytes[i] = bruto.charCodeAt(i);
  return bytes;
}

export default function AtivarNotificacoes() {
  const [suportado, setSuportado] = useState(false);
  const [estado, setEstado] = useState<NotificationPermission | "assinado">("default");
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    const ok = typeof window !== "undefined" && "serviceWorker" in navigator &&
      "PushManager" in window && "Notification" in window && !!VAPID;
    setSuportado(ok);
    if (ok) setEstado(Notification.permission);
  }, []);

  async function ativar() {
    setOcupado(true);
    try {
      const permissao = await Notification.requestPermission();
      setEstado(permissao);
      if (permissao !== "granted") return;
      const reg = await navigator.serviceWorker.ready;
      const existente = await reg.pushManager.getSubscription();
      const inscricao = existente ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: chaveParaBytes(VAPID) as BufferSource,
      });
      const r = await fetch("/api/push/inscrever", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify(inscricao.toJSON()),
      });
      if (r.ok) setEstado("assinado");
    } finally {
      setOcupado(false);
    }
  }

  if (!suportado || estado === "assinado" || estado === "granted") return null;
  if (estado === "denied") {
    return <p className="text-xs text-slate-400">Notificacoes bloqueadas no navegador.</p>;
  }
  return (
    <Botao variante="secundario" tamanho="pequeno" onClick={ativar} disabled={ocupado}>
      <Icone nome="logs" className="h-4 w-4" />
      {ocupado ? "Ativando…" : "Ativar notificacoes"}
    </Botao>
  );
}
