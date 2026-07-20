"use client";

import { useCallback, useState } from "react";

/** Estado de selección para tablas con checkbox (tab pendientes). */
export function useTableSelection() {
  const [seleccion, setSeleccion] = useState<Set<string>>(new Set());

  const toggleSeleccion = useCallback((id: string) => {
    setSeleccion((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  /** Alterna todos los ids del conjunto filtrado actual (no solo la página visible). */
  const toggleSeleccionLote = useCallback((ids: string[]) => {
    setSeleccion((prev) => {
      const todos = ids.length > 0 && ids.every((id) => prev.has(id));
      const next = new Set(prev);
      if (todos) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  }, []);

  const clearSeleccion = useCallback(() => setSeleccion(new Set()), []);

  return {
    seleccion,
    toggleSeleccion,
    toggleSeleccionLote,
    clearSeleccion,
  };
}

export function getSelectionState(seleccion: Set<string>, ids: string[]) {
  const allSelected =
    ids.length > 0 && ids.every((id) => seleccion.has(id));
  const someSelected = ids.some((id) => seleccion.has(id));
  return { allSelected, someSelected };
}
