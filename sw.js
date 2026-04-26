// sw.js — Service Worker do Planner EQ
// Gerencia notificações em background (funciona mesmo com app fechado/minimizado)

const SW_VERSION = 'eq-sw-v2';

// ── Install & Activate ──────────────────────────────────────────
self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(self.clients.claim());
});

// ── Agendamento de notificações via postMessage ─────────────────
// A página envia os blocos do dia; o SW agenda via setTimeout e
// dispara showNotification (funciona em background no Android/Chrome)
let _swTimers = [];

self.addEventListener('message', e => {
  if (!e.data || e.data.type !== 'SCHEDULE_NOTIFS') return;

  // Cancela timers anteriores
  _swTimers.forEach(t => clearTimeout(t));
  _swTimers = [];

  const blocos = e.data.blocos || [];
  const now = Date.now();

  blocos.forEach(b => {
    // Calcula ms até o horário do bloco (hoje)
    const [h, m] = b.start.split(':').map(Number);
    const blockDate = new Date();
    blockDate.setHours(h, m, 0, 0);
    const ms = blockDate.getTime() - now;
    if (ms <= 0) return; // já passou

    const timer = setTimeout(() => {
      self.registration.showNotification(b.title, {
        body: b.body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: b.tag,
        renotify: true,
        vibrate: [200, 100, 200],
      });
    }, ms);

    _swTimers.push(timer);
  });

  console.log(`[SW] ${_swTimers.length} notificação(ões) agendada(s) para hoje`);
});

// ── Clique na notificação → abre o app ─────────────────────────
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      // Se o app já está aberto, foca nele
      const client = clients.find(c => c.url && c.visibilityState === 'visible');
      if (client) return client.focus();
      // Senão abre uma nova aba
      return self.clients.openWindow('/');
    })
  );
});
