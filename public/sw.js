/* Service worker minimal : rend l'application installable et garde la coquille de l'app en secours hors ligne.
   Reseau d'abord : les mises a jour sont toujours visibles des qu'il y a du reseau. */
const CACHE = 'cf-commercial-v2'

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return
  // La page d'accueil est toujours revalidee aupres du serveur (GitHub Pages la garde 10 min dans le navigateur)
  const request = req.mode === 'navigate' ? new Request(req, { cache: 'no-cache' }) : req
  event.respondWith(
    fetch(request)
      .then((res) => {
        const isMedia = /\.(mp4|webm|mov)$/i.test(new URL(req.url).pathname)
        if (res.status === 200 && !isMedia) {
          const copy = res.clone()
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
        }
        return res
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html'))),
  )
})
