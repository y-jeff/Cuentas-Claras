import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/lib/api";
import type { GastoInput, GastoPage, GastosQuery } from "@/lib/types";

export const claves = {
  me: ["me"] as const,
  gastos: ["gastos"] as const,
  listas: ["gastos", "lista"] as const,
  lista: (query: GastosQuery) => ["gastos", "lista", query] as const,
  resumen: ["gastos", "resumen"] as const,
};

export function useUsuario() {
  return useQuery({ queryKey: claves.me, queryFn: api.me, staleTime: Infinity });
}

export function useGastos(query: GastosQuery) {
  return useQuery({
    queryKey: claves.lista(query),
    queryFn: () => api.listarGastos(query),
    // Mantiene la página anterior visible mientras llega la siguiente (sin parpadeos).
    placeholderData: keepPreviousData,
  });
}

export function useResumen() {
  return useQuery({ queryKey: claves.resumen, queryFn: api.resumen });
}

export function useGuardarGasto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, datos }: { id?: number; datos: GastoInput }) =>
      id ? api.actualizarGasto(id, datos) : api.crearGasto(datos),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: claves.gastos }),
  });
}

export function useEliminarGasto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.eliminarGasto,
    // Actualización optimista: la fila desaparece al instante y se restaura si el servidor falla.
    onMutate: async (id: number) => {
      await queryClient.cancelQueries({ queryKey: claves.listas });
      const anteriores = queryClient.getQueriesData<GastoPage>({ queryKey: claves.listas });
      queryClient.setQueriesData<GastoPage>({ queryKey: claves.listas }, (pagina) =>
        pagina && {
          ...pagina,
          items: pagina.items.filter((gasto) => gasto.id !== id),
          count: pagina.count - 1,
        },
      );
      return { anteriores };
    },
    onError: (_error, _id, contexto) => {
      contexto?.anteriores.forEach(([clave, datos]) => queryClient.setQueryData(clave, datos));
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: claves.gastos }),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.logout,
    onSettled: () => queryClient.clear(),
  });
}
