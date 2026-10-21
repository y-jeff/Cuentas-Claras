"use client";

import { LogOut, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { useLogout, useUsuario } from "@/hooks/use-gastos";

export function Header() {
  const router = useRouter();
  const { data: usuario } = useUsuario();
  const logout = useLogout();

  function cerrarSesion() {
    logout.mutate(undefined, {
      onSuccess: () => router.replace("/login"),
      onError: (error) => toast.error(error.message),
    });
  }

  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-2 font-semibold">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Wallet className="size-4" aria-hidden />
          </span>
          Gastos
        </div>
        <div className="flex items-center gap-3">
          {usuario ? (
            <span className="hidden text-sm text-muted sm:inline">
              {usuario.first_name || usuario.username}
            </span>
          ) : (
            <span className="skeleton hidden h-4 w-24 sm:block" />
          )}
          <button
            type="button"
            className="btn-secondary h-9 px-3"
            onClick={cerrarSesion}
            disabled={logout.isPending}
          >
            <LogOut className="size-4" aria-hidden />
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
