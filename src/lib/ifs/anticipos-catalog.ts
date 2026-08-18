import type {
  CurrencyCodesQuery,
  EmployeeInfoQuery,
  IfsCompany,
  PaymentAddress,
  ProjectInfoQuery,
} from "@/src/lib/ifs/types";
import type {
  EmpleadoAnticipo,
  LovItem,
} from "@/src/lib/mis-anticipos-mock";
import { PRE_MAP } from "@/src/lib/mis-anticipos-mock";

export type AnticiposIfsProfile = {
  empNo: string;
  empName: string;
  companyId: string;
  companyName: string;
  personId: string;
  supplierId?: string;
  banco: string;
  tipoCuenta: string;
  cuenta: string;
  companiasGasto: { id: string; label: string }[];
};

export type AnticiposDivisaOption = {
  code: string;
  label: string;
  pre: string;
};

export function mapIfsCompanyToLov(row: IfsCompany): LovItem | null {
  const id = row.Company?.trim();
  if (!id) return null;
  const nombre = row.Name?.trim() || id;
  return { id, nombre, sub: id };
}

export function companyLabel(row: IfsCompany | LovItem | null | undefined): string {
  if (!row) return "";
  if ("nombre" in row) {
    return row.nombre ? `${row.id} – ${row.nombre}` : row.id;
  }
  const id = row.Company?.trim() || "";
  const name = row.Name?.trim();
  return name ? `${id} – ${name}` : id;
}

export function mapIfsEmployee(
  row: EmployeeInfoQuery,
  companyLabelText: string,
): EmpleadoAnticipo | null {
  const empNo = row.CEmpNo?.trim() || "";
  const personId = row.PersonId?.trim() || "";
  const identity = row.Identity?.trim() || "";
  const id =
    personId.replace(/\D/g, "") ||
    empNo.replace(/\D/g, "") ||
    empNo ||
    identity;
  const nombre = row.EmpName?.trim() || row.SupplierName?.trim() || "";
  if (!id || !nombre) return null;
  const empresa = row.Company?.trim() || "";
  return {
    id,
    nombre,
    sub: empNo || id,
    banco: "",
    tipo: "",
    cuenta: "",
    empresa,
    companias: empresa
      ? [{ id: empresa, label: companyLabelText || empresa }]
      : [],
    empNo: empNo || undefined,
    supplierId: identity || undefined,
  };
}

export function mapIfsProjectToLov(row: ProjectInfoQuery): LovItem | null {
  const id = row.ProjectId?.trim();
  if (!id) return null;
  return {
    id,
    nombre: row.Name?.trim() || row.Description?.trim() || id,
    sub: row.Company?.trim() || row.Manager?.trim() || "",
  };
}

export function mapIfsCurrency(row: CurrencyCodesQuery): AnticiposDivisaOption | null {
  const code = row.CurrencyCode?.trim();
  if (!code) return null;
  const desc = row.Description?.trim();
  return {
    code,
    label: desc ? `${code} – ${desc}` : code,
    pre: PRE_MAP[code] || "$",
  };
}

export function mapIfsBank(rows: PaymentAddress[]): {
  banco: string;
  tipo: string;
  cuenta: string;
} {
  const row = rows.find((r) => r.Account?.trim()) ?? rows[0];
  return {
    banco: row?.Bank?.trim() || "",
    tipo: row?.AccountType?.trim() || row?.AccountTypeDb?.trim() || "",
    cuenta: row?.Account?.trim() || "",
  };
}

export function mergeCompanyLovs(lists: Array<LovItem | null | undefined>): LovItem[] {
  const map = new Map<string, LovItem>();
  for (const item of lists) {
    if (!item?.id) continue;
    if (!map.has(item.id)) map.set(item.id, item);
  }
  return [...map.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}
