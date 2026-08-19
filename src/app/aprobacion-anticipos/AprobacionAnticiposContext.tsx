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
import type { SyncAnticipoHandler } from "@/src/lib/anticipos-bridge";
import {
  countAproAnticiposTabs,
  filterAproAnticiposByTab,
  GERENTE_APROBADOR,
  getAproAnticiposKpis,
  type AnticipoAprobacion,
  type AnticipoAprobacionEstado,
  type AnticipoAprobacionTab,
} from "@/src/lib/aprobacion-anticipos-mock";
import { useTableSelection } from "@/src/lib/use-table-selection";
import {
  decidirAnticiposAction,
  listAprobacionAnticiposAction,
} from "@/src/server/anticipos-actions";

function fechaHoyLocal(): string {
  const fecha = new Date();
  const d = String(fecha.getDate()).padStart(2, "0");
  const m = String(fecha.getMonth() + 1).padStart(2, "0");
  const y = fecha.getFullYear();
  return `${d}/${m}/${y}`;
}

type AprobacionAnticiposContextValue = {
  solicitudes: Record<string, AnticipoAprobacion>;
  loaded: boolean;
  fromIfs: boolean;
  fromDb: boolean;
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
  reloadSolicitudes: () => Promise<void>;
  aprobar: (
    nos: string[],
    comentario?: string,
  ) => Promise<{ ok: boolean; error?: string }>;
  rechazar: (
    nos: string[],
    comentario: string,
  ) => Promise<{ ok: boolean; error?: string }>;
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
  const [solicitudes, setSolicitudes] = useState<
    Record<string, AnticipoAprobacion>
  >({});
  const [loaded, setLoaded] = useState(false);
  const [fromIfs, setFromIfs] = useState(false);
  const [fromDb, setFromDb] = useState(false);
  const [sessionNombre, setSessionNombre] = useState(GERENTE_APROBADOR);
  const [tab, setTabState] = useState<AnticipoAprobacionTab>("pendientes");
  const {
    seleccion,
    toggleSeleccion,
    toggleSeleccionLote,
    clearSeleccion,
  } = useTableSelection();

  const reloadSolicitudes = useCallback(async (alsoRequestNos: string[] = []) => {
    const result = await listAprobacionAnticiposAction(alsoRequestNos);
    setSolicitudes(result.solicitudes);
    setSessionNombre(result.sessionNombre || GERENTE_APROBADOR);
    setFromIfs(result.fromIfs);
    setFromDb(result.fromDb);
    setLoaded(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void listAprobacionAnticiposAction()
      .then((result) => {
        if (cancelled) return;
        setSolicitudes(result.solicitudes);
        setSessionNombre(result.sessionNombre || GERENTE_APROBADOR);
        setFromIfs(result.fromIfs);
        setFromDb(result.fromDb);
      })
      .catch(() => {
        if (cancelled) return;
        setFromIfs(false);
        setFromDb(false);
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setTab = useCallback(
    (next: AnticipoAprobacionTab) => {
      setTabState(next);
      clearSeleccion();
    },
    [clearSeleccion],
  );

  const aplicarEstadoLocal = useCallback(
    (nos: string[], estado: AnticipoAprobacionEstado, comentario: string) => {
      const fecha = fechaHoyLocal();
      const aprobador = fromIfs ? sessionNombre : GERENTE_APROBADOR;
      setSolicitudes((prev) => {
        const next = { ...prev };
        nos.forEach((no) => {
          if (!next[no]) return;
          next[no] = {
            ...next[no],
            estadoApro: estado,
            comentarioApro: comentario,
            fechaApro: estado ? fecha : "",
            aprobador: estado ? aprobador : "",
          };
        });
        return next;
      });

      if (estado === "Aprobado" || estado === "Rechazado") {
        const accion = estado === "Aprobado" ? "aprobado" : "rechazado";
        nos.forEach((no) => onSyncAnticipo?.(no, accion, comentario));
      }
    },
    [fromIfs, onSyncAnticipo, sessionNombre],
  );

  const decidir = useCallback(
    async (
      nos: string[],
      estado: AnticipoAprobacionEstado,
      comentario: string,
    ): Promise<{ ok: boolean; error?: string }> => {
      aplicarEstadoLocal(nos, estado, comentario);
      clearSeleccion();
      const result = await decidirAnticiposAction({
        nos,
        accion: estado === "Aprobado" ? "aprobado" : "rechazado",
        comentario,
        aprobadorNombre: fromIfs ? sessionNombre : undefined,
      });
      if (result.persisted.length || fromDb || fromIfs || result.error) {
        await reloadSolicitudes(result.persisted);
      }
      return {
        ok: result.ok && !result.error,
        error: result.error,
      };
    },
    [
      aplicarEstadoLocal,
      clearSeleccion,
      fromDb,
      fromIfs,
      reloadSolicitudes,
      sessionNombre,
    ],
  );

  const aprobar = useCallback(
    async (nos: string[], comentario = "") => {
      return decidir(nos, "Aprobado", comentario);
    },
    [decidir],
  );

  const rechazar = useCallback(
    async (nos: string[], comentario: string) => {
      return decidir(nos, "Rechazado", comentario);
    },
    [decidir],
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
      loaded,
      fromIfs,
      fromDb,
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
      reloadSolicitudes,
      aprobar,
      rechazar,
      ingresarSolicitud,
      retirarSolicitud,
      getSolicitud: (no: string) => solicitudes[no],
    }),
    [
      solicitudes,
      loaded,
      fromIfs,
      fromDb,
      kpis,
      tab,
      tabCounts,
      seleccion,
      toggleSeleccion,
      toggleSeleccionLote,
      clearSeleccion,
      registrosActuales,
      reloadSolicitudes,
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
