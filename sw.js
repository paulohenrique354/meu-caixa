/* Meu Caixa — modo offline.
   A página vem da rede primeiro (para receber versões novas) e, sem internet, da cópia guardada.
   Ícones, leitor de QR e fonte ficam guardados depois do primeiro uso. A IA da nota fiscal nunca passa pelo cache. */
const VERSAO = 'meu-caixa-v2';
const BASE = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSAO).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSAO).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).hostname === 'api.anthropic.com') return;
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(res => { const c = res.clone(); caches.open(VERSAO).then(k => k.put('./index.html', c)); return res; })
      .catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(r).then(hit => hit || fetch(r).then(res => {
    if (res.ok || res.type === 'opaque') { const c = res.clone(); caches.open(VERSAO).then(k => k.put(r, c)); }
    return res;
  })));
});
