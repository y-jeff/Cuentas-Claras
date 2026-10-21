"use client";

import { useState } from "react";
import { toast } from "sonner";

import { ConfirmarEliminacion } from "@/components/confirmar-eliminacion";
import { GastoFormModal } from "@/components/gasto-form-modal";
import { Header } from "@/components/header";
import { ResumenMes } from "@/components/resumen-mes";
import { TablaGastos, type Filtros } from "@/components/tabla-gastos";
import { useDebounce } from "@/hooks/use-debounce";
import { useEliminarGasto, useGastos } from "@/hooks/use-gastos";
import type { Gasto } from "@/lib/types";

type ModalAbierto = { tipo: "formulario"; gasto?: Gasto } | { tipo: "eliminar"; gasto: Gasto } | null;

export default function DashboardPage() {
  const [filtros, setFiltros] = useState<Filtros>({ search: "", categoria: "", orden: "-fecha" });
  const [pagina, setPagina] = useState(1);
  const [modal, setModal] = useState<ModalAbierto>(null);

  const search = useDebounce(filtros.search.trim(), 400);
  const gastos = useGastos({
    page: pagina,
    search,
    categoria: filtros.categoria || undefined,
    orden: filtros.orden,
  });
  const eliminar = useEliminarGasto();

  function cambiarFiltros(nuevos: Filtros) {
    setFiltros(nuevos);
    setPagina(1);
  }

  function confirmarEliminacion(gasto: Gasto) {
    setModal(null);
    eliminar.mutate(gasto.id, {
      onSuccess: () => toast.success("Gasto eliminado"),
      onError: (error) => toast.error(`No se pudo eliminar: ${error.message}`),
    });
  }

  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">Tus gastos del mes y el historial completo.</p>
        </div>

        <ResumenMes />

        <TablaGastos
          filtros={filtros}
          onFiltrosChange={cambiarFiltros}
          pagina={gastos.data}
          cargando={gastos.isPending}
          actualizando={gastos.isPlaceholderData}
          error={gastos.error}
          onReintentar={() => gastos.refetch()}
          onPaginaChange={setPagina}
          onNuevo={() => setModal({ tipo: "formulario" })}
          onEditar={(gasto) => setModal({ tipo: "formulario", gasto })}
          onEliminar={(gasto) => setModal({ tipo: "eliminar", gasto })}
        />
      </main>

      {modal?.tipo === "formulario" && (
        <GastoFormModal key={modal.gasto?.id ?? "nuevo"} gasto={modal.gasto} onClose={() => setModal(null)} />
      )}
      {modal?.tipo === "eliminar" && (
        <ConfirmarEliminacion
          gasto={modal.gasto}
          onConfirm={() => confirmarEliminacion(modal.gasto)}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
