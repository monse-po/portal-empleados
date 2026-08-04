"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/src/components/ui/Button";
import { MiTiempoDia } from "@/src/app/hoja-tiempo/MiTiempoDia";
import { MiTiempoLista } from "@/src/app/hoja-tiempo/MiTiempoLista";
import { MiTiempoLoading } from "@/src/app/hoja-tiempo/MiTiempoLoading";
import { useMiTiempo } from "@/src/app/hoja-tiempo/MiTiempoContext";
import { RegistrarHorasModal } from "@/src/app/hoja-tiempo/RegistrarHorasModal";
import { LOADING_COPY, loadingPlaceholder } from "@/src/lib/copy/loading";
import { useAsyncAction } from "@/src/lib/use-async-action";

type Vista = "lista" | "dia";

function MiTiempoNavigationEffects({
  onRegistroGuardado,
}: {
  onRegistroGuardado: (fecha: string) => void;
}) {
  const { setRegistroGuardadoHandler } = useMiTiempo();

  useEffect(() => {
    setRegistroGuardadoHandler(onRegistroGuardado);
    return () => setRegistroGuardadoHandler(undefined);
  }, [onRegistroGuardado, setRegistroGuardadoHandler]);

  return null;
}

export function MiTiempoView() {
  const { registrosLoaded, registrosError, reloadRegistros } = useMiTiempo();
  const { loading: retrying, run: retryLoad } = useAsyncAction(reloadRegistros);
  const [vista, setVista] = useState<Vista>("lista");
  const [tab, setTab] = useState<"cal" | "lista">("cal");
  const [fechaSeleccionada, setFechaSeleccionada] = useState<string | null>(
    null,
  );
  const [esHistorial, setEsHistorial] = useState(false);

  const handleSelectDia = (fecha: string, fromHistorial: boolean) => {
    setFechaSeleccionada(fecha);
    setEsHistorial(fromHistorial);
    setVista("dia");
  };

  const handleVolver = () => {
    setVista("lista");
    setFechaSeleccionada(null);
    setEsHistorial(false);
  };

  const handleRegistroGuardado = useCallback(
    (fecha: string) => {
      if (vista === "dia") {
        setFechaSeleccionada(fecha);
        setEsHistorial(false);
        return;
      }
      if (tab === "lista") {
        return;
      }
      setFechaSeleccionada(fecha);
      setEsHistorial(false);
      setVista("dia");
    },
    [vista, tab],
  );

  if (!registrosLoaded) {
    return <MiTiempoLoading />;
  }

  if (registrosError) {
    return (
      <div className="view-wide flex min-h-[320px] flex-col items-center justify-center gap-4 text-center">
        <p className="max-w-md text-[13px] text-[#374151]">{registrosError}</p>
        <p className="max-w-md text-[12px] text-muted">
          Inicia sesión con tu correo{" "}
          <span className="font-medium">@h-mv.com</span> o revisa el estado de
          la conexión en{" "}
          <a href="/dev/ifs" className="font-semibold text-navy underline">
            /dev/ifs
          </a>
          .
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            variant="primary"
            onClick={() => void retryLoad()}
            loading={retrying}
            loadingLabel={loadingPlaceholder(LOADING_COPY.generic)}
          >
            Reintentar
          </Button>
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-lg border border-[#c7d9ed] bg-[#eef3f9] px-4 py-2 text-[13px] font-medium text-navy hover:bg-[#dbeafe]"
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <MiTiempoNavigationEffects onRegistroGuardado={handleRegistroGuardado} />

      {vista === "dia" && fechaSeleccionada ? (
        <MiTiempoDia
          fecha={fechaSeleccionada}
          esHistorial={esHistorial}
          onVolver={handleVolver}
          onCambiarDia={(f) => {
            setFechaSeleccionada(f);
            setEsHistorial(false);
          }}
        />
      ) : (
        <MiTiempoLista
          tab={tab}
          onTabChange={setTab}
          onSelectDia={handleSelectDia}
        />
      )}
      <RegistrarHorasModal />
    </>
  );
}
