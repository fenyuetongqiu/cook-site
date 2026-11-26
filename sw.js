/* 宝贝之家小厨房 · Service Worker
   原则：页面永远优先拿网络上的新版本（别让缓存把更新挡住），
   断网了才用缓存兜底；图标/清单这类不变的东西才走缓存。 */
const CACHE = 'kitchen-v1'
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
]

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return // 云端数据不拦，直接走网络

  const isDoc = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html')
  if (isDoc) {
    e.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((r) => {
          const copy = r.clone()
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
          return r
        })
        .catch(() => caches.match(req).then((m) => m || caches.match('index.html')))
    )
    return
  }

  // 静态资源：先缓存，后台顺手更新
  e.respondWith(
    caches.match(req).then((m) => {
      const net = fetch(req)
        .then((r) => {
          if (r && r.status === 200) {
            const copy = r.clone()
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {})
          }
          return r
        })
        .catch(() => m)
      return m || net
    })
  )
})
