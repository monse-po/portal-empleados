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
  getAnticiposAction,
  lanzarAnticipoAction,
} from "@/src/server/mis-anticipos-actions";

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
      const result = await getAnticiposAction();
      setAnticipos(result.anticipos);
      setExtras(result.extras);
      setEmpleadoId(result.empleadoId);
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

  const lanzarAnticipo = useCallback(
    async (input: LanzarAnticipoInput): Promise<string | null> => {
      const { codigo } = await lanzarAnticipoAction(input);
      await reload();
      return codigo;
    },
    [reload],
  );

  const cancelarAnticipo = useCallback(
    async (no: string) => {
      await cancelarAnticipoAction(no);
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
