"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { hoyDMY } from "@/src/lib/mis-anticipos-mock";
import type { SyncAnticipoHandler } from "@/src/lib/anticipos-bridge";
import {
  cloneInitialAproAnticipos,
  countAproAnticiposTabs,
  filterAproAnticiposByTab,
  GERENTE_APROBADOR,
  getAproAnticiposKpis,
  type AnticipoAprobacion,
  type AnticipoAprobacionEstado,
  type AnticipoAprobacionTab,
} from "@/src/lib/aprobacion-anticipos-mock";
import { useTableSelection } from "@/src/lib/use-table-selection";

type AprobacionAnticiposContextValue = {
  solicitudes: Record<string, AnticipoAprobacion>;
  kpis: ReturnType<typeof getAproAnticiposKpis>;
  pendientesCount: number;
  tab: AnticipoAprobacionTab;
  setTab: (tab: AnticipoAprobacionTab) => void;
  tabCounts: { pendientes: number; resueltas: number };
  seleccion: Set<string>;
  toggleSeleccion: (no: string) => void;
  toggleSeleccionLote: (nos: string[]) => void;
  clearSeleccion: () => void;
  registrosActuales: AnticipoAprobacion[];
  aprobar: (nos: string[], comentario?: string) => void;
  rechazar: (nos: string[], comentario: string) => void;
  ingresarSolicitud: (s: AnticipoAprobacion) => void;
  retirarSolicitud: (no: string) => void;
  getSolicitud: (no: string) => AnticipoAprobacion | undefined;
};

const AprobacionAnticiposContext =
  createContext<AprobacionAnticiposContextValue | null>(null);

type AprobacionAnticiposProviderProps = {
  children: ReactNode;
  onSyncAnticipo?: SyncAnticipoHandler;
};

export function AprobacionAnticiposProvider({
  children,
  onSyncAnticipo,
}: AprobacionAnticiposProviderProps) {
  const [solicitudes, setSolicitudes] = useState(cloneInitialAproAnticipos);
  const [tab, setTabState] = useState<AnticipoAprobacionTab>("pendientes");
  const {
    seleccion,
    toggleSeleccion,
    toggleSeleccionLote,
    clearSeleccion,
  } = useTableSelection();

  const setTab = useCallback(
    (next: AnticipoAprobacionTab) => {
      setTabState(next);
      clearSeleccion();
    },
    [clearSeleccion],
  );

  const aplicarEstado = useCallback(
    (
      nos: string[],
      estado: AnticipoAprobacionEstado,
      comentario: string,
    ) => {
      setSolicitudes((prev) => {
        const next = { ...prev };
        nos.forEach((no) => {
          if (!next[no]) return;
          next[no] = {
            ...next[no],
            estadoApro: estado,
            comentarioApro: comentario,
            fechaApro: estado ? hoyDMY() : "",
            aprobador: estado ? GERENTE_APROBADOR : "",
          };
        });
        return next;
      });

      if (estado === "Aprobado" || estado === "Rechazado") {
        const accion = estado === "Aprobado" ? "aprobado" : "rechazado";
        nos.forEach((no) => onSyncAnticipo?.(no, accion, comentario));
      }
    },
    [onSyncAnticipo],
  );

  const aprobar = useCallback(
    (nos: string[], comentario = "") => {
      aplicarEstado(nos, "Aprobado", comentario);
      clearSeleccion();
    },
    [aplicarEstado, clearSeleccion],
  );

  const rechazar = useCallback(
    (nos: string[], comentario: string) => {
      aplicarEstado(nos, "Rechazado", comentario);
      clearSeleccion();
    },
    [aplicarEstado, clearSeleccion],
  );

  const ingresarSolicitud = useCallback((s: AnticipoAprobacion) => {
    setSolicitudes((prev) => {
      if (prev[s.no]) return prev;
      return { ...prev, [s.no]: s };
    });
  }, []);

  const retirarSolicitud = useCallback((no: string) => {
    setSolicitudes((prev) => {
      const item = prev[no];
      if (!item || item.estadoApro !== "") return prev;
      const next = { ...prev };
      delete next[no];
      return next;
    });
  }, []);

  const kpis = useMemo(() => getAproAnticiposKpis(solicitudes), [solicitudes]);
  const tabCounts = useMemo(
    () => countAproAnticiposTabs(solicitudes),
    [solicitudes],
  );
  const registrosActuales = useMemo(
    () => filterAproAnticiposByTab(solicitudes, tab),
    [solicitudes, tab],
  );

  const value = useMemo(
    () => ({
      solicitudes,
      kpis,
      pendientesCount: kpis.pendientes,
      tab,
      setTab,
      tabCounts,
      seleccion,
      toggleSeleccion,
      toggleSeleccionLote,
      clearSeleccion,
      registrosActuales,
      aprobar,
      rechazar,
      ingresarSolicitud,
      retirarSolicitud,
      getSolicitud: (no: string) => solicitudes[no],
    }),
    [
      solicitudes,
      kpis,
      tab,
      tabCounts,
      seleccion,
      toggleSeleccion,
      toggleSeleccionLote,
      clearSeleccion,
      registrosActuales,
      aprobar,
      rechazar,
      ingresarSolicitud,
      retirarSolicitud,
      setTab,
    ],
  );

  return (
    <AprobacionAnticiposContext.Provider value={value}>
      {children}
    </AprobacionAnticiposContext.Provider>
  );
}

export function useAprobacionAnticipos() {
  const ctx = useContext(AprobacionAnticiposContext);
  if (!ctx) {
    throw new Error(
      "useAprobacionAnticipos debe usarse dentro de AprobacionAnticiposProvider",
    );
  }
  return ctx;
}

export function useAprobacionAnticiposOptional() {
  return useContext(AprobacionAnticiposContext);
}
