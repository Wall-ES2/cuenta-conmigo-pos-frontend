import { useState } from "react";
import { formatearPrecio } from "../../ventas/data/productos.js";

function TendenciaVentas({ dias, onSeleccionarDia }) {
  const [diaActivo, setDiaActivo] = useState(null);
  const maximo = Math.max(...dias.map(({ total }) => total), 1);
  const hayOtroAnio = dias.some((dia) => dia.fecha.getFullYear() !== new Date().getFullYear());
  const anchoGrafico = Math.max(
    720,
    dias.length * (dias.length <= 30 ? (hayOtroAnio ? 42 : 28) : 14),
  );
  const margenIzquierdo = 24;
  const margenDerecho = 12;
  const anchoUtil = anchoGrafico - margenIzquierdo - margenDerecho;
  const paso = dias.length ? anchoUtil / dias.length : anchoUtil;
  const baseY = 195;
  const altoUtil = 170;
  const anchoBarra = Math.min(paso * 0.62, 18);
  const mostrarPreciosFijos = dias.length <= 7;
  const fechaEtiqueta = (fecha) =>
    [
      String(fecha.getDate()).padStart(2, "0"),
      String(fecha.getMonth() + 1).padStart(2, "0"),
      ...(fecha.getFullYear() === new Date().getFullYear()
        ? []
        : [String(fecha.getFullYear()).slice(-2)]),
    ].join("/");

  return (
    <div aria-label="Gráfico de ventas diarias" className="mt-5 overflow-x-auto">
      <svg
        aria-label="Ventas por día. Pasa el mouse o enfoca una barra para ver el importe."
        className="max-w-none"
        height="250"
        role="group"
        viewBox={"0 0 " + anchoGrafico + " 250"}
        width={anchoGrafico}
      >
        <line
          stroke="#cbd5e1"
          strokeWidth="1.5"
          x1={margenIzquierdo}
          x2={anchoGrafico - margenDerecho}
          y1={baseY}
          y2={baseY}
        />
        {dias.map((dia, indice) => {
          const xCentro = margenIzquierdo + paso * (indice + 0.5);
          const altoBarra = dia.total > 0
            ? Math.max((dia.total / maximo) * altoUtil, 2)
            : 0;
          const yBarra = baseY - altoBarra;
          const radioSuperior = Math.min(4, anchoBarra / 2, altoBarra / 2);
          const xBarra = xCentro - anchoBarra / 2;
          const rutaBarra =
            "M " + (xBarra + radioSuperior) + " " + yBarra +
            " H " + (xBarra + anchoBarra - radioSuperior) +
            " Q " + (xBarra + anchoBarra) + " " + yBarra + " " +
            (xBarra + anchoBarra) + " " + (yBarra + radioSuperior) +
            " V " + baseY +
            " H " + xBarra +
            " V " + (yBarra + radioSuperior) +
            " Q " + xBarra + " " + yBarra + " " +
            (xBarra + radioSuperior) + " " + yBarra + " Z";
          const precio = formatearPrecio(dia.total);
          const anchoTooltip = Math.max(64, precio.length * 7 + 18);
          const xTooltip = Math.min(
            Math.max(xCentro, margenIzquierdo + anchoTooltip / 2),
            anchoGrafico - margenDerecho - anchoTooltip / 2,
          );
          const mostrarEtiqueta = dias.length <= 30
            || indice % (dias.length >= 60 ? 14 : 7) === 0;
          const etiquetaDia = fechaEtiqueta(dia.fecha);
          const inicialDia = ["D", "L", "M", "X", "J", "V", "S"][dia.fecha.getDay()];
          const activo = diaActivo === indice;

          return (
            <g
              aria-label={
                dia.fecha.toLocaleDateString("es-CL") +
                ": " +
                precio +
                ", " +
                dia.cantidad +
                " ventas"
              }
              className="cursor-pointer focus:outline-none"
              key={dia.clave}
              onBlur={() => setDiaActivo(null)}
              onClick={() => onSeleccionarDia?.(dia.clave)}
              onFocus={() => setDiaActivo(indice)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSeleccionarDia?.(dia.clave);
                }
              }}
              onMouseEnter={() => setDiaActivo(indice)}
              onMouseLeave={() => setDiaActivo(null)}
              role="button"
              style={{ outline: "none" }}
              tabIndex={0}
            >
              <rect
                fill="transparent"
                height={baseY}
                pointerEvents="all"
                width={Math.max(paso, 8)}
                x={xCentro - paso / 2}
                y="0"
              />
              {altoBarra > 0 && (
                <path
                  fill={activo ? "#10b981" : "#047857"}
                  d={rutaBarra}
                />
              )}
              {mostrarPreciosFijos && (
                <text
                  fill="#334155"
                  fontSize="11"
                  fontWeight="600"
                  textAnchor="middle"
                  x={xCentro}
                  y={Math.max(14, yBarra - 7)}
                >
                  {precio}
                </text>
              )}
              {mostrarEtiqueta && (
                <g fill="#64748b" textAnchor="middle">
                  <text fontSize="10" fontWeight="600" x={xCentro} y="216">
                    {inicialDia}
                  </text>
                  <text fontSize="9" x={xCentro} y="232">
                    {etiquetaDia}
                  </text>
                </g>
              )}
              {activo && !mostrarPreciosFijos && (
                <g
                  pointerEvents="none"
                  transform={
                    "translate(" +
                    xTooltip +
                    " " +
                    Math.max(27, yBarra - 5) +
                    ")"
                  }
                >
                  <rect
                    fill="#0f172a"
                    height="24"
                    rx="5"
                    width={anchoTooltip}
                    x={-anchoTooltip / 2}
                    y="-27"
                  />
                  <text
                    fill="white"
                    fontSize="12"
                    fontWeight="600"
                    textAnchor="middle"
                    x="0"
                    y="-11"
                  >
                    {precio}
                  </text>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default TendenciaVentas;
