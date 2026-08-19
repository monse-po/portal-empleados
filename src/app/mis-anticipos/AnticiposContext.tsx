"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { getAnticiposRegistrosTab } from "@/src/lib/anticipos-filtros";
import {
  anticipoToAprobacion,
  aplicarTimelineAprobacion,
  estadoEmpleadoDesdeAccion,
  type IngresarAnticipoHandler,
  type RetirarAnticipoHandler,
  type SyncAnticipoAccion,
} from "@/src/lib/anticipos-bridge";
import type { LanzarAnticipoInput } from "@/src/lib/anticipos-db";
import {
  countAnticiposTab,
  SESSION_EMPLEADO,
  type Anticipo,
  type AnticipoExtra,
  type AnticipoTab,
} from "@/src/lib/mis-anticipos-mock";
import {
  cancelarAnticipoAction,
  lanzarAnticipoAction,
  listMisAnticiposAction,
} from "@/src/server/anticipos-actions";

export type { LanzarAnticipoInput };

type AnticiposContextValue = {
  anticipos: Record<string, Anticipo>;
  extras: Record<string, AnticipoExtra>;
  loaded: boolean;
  fromIfs: boolean;
  fromDb: boolean;
  sessionIds: string[];
  sessionNombre: string;
  tab: AnticipoTab;
  setTab: (tab: AnticipoTab) => void;
  tabCounts: { pendientes: number; disponibles: number };
  registrosActuales: Anticipo[];
  reloadAnticipos: () => Promise<void>;
  lanzarAnticipo: (
    input: LanzarAnticipoInput,
  ) => Promise<{ no: string | null; error?: string }>;
  cancelarAnticipo: (no: string) => Promise<boolean>;
  sincronizarDesdeAprobacion: (
    no: string,
    accion: SyncAnticipoAccion,
    comentario?: string,
  ) => void;
  getAnticipo: (no: string) => Anticipo | undefined;
  getExtra: (no: string) => AnticipoExtra | undefined;
};

const AnticiposContext = createContext<AnticiposContextValue | null>(null);

type AnticiposProviderProps = {
  children: ReactNode;
  onIngresarSolicitud?: IngresarAnticipoHandler;
  onRetirarSolicitud?: RetirarAnticipoHandler;
};

function applyLocalCancel(
  no: string,
  nombre: string,
  fecha: string,
  setAnticipos: Dispatch<SetStateAction<Record<string, Anticipo>>>,
  setExtras: Dispatch<SetStateAction<Record<string, AnticipoExtra>>>,
): boolean {
  let cancelled = false;
  setAnticipos((prev) => {
    const item = prev[no];
    if (!item || item.estado !== "Lanzado") return prev;
    cancelled = true;
    return {
      ...prev,
      [no]: {
        ...item,
        disponible: true,
        estado: "Cancelado",
        pago: "—",
      },
    };
  });
  setExtras((prev) => {
    const ex = prev[no];
    if (!ex) return prev;
    const tl = ex.tl.filter((t) => !t.accion.startsWith("Esperando"));
    return {
      ...prev,
      [no]: {
        ...ex,
        tl: [
          ...tl,
          {
            accion: "Cancelado por el empleado",
            usuario: nombre,
            fecha,
            icon: "ban",
            color: "#6b7280",
          },
        ],
      },
    };
  });
  return cancelled;
}

export function AnticiposProvider({
  children,
  onIngresarSolicitud,
  onRetirarSolicitud,
}: AnticiposProviderProps) {
  const [anticipos, setAnticipos] = useState<Record<string, Anticipo>>({});
  const [extras, setExtras] = useState<Record<string, AnticipoExtra>>({});
  const [loaded, setLoaded] = useState(false);
  const [fromIfs, setFromIfs] = useState(false);
  const [fromDb, setFromDb] = useState(false);
  const [sessionIds, setSessionIds] = useState<string[]>([
    SESSION_EMPLEADO.cedula.replace(/\./g, ""),
  ]);
  const [sessionNombre, setSessionNombre] = useState(SESSION_EMPLEADO.nombre);
  const [tab, setTab] = useState<AnticipoTab>("pendientes");

  const reloadAnticipos = useCallback(async () => {
    const result = await listMisAnticiposAction();
    setAnticipos(result.anticipos);
    setExtras(result.extras);
    setSessionIds(result.sessionIds);
    setSessionNombre(result.sessionNombre);
    setFromIfs(result.fromIfs);
    setFromDb(result.fromDb);
    setLoaded(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void listMisAnticiposAction()
      .then((result) => {
        if (cancelled) return;
        setAnticipos(result.anticipos);
        setExtras(result.extras);
        setSessionIds(result.sessionIds);
        setSessionNombre(result.sessionNombre);
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

  const lanzarAnticipo = useCallback(
    async (
      input: LanzarAnticipoInput,
    ): Promise<{ no: string | null; error?: string }> => {
      const result = await lanzarAnticipoAction(input);
      if (result.error || !result.no) {
        return { no: null, error: result.error || "No se pudo crear el anticipo" };
      }
      const fresh = await listMisAnticiposAction();
      setAnticipos(fresh.anticipos);
      setExtras(fresh.extras);
      setSessionIds(fresh.sessionIds);
      setSessionNombre(fresh.sessionNombre);
      setFromIfs(fresh.fromIfs);
      setFromDb(fresh.fromDb);
      setLoaded(true);
      const registro = fresh.anticipos[result.no];
      if (registro) {
        onIngresarSolicitud?.(
          anticipoToAprobacion(registro, fresh.extras[result.no]),
        );
      }
      return { no: result.no };
    },
    [onIngresarSolicitud],
  );

  const cancelarAnticipo = useCallback(
    async (no: string): Promise<boolean> => {
      const result = await cancelarAnticipoAction(no);
      if (result.ok) {
        await reloadAnticipos();
        onRetirarSolicitud?.(no);
        return true;
      }
      if (result.missing && !fromIfs) {
        const fecha = new Date();
        const d = String(fecha.getDate()).padStart(2, "0");
        const m = String(fecha.getMonth() + 1).padStart(2, "0");
        const y = fecha.getFullYear();
        const cancelled = applyLocalCancel(
          no,
          sessionNombre,
          `${d}/${m}/${y}`,
          setAnticipos,
          setExtras,
        );
        if (cancelled) onRetirarSolicitud?.(no);
        return cancelled;
      }
      return false;
    },
    [fromIfs, onRetirarSolicitud, reloadAnticipos, sessionNombre],
  );

  const sincronizarDesdeAprobacion = useCallback(
    (no: string, accion: SyncAnticipoAccion, comentario?: string) => {
      const estado = estadoEmpleadoDesdeAccion(accion);
      const fecha = new Date();
      const d = String(fecha.getDate()).padStart(2, "0");
      const m = String(fecha.getMonth() + 1).padStart(2, "0");
      const y = fecha.getFullYear();
      const fechaStr = `${d}/${m}/${y}`;

      setAnticipos((prev) => {
        const item = prev[no];
        if (!item || item.estado !== "Lanzado") return prev;
        return {
          ...prev,
          [no]: {
            ...item,
            estado,
            fechaAprob: fechaStr,
            disponible: accion !== "aprobado",
            pago: accion === "aprobado" ? "Pendiente" : "—",
          },
        };
      });

      setExtras((prev) => {
        const ex = prev[no];
        if (!ex) return prev;
        return {
          ...prev,
          [no]: aplicarTimelineAprobacion(ex, accion, comentario ?? "", fechaStr),
        };
      });

      void reloadAnticipos();
    },
    [reloadAnticipos],
  );

  const tabCounts = useMemo(
    () => countAnticiposTab(anticipos, sessionIds),
    [anticipos, sessionIds],
  );
  const registrosActuales = useMemo(
    () => getAnticiposRegistrosTab(anticipos, tab, sessionIds),
    [anticipos, sessionIds, tab],
  );

  const value = useMemo(
    () => ({
      anticipos,
      extras,
      loaded,
      fromIfs,
      fromDb,
      sessionIds,
      sessionNombre,
      tab,
      setTab,
      tabCounts,
      registrosActuales,
      reloadAnticipos,
      lanzarAnticipo,
      cancelarAnticipo,
      sincronizarDesdeAprobacion,
      getAnticipo: (no: string) => anticipos[no],
      getExtra: (no: string) => extras[no],
    }),
    [
      anticipos,
      extras,
      loaded,
      fromIfs,
      fromDb,
      sessionIds,
      sessionNombre,
      tab,
      tabCounts,
      registrosActuales,
      reloadAnticipos,
      lanzarAnticipo,
      cancelarAnticipo,
      sincronizarDesdeAprobacion,
    ],
  );

  return (
    <AnticiposContext.Provider value={value}>
      {children}
    </AnticiposContext.Provider>
  );
}

export function useAnticipos() {
  const ctx = useContext(AnticiposContext);
  if (!ctx) {
    throw new Error("useAnticipos debe usarse dentro de AnticiposProvider");
  }
  return ctx;
}
