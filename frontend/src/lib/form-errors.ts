import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

import { ApiError } from "./api";

/**
 * Lleva los errores 400 de Django ({ errors: { campo: [mensajes] } }) a React Hook Form.
 * Los campos que el formulario no conoce se muestran como error general.
 */
export function aplicarErroresServidor<T extends FieldValues>(
  error: ApiError,
  campos: readonly Path<T>[],
  setError: UseFormSetError<T>,
): void {
  const generales: string[] = [];
  for (const [campo, mensajes] of Object.entries(error.fieldErrors)) {
    if ((campos as readonly string[]).includes(campo)) {
      setError(campo as Path<T>, { type: "server", message: mensajes.join(" ") });
    } else {
      generales.push(...mensajes);
    }
  }
  if (generales.length || !Object.keys(error.fieldErrors).length) {
    setError("root.server" as Path<T>, { type: "server", message: generales.join(" ") || error.message });
  }
}
