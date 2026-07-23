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
import {
  deleteRegistroAction,
  enviarDiaAction,
  getRegistrosGroupedAction,
  updateRegistroEstadoAction,
  upsertRegistroAction,
} from "@/src/server/mi-tiempo-actions";
import { getIfsSessionStatusAction } from "@/src/server/mi-tiempo-catalog-actions";

export type RegistrarModalState = {
  editId?: string;
  fecha?: string;
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
  ifsConnected: boolean;
  ifsEmail: string | null;
  reloadRegistros: () => Promise<void>;
  upsertRegistro: (reg: RegistroMock) => Promise<void>;
  upsertRegistroYEnviarDia: (reg: RegistroMock) => Promise<RegistroMock[]>;
  deleteRegistro: (id: string) => Promise<void>;
  enviarDia: (fecha: string) => Promise<RegistroMock[]>;
  sincronizarDesdeAprobacion: (
    id: string,
    accion: SyncRegistroAccion,
    comentario?: string,
  ) => Promise<void>;
  modal: RegistrarModalState;
  openRegistrarModal: (opts?: { editId?: string; fecha?: string }) => void;
  closeRegistrarModal: () => void;
  setRegistroGuardadoHandler: (handler?: RegistroGuardadoHandler) => void;
};

const MiTiempoContext = createContext<MiTiempoContextValue | null>(null);

type MiTiempoProviderProps = {
  children: ReactNode;
  onIngresarHojas?: (hojas: HojaAprobacion[]) => void;
};

export function MiTiempoProvider({
  children,
  onIngresarHojas,
}: MiTiempoProviderProps) {
  const [registros, setRegistros] = useState<Record<string, RegistroMock[]>>({});
  const [registrosLoaded, setRegistrosLoaded] = useState(false);
  const [registrosError, setRegistrosError] = useState<string | null>(null);
  const [ifsConnected, setIfsConnected] = useState(false);
  const [ifsEmail, setIfsEmail] = useState<string | null>(null);
  const [modal, setModal] = useState<RegistrarModalState>(null);
  const registroGuardadoHandler = useRef<RegistroGuardadoHandler | undefined>(
    undefined,
  );

  const reloadRegistros = useCallback(async () => {
    setRegistrosError(null);
    try {
      const data = await getRegistrosGroupedAction();
      setRegistros(data);
    } catch {
      setRegistrosError(
        "No se pudieron cargar los registros. Revisa la base de datos.",
      );
    } finally {
      setRegistrosLoaded(true);
    }
  }, []);

  useEffect(() => {
    void reloadRegistros();
  }, [reloadRegistros]);

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

  const upsertRegistro = useCallback(async (reg: RegistroMock) => {
    const saved = await upsertRegistroAction(reg);
    setRegistros((prev) => upsertIntoRegistros(prev, saved));
    registroGuardadoHandler.current?.(saved.fecha);
  }, []);

  const upsertRegistroYEnviarDia = useCallback(
    async (reg: RegistroMock) => {
      await upsertRegistroAction(reg);
      const enviados = await enviarDiaAction(reg.fecha);
      if (enviados.length) {
        onIngresarHojas?.(enviados.map((r) => registroToHoja(r)));
      }
      const fresh = await getRegistrosGroupedAction();
      setRegistros(fresh);
      registroGuardadoHandler.current?.(reg.fecha);
      return enviados;
    },
    [onIngresarHojas],
  );

  const deleteRegistro = useCallback(async (id: string) => {
    await deleteRegistroAction(id);
    setRegistros((prev) => removeRegistroFromState(prev, id));
  }, []);

  const sincronizarDesdeAprobacion = useCallback(
    async (id: string, accion: SyncRegistroAccion, comentario?: string) => {
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
      const enviados = await enviarDiaAction(fecha);
      if (enviados.length) {
        onIngresarHojas?.(enviados.map((reg) => registroToHoja(reg)));
      }
      const fresh = await getRegistrosGroupedAction();
      setRegistros(fresh);
      return enviados;
    },
    [onIngresarHojas],
  );

  const openRegistrarModal = useCallback(
    (opts?: { editId?: string; fecha?: string }) => {
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
