"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Wallet } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { FieldError } from "@/components/field-error";
import { claves } from "@/hooks/use-gastos";
import { api, ApiError } from "@/lib/api";
import { aplicarErroresServidor } from "@/lib/form-errors";
import { loginSchema, type LoginValues } from "@/lib/schemas";

const DEMO: LoginValues = { username: "demo", password: "demo1234" };

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });
  const { errors } = form.formState;

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("expirada")) {
      toast.info("Tu sesión expiró. Vuelve a iniciar sesión.");
    }
  }, []);

  const login = useMutation({
    mutationFn: api.login,
    onSuccess: (usuario) => {
      queryClient.clear();
      queryClient.setQueryData(claves.me, usuario);
      form.reset();
      router.replace("/dashboard");
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status !== 0) {
        aplicarErroresServidor(error, ["username", "password"], form.setError);
      } else {
        toast.error(error.message);
      }
    },
  });

  const enviar = form.handleSubmit((valores) => login.mutate(valores));

  function entrarComoDemo() {
    form.reset(DEMO);
    login.mutate(DEMO);
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-3 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Wallet className="size-6" aria-hidden />
          </span>
          <h1 className="text-2xl font-semibold">Registro de gastos</h1>
          <p className="mt-1 text-sm text-muted">Inicia sesión para ver tu dashboard.</p>
        </div>

        <form onSubmit={enviar} noValidate className="card space-y-4 p-6">
          {errors.root?.server && (
            <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              {errors.root.server.message}
            </p>
          )}

          <div className="space-y-1.5">
            <label htmlFor="username" className="text-sm font-medium">
              Usuario
            </label>
            <input
              id="username"
              autoComplete="username"
              className="input"
              aria-invalid={!!errors.username}
              {...form.register("username")}
            />
            <FieldError mensaje={errors.username?.message} />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              className="input"
              aria-invalid={!!errors.password}
              {...form.register("password")}
            />
            <FieldError mensaje={errors.password?.message} />
          </div>

          <button type="submit" className="btn-primary w-full" disabled={login.isPending}>
            {login.isPending && <Loader2 className="size-4 animate-spin" aria-hidden />}
            Iniciar sesión
          </button>

          <div className="relative py-1 text-center text-xs text-muted">
            <span className="relative z-10 bg-surface px-2">o</span>
            <span className="absolute inset-x-0 top-1/2 h-px bg-border" aria-hidden />
          </div>

          <button
            type="button"
            className="btn-secondary w-full"
            onClick={entrarComoDemo}
            disabled={login.isPending}
          >
            Entrar como demo
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-muted">
          Cuenta demo: <code className="font-mono">demo</code> / <code className="font-mono">demo1234</code>
        </p>
      </div>
    </main>
  );
}
