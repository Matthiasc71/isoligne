/* Notifications d'Isoligne, chargé par le service worker (importScripts).
 * Chaque push affiche une notification (exigence de Safari : sinon l'abonnement est révoqué).
 * Le contenu arrive déjà déchiffré par le système : il a été chiffré sur un appareil de l'espace. */

/* global self, clients, indexedDB */

self.addEventListener('push', (evenement) => {
  let d = {};
  try { d = evenement.data ? evenement.data.json() : {}; } catch (e) { d = {}; }
  const titre = typeof d.t === 'string' && d.t ? d.t : 'Isoligne';
  evenement.waitUntil((async () => {
    await self.registration.showNotification(titre, {
      body: typeof d.b === 'string' ? d.b : '',
      tag: typeof d.g === 'string' && d.g ? d.g : undefined,
      data: { u: typeof d.u === 'string' && d.u.startsWith('#/') ? d.u : '#/' },
      icon: 'icone-192.png',
      lang: 'fr',
    });
    await pastille().catch(() => undefined);
  })());
});

self.addEventListener('notificationclick', (evenement) => {
  evenement.notification.close();
  const ancre = (evenement.notification.data && evenement.notification.data.u) || '#/';
  const url = new URL(ancre, self.registration.scope).href;
  evenement.waitUntil((async () => {
    const fenetres = await clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const f of fenetres) {
      if ('focus' in f) {
        if ('navigate' in f) await f.navigate(url).catch(() => undefined);
        return f.focus();
      }
    }
    return clients.openWindow(url);
  })());
});

/** Lecture seule de l'index local (« isoligne-index ») ; ne crée jamais la base si elle n'existe pas. */
function ouvrirIndex() {
  return new Promise((ok, ko) => {
    const r = indexedDB.open('isoligne-index');
    r.onupgradeneeded = () => r.transaction.abort();
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ko(r.error);
  });
}

function tout(db, magasin) {
  return new Promise((ok, ko) => {
    if (!db.objectStoreNames.contains(magasin)) { ok([]); return; }
    const r = db.transaction(magasin, 'readonly').objectStore(magasin).getAll();
    r.onsuccess = () => ok(r.result);
    r.onerror = () => ko(r.error);
  });
}

/** Pastille : échéances ouvertes du jour et en retard, projets non archivés (même règle que l'app). */
async function pastille() {
  if (!('setAppBadge' in self.navigator)) return;
  const db = await ouvrirIndex();
  try {
    const [echeances, projets] = await Promise.all([tout(db, 'echeances'), tout(db, 'projets')]);
    const archives = new Set(projets.filter((p) => p.statut === 'archive').map((p) => p.id));
    const jour = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris' }).format(new Date());
    const n = echeances.filter((e) => !archives.has(e.projetId) && String(e.date).slice(0, 10) <= jour).length;
    if (n > 0) await self.navigator.setAppBadge(n);
    else await self.navigator.clearAppBadge();
  } finally {
    db.close();
  }
}
