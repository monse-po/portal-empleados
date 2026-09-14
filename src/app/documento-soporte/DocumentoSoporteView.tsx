"use client";

import { useState } from "react";
import { DocumentoSoporteDetalle } from "@/src/app/documento-soporte/DocumentoSoporteDetalle";
import { DocumentoSoporteFormulario } from "@/src/app/documento-soporte/DocumentoSoporteFormulario";
import { DocumentoSoporteLista } from "@/src/app/documento-soporte/DocumentoSoporteLista";
import { useDocumentoSoporte } from "@/src/app/documento-soporte/DocumentoSoporteContext";
import { LoadingNotice } from "@/src/components/ui/LoadingNotice";
import { LOADING_COPY } from "@/src/lib/copy/loading";

type Vista = "lista" | "detalle" | "form";

export function DocumentoSoporteView() {
  const { getDocumento, loaded, loadError } = useDocumentoSoporte();
  const [vista, setVista] = useState<Vista>("lista");
  const [detalleNo, setDetalleNo] = useState<string | null>(null);
  const [editNo, setEditNo] = useState<string | null>(null);

  const volverLista = () => {
    setVista("lista");
    setDetalleNo(null);
    setEditNo(null);
  };

  if (!loaded) {
    return (
      <div className="view-wide flex min-h-[320px] items-center justify-center">
        <LoadingNotice
          variant="inline"
          icon="folderOpen"
          label={LOADING_COPY.generic.label}
        />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="view-wide flex min-h-[240px] flex-col items-center justify-center gap-2 text-center text-[13px]">
        <p className="text-[#374151]">{loadError}</p>
        <p className="text-muted">Inicia sesión con tu correo @h-mv.com</p>
      </div>
    );
  }

  if (vista === "form") {
    return (
      <DocumentoSoporteFormulario
        editNo={editNo}
        onVolver={volverLista}
        onGuardado={() => {
          volverLista();
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
            documento.editable
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
