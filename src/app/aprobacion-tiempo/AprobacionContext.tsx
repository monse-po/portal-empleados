"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  cloneInitialHojas,
  filterHojasByProyTab,
  getAprobacionKpis,
  getProyConMasPendientes,
  getProyectosList,
  hoyDMY,
  type HojaAprobacion,
} from "@/src/lib/aprobacion-tiempo-mock";
import type { SyncRegistroAccion, SyncRegistroHandler } from "@/src/lib/tiempo-bridge";
import { useTableSelection } from "@/src/lib/use-table-selection";

type AprobacionContextValue = {
  hojas: Record<string, HojaAprobacion>;
  kpis: ReturnType<typeof getAprobacionKpis>;
  pendientesCount: number;
  proyectos: ReturnType<typeof getProyectosList>;
  proySel: string;
  setProySel: (cod: string) => void;
  tab: "pend" | "res";
  setTab: (tab: "pend" | "res") => void;
  seleccion: Set<string>;
  toggleSeleccion: (no: string) => void;
  toggleSeleccionLote: (nos: string[]) => void;
  clearSeleccion: () => void;
  registrosActuales: HojaAprobacion[];
  ingresarHojas: (hojas: HojaAprobacion[]) => void;
  aprobar: (nos: string[], comentario?: string) => void;
  rechazar: (nos: string[], comentario: string) => void;
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
  const [hojas, setHojas] = useState(cloneInitialHojas);
  const [proySel, setProySelState] = useState(() =>
    getProyConMasPendientes(cloneInitialHojas()),
  );
  const [tab, setTab] = useState<"pend" | "res">("pend");
  const {
    seleccion,
    toggleSeleccion,
    toggleSeleccionLote,
    clearSeleccion,
  } = useTableSelection();

  const setProySel = useCallback((cod: string) => {
    setProySelState((prev) => (prev === cod ? prev : cod));
  }, []);

  const prevProySelRef = useRef(proySel);
  useEffect(() => {
    if (prevProySelRef.current === proySel) return;
    prevProySelRef.current = proySel;
    clearSeleccion();
  }, [proySel, clearSeleccion]);

  const ingresarHojas = useCallback((nuevas: HojaAprobacion[]) => {
    setHojas((prev) => {
      const next = { ...prev };
      nuevas.forEach((hoja) => {
        if (!next[hoja.no]) next[hoja.no] = hoja;
      });
      return next;
    });
  }, []);

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
            aprobador: estado ? "Carlos Rivas Mora" : "",
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

  const anular = useCallback(
    (nos: string[]) => {
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
            estadoApro: "",
            comentarioApro: "",
            fechaApro: "",
            aprobador: "",
          };
          if (registroId) {
            toSync.push({ id: registroId, accion: "anulado", comentario: "" });
          }
        });
        return next;
      });

      toSync.forEach(({ id, accion, comentario }) => {
        syncRegistro(id, accion, comentario);
      });
      clearSeleccion();
    },
    [syncRegistro, clearSeleccion],
  );

  const kpis = useMemo(() => getAprobacionKpis(hojas), [hojas]);
  const proyectos = useMemo(() => getProyectosList(hojas), [hojas]);
  const registrosActuales = useMemo(
    () => (proySel ? filterHojasByProyTab(hojas, proySel, tab) : []),
    [hojas, proySel, tab],
  );

  const tabCounts = useMemo(() => {
    if (!proySel) return { pend: 0, res: 0 };
    return {
      pend: filterHojasByProyTab(hojas, proySel, "pend").length,
      res: filterHojasByProyTab(hojas, proySel, "res").length,
    };
  }, [hojas, proySel]);

  const value = useMemo(
    () => ({
      hojas,
      kpis,
      pendientesCount: kpis.pendientes,
      proyectos,
      proySel,
      setProySel,
      tab,
      setTab,
      seleccion,
      toggleSeleccion,
      toggleSeleccionLote,
      clearSeleccion,
      registrosActuales,
      ingresarHojas,
      aprobar,
      rechazar,
      anular,
      getHoja: (no: string) => hojas[no],
      tabCounts,
    }),
    [
      hojas,
      kpis,
      proyectos,
      proySel,
      setProySel,
      tab,
      seleccion,
      toggleSeleccion,
      toggleSeleccionLote,
      clearSeleccion,
      registrosActuales,
      ingresarHojas,
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
