import { formatearPrecio } from '../../ventas/data/productos.js'

function TendenciaVentas({ dias }) {
  const maximo = Math.max(...dias.map(({ total }) => total), 1)

  return (
    <div aria-label="Gráfico de ventas diarias" className="mt-5">
      <div className="flex h-52 items-end gap-2 border-b border-l border-slate-200 px-2">
        {dias.map((dia) => {
          const altura = dia.total === 0 ? 0 : Math.max((dia.total / maximo) * 100, 4)

          return (
            <div
              className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2"
              key={dia.clave}
            >
              <span className="truncate text-xs text-slate-500">
                {dia.total > 0 ? formatearPrecio(dia.total) : ''}
              </span>
              <div
                aria-label={`${dia.fecha.toLocaleDateString('es-CL')}: ${formatearPrecio(dia.total)}, ${dia.cantidad} ventas`}
                className="w-full max-w-14 rounded-t-md bg-emerald-700 transition-[height]"
                role="img"
                style={{ height: `${altura}%` }}
              />
            </div>
          )
        })}
      </div>
      <div className="flex gap-2 px-2 pt-2">
        {dias.map((dia) => (
          <span className="min-w-0 flex-1 text-center text-xs capitalize text-slate-500" key={dia.clave}>
            {dia.fecha.toLocaleDateString('es-CL', { weekday: 'short' })}
          </span>
        ))}
      </div>
    </div>
  )
}

export default TendenciaVentas
