function TarjetaIndicador({ etiqueta, valor, detalle }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-medium text-slate-600">{etiqueta}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{valor}</p>
      {detalle && <p className="mt-1 text-sm text-slate-500">{detalle}</p>}
    </article>
  )
}

export default TarjetaIndicador
