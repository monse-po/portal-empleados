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
  comentarioRechazoDesdeAccion,
  estadoDesdeAccionAprobacion,
  registroToHoja,
  type SyncRegistroAccion,
} from "@/src/lib/tiempo-bridge";
import type { RegistroEstado, RegistroMock } from "@/src/lib/mi-tiempo-mock";
import type { HojaAprobacion } from "@/src/lib/aprobacion-tiempo-mock";
import { isIfsRegistroId } from "@/src/lib/ifs/tiempo-timesheet";
import {
  deleteRegistroAction,
  enviarDiaAction,
  getRegistrosGroupedAction,
  updateRegistroEstadoAction,
  upsertRegistroAction,
  type EnviarDiaResult,
} from "@/src/server/mi-tiempo-actions";
import { getIfsSessionStatusAction } from "@/src/server/mi-tiempo-catalog-actions";

export type { EnviarDiaResult };

export type RegistrarModalState = {
  editId?: string;
  fecha?: string;
  /** Abierto desde tab Lista — un solo botón guardar; envío desde vista día. */
  origen?: "lista" | "dia";
} | null;

type RegistroGuardadoHandler = (fecha: string) => void;

export type GuardarRegistroMode = "guardar" | "enviar";

function upsertIntoRegistros(
  prev: Record<string, RegistroMock[]>,
  reg: RegistroMock,
): Record<string, RegistroMock[]> {
  const next: Record<string, RegistroMock[]> = {};
  for (const [fecha, arr] of Object.entries(prev)) {
    const filtered = arr.filter((r) => r.id !== reg.id);
    if (filtered.length) next[fecha] = filtered;
  }
  if (!next[reg.fecha]) next[reg.fecha] = [];
  next[reg.fecha] = [...next[reg.fecha], reg];
  return next;
}

function removeRegistroFromState(
  prev: Record<string, RegistroMock[]>,
  id: string,
): Record<string, RegistroMock[]> {
  const next: Record<string, RegistroMock[]> = {};
  for (const [fecha, arr] of Object.entries(prev)) {
    const filtered = arr.filter((r) => r.id !== id);
    if (filtered.length) next[fecha] = filtered;
  }
  return next;
}

type MiTiempoContextValue = {
  registros: Record<string, RegistroMock[]>;
  registrosLoaded: boolean;
  registrosError: string | null;
  registrosFromIfs: boolean;
  ifsConnected: boolean;
  ifsEmail: string | null;
  reloadRegistros: () => Promise<void>;
  upsertRegistro: (reg: RegistroMock) => Promise<void>;
  upsertRegistroYEnviarDia: (reg: RegistroMock) => Promise<EnviarDiaResult>;
  deleteRegistro: (id: string) => Promise<void>;
  enviarDia: (fecha: string) => Promise<EnviarDiaResult>;
  sincronizarDesdeAprobacion: (
    id: string,
    accion: SyncRegistroAccion,
    comentario?: string,
  ) => Promise<void>;
  modal: RegistrarModalState;
  openRegistrarModal: (opts?: {
    editId?: string;
    fecha?: string;
    origen?: "lista" | "dia";
  }) => void;
  closeRegistrarModal: () => void;
  setRegistroGuardadoHandler: (handler?: RegistroGuardadoHandler) => void;
};

const MiTiempoContext = createContext<MiTiempoContextValue | null>(null);

type MiTiempoProviderProps = {
  children: ReactNode;
  onIngresarHojas?: (hojas: HojaAprobacion[]) => void;
  onRetirarHojas?: (registroIds: string[]) => void;
};

export function MiTiempoProvider({
  children,
  onIngresarHojas,
  onRetirarHojas,
}: MiTiempoProviderProps) {
  const [registros, setRegistros] = useState<Record<string, RegistroMock[]>>({});
  const [registrosLoaded, setRegistrosLoaded] = useState(false);
  const [registrosError, setRegistrosError] = useState<string | null>(null);
  const [registrosFromIfs, setRegistrosFromIfs] = useState(false);
  const [ifsConnected, setIfsConnected] = useState(false);
  const [ifsEmail, setIfsEmail] = useState<string | null>(null);
  const [modal, setModal] = useState<RegistrarModalState>(null);
  const registroGuardadoHandler = useRef<RegistroGuardadoHandler | undefined>(
    undefined,
  );

  const reloadRegistros = useCallback(async () => {
    setRegistrosError(null);
    try {
      const result = await getRegistrosGroupedAction();
      setRegistros(result.registros);
      setRegistrosFromIfs(result.fromIfs);
      if (result.warning) {
        setRegistrosError(
          "No se pudo leer la hoja de IFS. Mostrando registros locales.",
        );
      }
    } catch {
      setRegistrosFromIfs(false);
      setRegistrosError(
        "No se pudieron cargar los registros. Revisa la conexión o la base de datos.",
      );
    } finally {
      setRegistrosLoaded(true);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setRegistrosError(null);
      try {
        const result = await getRegistrosGroupedAction();
        if (cancelled) return;
        setRegistros(result.registros);
        setRegistrosFromIfs(result.fromIfs);
        if (result.warning) {
          setRegistrosError(
            "No se pudo leer la hoja de IFS. Mostrando registros locales.",
          );
        }
      } catch {
        if (cancelled) return;
        setRegistrosFromIfs(false);
        setRegistrosError(
          "No se pudieron cargar los registros. Revisa la conexión o la base de datos.",
        );
      } finally {
        if (!cancelled) setRegistrosLoaded(true);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    void getIfsSessionStatusAction().then((status) => {
      setIfsConnected(status.connected);
      setIfsEmail(status.email ?? null);
    });
  }, []);

  const setRegistroGuardadoHandler = useCallback(
    (handler?: RegistroGuardadoHandler) => {
      registroGuardadoHandler.current = handler;
    },
    [],
  );

  const upsertRegistro = useCallback(
    async (reg: RegistroMock) => {
      const saved = await upsertRegistroAction(reg);
      if (isIfsRegistroId(saved.id)) {
        // Objversion IFS cambia tras update — refrescar timesheet.
        const fresh = await getRegistrosGroupedAction();
        setRegistros(fresh.registros);
        setRegistrosFromIfs(fresh.fromIfs);
      } else {
        setRegistros((prev) => upsertIntoRegistros(prev, saved));
      }
      if (saved.estado === "Lanzado") {
        onIngresarHojas?.([registroToHoja(saved)]);
      }
      registroGuardadoHandler.current?.(saved.fecha);
    },
    [onIngresarHojas],
  );

  const upsertRegistroYEnviarDia = useCallback(
    async (reg: RegistroMock) => {
      await upsertRegistroAction(reg);
      const result = await enviarDiaAction(reg.fecha);
      if (result.enviados.length) {
        onIngresarHojas?.(result.enviados.map((r) => registroToHoja(r)));
      }
      const fresh = await getRegistrosGroupedAction();
      setRegistros(fresh.registros);
      setRegistrosFromIfs(fresh.fromIfs);
      registroGuardadoHandler.current?.(reg.fecha);
      return result;
    },
    [onIngresarHojas],
  );

  const deleteRegistro = useCallback(
    async (id: string) => {
      await deleteRegistroAction(id);
      if (isIfsRegistroId(id)) {
        const fresh = await getRegistrosGroupedAction();
        setRegistros(fresh.registros);
        setRegistrosFromIfs(fresh.fromIfs);
      } else {
        setRegistros((prev) => removeRegistroFromState(prev, id));
      }
      onRetirarHojas?.([id]);
    },
    [onRetirarHojas],
  );

  const sincronizarDesdeAprobacion = useCallback(
    async (id: string, accion: SyncRegistroAccion, comentario?: string) => {
      // Registros IFS: el estado vive en IFS; refrescar timesheet en vez de Neon.
      if (isIfsRegistroId(id)) {
        const fresh = await getRegistrosGroupedAction();
        setRegistros(fresh.registros);
        setRegistrosFromIfs(fresh.fromIfs);
        return;
      }
      const updated = await updateRegistroEstadoAction(
        id,
        estadoDesdeAccionAprobacion(accion),
        comentarioRechazoDesdeAccion(accion, comentario),
      );
      if (!updated) return;
      setRegistros((prev) => upsertIntoRegistros(prev, updated));
    },
    [],
  );

  const enviarDia = useCallback(
    async (fecha: string) => {
      const result = await enviarDiaAction(fecha);
      if (result.enviados.length) {
        onIngresarHojas?.(result.enviados.map((reg) => registroToHoja(reg)));
      }
      const fresh = await getRegistrosGroupedAction();
      setRegistros(fresh.registros);
      setRegistrosFromIfs(fresh.fromIfs);
      return result;
    },
    [onIngresarHojas],
  );

  const openRegistrarModal = useCallback(
    (opts?: {
      editId?: string;
      fecha?: string;
      origen?: "lista" | "dia";
    }) => {
      setModal(opts ?? {});
    },
    [],
  );

  const closeRegistrarModal = useCallback(() => {
    setModal(null);
  }, []);

  const value = useMemo(
    () => ({
      registros,
      registrosLoaded,
      registrosError,
      registrosFromIfs,
      ifsConnected,
      ifsEmail,
      reloadRegistros,
      upsertRegistro,
      upsertRegistroYEnviarDia,
      deleteRegistro,
      enviarDia,
      sincronizarDesdeAprobacion,
      modal,
      openRegistrarModal,
      closeRegistrarModal,
      setRegistroGuardadoHandler,
    }),
    [
      registros,
      registrosLoaded,
      registrosError,
      registrosFromIfs,
      ifsConnected,
      ifsEmail,
      reloadRegistros,
      upsertRegistro,
      upsertRegistroYEnviarDia,
      deleteRegistro,
      enviarDia,
      sincronizarDesdeAprobacion,
      modal,
      openRegistrarModal,
      closeRegistrarModal,
      setRegistroGuardadoHandler,
    ],
  );

  return (
    <MiTiempoContext.Provider value={value}>
      {children}
    </MiTiempoContext.Provider>
  );
}

export function useMiTiempo() {
  const ctx = useContext(MiTiempoContext);
  if (!ctx) {
    throw new Error("useMiTiempo debe usarse dentro de MiTiempoProvider");
  }
  return ctx;
}
