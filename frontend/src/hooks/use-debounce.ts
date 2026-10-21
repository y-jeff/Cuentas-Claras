import { useEffect, useState } from "react";

export function useDebounce<T>(valor: T, demoraMs = 400): T {
  const [debounced, setDebounced] = useState(valor);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(valor), demoraMs);
    return () => clearTimeout(timer);
  }, [valor, demoraMs]);

  return debounced;
}
