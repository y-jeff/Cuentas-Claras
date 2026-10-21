const clp = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP" });

export function formatearCLP(monto: number): string {
  return clp.format(monto);
}

// Las fechas llegan como "YYYY-MM-DD"; se formatean sin pasar por UTC para no correr el día.
export function formatearFecha(iso: string): string {
  const [anio, mes, dia] = iso.split("-").map(Number);
  return new Date(anio, mes - 1, dia).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatearMes(mesIso: string): string {
  const [anio, mes] = mesIso.split("-").map(Number);
  return new Date(anio, mes - 1, 1).toLocaleDateString("es-CL", { month: "long", year: "numeric" });
}

export function hoyIso(): string {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `${hoy.getFullYear()}-${mes}-${dia}`;
}
