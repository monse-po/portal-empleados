"use client";

import { useEffect, useRef, useState } from "react";
import { LegalizacionesDetalle } from "@/src/app/legalizaciones/LegalizacionesDetalle";
import { LegalizacionesFormulario } from "@/src/app/legalizaciones/LegalizacionesFormulario";
import { LegalizacionesLista } from "@/src/app/legalizaciones/LegalizacionesLista";
import {
  LegalizacionesProvider,
  useLegalizaciones,
} from "@/src/app/legalizaciones/LegalizacionesContext";

type Vista = "lista" | "detalle" | "form";

function LegalizacionesViewInner() {
  const { getLegalizacion } = useLegalizaciones();
  const [vista, setVista] = useState<Vista>("lista");
  const [detalleNo, setDetalleNo] = useState<string | null>(null);
  const detalleQueryOpened = useRef(false);

  useEffect(() => {
    if (detalleQueryOpened.current) return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("nueva") === "1") {
      detalleQueryOpened.current = true;
      setVista("form");
      return;
    }
    const no = params.get("no");
    if (!no || !getLegalizacion(no)) return;
    detalleQueryOpened.current = true;
    setDetalleNo(no);
    setVista("detalle");
  }, [getLegalizacion]);

  const volverLista = () => {
    setVista("lista");
    setDetalleNo(null);
  };

  if (vista === "form") {
    return (
      <LegalizacionesFormulario
        onVolver={volverLista}
        onCreada={(no) => {
          setDetalleNo(no);
          setVista("detalle");
        }}
      />
    );
  }

  if (vista === "detalle" && detalleNo) {
    const legalizacion = getLegalizacion(detalleNo);
    if (legalizacion) {
      return (
        <LegalizacionesDetalle
          legalizacion={legalizacion}
          onVolver={volverLista}
        />
      );
    }
  }

  return (
    <LegalizacionesLista
      onOpenDetalle={(no) => {
        setDetalleNo(no);
        setVista("detalle");
      }}
      onNueva={() => setVista("form")}
    />
  );
}

export function LegalizacionesView() {
  return (
    <LegalizacionesProvider>
      <LegalizacionesViewInner />
    </LegalizacionesProvider>
  );
}
