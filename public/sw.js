// Service worker do Episteme (PWA). Foco: notificacoes push. Cache minimo
// (a app e majoritariamente dinamica/autenticada, entao nao cacheamos rotas).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// Recebe uma notificacao push do servidor e exibe.
self.addEventListener("push", (evento) => {
  let dados = {};
  try { dados = evento.data ? evento.data.json() : {}; } catch { dados = {}; }
  const titulo = dados.titulo || "Episteme";
  const opcoes = {
    body: dados.corpo || "",
    icon: "/icone-episteme.svg",
    badge: "/icone-episteme.svg",
    data: { url: dados.url || "/paineis" },
    tag: dados.tag || undefined,
  };
  evento.waitUntil(self.registration.showNotification(titulo, opcoes));
});

// Clique na notificacao: foca uma aba aberta ou abre a app na url alvo.
self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const alvo = (evento.notification.data && evento.notification.data.url) || "/paineis";
  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((abas) => {
      for (const aba of abas) {
        if ("focus" in aba) { aba.navigate(alvo); return aba.focus(); }
      }
      return self.clients.openWindow(alvo);
    }),
  );
});
