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
  decidirAnticiposAction,
  listAprobacionAnticiposAction,
} from "@/src/server/anticipos-actions";
import { createNotificacionesAnticipoDecisionAction } from "@/src/server/notificacion-actions";
import { getIfsSessionStatusAction } from "@/src/server/mi-tiempo-catalog-actions";
import { ANTICIPOS_CHANGED_EVENT } from "@/src/lib/ifs/portal-events";
import { useTableSelection } from "@/src/lib/use-table-selection";

type AprobacionAnticiposContextValue = {
  solicitudes: Record<string, AnticipoAprobacion>;
  loaded: boolean;
  loadError: string | null;
  fromIfs: boolean;
  ifsConnected: boolean;
  ifsEmail: string | null;
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
  const [fromIfs, setFromIfs] = useState(false);
  const [ifsConnected, setIfsConnected] = useState(false);
  const [ifsEmail, setIfsEmail] = useState<string | null>(null);
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
      const data = await listAprobacionAnticiposAction();
      setSolicitudes(data.solicitudes);
      setFromIfs(data.fromIfs);
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar las solicitudes.",
      );
      setSolicitudes({});
      setFromIfs(false);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    void getIfsSessionStatusAction().then((status) => {
      setIfsConnected(status.connected);
      setIfsEmail(status.email ?? null);
    });
  }, []);

  const setTab = useCallback(
    (next: AnticipoAprobacionTab) => {
      setTabState(next);
      clearSeleccion();
    },
    [clearSeleccion],
  );

  const resolverDecision = useCallback(
    async (
      nos: string[],
      accion: "aprobado" | "rechazado",
      comentario: string,
    ) => {
      const solicitudesDecision = nos
        .map((no) => solicitudes[no])
        .filter((s): s is AnticipoAprobacion => !!s);

      const result = await decidirAnticiposAction({
        nos,
        accion,
        comentario,
      });
      clearSeleccion();

      if (!result.persisted.length) {
        throw new Error(
          result.error || "No se pudo completar la decisión en IFS.",
        );
      }

      const notificar = solicitudesDecision.filter((s) =>
        result.persisted.includes(s.no),
      );
      void createNotificacionesAnticipoDecisionAction({
        decision: accion,
        solicitudes: notificar.map((s) => ({
          no: s.no,
          fecha: s.fecha,
          cedula: s.cedula,
          nombre: s.nombre || s.solicitante,
          proy: s.proy,
        })),
        comentario,
      }).catch((error) => {
        console.error("[notificaciones] no se pudo notificar el anticipo", error);
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event(ANTICIPOS_CHANGED_EVENT));
      }

      await reload();

      if (result.error) {
        throw new Error(result.error);
      }
    },
    [clearSeleccion, reload, solicitudes],
  );

  const aprobar = useCallback(
    (nos: string[], comentario = "") =>
      resolverDecision(nos, "aprobado", comentario),
    [resolverDecision],
  );

  const rechazar = useCallback(
    (nos: string[], comentario: string) =>
      resolverDecision(nos, "rechazado", comentario),
    [resolverDecision],
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
      fromIfs,
      ifsConnected,
      ifsEmail,
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
      fromIfs,
      ifsConnected,
      ifsEmail,
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
