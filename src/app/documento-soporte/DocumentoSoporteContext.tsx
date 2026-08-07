"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  cloneInitialDocumentos,
  countDocumentosTab,
  getDocumentosTab,
  hoyDMY,
  nuevoCodigoDocumento,
  type DocumentoSoporte,
  type DocumentoSoporteTab,
  type GuardarDocumentoSoporteInput,
} from "@/src/lib/documento-soporte-mock";

type DocumentoSoporteContextValue = {
  documentos: Record<string, DocumentoSoporte>;
  tab: DocumentoSoporteTab;
  setTab: (tab: DocumentoSoporteTab) => void;
  tabCounts: { pendientes: number; historial: number };
  registrosActuales: DocumentoSoporte[];
  getDocumento: (no: string) => DocumentoSoporte | undefined;
  /** Crear o actualizar borrador / enviar a revisión. */
  guardarDocumento: (
    input: GuardarDocumentoSoporteInput,
    editNo?: string,
  ) => string;
};

const DocumentoSoporteContext =
  createContext<DocumentoSoporteContextValue | null>(null);

export function DocumentoSoporteProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [documentos, setDocumentos] = useState(cloneInitialDocumentos);
  const [tab, setTab] = useState<DocumentoSoporteTab>("pendientes");

  const getDocumento = useCallback(
    (no: string) => documentos[no],
    [documentos],
  );

  const guardarDocumento = useCallback(
    (input: GuardarDocumentoSoporteInput, editNo?: string) => {
      let codigo = "";
      setDocumentos((prev) => {
        const existing = editNo ? prev[editNo] : undefined;
        if (editNo && existing && existing.estado !== "Borrador") {
          return prev;
        }

        const no = existing?.no ?? nuevoCodigoDocumento(prev);
        codigo = no;
        const next: DocumentoSoporte = {
          no,
          fecha: existing?.fecha ?? hoyDMY(),
          tipo: input.tipo,
          referencia: input.referencia.trim(),
          descripcion: input.descripcion.trim(),
          estado: input.enviar ? "En revisión" : "Borrador",
          adjunto: input.adjunto,
          comentario: input.comentario?.trim() || undefined,
          disponible: false,
        };
        return { ...prev, [no]: next };
      });
      return codigo;
    },
    [],
  );

  const tabCounts = useMemo(
    () => ({
      pendientes: countDocumentosTab(documentos, "pendientes"),
      historial: countDocumentosTab(documentos, "historial"),
    }),
    [documentos],
  );

  const registrosActuales = useMemo(
    () => getDocumentosTab(documentos, tab),
    [documentos, tab],
  );

  const value = useMemo(
    () => ({
      documentos,
      tab,
      setTab,
      tabCounts,
      registrosActuales,
      getDocumento,
      guardarDocumento,
    }),
    [
      documentos,
      tab,
      tabCounts,
      registrosActuales,
      getDocumento,
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
