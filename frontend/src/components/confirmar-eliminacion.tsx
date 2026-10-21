"use client";

import { Modal } from "@/components/modal";
import { formatearCLP } from "@/lib/format";
import type { Gasto } from "@/lib/types";

type Props = {
  gasto: Gasto;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmarEliminacion({ gasto, onConfirm, onClose }: Props) {
  return (
    <Modal titulo="¿Eliminar gasto?" onClose={onClose} ancho="sm">
      <p className="text-sm text-muted">
        Se eliminará <strong className="text-foreground">{gasto.descripcion}</strong> por{" "}
        <strong className="text-foreground">{formatearCLP(gasto.monto)}</strong>. Esta acción no se
        puede deshacer.
      </p>
      <div className="mt-6 flex justify-end gap-2">
        <button type="button" className="btn-secondary" onClick={onClose}>
          Cancelar
        </button>
        <button type="button" className="btn-danger" onClick={onConfirm}>
          Eliminar
        </button>
      </div>
    </Modal>
  );
}
