"use client";

import { AlertTriangle } from "lucide-react";

import { useResumen } from "@/hooks/use-gastos";
import { CATEGORIAS } from "@/lib/categorias";
import { formatearCLP, formatearMes } from "@/lib/format";

export function ResumenMes() {
  const { data, isPending, isError, error, refetch } = useResumen();

  if (isPending) {
    return (
      <section className="grid gap-4 lg:grid-cols-3" aria-busy="true" aria-label="Cargando resumen">
        <div className="card space-y-3 p-5">
          <div className="skeleton h-4 w-32" />
          <div className="skeleton h-9 w-44" />
          <div className="skeleton h-4 w-24" />
        </div>
        <div className="card space-y-3 p-5 lg:col-span-2">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="skeleton h-4" />
          ))}
        </div>
      </section>
    );
  }

  if (isError) {
    return (
      <section className="card flex items-center justify-between gap-4 p-5">
        <p className="flex items-center gap-2 text-sm text-danger">
          <AlertTriangle className="size-4 shrink-0" aria-hidden />
          No se pudo cargar el resumen: {error.message}
        </p>
        <button type="button" className="btn-secondary shrink-0" onClick={() => refetch()}>
          Reintentar
        </button>
      </section>
    );
  }

  const maximo = Math.max(...data.por_categoria.map((c) => c.total), 1);

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      <div className="card flex flex-col justify-between p-5">
        <div>
          <p className="text-sm text-muted first-letter:uppercase">Total de {formatearMes(data.mes)}</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{formatearCLP(data.total)}</p>
        </div>
        <p className="mt-4 text-sm text-muted">
          {data.cantidad} {data.cantidad === 1 ? "gasto registrado" : "gastos registrados"}
        </p>
      </div>

      <div className="card p-5 lg:col-span-2">
        <h2 className="mb-4 text-sm font-medium text-muted">Por categoría</h2>
        <ul className="space-y-3">
          {data.por_categoria.map(({ categoria, total }) => (
            <li key={categoria} className="grid grid-cols-[6.5rem_1fr_auto] items-center gap-3 text-sm">
              <span>{CATEGORIAS[categoria].label}</span>
              <span className="h-2 overflow-hidden rounded-full bg-surface-muted">
                <span
                  className={`block h-full rounded-full ${CATEGORIAS[categoria].barra}`}
                  style={{ width: `${(total / maximo) * 100}%` }}
                />
              </span>
              <span className="w-24 text-right tabular-nums">{formatearCLP(total)}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
