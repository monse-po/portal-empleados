"use client";

import { useState, useEffect } from "react";
import { Button } from "@/src/components/ui/Button";
import { MiTiempoDia } from "@/src/app/hoja-tiempo/MiTiempoDia";
import { MiTiempoLista } from "@/src/app/hoja-tiempo/MiTiempoLista";
import { MiTiempoLoading } from "@/src/app/hoja-tiempo/MiTiempoLoading";
import { useMiTiempo } from "@/src/app/hoja-tiempo/MiTiempoContext";
import { RegistrarHorasModal } from "@/src/app/hoja-tiempo/RegistrarHorasModal";

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
  const [vista, setVista] = useState<Vista>("lista");
  const [tab, setTab] = useState<"cal" | "hist">("cal");
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

  const handleRegistroGuardado = (fecha: string) => {
    setFechaSeleccionada(fecha);
    setEsHistorial(false);
    setVista("dia");
  };

  if (!registrosLoaded) {
    return <MiTiempoLoading />;
  }

  if (registrosError) {
    return (
      <div className="view-wide flex min-h-[320px] flex-col items-center justify-center gap-4 text-center">
        <p className="max-w-md text-[13px] text-[#374151]">{registrosError}</p>
        <p className="text-[12px] text-muted">
          Ejecuta{" "}
          <code className="rounded bg-[#f3f4f6] px-1.5 py-0.5">
            npm run db:migrate
          </code>{" "}
          y{" "}
          <code className="rounded bg-[#f3f4f6] px-1.5 py-0.5">
            npm run db:seed
          </code>
        </p>
        <Button variant="primary" onClick={() => void reloadRegistros()}>
          Reintentar
        </Button>
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
