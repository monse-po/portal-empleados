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
  countDocumentosTab,
  getDocumentosTab,
  SESSION_DS,
  validarSignoMonto,
  type DocumentoSoporte,
  type DocumentoSoporteTab,
  type GuardarDocumentoSoporteInput,
} from "@/src/lib/documento-soporte-mock";
import { getIfsSessionStatusAction } from "@/src/server/mi-tiempo-catalog-actions";
import {
  guardarDocumentoSoporteAction,
  listMisDocumentosSoporteAction,
} from "@/src/server/dse-actions";
import { IFS_EMPLOYEE_CHANGED_EVENT } from "@/src/lib/ifs/portal-events";

const IFS_AUTH_ENABLED = process.env.NEXT_PUBLIC_IFS_AUTH_ENABLED === "true";

type DocumentoSoporteContextValue = {
  sessionEmpleadoId: string;
  sessionEmpNo: string;
  sessionIds: string[];
  sessionNombre: string;
  documentos: Record<string, DocumentoSoporte>;
  loaded: boolean;
  loadError: string | null;
  fromIfs: boolean;
  ifsConnected: boolean;
  ifsEmail: string | null;
  tab: DocumentoSoporteTab;
  setTab: (tab: DocumentoSoporteTab) => void;
  tabCounts: { pendientes: number; historial: number };
  registrosActuales: DocumentoSoporte[];
  getDocumento: (no: string) => DocumentoSoporte | undefined;
  reload: () => Promise<void>;
  guardarDocumento: (
    input: GuardarDocumentoSoporteInput,
    editNo?: string,
  ) => Promise<{ ok: true; codigo: string } | { ok: false; error: string }>;
};

const DocumentoSoporteContext =
  createContext<DocumentoSoporteContextValue | null>(null);

export function DocumentoSoporteProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [documentos, setDocumentos] = useState<Record<string, DocumentoSoporte>>(
    {},
  );
  const [tab, setTab] = useState<DocumentoSoporteTab>("pendientes");
  const [sessionIds, setSessionIds] = useState<string[]>([SESSION_DS.id]);
  const [sessionEmpNo, setSessionEmpNo] = useState(SESSION_DS.id);
  const [sessionNombre, setSessionNombre] = useState(SESSION_DS.nombre);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [fromIfs, setFromIfs] = useState(false);
  const [ifsConnected, setIfsConnected] = useState(false);
  const [ifsEmail, setIfsEmail] = useState<string | null>(null);

  const sessionEmpleadoId = sessionIds[0] ?? SESSION_DS.id;

  const reload = useCallback(async () => {
    setLoadError(null);
    try {
      const result = await listMisDocumentosSoporteAction();
      setDocumentos(result.documentos);
      setSessionIds(result.sessionIds.length ? result.sessionIds : [SESSION_DS.id]);
      setSessionEmpNo(result.sessionEmpNo || result.sessionIds[0] || SESSION_DS.id);
      setSessionNombre(result.sessionNombre || SESSION_DS.nombre);
      setFromIfs(result.fromIfs);
      if (IFS_AUTH_ENABLED && !result.fromIfs) {
        setLoadError(
          "No hay sesión IFS. Entra con IFS para ver y crear documentos de soporte.",
        );
      }
    } catch (error) {
      setLoadError(
        error instanceof Error
          ? error.message
          : "No se pudieron cargar los documentos de soporte.",
      );
      setDocumentos({});
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
    return () => {
      window.removeEventListener(IFS_EMPLOYEE_CHANGED_EVENT, onChanged);
    };
  }, [reload]);

  const getDocumento = useCallback(
    (no: string) => documentos[no],
    [documentos],
  );

  const guardarDocumento = useCallback(
    async (input: GuardarDocumentoSoporteInput, editNo?: string) => {
      const signoErr = validarSignoMonto(input.tipo, input.monto);
      if (signoErr) return { ok: false as const, error: signoErr };
      const result = await guardarDocumentoSoporteAction(input, editNo);
      if (result.ok) await reload();
      return result;
    },
    [reload],
  );

  const tabCounts = useMemo(
    () => ({
      pendientes: countDocumentosTab(documentos, "pendientes", sessionIds),
      historial: countDocumentosTab(documentos, "historial", sessionIds),
    }),
    [documentos, sessionIds],
  );

  const registrosActuales = useMemo(
    () => getDocumentosTab(documentos, tab, sessionIds),
    [documentos, tab, sessionIds],
  );

  const value = useMemo(
    () => ({
      sessionEmpleadoId,
      sessionEmpNo,
      sessionIds,
      sessionNombre,
      documentos,
      loaded,
      loadError,
      fromIfs,
      ifsConnected,
      ifsEmail,
      tab,
      setTab,
      tabCounts,
      registrosActuales,
      getDocumento,
      reload,
      guardarDocumento,
    }),
    [
      sessionEmpleadoId,
      sessionEmpNo,
      sessionIds,
      sessionNombre,
      documentos,
      loaded,
      loadError,
      fromIfs,
      ifsConnected,
      ifsEmail,
      tab,
      tabCounts,
      registrosActuales,
      getDocumento,
      reload,
      guardarDocumento,
    ],
  );

  return (
    <DocumentoSoporteContext.Provider value={value}>
      {children}
    </DocumentoSoporteContext.Provider>
  );
}

export function useDocumentoSoporte() {
  const ctx = useContext(DocumentoSoporteContext);
  if (!ctx) {
    throw new Error(
      "useDocumentoSoporte debe usarse dentro de DocumentoSoporteProvider",
    );
  }
  return ctx;
}
