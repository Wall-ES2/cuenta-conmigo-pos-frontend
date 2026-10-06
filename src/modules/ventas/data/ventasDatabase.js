import Dexie from 'dexie'

export const ventasDatabase = new Dexie('cuenta-conmigo-pos')

ventasDatabase.version(1).stores({
  productos: '&id, categoria, actualizadoEn',
  ventas: '&id, estado, creadaEn',
  colaSincronizacion: '&id, creadaEn',
  configuracion: '&clave'
})

ventasDatabase.version(2).stores({
  productos: '&id, categoria, actualizadoEn',
  ventas: '&id, estado, creadaEn',
  colaSincronizacion: '&id, creadaEn',
  configuracion: '&clave'
})

export async function guardarConfiguracionSincronizacion(endpoint) {
  await ventasDatabase.configuracion.put({
    clave: 'endpointSincronizacionVentas',
    valor: endpoint
  })
}

export async function solicitarSincronizacionEnSegundoPlano() {
  if (!('serviceWorker' in navigator)) return false

  const registro = await navigator.serviceWorker.ready

  if (!('sync' in registro)) return false

  await registro.sync.register('sincronizar-ventas-pendientes')
  return true
}
