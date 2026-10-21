"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";

import { ApiError } from "@/lib/api";

function redirigirSiExpiro(error: Error) {
  if (error instanceof ApiError && error.status === 401 && window.location.pathname !== "/login") {
    // Recarga completa a propósito: descarta caché y estado en memoria de la sesión anterior.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login?expirada=1");
  }
}

function crearQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({ onError: redirigirSiExpiro }),
    mutationCache: new MutationCache({ onError: redirigirSiExpiro }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // No reintenta errores del cliente (4xx): solo fallas de red o del servidor.
        retry: (intentos, error) =>
          !(error instanceof ApiError && error.status >= 400 && error.status < 500) && intentos < 2,
      },
    },
  });
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(crearQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster richColors position="top-right" closeButton />
    </QueryClientProvider>
  );
}
