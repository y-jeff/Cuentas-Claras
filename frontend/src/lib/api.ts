import type {
  ErrorOut,
  Gasto,
  GastoInput,
  GastoPage,
  GastosQuery,
  LoginInput,
  Resumen,
  Usuario,
} from "./types";

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const MENSAJES_POR_STATUS: Record<number, string> = {
  401: "Tu sesión expiró. Vuelve a iniciar sesión.",
  403: "No tienes permiso para realizar esta acción.",
  404: "El recurso no existe.",
  500: "Error interno del servidor. Intenta nuevamente.",
  502: "El servidor no está disponible en este momento.",
  503: "El servidor no está disponible en este momento.",
  504: "El servidor tardó demasiado en responder.",
};

function leerCookie(nombre: string): string | undefined {
  return document.cookie
    .split("; ")
    .find((fila) => fila.startsWith(`${nombre}=`))
    ?.split("=")[1];
}

type Opciones = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | null | undefined>;
};

async function apiFetch<T>(ruta: string, { method = "GET", body, query }: Opciones = {}): Promise<T> {
  const params = new URLSearchParams();
  for (const [clave, valor] of Object.entries(query ?? {})) {
    if (valor !== undefined && valor !== null && valor !== "") params.set(clave, String(valor));
  }
  const url = `/api${ruta}${params.size ? `?${params}` : ""}`;

  const headers: Record<string, string> = { Accept: "application/json" };
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (method !== "GET") {
    const csrf = leerCookie("csrftoken");
    if (csrf) headers["X-CSRFToken"] = csrf;
  }

  let respuesta: Response;
  try {
    respuesta = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: "same-origin",
    });
  } catch {
    throw new ApiError(0, "No se pudo conectar con el servidor. Revisa tu conexión.");
  }

  if (respuesta.status === 204) return undefined as T;

  const datos: unknown = await respuesta.json().catch(() => null);
  if (!respuesta.ok) {
    const error = datos as Partial<ErrorOut> | null;
    throw new ApiError(
      respuesta.status,
      error?.detail ?? MENSAJES_POR_STATUS[respuesta.status] ?? "Ocurrió un error inesperado.",
      error?.errors ?? {},
    );
  }
  return datos as T;
}

export const api = {
  login: (datos: LoginInput) => apiFetch<Usuario>("/auth/login", { method: "POST", body: datos }),
  logout: () => apiFetch<void>("/auth/logout", { method: "POST" }),
  me: () => apiFetch<Usuario>("/auth/me"),

  listarGastos: (query: GastosQuery) => apiFetch<GastoPage>("/gastos", { query }),
  resumen: () => apiFetch<Resumen>("/gastos/resumen"),
  crearGasto: (datos: GastoInput) => apiFetch<Gasto>("/gastos", { method: "POST", body: datos }),
  actualizarGasto: (id: number, datos: GastoInput) =>
    apiFetch<Gasto>(`/gastos/${id}`, { method: "PUT", body: datos }),
  eliminarGasto: (id: number) => apiFetch<void>(`/gastos/${id}`, { method: "DELETE" }),
};
