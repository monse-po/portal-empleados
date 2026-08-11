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
  findDuplicado,
  getDocumentosTab,
  hoyDMY,
  normalizeNif,
  nuevoCodigoDocumento,
  SESSION_DS,
  validarSignoMonto,
  type DocumentoSoporte,
  type DocumentoSoporteTab,
  type GuardarDocumentoSoporteInput,
} from "@/src/lib/documento-soporte-mock";

type DocumentoSoporteContextValue = {
  sessionEmpleadoId: string;
  sessionNombre: string;
  documentos: Record<string, DocumentoSoporte>;
  tab: DocumentoSoporteTab;
  setTab: (tab: DocumentoSoporteTab) => void;
  tabCounts: { pendientes: number; historial: number };
  registrosActuales: DocumentoSoporte[];
  getDocumento: (no: string) => DocumentoSoporte | undefined;
  /**
   * Guarda solicitud → estado Lanzado.
   * Devuelve { ok, codigo?, error? }.
   */
  guardarDocumento: (
    input: GuardarDocumentoSoporteInput,
    editNo?: string,
  ) => { ok: true; codigo: string } | { ok: false; error: string };
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
  const sessionEmpleadoId = SESSION_DS.id;
  const sessionNombre = SESSION_DS.nombre;

  const getDocumento = useCallback(
    (no: string) => documentos[no],
    [documentos],
  );

  const guardarDocumento = useCallback(
    (input: GuardarDocumentoSoporteInput, editNo?: string) => {
      const signoErr = validarSignoMonto(input.tipo, input.monto);
      if (signoErr) return { ok: false as const, error: signoErr };

      if (input.tipo === "NA") {
        if (!input.tipoAjuste?.trim()) {
          return {
            ok: false as const,
            error: "Tipo Ajuste es obligatorio para NA",
          };
        }
        if (!input.documentoSoporteAnular?.trim()) {
          return {
            ok: false as const,
            error: "Documento Soporte a Anular es obligatorio para NA",
          };
        }
        if (!input.cudsAnular?.trim()) {
          return {
            ok: false as const,
            error: "CUDS Documento Soporte a Anular es obligatorio para NA",
          };
        }
      }

      let result:
        | { ok: true; codigo: string }
        | { ok: false; error: string }
        | null = null;

      setDocumentos((prev) => {
        const existing = editNo ? prev[editNo] : undefined;
        if (editNo) {
          if (!existing) {
            result = { ok: false, error: "Solicitud no encontrada" };
            return prev;
          }
          if (existing.estado !== "Lanzado") {
            result = {
              ok: false,
              error: "Solo se pueden editar solicitudes en estado Lanzado",
            };
            return prev;
          }
          if (existing.registradoPorId !== sessionEmpleadoId) {
            result = {
              ok: false,
              error: "Solo quien registró la solicitud puede editarla",
            };
            return prev;
          }
        }

        const dup = findDuplicado(
          prev,
          input.nif,
          input.noDocumentoOriginal,
          editNo ?? undefined,
        );
        if (dup) {
          result = {
            ok: false,
            error: `El documento No. ${input.noDocumentoOriginal.trim()} del proveedor ${normalizeNif(input.nif)} ya se encuentra registrado con la Solicitud ${dup.no}. No es posible crear una solicitud duplicada.`,
          };
          return prev;
        }

        const no = existing?.no ?? nuevoCodigoDocumento(prev);
        const next: DocumentoSoporte = {
          no,
          fecha: existing?.fecha ?? hoyDMY(),
          tipo: input.tipo,
          estado: "Lanzado",
          empresaId: input.empresaId,
          empresaLabel: input.empresaLabel,
          registradoPorId: existing?.registradoPorId ?? sessionEmpleadoId,
          registradoPorNombre:
            existing?.registradoPorNombre ?? sessionNombre,
          solicitadoPorId: input.solicitadoPorId,
          solicitadoPorNombre: input.solicitadoPorNombre,
          nif: normalizeNif(input.nif),
          noDocumentoOriginal: input.noDocumentoOriginal.trim(),
          fechaDocumento: input.fechaDocumento,
          tarjetaUltimos4: input.tarjetaUltimos4?.replace(/\D/g, "").slice(-4),
          concepto: input.concepto.trim(),
          divisa: input.divisa,
          monto: input.monto,
          adjunto: input.adjunto,
          tipoAjuste:
            input.tipo === "NA" ? input.tipoAjuste?.trim() : undefined,
          documentoSoporteAnular:
            input.tipo === "NA"
              ? input.documentoSoporteAnular?.trim()
              : undefined,
          cudsAnular:
            input.tipo === "NA" ? input.cudsAnular?.trim() : undefined,
          disponible: false,
        };
        result = { ok: true, codigo: no };
        return { ...prev, [no]: next };
      });

      return result ?? { ok: false as const, error: "No se pudo guardar" };
    },
    [sessionEmpleadoId, sessionNombre],
  );

  const tabCounts = useMemo(
    () => ({
      pendientes: countDocumentosTab(
        documentos,
        "pendientes",
        sessionEmpleadoId,
      ),
      historial: countDocumentosTab(
        documentos,
        "historial",
        sessionEmpleadoId,
      ),
    }),
    [documentos, sessionEmpleadoId],
  );

  const registrosActuales = useMemo(
    () => getDocumentosTab(documentos, tab, sessionEmpleadoId),
    [documentos, tab, sessionEmpleadoId],
  );

  const value = useMemo(
    () => ({
      sessionEmpleadoId,
      sessionNombre,
      documentos,
      tab,
      setTab,
      tabCounts,
      registrosActuales,
      getDocumento,
      guardarDocumento,
    }),
    [
      sessionEmpleadoId,
      sessionNombre,
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
