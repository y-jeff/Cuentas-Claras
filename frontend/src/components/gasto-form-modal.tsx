"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FieldError } from "@/components/field-error";
import { Modal } from "@/components/modal";
import { useGuardarGasto } from "@/hooks/use-gastos";
import { ApiError } from "@/lib/api";
import { CATEGORIAS, LISTA_CATEGORIAS } from "@/lib/categorias";
import { aplicarErroresServidor } from "@/lib/form-errors";
import { hoyIso } from "@/lib/format";
import { gastoFormSchema, type GastoFormValues } from "@/lib/schemas";
import type { Gasto } from "@/lib/types";

const CAMPOS = ["descripcion", "monto", "categoria", "fecha"] as const;

type Props = {
  gasto?: Gasto;
  onClose: () => void;
};

export function GastoFormModal({ gasto, onClose }: Props) {
  const guardar = useGuardarGasto();
  const form = useForm<GastoFormValues>({
    resolver: zodResolver(gastoFormSchema),
    defaultValues: gasto
      ? {
          descripcion: gasto.descripcion,
          monto: gasto.monto,
          categoria: gasto.categoria,
          fecha: gasto.fecha,
        }
      : { descripcion: "", categoria: "comida", fecha: hoyIso() },
  });
  const { errors } = form.formState;

  const enviar = form.handleSubmit(async (datos) => {
    try {
      await guardar.mutateAsync({ id: gasto?.id, datos });
      toast.success(gasto ? "Gasto actualizado" : "Gasto registrado");
      onClose();
    } catch (error) {
      if (error instanceof ApiError && error.status === 400) {
        aplicarErroresServidor(error, CAMPOS, form.setError);
      } else if (!(error instanceof ApiError && error.status === 401)) {
        toast.error(error instanceof Error ? error.message : "No se pudo guardar el gasto.");
      }
    }
  });

  return (
    <Modal titulo={gasto ? "Editar gasto" : "Nuevo gasto"} onClose={onClose}>
      <form onSubmit={enviar} noValidate className="space-y-4">
        {errors.root?.server && (
          <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
            {errors.root.server.message}
          </p>
        )}

        <div className="space-y-1.5">
          <label htmlFor="descripcion" className="text-sm font-medium">
            Descripción
          </label>
          <input
            id="descripcion"
            autoFocus
            className="input"
            placeholder="Ej: Supermercado"
            aria-invalid={!!errors.descripcion}
            {...form.register("descripcion")}
          />
          <FieldError mensaje={errors.descripcion?.message} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="monto" className="text-sm font-medium">
              Monto (CLP)
            </label>
            <input
              id="monto"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              className="input"
              placeholder="15000"
              aria-invalid={!!errors.monto}
              {...form.register("monto", { valueAsNumber: true })}
            />
            <FieldError mensaje={errors.monto?.message} />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="fecha" className="text-sm font-medium">
              Fecha
            </label>
            <input
              id="fecha"
              type="date"
              className="input"
              aria-invalid={!!errors.fecha}
              {...form.register("fecha")}
            />
            <FieldError mensaje={errors.fecha?.message} />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="categoria" className="text-sm font-medium">
            Categoría
          </label>
          <select
            id="categoria"
            className="input"
            aria-invalid={!!errors.categoria}
            {...form.register("categoria")}
          >
            {LISTA_CATEGORIAS.map((categoria) => (
              <option key={categoria} value={categoria}>
                {CATEGORIAS[categoria].label}
              </option>
            ))}
          </select>
          <FieldError mensaje={errors.categoria?.message} />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {gasto ? "Guardar cambios" : "Registrar gasto"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
