import type {
  DocumentoSoporte,
  DocumentoSoporteEstado,
  GuardarDocumentoSoporteInput,
} from "@/src/lib/documento-soporte-mock";
import { esHistorialEstado, isoToDmy } from "@/src/lib/documento-soporte-mock";
import type {
  CDseRequest,
  CDseRequestInsert,
  CDseRequestState,
} from "@/src/lib/ifs/cemp-dse";

function clip(value: string, max: number): string {
  return value.trim().slice(0, max);
}

function isoDate(value?: string | null): string {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  const [d, m, y] = value.split("/");
  if (!d || !m || !y) return "";
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export function ifsStateToUi(
  state?: CDseRequestState | string | null,
): DocumentoSoporteEstado {
  const raw = `${state || ""}`.toLowerCase();
  if (raw.includes("reject")) return "Rechazado";
  if (raw.includes("void")) return "Anulado";
  if (raw.includes("cancel")) return "Cancelado";
  if (raw.includes("issue")) return "Emitido";
  if (raw.includes("approv") || raw.includes("sent")) {
    return "Aprobado";
  }
  return "Lanzado";
}

export function toCDseRequestInsert(
  input: GuardarDocumentoSoporteInput,
  actor: { personId: string; empNo: string; companyId: string },
): CDseRequestInsert {
  const company = clip(input.empresaId || actor.companyId, 20);
  const empNo = clip(input.solicitadoPorId || actor.empNo, 10);
  const empCompany = clip(input.solicitadoPorEmpCompany || company, 20);
  const payload: CDseRequestInsert = {
    RequestSource: "EMPPORTAL",
    Description: clip(input.concepto, 100),
    RegisteredBy: clip(actor.personId || actor.empNo, 20),
    Company: company,
    EmpCompany: empCompany,
    EmpNo: empNo,
    DocType: "DSE",
    Nif: clip(input.nif.replace(/\s+/g, ""), 50),
    OrgDocNo: clip(input.noDocumentoOriginal, 50),
    DocDate: isoDate(input.fechaDocumento),
    CurrencyCode: clip(input.divisa, 3),
    Amount: input.monto,
    Iva: 0,
    Riva: 0,
    Rfte: 0,
    Rica: 0,
  };
  if (input.adjunto?.nombre) {
    payload.FileName = clip(input.adjunto.nombre, 50);
  }
  if (input.adjuntoBase64) {
    payload.FileData = input.adjuntoBase64;
  }
  const card = input.tarjetaUltimos4?.replace(/\D/g, "").slice(-4);
  if (card && card.length === 4) {
    payload.CreditCardNo = Number(card);
  }
  if (input.proyectoId?.trim()) {
    payload.Project = clip(input.proyectoId, 10);
  }
  if (input.supplierId?.trim()) {
    payload.SupplierId = clip(input.supplierId, 20);
  }
  return payload;
}

/** PATCH: solo atributos de `CDseRequest-Update`. Description/DocDate/CurrencyCode no son updatable. */
export function toCDseRequestPatch(
  input: GuardarDocumentoSoporteInput,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    Nif: clip(input.nif.replace(/\s+/g, ""), 50),
    OrgDocNo: clip(input.noDocumentoOriginal, 50),
    Amount: input.monto,
    Iva: 0,
    Riva: 0,
    Rfte: 0,
    Rica: 0,
  };
  if (input.adjunto?.nombre) {
    body.FileName = clip(input.adjunto.nombre, 50);
  }
  const card = input.tarjetaUltimos4?.replace(/\D/g, "").slice(-4);
  if (card && card.length === 4) {
    body.CreditCardNo = Number(card);
  }
  if (input.proyectoId?.trim()) {
    body.Project = clip(input.proyectoId, 10);
  }
  if (input.supplierId?.trim()) {
    body.SupplierId = clip(input.supplierId, 20);
  }
  return body;
}

export function requestToDocumento(
  row: CDseRequest,
  names: {
    emp?: string;
    registered?: string;
    company?: string;
    project?: string;
  } = {},
): DocumentoSoporte {
  const no = String(row.RequestNo ?? "");
  const estado = ifsStateToUi(row.Objstate);
  const card =
    row.CreditCardNo != null
      ? String(row.CreditCardNo).replace(/\D/g, "").slice(-4)
      : undefined;
  return {
    no,
    fecha: isoToDmy(isoDate(row.RequestDate)) || isoToDmy(isoDate(row.DocDate)),
    tipo: row.DocType === "NA" ? "NA" : "DSE",
    estado,
    empresaId: row.Company || row.EmpCompany || "",
    empresaLabel: names.company || row.Company || row.EmpCompany || "",
    registradoPorId: row.RegisteredBy && row.RegisteredBy !== "*"
      ? row.RegisteredBy
      : row.CUserPersonId || "",
    registradoPorNombre: names.registered || row.RegisteredBy || "",
    solicitadoPorId: row.EmpNo || "",
    solicitadoPorNombre: names.emp || row.PersonId || row.EmpNo || "",
    nif: row.Nif || "",
    noDocumentoOriginal: row.OrgDocNo || "",
    fechaDocumento: isoToDmy(isoDate(row.DocDate)),
    tarjetaUltimos4: card && card.length === 4 ? card : undefined,
    concepto: row.Description || "",
    divisa: row.CurrencyCode || "",
    monto: Number(row.Amount ?? 0),
    adjunto: row.FileName
      ? { nombre: row.FileName, sizeKb: 0, mime: "application/pdf" }
      : undefined,
    tipoAjuste: row.AdjustmentType || undefined,
    documentoSoporteAnular: row.ReferDse || undefined,
    cudsAnular: row.Cuds || undefined,
    notaSolicitud: row.ApproverComment || undefined,
    aprobadoPorNombre: row.Approver || undefined,
    fechaAprobacion: isoToDmy(isoDate(row.ApprovedDate)) || undefined,
    disponible: esHistorialEstado(estado),
    editable: estado === "Lanzado" && `${row.IsEditAllowed || ""}`.toUpperCase() === "TRUE",
    proyectoId: row.Project || undefined,
    proyectoNombre: names.project || undefined,
  };
}
