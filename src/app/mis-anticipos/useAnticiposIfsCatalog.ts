"use client";

import type { AnticiposDivisaOption, AnticiposIfsProfile } from "@/src/lib/ifs/anticipos-catalog";
import type { EmpleadoAnticipo, LovItem } from "@/src/lib/mis-anticipos-mock";

/** Catálogo IFS de anticipos se carga vía actions de destinos/divisas en el formulario. */
export function useAnticiposIfsCatalog() {
  return {
    connected: false,
    loading: false,
    error: null as string | null,
    profile: null as AnticiposIfsProfile | null,
    companies: [] as LovItem[],
    loadEmployees: async (_companyId: string) => [] as EmpleadoAnticipo[],
    loadProjects: async (_companyId: string) => [] as LovItem[],
    loadCurrencies: async (_companyId: string) => [] as AnticiposDivisaOption[],
    loadBank: async (_companyId: string, _empNo: string) => ({
      banco: "",
      tipo: "",
      cuenta: "",
    }),
    loadAprobador: async (_projectId: string) =>
      null as { codigo: string; nombre: string } | null,
  };
}
