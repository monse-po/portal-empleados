"use client";

import Link from "next/link";
import { Icon } from "@/src/components/ui/Icon";
import { isPathVisible } from "@/src/lib/modules";
import { recientesVisibles } from "@/src/lib/recientes-dummy";

export function InicioView() {
  const items = recientesVisibles(isPathVisible);

  return (
    <div className="view-wide max-w-[640px]">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-[#111]">Inicio</h1>
        <p className="mt-1 text-[13px] text-[#4b5563]">
          Repite lo último sin volver a llenar todo
        </p>
        <p className="mt-2 rounded-lg border border-[#c7d9ed] bg-[#eef3f9] px-3 py-1.5 text-[13px] text-navy">
          <strong>Prueba.</strong> Un clic abre un registro{" "}
          <strong>nuevo</strong> con proyecto, tipo y horas ya puestos. No abre
          el de ayer.
        </p>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-white">
        <div className="border-b border-border px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
          Usar de nuevo
        </div>
        {items.length === 0 ? (
          <p className="px-4 py-6 text-[13px] text-muted">
            No hay recientes para los módulos visibles.
          </p>
        ) : (
          <ul>
            {items.map((item, index) => (
              <li key={item.id}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-[#f8fafc] ${
                    index < items.length - 1 ? "border-b border-[#f0f0f0]" : ""
                  }`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#eef3f9] text-navy">
                    <Icon name={item.icon} size="sm" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="text-[13px] font-medium text-[#111]">
                        {item.titulo}
                      </span>
                      <span className="shrink-0 text-[11px] font-semibold text-navy">
                        Usar
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-[12px] text-[#4b5563]">
                      {item.tipoLabel} · {item.detalle}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
