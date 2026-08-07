"use client";

import { useState } from "react";
import { DocumentoSoporteDetalle } from "@/src/app/documento-soporte/DocumentoSoporteDetalle";
import { DocumentoSoporteFormulario } from "@/src/app/documento-soporte/DocumentoSoporteFormulario";
import { DocumentoSoporteLista } from "@/src/app/documento-soporte/DocumentoSoporteLista";
import {
  DocumentoSoporteProvider,
  useDocumentoSoporte,
} from "@/src/app/documento-soporte/DocumentoSoporteContext";

type Vista = "lista" | "detalle" | "form";

function DocumentoSoporteViewInner() {
  const { getDocumento } = useDocumentoSoporte();
  const [vista, setVista] = useState<Vista>("lista");
  const [detalleNo, setDetalleNo] = useState<string | null>(null);
  const [editNo, setEditNo] = useState<string | null>(null);

  const volverLista = () => {
    setVista("lista");
    setDetalleNo(null);
    setEditNo(null);
  };

  if (vista === "form") {
    return (
      <DocumentoSoporteFormulario
        editNo={editNo}
        onVolver={volverLista}
        onGuardado={(no) => {
          setEditNo(null);
          setDetalleNo(no);
          setVista("detalle");
        }}
      />
    );
  }

  if (vista === "detalle" && detalleNo) {
    const documento = getDocumento(detalleNo);
    if (documento) {
      return (
        <DocumentoSoporteDetalle
          documento={documento}
          onVolver={volverLista}
          onContinuarEdicion={
            documento.estado === "Borrador"
              ? () => {
                  setEditNo(documento.no);
                  setVista("form");
                }
              : undefined
          }
        />
      );
    }
  }

  return (
    <DocumentoSoporteLista
      onOpenDetalle={(no) => {
        const doc = getDocumento(no);
        if (doc?.estado === "Borrador") {
          setEditNo(no);
          setVista("form");
          return;
        }
        setDetalleNo(no);
        setVista("detalle");
      }}
      onNuevo={() => {
        setEditNo(null);
        setVista("form");
      }}
    />
  );
}

export function DocumentoSoporteView() {
  return (
    <DocumentoSoporteProvider>
      <DocumentoSoporteViewInner />
    </DocumentoSoporteProvider>
  );
}
