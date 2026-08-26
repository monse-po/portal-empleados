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
import { TIEMPO_UI_COPY } from "@/src/lib/copy/tiempo";
import type { RegistroEstado, RegistroMock } from "@/src/lib/mi-tiempo-mock";
import type { HojaAprobacion } from "@/src/lib/aprobacion-tiempo-mock";
import { isIfsRegistroId } from "@/src/lib/ifs/tiempo-timesheet";
import { isRegistroEnviado } from "@/src/lib/tiempo-registro-rules";
import {
  deleteRegistroAction,
  enviarDiaAction,
  enviarFechasAction,
  getRegistrosGroupedAction,
  updateRegistroEstadoAction,
  upsertRegistroAction,
  upsertRegistrosAction,
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
  registrosIfsWarning: string | null;
  registrosFromIfs: boolean;
  ifsConnected: boolean;
  ifsEmail: string | null;
  reloadRegistros: () => Promise<void>;
  upsertRegistro: (reg: RegistroMock) => Promise<void>;
  /** Crea/actualiza registros en IFS (estado Registrado). */
  upsertRegistros: (regs: RegistroMock[]) => Promise<void>;
  /** Guarda borradores y los envía a aprobación en un solo paso. */
  upsertRegistrosYEnviar: (regs: RegistroMock[]) => Promise<EnviarDiaResult>;
  upsertRegistroYEnviarDia: (reg: RegistroMock) => Promise<EnviarDiaResult>;
  deleteRegistro: (id: string) => Promise<void>;
  enviarDia: (fecha: string) => Promise<EnviarDiaResult>;
  enviarFechas: (fechas: string[]) => Promise<EnviarDiaResult>;
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
  const [registrosIfsWarning, setRegistrosIfsWarning] = useState<string | null>(
    null,
  );
  const [registrosFromIfs, setRegistrosFromIfs] = useState(false);
  const [ifsConnected, setIfsConnected] = useState(false);
  const [ifsEmail, setIfsEmail] = useState<string | null>(null);
  const [modal, setModal] = useState<RegistrarModalState>(null);
  const registroGuardadoHandler = useRef<RegistroGuardadoHandler | undefined>(
    undefined,
  );

  const applyGrouped = useCallback(
    (result: Awaited<ReturnType<typeof getRegistrosGroupedAction>>) => {
      setRegistros(result.registros);
      setRegistrosFromIfs(result.fromIfs);
      setRegistrosIfsWarning(
        result.warning
          ? result.sessionExpired
            ? TIEMPO_UI_COPY.ifsTimesheetWarning.sessionExpired
            : TIEMPO_UI_COPY.ifsTimesheetWarning.fetchFailed
          : null,
      );
      setRegistrosError(null);
    },
    [],
  );

  const reloadRegistros = useCallback(async () => {
    setRegistrosError(null);
    try {
      applyGrouped(await getRegistrosGroupedAction());
    } catch {
      setRegistrosFromIfs(false);
      setRegistrosIfsWarning(null);
      setRegistrosError(
        "No se pudieron cargar los registros. Revisa la conexión o la base de datos.",
      );
    } finally {
      setRegistrosLoaded(true);
    }
  }, [applyGrouped]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setRegistrosError(null);
      try {
        const result = await getRegistrosGroupedAction();
        if (cancelled) return;
        applyGrouped(result);
      } catch {
        if (cancelled) return;
        setRegistrosFromIfs(false);
        setRegistrosIfsWarning(null);
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
  }, [applyGrouped]);

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
      applyGrouped(await getRegistrosGroupedAction());
      if (isRegistroEnviado(saved.estado)) {
        onIngresarHojas?.([registroToHoja(saved)]);
      }
      registroGuardadoHandler.current?.(saved.fecha);
    },
    [applyGrouped, onIngresarHojas],
  );

  const upsertRegistros = useCallback(
    async (regs: RegistroMock[]) => {
      if (!regs.length) return;
      const saved = await upsertRegistrosAction(regs);
      applyGrouped(await getRegistrosGroupedAction());
      const enviados = saved.filter((row) => isRegistroEnviado(row.estado));
      if (enviados.length) {
        onIngresarHojas?.(enviados.map((row) => registroToHoja(row)));
      }
      registroGuardadoHandler.current?.(saved[0]?.fecha ?? regs[0].fecha);
    },
    [applyGrouped, onIngresarHojas],
  );

  const enviarFechas = useCallback(
    async (fechas: string[]) => {
      const result = await enviarFechasAction(fechas);
      if (result.enviados.length) {
        onIngresarHojas?.(result.enviados.map((reg) => registroToHoja(reg)));
      }
      applyGrouped(await getRegistrosGroupedAction());
      return result;
    },
    [applyGrouped, onIngresarHojas],
  );

  const upsertRegistrosYEnviar = useCallback(
    async (regs: RegistroMock[]) => {
      await upsertRegistros(regs);
      return {
        enviados: regs,
        sentToIfs: true,
      } satisfies EnviarDiaResult;
    },
    [upsertRegistros],
  );

  const upsertRegistroYEnviarDia = useCallback(
    async (reg: RegistroMock) => {
      await upsertRegistroAction(reg);
      const result = await enviarDiaAction(reg.fecha);
      if (result.enviados.length) {
        onIngresarHojas?.(result.enviados.map((r) => registroToHoja(r)));
      }
      applyGrouped(await getRegistrosGroupedAction());
      registroGuardadoHandler.current?.(reg.fecha);
      return result;
    },
    [applyGrouped, onIngresarHojas],
  );

  const deleteRegistro = useCallback(
    async (id: string) => {
      await deleteRegistroAction(id);
      if (isIfsRegistroId(id)) {
        applyGrouped(await getRegistrosGroupedAction());
      } else {
        setRegistros((prev) => removeRegistroFromState(prev, id));
      }
      onRetirarHojas?.([id]);
    },
    [applyGrouped, onRetirarHojas],
  );

  const sincronizarDesdeAprobacion = useCallback(
    async (id: string, accion: SyncRegistroAccion, comentario?: string) => {
      // Registros IFS: el estado vive en IFS; refrescar timesheet en vez de Neon.
      if (isIfsRegistroId(id)) {
        applyGrouped(await getRegistrosGroupedAction());
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
    [applyGrouped],
  );

  const enviarDia = useCallback(
    async (fecha: string) => {
      return enviarFechas([fecha]);
    },
    [enviarFechas],
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
      registrosIfsWarning,
      registrosFromIfs,
      ifsConnected,
      ifsEmail,
      reloadRegistros,
      upsertRegistro,
      upsertRegistros,
      upsertRegistrosYEnviar,
      upsertRegistroYEnviarDia,
      deleteRegistro,
      enviarDia,
      enviarFechas,
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
      registrosIfsWarning,
      registrosFromIfs,
      ifsConnected,
      ifsEmail,
      reloadRegistros,
      upsertRegistro,
      upsertRegistros,
      upsertRegistrosYEnviar,
      upsertRegistroYEnviarDia,
      deleteRegistro,
      enviarDia,
      enviarFechas,
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
