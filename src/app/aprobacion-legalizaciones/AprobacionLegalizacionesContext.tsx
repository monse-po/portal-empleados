"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  cloneInitialLegalizacionesApro,
  filterLegalizacionesAproTab,
  getLegalizacionesAproKpis,
  type LegalizacionApro,
  type LegalizacionAproEstado,
} from "@/src/lib/aprobacion-legalizaciones-mock";
import { hoyDMY } from "@/src/lib/legalizaciones-mock";
import { useTableSelection } from "@/src/lib/use-table-selection";

type AprobacionLegalizacionesContextValue = {
  solicitudes: Record<string, LegalizacionApro>;
  kpis: ReturnType<typeof getLegalizacionesAproKpis>;
  tab: "pend" | "res";
  setTab: (tab: "pend" | "res") => void;
  pendientesCount: number;
  registrosActuales: LegalizacionApro[];
  getSolicitud: (no: string) => LegalizacionApro | undefined;
  tabCounts: { pend: number; res: number };
  seleccion: Set<string>;
  toggleSeleccion: (no: string) => void;
  toggleSeleccionLote: (nos: string[]) => void;
  clearSeleccion: () => void;
  aprobar: (nos: string[], comentario?: string) => void;
  rechazar: (nos: string[], comentario: string) => void;
};

const AprobacionLegalizacionesContext =
  createContext<AprobacionLegalizacionesContextValue | null>(null);

export function AprobacionLegalizacionesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [solicitudes, setSolicitudes] = useState(
    cloneInitialLegalizacionesApro,
  );
  const [tab, setTabState] = useState<"pend" | "res">("pend");
  const {
    seleccion,
    toggleSeleccion,
    toggleSeleccionLote,
    clearSeleccion,
  } = useTableSelection();

  const setTab = useCallback(
    (next: "pend" | "res") => {
      setTabState(next);
      clearSeleccion();
    },
    [clearSeleccion],
  );

  const aplicarEstado = useCallback(
    (nos: string[], estado: LegalizacionAproEstado, comentario: string) => {
      setSolicitudes((prev) => {
        const next = { ...prev };
        nos.forEach((no) => {
          if (!next[no]) return;
          next[no] = {
            ...next[no],
            estadoApro: estado,
            comentarioApro: comentario,
            fechaApro: estado ? hoyDMY() : "",
            estado: estado === "Aprobado" ? "Aprobado" : "Rechazado",
            disponible: !!estado,
          };
        });
        return next;
      });
      clearSeleccion();
    },
    [clearSeleccion],
  );

  const aprobar = useCallback(
    (nos: string[], comentario = "") => {
      aplicarEstado(nos, "Aprobado", comentario);
    },
    [aplicarEstado],
  );

  const rechazar = useCallback(
    (nos: string[], comentario: string) => {
      aplicarEstado(nos, "Rechazado", comentario || "Rechazado");
    },
    [aplicarEstado],
  );

  const getSolicitud = useCallback(
    (no: string) => solicitudes[no],
    [solicitudes],
  );

  const kpis = useMemo(
    () => getLegalizacionesAproKpis(solicitudes),
    [solicitudes],
  );

  const registrosActuales = useMemo(
    () => filterLegalizacionesAproTab(solicitudes, tab),
    [solicitudes, tab],
  );

  const tabCounts = useMemo(
    () => ({
      pend: filterLegalizacionesAproTab(solicitudes, "pend").length,
      res: filterLegalizacionesAproTab(solicitudes, "res").length,
    }),
    [solicitudes],
  );

  const value = useMemo(
    () => ({
      solicitudes,
      kpis,
      tab,
      setTab,
      pendientesCount: kpis.pendientes,
      registrosActuales,
      getSolicitud,
      tabCounts,
      seleccion,
      toggleSeleccion,
      toggleSeleccionLote,
      clearSeleccion,
      aprobar,
      rechazar,
    }),
    [
      solicitudes,
      kpis,
      tab,
      setTab,
      registrosActuales,
      getSolicitud,
      tabCounts,
      seleccion,
      toggleSeleccion,
      toggleSeleccionLote,
      clearSeleccion,
      aprobar,
      rechazar,
    ],
  );

  return (
    <AprobacionLegalizacionesContext.Provider value={value}>
      {children}
    </AprobacionLegalizacionesContext.Provider>
  );
}

export function useAprobacionLegalizaciones() {
  const ctx = useContext(AprobacionLegalizacionesContext);
  if (!ctx) {
    throw new Error(
      "useAprobacionLegalizaciones debe usarse dentro de AprobacionLegalizacionesProvider",
    );
  }
  return ctx;
}

export function useAprobacionLegalizacionesOptional() {
  return useContext(AprobacionLegalizacionesContext);
}
