// ============================================================================
// Harvestly — Service Worker (Level 1: ang app shell ay bumubukas kahit
// walang signal). Hindi nito pinapadala ang mga bagong record "offline" —
// iyon ay susunod na phase. Ang ginagawa lang dito: kapag minsan nang na-
// load ang app habang may signal, ma-cache ang HTML/CSS/JS/images, para
// kahit mawalan ng signal, bubukas pa rin ang app sa halip na "No Internet"
// error page lang.
//
// MAHALAGA kapag nag-a-update: NETWORK-FIRST ang strategy dito, ibig sabihin
// kapag may signal, laging kukunin ang PINAKABAGONG bersyon mula sa server
// (kasama ang mga bagong ayos mo sa bug) — ang cache ay fallback LANG kapag
// offline. Kaya hindi mo kailangang baguhin ang CACHE_NAME sa bawat
// deploy — pero kung gusto mong sapilitang i-clear ang lumang cache ng mga
// existing users (hal. may sirang file na na-cache), taasan ang bersyon sa
// ibaba (v1 -> v2) at mage-expire ang luma sa susunod na pagbisita nila.
const CACHE_NAME = 'harvestly-shell-v1';

// Mga file na ipe-precache agad sa unang pagbukas habang may signal.
// Idagdag dito ang anumang BAGONG static file (hal. bagong logo o image)
// na gusto mong available kahit offline agad-agad.
const APP_SHELL = [
  '/',
  '/static/style.css',
  '/static/script.js',
  '/static/manifest.json',
  '/static/favicon.svg',
  '/static/harvestly-logo.svg',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .catch((err) => console.warn('[sw] precache skipped some files:', err))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // GET requests lang ang hinahawakan dito. Ang /api/* ay HINDI kailanman
  // dapat i-intercept — kailangan nilang maabot talaga ang server kada
  // request (login, pag-save ng record, CSRF token, atbp.), kaya
  // dumadaan sila nang direkta, gaya ng dati, walang offline fallback.
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        // Successful na sagot mula sa server — i-save ang bagong kopya
        // para magamit bilang offline fallback sa susunod.
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() =>
        // Walang signal — ibalik ang huling na-cache na bersyon kung meron.
        // Kung isang page request ito (hal. direktang pag-type ng URL) at
        // wala sa cache, ibalik na lang ang cached na "/" shell.
        caches.match(req).then((cached) => cached || (req.mode === 'navigate' ? caches.match('/') : undefined))
      )
  );
});
