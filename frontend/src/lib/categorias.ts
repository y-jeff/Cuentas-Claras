import type { Categoria } from "./types";

// Record<Categoria, ...> obliga a que este mapa cubra exactamente el enum que expone la API.
export const CATEGORIAS: Record<Categoria, { label: string; badge: string; barra: string }> = {
  comida: {
    label: "Comida",
    badge: "bg-orange-100 text-orange-800 dark:bg-orange-500/15 dark:text-orange-300",
    barra: "bg-orange-500",
  },
  transporte: {
    label: "Transporte",
    badge: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300",
    barra: "bg-sky-500",
  },
  hogar: {
    label: "Hogar",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300",
    barra: "bg-emerald-500",
  },
  ocio: {
    label: "Ocio",
    badge: "bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-500/15 dark:text-fuchsia-300",
    barra: "bg-fuchsia-500",
  },
  otros: {
    label: "Otros",
    badge: "bg-slate-200 text-slate-700 dark:bg-slate-500/20 dark:text-slate-300",
    barra: "bg-slate-500",
  },
};

export const LISTA_CATEGORIAS = Object.keys(CATEGORIAS) as Categoria[];
