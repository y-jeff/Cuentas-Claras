"use client";

import { X } from "lucide-react";
import { useEffect, useRef } from "react";

type Props = {
  titulo: string;
  onClose: () => void;
  children: React.ReactNode;
  ancho?: "sm" | "md";
};

/** Modal sobre <dialog> nativo: trae foco atrapado, Escape y capa superior sin librerías. */
export function Modal({ titulo, onClose, children, ancho = "md" }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  // Sin cleanup: al desmontarse, el <dialog> sale del DOM y del top layer por sí solo.
  // Llamar close() aquí dispararía onClose en el doble montaje de StrictMode.
  useEffect(() => {
    const dialogo = ref.current;
    if (dialogo && !dialogo.open) dialogo.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(evento) => evento.target === ref.current && onClose()}
      aria-labelledby="modal-titulo"
      className={`m-auto w-[calc(100%-2rem)] rounded-xl border border-border bg-surface p-0 text-foreground shadow-xl backdrop:bg-black/50 ${
        ancho === "sm" ? "max-w-sm" : "max-w-lg"
      }`}
    >
      <div className="p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 id="modal-titulo" className="text-lg font-semibold">
            {titulo}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="-m-1 rounded-md p-1 text-muted hover:bg-surface-muted hover:text-foreground"
            aria-label="Cerrar"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
