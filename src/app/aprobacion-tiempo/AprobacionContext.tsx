"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  filterHojasByTab,
  getAprobacionKpis,
  hoyDMY,
  type HojaAprobacion,
} from "@/src/lib/aprobacion-tiempo-mock";
import type { SyncRegistroAccion, SyncRegistroHandler } from "@/src/lib/tiempo-bridge";
import { useTableSelection } from "@/src/lib/use-table-selection";
import { resolverAprobacionTiempoAction } from "@/src/server/mi-tiempo-actions";
import { createNotificacionesTiempoDecisionAction } from "@/src/server/notificacion-actions";
import type { HojaNotificacionInput } from "@/src/lib/notificacion-tiempo";
import { SESSION_EMPLEADO } from "@/src/lib/mis-anticipos-mock";

function toHojaNotifInput(hoja: HojaAprobacion): HojaNotificacionInput {
  return {
    no: hoja.no,
    fecha: hoja.fecha,
    cedula: hoja.cedula,
    nombre: hoja.nombre,
    proy: hoja.proy,
  };
}

export type AprobacionDecisionResult = {
  ok: boolean;
  error?: string;
  sentToIfs?: boolean;
  stale?: boolean;
};

type AprobacionContextValue = {
  hojas: Record<string, HojaAprobacion>;
  kpis: ReturnType<typeof getAprobacionKpis>;
  pendientesCount: number;
  tab: "pend" | "res";
  setTab: (tab: "pend" | "res") => void;
  seleccion: Set<string>;
  toggleSeleccion: (no: string) => void;
  toggleSeleccionLote: (nos: string[]) => void;
  clearSeleccion: () => void;
  registrosActuales: HojaAprobacion[];
  ingresarHojas: (hojas: HojaAprobacion[]) => void;
  /** Retira de la cola por registroId (empleado borró o anulación). */
  retirarHojas: (registroIds: string[]) => void;
  syncPendientesDesdeDb: (hojas: HojaAprobacion[]) => void;
  aprobar: (
    nos: string[],
    comentario?: string,
  ) => Promise<AprobacionDecisionResult>;
  rechazar: (
    nos: string[],
    comentario: string,
  ) => Promise<AprobacionDecisionResult>;
  anular: (nos: string[]) => void;
  getHoja: (no: string) => HojaAprobacion | undefined;
  tabCounts: { pend: number; res: number };
};

const AprobacionContext = createContext<AprobacionContextValue | null>(null);

type AprobacionProviderProps = {
  children: ReactNode;
  onSyncRegistro?: SyncRegistroHandler;
};

export function AprobacionProvider({
  children,
  onSyncRegistro,
}: AprobacionProviderProps) {
  const [hojas, setHojas] = useState<Record<string, HojaAprobacion>>(() => ({}));
  const hojasRef = useRef(hojas);
  hojasRef.current = hojas;
  const [tab, setTab] = useState<"pend" | "res">("pend");
  const {
    seleccion,
    toggleSeleccion,
    toggleSeleccionLote,
    clearSeleccion,
  } = useTableSelection();

  const ingresarHojas = useCallback((nuevas: HojaAprobacion[]) => {
    setHojas((prev) => {
      const next = { ...prev };
      nuevas.forEach((hoja) => {
        const existing = next[hoja.no];
        // Upsert: refresca datos si el empleado editó un Registrado aún pendiente.
        if (existing?.estadoApro) {
          return;
        }
        next[hoja.no] = {
          ...hoja,
          estadoApro: existing?.estadoApro ?? "",
          comentarioApro: existing?.comentarioApro ?? "",
          fechaApro: existing?.fechaApro ?? "",
          aprobador: existing?.aprobador ?? "",
        };
      });
      return next;
    });
  }, []);

  const retirarHojas = useCallback((registroIds: string[]) => {
    if (!registroIds.length) return;
    const idSet = new Set(registroIds);
    setHojas((prev) => {
      const next = { ...prev };
      Object.values(prev).forEach((h) => {
        if (h.registroId && idSet.has(h.registroId) && !h.estadoApro) {
          delete next[h.no];
        }
      });
      return next;
    });
  }, []);

  const syncPendientesDesdeDb = useCallback(
    (pendientes: HojaAprobacion[]) => {
      setHojas((prev) => {
        const resueltas = Object.fromEntries(
          Object.entries(prev).filter(([, h]) => !!h.estadoApro),
        );
        const pend = Object.fromEntries(pendientes.map((h) => [h.no, h]));
        return { ...resueltas, ...pend };
      });
    },
    [],
  );

  const syncRegistro = useCallback(
    (registroId: string, accion: SyncRegistroAccion, comentario = "") => {
      onSyncRegistro?.(registroId, accion, comentario);
    },
    [onSyncRegistro],
  );

  const aplicarEstado = useCallback(
    (
      nos: string[],
      estado: HojaAprobacion["estadoApro"],
      comentario: string,
    ) => {
      const toSync: Array<{
        id: string;
        accion: SyncRegistroAccion;
        comentario: string;
      }> = [];

      setHojas((prev) => {
        const next = { ...prev };
        nos.forEach((no) => {
          if (!next[no]) return;
          const registroId = next[no].registroId;
          next[no] = {
            ...next[no],
            estadoApro: estado,
            comentarioApro: comentario,
            fechaApro: estado ? hoyDMY() : "",
            aprobador: estado ? SESSION_EMPLEADO.nombre : "",
          };
          if (!registroId) return;
          if (estado === "Aprobado") {
            toSync.push({ id: registroId, accion: "aprobado", comentario });
          } else if (estado === "Rechazado") {
            toSync.push({ id: registroId, accion: "rechazado", comentario });
          }
        });
        return next;
      });

      toSync.forEach(({ id, accion, comentario: syncComentario }) => {
        syncRegistro(id, accion, syncComentario);
      });
    },
    [syncRegistro],
  );

  const resolverDecision = useCallback(
    async (
      nos: string[],
      decision: "aprobado" | "rechazado",
      comentario: string,
    ): Promise<AprobacionDecisionResult> => {
      const registroIds = nos
        .map((no) => hojasRef.current[no]?.registroId)
        .filter((id): id is string => !!id);

      if (!registroIds.length) {
        return {
          ok: false,
          error: "No hay registros válidos para resolver.",
        };
      }

      const hojasDecision = nos
        .map((no) => hojasRef.current[no])
        .filter((h): h is HojaAprobacion => !!h);

      const result = await resolverAprobacionTiempoAction({
        registroIds,
        decision,
        comentario,
      });

      if (!result.ok) {
        return {
          ok: false,
          error: result.error,
          sentToIfs: result.sentToIfs,
          stale: result.stale,
        };
      }

      aplicarEstado(
        nos,
        decision === "aprobado" ? "Aprobado" : "Rechazado",
        comentario,
      );
      clearSeleccion();

      void createNotificacionesTiempoDecisionAction({
        decision,
        hojas: hojasDecision.map(toHojaNotifInput),
        comentario,
      }).catch((error) => {
        console.error("[notificaciones] no se pudo notificar al empleado", error);
      });

      return { ok: true, sentToIfs: result.sentToIfs };
    },
    [aplicarEstado, clearSeleccion],
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

  const anular = useCallback(
    (nos: string[]) => {
      const toSync: string[] = [];
      const hojasAnuladas = nos
        .map((no) => hojasRef.current[no])
        .filter((h): h is HojaAprobacion => !!h);

      setHojas((prev) => {
        const next = { ...prev };
        nos.forEach((no) => {
          if (!next[no]) return;
          const registroId = next[no].registroId;
          if (registroId) toSync.push(registroId);
          // Sale de la cola; el empleado vuelve a Registrado vía sync.
          delete next[no];
        });
        return next;
      });

      toSync.forEach((id) => {
        syncRegistro(id, "anulado", "");
      });
      clearSeleccion();

      void createNotificacionesTiempoDecisionAction({
        decision: "anulado",
        hojas: hojasAnuladas.map(toHojaNotifInput),
      }).catch((error) => {
        console.error("[notificaciones] no se pudo notificar anulación", error);
      });
    },
    [syncRegistro, clearSeleccion],
  );

  const kpis = useMemo(() => getAprobacionKpis(hojas), [hojas]);
  const registrosActuales = useMemo(
    () => filterHojasByTab(hojas, tab),
    [hojas, tab],
  );

  const tabCounts = useMemo(
    () => ({
      pend: filterHojasByTab(hojas, "pend").length,
      res: filterHojasByTab(hojas, "res").length,
    }),
    [hojas],
  );

  const value = useMemo(
    () => ({
      hojas,
      kpis,
      pendientesCount: kpis.pendientes,
      tab,
      setTab,
      seleccion,
      toggleSeleccion,
      toggleSeleccionLote,
      clearSeleccion,
      registrosActuales,
      ingresarHojas,
      retirarHojas,
      syncPendientesDesdeDb,
      aprobar,
      rechazar,
      anular,
      getHoja: (no: string) => hojas[no],
      tabCounts,
    }),
    [
      hojas,
      kpis,
      tab,
      seleccion,
      toggleSeleccion,
      toggleSeleccionLote,
      clearSeleccion,
      registrosActuales,
      ingresarHojas,
      retirarHojas,
      syncPendientesDesdeDb,
      aprobar,
      rechazar,
      anular,
      tabCounts,
    ],
  );

  return (
    <AprobacionContext.Provider value={value}>
      {children}
    </AprobacionContext.Provider>
  );
}

export function useAprobacion() {
  const ctx = useContext(AprobacionContext);
  if (!ctx) {
    throw new Error("useAprobacion debe usarse dentro de AprobacionProvider");
  }
  return ctx;
}

export function useAprobacionOptional() {
  return useContext(AprobacionContext);
}
