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
import { getIfsSessionStatusAction } from "@/src/server/mi-tiempo-catalog-actions";
import {
  ANTICIPOS_CHANGED_EVENT,
  IFS_EMPLOYEE_CHANGED_EVENT,
} from "@/src/lib/ifs/portal-events";

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
  companyId?: string;
  invCompanyId?: string;
  createdBy?: string;
  beneficiarioEmpNo?: string;
  beneficiarioSupplierId?: string;
  /** PersonId del gerente IFS (ProjectManager). */
  aprobador?: string;
  paraOtro: boolean;
  beneficiarioId?: string;
  beneficiarioNombre?: string;
  beneficiarioCedula?: string;
  fechaIda?: string;
  fechaRegreso?: string;
  destino?: string;
  destinoCodigo?: string;
  tipoViaje?: "nacional" | "internacional";
};

type AnticiposContextValue = {
  anticipos: Record<string, Anticipo>;
  extras: Record<string, AnticipoExtra>;
  loaded: boolean;
  loadError: string | null;
  fromIfs: boolean;
  ifsConnected: boolean;
  ifsEmail: string | null;
  empleadoId: string | null;
  sessionIds: string[];
  sessionNombre: string;
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
  const [sessionIds, setSessionIds] = useState<string[]>([]);
  const [sessionNombre, setSessionNombre] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fromIfs, setFromIfs] = useState(false);
  const [ifsConnected, setIfsConnected] = useState(false);
  const [ifsEmail, setIfsEmail] = useState<string | null>(null);
  const [tab, setTab] = useState<AnticipoTab>("pendientes");

  const reload = useCallback(async () => {
    setLoadError(null);
    try {
      const result = await listMisAnticiposAction();
      setAnticipos(result.anticipos as Record<string, Anticipo>);
      setExtras(result.extras as Record<string, AnticipoExtra>);
      setSessionIds(result.sessionIds);
      setSessionNombre(result.sessionNombre || "");
      setEmpleadoId(result.sessionIds[0] ?? null);
      setFromIfs(result.fromIfs);
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
      setSessionIds([]);
      setSessionNombre("");
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

  useEffect(() => {
    const onChanged = () => {
      setLoaded(false);
      void reload();
    };
    window.addEventListener(IFS_EMPLOYEE_CHANGED_EVENT, onChanged);
    window.addEventListener(ANTICIPOS_CHANGED_EVENT, onChanged);
    return () => {
      window.removeEventListener(IFS_EMPLOYEE_CHANGED_EVENT, onChanged);
      window.removeEventListener(ANTICIPOS_CHANGED_EVENT, onChanged);
    };
  }, [reload]);

  const lanzarAnticipo = useCallback(
    async (input: LanzarAnticipoInput): Promise<string | null> => {
      const { no, error, anticipo, extra } = await lanzarAnticipoAction(input);
      if (error || !no) {
        throw new Error(
          error || "No se pudo crear el anticipo en IFS (Employee Advances).",
        );
      }
      await reload();
      if (anticipo) {
        setAnticipos((prev) =>
          prev[no] ? prev : { ...prev, [no]: anticipo },
        );
      }
      if (extra) {
        setExtras((prev) => (prev[no] ? prev : { ...prev, [no]: extra }));
      }
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
      sessionIds.length
        ? countAnticiposTab(anticipos, sessionIds)
        : { pendientes: 0, disponibles: 0 },
    [anticipos, sessionIds],
  );

  const registrosActuales = useMemo(
    () =>
      sessionIds.length
        ? getAnticiposRegistrosTab(anticipos, tab, sessionIds)
        : [],
    [anticipos, tab, sessionIds],
  );

  const value = useMemo(
    () => ({
      anticipos,
      extras,
      loaded,
      loadError,
      fromIfs,
      ifsConnected,
      ifsEmail,
      empleadoId,
      sessionIds,
      sessionNombre,
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
      fromIfs,
      ifsConnected,
      ifsEmail,
      empleadoId,
      sessionIds,
      sessionNombre,
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
