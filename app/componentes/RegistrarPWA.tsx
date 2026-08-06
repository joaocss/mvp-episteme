"use client";

// Registra o service worker (/sw.js) uma vez, no carregamento. Nao renderiza
// nada. Necessario para instalar a PWA e receber push.
import { useEffect } from "react";

export default function RegistrarPWA() {
  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => { /* silencioso */ });
    }
  }, []);
  return null;
}
