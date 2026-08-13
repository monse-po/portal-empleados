"use client";

import { useState } from "react";
import { DocumentoSoporteDetalle } from "@/src/app/documento-soporte/DocumentoSoporteDetalle";
import { DocumentoSoporteFormulario } from "@/src/app/documento-soporte/DocumentoSoporteFormulario";
import { DocumentoSoporteLista } from "@/src/app/documento-soporte/DocumentoSoporteLista";
import { useDocumentoSoporte } from "@/src/app/documento-soporte/DocumentoSoporteContext";

type Vista = "lista" | "detalle" | "form";

function puedeEditar(
  estado: string,
  registradoPorId: string,
  sessionEmpleadoId: string,
): boolean {
  return (
    estado === "Lanzado" &&
    registradoPorId.replace(/\D/g, "") === sessionEmpleadoId.replace(/\D/g, "")
  );
}

export function DocumentoSoporteView() {
  const { getDocumento, sessionEmpleadoId } = useDocumentoSoporte();
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
        onGuardado={() => {
          // Post-envío → inicio de la sección (lista).
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
            puedeEditar(
              documento.estado,
              documento.registradoPorId,
              sessionEmpleadoId,
            )
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
