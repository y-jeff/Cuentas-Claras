import { z } from "zod";

import { LISTA_CATEGORIAS } from "./categorias";
import type { Categoria, GastoInput, LoginInput } from "./types";

// Validación rápida en el cliente. Las reglas de negocio (fecha no futura, monto máximo)
// viven en Django y sus errores 400 se muestran bajo cada input.
export const gastoFormSchema = z.object({
  descripcion: z.string().trim().min(1, { error: "Ingresa una descripción." }),
  monto: z
    .number({ error: "Ingresa un monto." })
    .int({ error: "El monto debe ser un número entero." })
    .positive({ error: "El monto debe ser mayor a 0." }),
  categoria: z.enum(LISTA_CATEGORIAS as [Categoria, ...Categoria[]], { error: "Selecciona una categoría." }),
  fecha: z.iso.date({ error: "Ingresa una fecha válida." }),
}) satisfies z.ZodType<GastoInput>;

export type GastoFormValues = z.infer<typeof gastoFormSchema>;

export const loginSchema = z.object({
  username: z.string().trim().min(1, { error: "Ingresa tu usuario." }),
  password: z.string().min(1, { error: "Ingresa tu contraseña." }),
}) satisfies z.ZodType<LoginInput>;

export type LoginValues = z.infer<typeof loginSchema>;
