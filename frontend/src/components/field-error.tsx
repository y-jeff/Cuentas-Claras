export function FieldError({ mensaje }: { mensaje?: string }) {
  if (!mensaje) return null;
  return <p className="text-xs text-danger">{mensaje}</p>;
}
