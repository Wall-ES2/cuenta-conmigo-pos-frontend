const APP_CACHE = 'cuenta-conmigo-pos-app-v2'
const SYNC_TAG = 'sincronizar-ventas-pendientes'

self.addEventListener('install', (event) => {
  event.waitUntil(Promise.all([precacheAppShell(), self.skipWaiting()]))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('cuenta-conmigo-pos-app-') && key !== APP_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  if (request.method !== 'GET' || url.origin !== self.location.origin) return

  if (request.mode === 'navigate') {
    event.respondWith(responderNavegacion(request))
    return
  }

  if (/\.(js|css|svg|png|jpg|jpeg|webp|woff2?)$/i.test(url.pathname)) {
    event.respondWith(responderAsset(request))
  }
})

self.addEventListener('sync', (event) => {
  if (event.tag === SYNC_TAG) {
    event.waitUntil(notificarClientesParaSincronizar())
  }
})

async function notificarClientesParaSincronizar() {
  const clientes = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })

  for (const cliente of clientes) {
    cliente.postMessage({ tipo: 'sincronizacion-ventas-solicitada' })
  }
}

async function precacheAppShell() {
  const cache = await caches.open(APP_CACHE)
  const response = await fetch('/index.html', { cache: 'reload' })

  if (!response.ok) {
    throw new Error(`No se pudo descargar el App Shell para caché (${response.status}).`)
  }

  const html = await response.clone().text()
  await cache.put('/', response.clone())
  await cache.put('/index.html', response.clone())

  const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css|svg|png|jpg|jpeg|webp|woff2?)(?:\?[^"]*)?)"/gi)]
    .map((match) => new URL(match[1], self.location.origin))
    .filter((url) => url.origin === self.location.origin)

  for (const asset of assets) {
    const assetResponse = await fetch(asset, { cache: 'reload' })
    if (!assetResponse.ok) {
      throw new Error(`No se pudo guardar el recurso offline ${asset.pathname} (${assetResponse.status}).`)
    }
    await cache.put(asset, assetResponse)
  }
}

async function responderNavegacion(request) {
  const cache = await caches.open(APP_CACHE)

  try {
    const response = await fetch(request)
    if (response.ok) {
      await cache.put('/', response.clone())
      await cache.put('/index.html', response.clone())
    }
    return response
  } catch {
    const cachedShell = await cache.match('/') ?? await cache.match('/index.html')
    if (cachedShell) return cachedShell
    return new Response('La aplicación no está disponible sin conexión inicial.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    })
  }
}

async function responderAsset(request) {
  const cache = await caches.open(APP_CACHE)
  const cachedAsset = await cache.match(request)
  if (cachedAsset) return cachedAsset

  const response = await fetch(request)
  if (response.ok) await cache.put(request, response.clone())
  return response
}
