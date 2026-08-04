"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  countAproAnticiposTabs,
  filterAproAnticiposByTab,
  getAproAnticiposKpis,
  type AnticipoAprobacion,
  type AnticipoAprobacionTab,
} from "@/src/lib/aprobacion-anticipos-registro";
import {
  aprobarAnticiposAction,
  getAprobacionAnticiposAction,
  rechazarAnticiposAction,
} from "@/src/server/aprobacion-anticipos-actions";
import { useTableSelection } from "@/src/lib/use-table-selection";

type AprobacionAnticiposContextValue = {
  solicitudes: Record<string, AnticipoAprobacion>;
  loaded: boolean;
  loadError: string | null;
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
  reload: () => Promise<void>;
  aprobar: (nos: string[], comentario?: string) => Promise<void>;
  rechazar: (nos: string[], comentario: string) => Promise<void>;
  getSolicitud: (no: string) => AnticipoAprobacion | undefined;
};

const AprobacionAnticiposContext =
  createContext<AprobacionAnticiposContextValue | null>(null);

export function AprobacionAnticiposProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [solicitudes, setSolicitudes] = useState<
    Record<string, AnticipoAprobacion>
  >({});
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTabState] = useState<AnticipoAprobacionTab>("pendientes");
  const {
    seleccion,
    toggleSeleccion,
    toggleSeleccionLote,
    clearSeleccion,
  } = useTableSelection();

  const reload = useCallback(async () => {
    setLoadError(null);
    try {
      const data = await getAprobacionAnticiposAction();
      setSolicitudes(data);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las solicitudes.",
      );
      setSolicitudes({});
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setTab = useCallback(
    (next: AnticipoAprobacionTab) => {
      setTabState(next);
      clearSeleccion();
    },
    [clearSeleccion],
  );

  const aprobar = useCallback(
    async (nos: string[], comentario = "") => {
      await aprobarAnticiposAction(nos, comentario);
      clearSeleccion();
      await reload();
    },
    [clearSeleccion, reload],
  );

  const rechazar = useCallback(
    async (nos: string[], comentario: string) => {
      await rechazarAnticiposAction(nos, comentario);
      clearSeleccion();
      await reload();
    },
    [clearSeleccion, reload],
  );

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
      loaded,
      loadError,
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
      reload,
      aprobar,
      rechazar,
      getSolicitud: (no: string) => solicitudes[no],
    }),
    [
      solicitudes,
      loaded,
      loadError,
      kpis,
      tab,
      tabCounts,
      seleccion,
      toggleSeleccion,
      toggleSeleccionLote,
      clearSeleccion,
      registrosActuales,
      reload,
      aprobar,
      rechazar,
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
