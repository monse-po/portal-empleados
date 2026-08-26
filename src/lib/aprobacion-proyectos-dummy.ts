import type { EmpReportItemRow } from "@/src/lib/ifs/types";
import {
  parseEmpReportItems,
  parseIfsProjectTransactionSeq,
} from "@/src/lib/ifs/tiempo-timesheet";

const PROYECTOS_DUMMY: Array<{ codigo: string; nombre: string }> = [
  { codigo: "PRY2026001", nombre: "Modernización PTF Cusiana – Bloque B" },
  { codigo: "PRY2026002", nombre: "Subestación La Loma 500 kV" },
  { codigo: "PRY2026003", nombre: "Oleoducto Caño Limón – mantenimiento" },
  { codigo: "PRY2026004", nombre: "Planta de gas Cupiagua – fase 2" },
  { codigo: "PRY2026005", nombre: "Refinería Cartagena – turnaround" },
  { codigo: "PRY2026006", nombre: "Línea 230 kV Copey – Fundación" },
  { codigo: "PRY2026007", nombre: "Pozo exploratorio Casanare Norte" },
  { codigo: "PRY2026008", nombre: "Terminal marítimo Pozos Colorados" },
  { codigo: "PRY2026009", nombre: "Acueducto regional Cesar" },
  { codigo: "PRY2026010", nombre: "Parque solar La Guajira 80 MW" },
  { codigo: "PRY2026011", nombre: "Interconexión ISA – tramo 4" },
  { codigo: "PRY2026012", nombre: "Planta de tratamiento Barrancabermeja" },
  { codigo: "PRY2026013", nombre: "Gasoducto Ballena – Barranquilla" },
  { codigo: "PRY2026014", nombre: "Edificio administrativo HMV Medellín" },
  { codigo: "PRY2026015", nombre: "Mantenimiento mayor Hidrosogamoso" },
  { codigo: "PRY2026016", nombre: "Red de distribución Atlántico" },
  { codigo: "PRY2026017", nombre: "Estudios geotécnicos Magdalena" },
  { codigo: "PRY2026018", nombre: "Ampliación puerto de Buenaventura" },
  { codigo: "PRY2026019", nombre: "Cierre ambiental Campo Rubiales" },
  { codigo: "PRY2026020", nombre: "Túnel de La Línea – inspección" },
  { codigo: "PRY2026021", nombre: "Subestación Chinú 220 kV" },
  { codigo: "PRY2026022", nombre: "Planta eólica Uribia" },
  { codigo: "PRY2026023", nombre: "Colector de aguas residuales Soacha" },
  { codigo: "PRY2026024", nombre: "Rehabilitación vía al Llano" },
  { codigo: "PRY2026025", nombre: "Centro de control SCADA Bogotá" },
  { codigo: "PRY2026026", nombre: "Almacenamiento GLP Mamonal" },
  { codigo: "PRY2026027", nombre: "Inspección ductos Putumayo" },
  { codigo: "PRY2026028", nombre: "Nueva sede HMV Barranquilla" },
  { codigo: "PRY2026029", nombre: "Repotenciación Chivor" },
  { codigo: "PRY2026030", nombre: "Estudios sísmicos Piedemonte" },
];

const EMPLEADOS_DUMMY: Array<{ empNo: string; nombre: string }> = [
  { empNo: "1001138401", nombre: "Ana Martínez Rueda" },
  { empNo: "1001138402", nombre: "Carlos Pérez Gómez" },
  { empNo: "1001138403", nombre: "Laura Sánchez Díaz" },
  { empNo: "1001138404", nombre: "Andrés Gómez Ruiz" },
  { empNo: "1001138405", nombre: "María Restrepo León" },
  { empNo: "1001138406", nombre: "Julián Torres Mora" },
  { empNo: "1001138407", nombre: "Paola Herrera Cruz" },
  { empNo: "1001138408", nombre: "Diego Ramírez Soto" },
  { empNo: "1001138409", nombre: "Camila Vargas Peña" },
  { empNo: "1001138410", nombre: "Felipe Castro Nieto" },
  { empNo: "1001138411", nombre: "Natalia López Mejía" },
  { empNo: "1001138412", nombre: "Santiago Ortiz Cano" },
  { empNo: "1001138413", nombre: "Valentina Rojas Gil" },
  { empNo: "1001138414", nombre: "Mateo Jiménez Pardo" },
  { empNo: "1001138415", nombre: "Isabella Duarte Silva" },
  { empNo: "1001138416", nombre: "Sebastián Molina Rico" },
  { empNo: "1001138417", nombre: "Daniela Peña Acosta" },
  { empNo: "1001138418", nombre: "Nicolás Álvarez Ríos" },
  { empNo: "1001138419", nombre: "Sofía Mendoza Palacio" },
  { empNo: "1001138420", nombre: "Tomás Aguilar Cárdenas" },
  { empNo: "1001138421", nombre: "Gabriela Suárez Pinto" },
  { empNo: "1001138422", nombre: "Samuel Parra Quintero" },
  { empNo: "1001138423", nombre: "Mariana Castaño Vélez" },
  { empNo: "1001138424", nombre: "Emilio Navarro Díaz" },
  { empNo: "1001138425", nombre: "Lucía Beltrán Ospina" },
  { empNo: "1001138426", nombre: "Martín Franco Hoyos" },
  { empNo: "1001138427", nombre: "Elena Pineda Salazar" },
  { empNo: "1001138428", nombre: "Joaquín Reyes Cifuentes" },
  { empNo: "1001138429", nombre: "Renata Guerrero Arias" },
  { empNo: "1001138430", nombre: "Iván Delgado Muñoz" },
  { empNo: "1001138431", nombre: "Catalina Mora Escobar" },
  { empNo: "1001138432", nombre: "Pablo Rincón Zapata" },
  { empNo: "1001138433", nombre: "Alejandra Cubillos Niño" },
  { empNo: "1001138434", nombre: "Ricardo Fonseca Lara" },
  { empNo: "1001138435", nombre: "Juliana Pacheco Bernal" },
  { empNo: "1001138436", nombre: "Héctor Villamizar Cruz" },
  { empNo: "1001138437", nombre: "Mónica Giraldo Peña" },
  { empNo: "1001138438", nombre: "Óscar Medina Flórez" },
  { empNo: "1001138439", nombre: "Patricia Cárdenas León" },
  { empNo: "1001138440", nombre: "Raúl Espinosa Correa" },
];

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickStatus(rand: () => number): "Registered" | "Confirmed" | "Rejected" {
  const roll = rand();
  if (roll < 0.72) return "Registered";
  if (roll < 0.92) return "Confirmed";
  return "Rejected";
}

/**
 * Carga de prueba: 30 proyectos, ~2000 h pendientes, cientos de filas.
 * Mismo shape que GetApprovalTimesheets para reusar los mappers reales.
 */
export function buildDummyApprovalTimesheet(): { value: EmpReportItemRow[] } {
  const rand = mulberry32(20260826);
  const rows: EmpReportItemRow[] = [];
  let seq = 8_000_001;
  let horasPendientes = 0;
  const targetPendientes = 2000;

  for (let p = 0; p < PROYECTOS_DUMMY.length; p++) {
    const proy = PROYECTOS_DUMMY[p];
    const nEmpleados = p < 2 ? 28 : 8 + Math.floor(rand() * 5);
    const startEmp = Math.floor(rand() * EMPLEADOS_DUMMY.length);

    for (let e = 0; e < nEmpleados; e++) {
      const emp = EMPLEADOS_DUMMY[(startEmp + e) % EMPLEADOS_DUMMY.length];
      const nDias = 2 + Math.floor(rand() * 4);

      for (let d = 0; d < nDias; d++) {
        const day = 3 + ((p * 3 + e + d) % 22);
        const horas = rand() < 0.35 ? 4 : 8;
        let status = pickStatus(rand);
        if (horasPendientes >= targetPendientes && status === "Registered") {
          status = "Confirmed";
        }
        if (status === "Registered") horasPendientes += horas;

        rows.push({
          CompanyId: "HMVINGCO",
          EmpNo: emp.empNo,
          EmployeeName: emp.nombre,
          ProjectTransactionSeq: seq++,
          AccountDate: `2026-08-${String(day).padStart(2, "0")}`,
          Hours: horas,
          CStatus: status,
          CStatusDb: status,
          ShortName: proy.codigo,
          ProjectId: proy.codigo,
          ProjectName: proy.nombre,
          SubProjectId: `SUB-${(p % 4) + 1}0${(e % 3) + 1}`,
          SubProjectDesc: e % 2 === 0 ? "Ingeniería de detalle" : "Obra civil",
          ActivityNo: `ACT-${100 + (e % 9)}`,
          ActDescription: e % 3 === 0 ? "Supervisión en campo" : "Diseño",
          ReportCostCode: rand() < 0.15 ? "HED" : "DN",
          InternalComments: d === 0 ? "Registro de prueba para carga." : "",
          CApproverName: "Aprobador dummy",
        });
      }
    }
  }

  return { value: rows };
}

export function applyDummyApprovalDecision(
  raw: unknown,
  registroIds: string[],
  decision: "aprobado" | "rechazado",
): { value: EmpReportItemRow[] } {
  const seqs = new Set(
    registroIds
      .map(parseIfsProjectTransactionSeq)
      .filter((n): n is number => n != null),
  );
  const status = decision === "aprobado" ? "Confirmed" : "Rejected";
  return {
    value: parseEmpReportItems(raw).map((row) => {
      if (row.ProjectTransactionSeq == null || !seqs.has(row.ProjectTransactionSeq)) {
        return row;
      }
      return { ...row, CStatus: status, CStatusDb: status };
    }),
  };
}
