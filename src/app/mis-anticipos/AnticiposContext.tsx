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
import { getAnticiposRegistrosTab } from "@/src/lib/anticipos-filtros";
import {
  countAnticiposTab,
  type Anticipo,
  type AnticipoExtra,
  type AnticipoTab,
  type AnticipoTipo,
} from "@/src/lib/anticipos-registro";
import {
  cancelarAnticipoAction,
  lanzarAnticipoAction,
  listMisAnticiposAction,
} from "@/src/server/anticipos-actions";
import { IFS_EMPLOYEE_CHANGED_EVENT } from "@/src/lib/ifs/portal-events";

const IFS_AUTH_ENABLED = process.env.NEXT_PUBLIC_IFS_AUTH_ENABLED === "true";

export type LanzarAnticipoInput = {
  tipo: AnticipoTipo;
  proyId: string;
  proyN: string;
  monto: number;
  div: string;
  motivo: string;
  compania: string;
  empCompania: string;
  /** Código o nombre del aprobador/gerente IFS del proyecto. */
  aprobador?: string;
  paraOtro: boolean;
  beneficiarioId?: string;
  beneficiarioNombre?: string;
  beneficiarioCedula?: string;
  fechaIda?: string;
  fechaRegreso?: string;
  destino?: string;
  tipoViaje?: "nacional" | "internacional";
};

type AnticiposContextValue = {
  anticipos: Record<string, Anticipo>;
  extras: Record<string, AnticipoExtra>;
  loaded: boolean;
  loadError: string | null;
  empleadoId: string | null;
  tab: AnticipoTab;
  setTab: (tab: AnticipoTab) => void;
  tabCounts: { pendientes: number; disponibles: number };
  registrosActuales: Anticipo[];
  reload: () => Promise<void>;
  lanzarAnticipo: (input: LanzarAnticipoInput) => Promise<string | null>;
  cancelarAnticipo: (no: string) => Promise<void>;
  getAnticipo: (no: string) => Anticipo | undefined;
  getExtra: (no: string) => AnticipoExtra | undefined;
};

const AnticiposContext = createContext<AnticiposContextValue | null>(null);

export function AnticiposProvider({ children }: { children: ReactNode }) {
  const [anticipos, setAnticipos] = useState<Record<string, Anticipo>>({});
  const [extras, setExtras] = useState<Record<string, AnticipoExtra>>({});
  const [empleadoId, setEmpleadoId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [tab, setTab] = useState<AnticipoTab>("pendientes");

  const reload = useCallback(async () => {
    setLoadError(null);
    try {
      const result = await listMisAnticiposAction();
      setAnticipos(result.anticipos as Record<string, Anticipo>);
      setExtras(result.extras as Record<string, AnticipoExtra>);
      setEmpleadoId(result.sessionIds[0] ?? null);
      if (IFS_AUTH_ENABLED && !result.fromIfs) {
        setLoadError(
          "No hay sesión IFS. Entra con IFS para ver y crear anticipos en Employee Advances.",
        );
      }
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los anticipos.",
      );
      setAnticipos({});
      setExtras({});
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    const onEmployeeChanged = () => {
      setLoaded(false);
      void reload();
    };
    window.addEventListener(IFS_EMPLOYEE_CHANGED_EVENT, onEmployeeChanged);
    return () => {
      window.removeEventListener(IFS_EMPLOYEE_CHANGED_EVENT, onEmployeeChanged);
    };
  }, [reload]);

  const lanzarAnticipo = useCallback(
    async (input: LanzarAnticipoInput): Promise<string | null> => {
      const { no, error } = await lanzarAnticipoAction(input);
      if (error || !no) {
        throw new Error(
          error || "No se pudo crear el anticipo en IFS (Employee Advances).",
        );
      }
      await reload();
      return no;
    },
    [reload],
  );

  const cancelarAnticipo = useCallback(
    async (no: string) => {
      const result = await cancelarAnticipoAction(no);
      if (!result.ok) {
        throw new Error(result.error || "No se pudo cancelar el anticipo en IFS.");
      }
      await reload();
    },
    [reload],
  );

  const tabCounts = useMemo(
    () =>
      empleadoId
        ? countAnticiposTab(anticipos, empleadoId)
        : { pendientes: 0, disponibles: 0 },
    [anticipos, empleadoId],
  );

  const registrosActuales = useMemo(
    () =>
      empleadoId
        ? getAnticiposRegistrosTab(anticipos, tab, empleadoId)
        : [],
    [anticipos, tab, empleadoId],
  );

  const value = useMemo(
    () => ({
      anticipos,
      extras,
      loaded,
      loadError,
      empleadoId,
      tab,
      setTab,
      tabCounts,
      registrosActuales,
      reload,
      lanzarAnticipo,
      cancelarAnticipo,
      getAnticipo: (no: string) => anticipos[no],
      getExtra: (no: string) => extras[no],
    }),
    [
      anticipos,
      extras,
      loaded,
      loadError,
      empleadoId,
      tab,
      tabCounts,
      registrosActuales,
      reload,
      lanzarAnticipo,
      cancelarAnticipo,
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
