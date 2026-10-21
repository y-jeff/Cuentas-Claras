"use client";

import { AlertTriangle, ChevronLeft, ChevronRight, Pencil, Plus, Search, SearchX, Trash2 } from "lucide-react";

import { CATEGORIAS, LISTA_CATEGORIAS } from "@/lib/categorias";
import { formatearCLP, formatearFecha } from "@/lib/format";
import type { Categoria, Gasto, GastoPage, Orden } from "@/lib/types";

export type Filtros = { search: string; categoria: Categoria | ""; orden: Orden };

const ORDENES: { valor: Orden; label: string }[] = [
  { valor: "-fecha", label: "Más recientes" },
  { valor: "fecha", label: "Más antiguos" },
  { valor: "-monto", label: "Mayor monto" },
  { valor: "monto", label: "Menor monto" },
];

type Props = {
  filtros: Filtros;
  onFiltrosChange: (filtros: Filtros) => void;
  pagina?: GastoPage;
  cargando: boolean;
  actualizando: boolean;
  error: Error | null;
  onReintentar: () => void;
  onPaginaChange: (pagina: number) => void;
  onNuevo: () => void;
  onEditar: (gasto: Gasto) => void;
  onEliminar: (gasto: Gasto) => void;
};

export function TablaGastos({
  filtros,
  onFiltrosChange,
  pagina,
  cargando,
  actualizando,
  error,
  onReintentar,
  onPaginaChange,
  onNuevo,
  onEditar,
  onEliminar,
}: Props) {
  const hayFiltros = filtros.search.trim() !== "" || filtros.categoria !== "";

  return (
    <section className="card">
      <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            className="input pl-9"
            placeholder="Buscar por descripción…"
            aria-label="Buscar gastos"
            value={filtros.search}
            onChange={(e) => onFiltrosChange({ ...filtros, search: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3 md:flex">
          <select
            className="input md:w-40"
            aria-label="Filtrar por categoría"
            value={filtros.categoria}
            onChange={(e) => onFiltrosChange({ ...filtros, categoria: e.target.value as Categoria | "" })}
          >
            <option value="">Todas las categorías</option>
            {LISTA_CATEGORIAS.map((categoria) => (
              <option key={categoria} value={categoria}>
                {CATEGORIAS[categoria].label}
              </option>
            ))}
          </select>
          <select
            className="input md:w-40"
            aria-label="Ordenar"
            value={filtros.orden}
            onChange={(e) => onFiltrosChange({ ...filtros, orden: e.target.value as Orden })}
          >
            {ORDENES.map(({ valor, label }) => (
              <option key={valor} value={valor}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="btn-primary" onClick={onNuevo}>
          <Plus className="size-4" aria-hidden />
          Nuevo gasto
        </button>
      </div>

      {cargando ? (
        <FilasSkeleton />
      ) : error && !pagina ? (
        <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
          <AlertTriangle className="size-8 text-danger" aria-hidden />
          <p className="text-sm text-danger">{error.message}</p>
          <button type="button" className="btn-secondary" onClick={onReintentar}>
            Reintentar
          </button>
        </div>
      ) : pagina && pagina.items.length === 0 ? (
        <EstadoVacio
          hayFiltros={hayFiltros}
          onLimpiar={() => onFiltrosChange({ ...filtros, search: "", categoria: "" })}
          onNuevo={onNuevo}
        />
      ) : (
        pagina && (
          <>
            <div className={`overflow-x-auto transition-opacity ${actualizando ? "opacity-60" : ""}`}>
              <table className="w-full min-w-[40rem] text-sm">
                <thead className="text-left text-xs uppercase tracking-wide text-muted">
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 font-medium">Fecha</th>
                    <th className="px-4 py-3 font-medium">Descripción</th>
                    <th className="px-4 py-3 font-medium">Categoría</th>
                    <th className="px-4 py-3 text-right font-medium">Monto</th>
                    <th className="px-4 py-3">
                      <span className="sr-only">Acciones</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pagina.items.map((gasto) => (
                    <tr key={gasto.id} className="border-b border-border last:border-0 hover:bg-surface-muted/50">
                      <td className="whitespace-nowrap px-4 py-3 text-muted">{formatearFecha(gasto.fecha)}</td>
                      <td className="px-4 py-3 font-medium">{gasto.descripcion}</td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORIAS[gasto.categoria].badge}`}>
                          {CATEGORIAS[gasto.categoria].label}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right tabular-nums">{formatearCLP(gasto.monto)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-muted hover:bg-surface-muted hover:text-foreground"
                            aria-label={`Editar ${gasto.descripcion}`}
                            onClick={() => onEditar(gasto)}
                          >
                            <Pencil className="size-4" aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="rounded-md p-1.5 text-muted hover:bg-danger-soft hover:text-danger"
                            aria-label={`Eliminar ${gasto.descripcion}`}
                            onClick={() => onEliminar(gasto)}
                          >
                            <Trash2 className="size-4" aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Paginacion pagina={pagina} onPaginaChange={onPaginaChange} />
          </>
        )
      )}
    </section>
  );
}

function FilasSkeleton() {
  return (
    <div className="space-y-3 p-4" aria-busy="true" aria-label="Cargando gastos">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="grid grid-cols-[6rem_1fr_6rem_5rem] items-center gap-4">
          <div className="skeleton h-4" />
          <div className="skeleton h-4" />
          <div className="skeleton h-5 rounded-full" />
          <div className="skeleton h-4" />
        </div>
      ))}
    </div>
  );
}

function EstadoVacio({
  hayFiltros,
  onLimpiar,
  onNuevo,
}: {
  hayFiltros: boolean;
  onLimpiar: () => void;
  onNuevo: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-16 text-center">
      <span className="mb-2 flex size-12 items-center justify-center rounded-full bg-surface-muted">
        <SearchX className="size-6 text-muted" aria-hidden />
      </span>
      <p className="font-medium">{hayFiltros ? "Sin resultados" : "Aún no tienes gastos"}</p>
      <p className="max-w-xs text-sm text-muted">
        {hayFiltros
          ? "Ningún gasto coincide con los filtros. Prueba con otra búsqueda."
          : "Registra tu primer gasto para empezar a ver tu resumen del mes."}
      </p>
      <button type="button" className="btn-secondary mt-3" onClick={hayFiltros ? onLimpiar : onNuevo}>
        {hayFiltros ? "Limpiar filtros" : "Registrar gasto"}
      </button>
    </div>
  );
}

function Paginacion({ pagina, onPaginaChange }: { pagina: GastoPage; onPaginaChange: (pagina: number) => void }) {
  const desde = (pagina.page - 1) * pagina.page_size + 1;
  const hasta = Math.min(pagina.page * pagina.page_size, pagina.count);

  return (
    <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-3 text-sm">
      <p className="text-muted">
        <span className="tabular-nums">
          {desde}–{hasta}
        </span>{" "}
        de <span className="tabular-nums">{pagina.count}</span>
      </p>
      <div className="flex items-center gap-2">
        <span className="hidden text-muted sm:inline">
          Página {pagina.page} de {pagina.total_pages}
        </span>
        <button
          type="button"
          className="btn-secondary h-8 px-2"
          onClick={() => onPaginaChange(pagina.page - 1)}
          disabled={pagina.page <= 1}
          aria-label="Página anterior"
        >
          <ChevronLeft className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          className="btn-secondary h-8 px-2"
          onClick={() => onPaginaChange(pagina.page + 1)}
          disabled={pagina.page >= pagina.total_pages}
          aria-label="Página siguiente"
        >
          <ChevronRight className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
