import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { HistoricoProyectoSubResumen } from "@/src/lib/historico-tiempo";
import { formatHistoricoRango } from "@/src/lib/historico-tiempo";

function formatHorasTotal(horas: number): string {
  return Number.isInteger(horas) ? String(horas) : horas.toFixed(1);
}

/** Genera y descarga un PDF con la tabla del histórico. */
export function downloadHistoricoPdf(
  filas: HistoricoProyectoSubResumen[],
  opts?: { empleadoNombre?: string; empNo?: string },
): void {
  if (typeof window === "undefined") return;
  if (!filas.length) {
    window.alert("No hay filas para exportar.");
    return;
  }

  const totalHoras = filas.reduce((s, r) => s + r.totalHoras, 0);
  const generado = new Date().toLocaleString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const empleado = opts?.empleadoNombre?.trim() || "Empleado";
  const empNo = opts?.empNo?.trim();

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  doc.setFontSize(14);
  doc.setTextColor(1, 71, 131);
  doc.text("Mi Histórico de tiempo", 14, 16);

  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  const meta = [
    empleado,
    empNo ? `EmpNo ${empNo}` : null,
    `Generado ${generado}`,
    `${filas.length} línea(s)`,
    `${formatHorasTotal(totalHoras)} h`,
  ]
    .filter(Boolean)
    .join(" · ");
  doc.text(meta, 14, 22);

  autoTable(doc, {
    startY: 28,
    head: [["Proyecto", "Subproyecto", "Actividad", "Horas", "Periodo", "Estado"]],
    body: filas.map((r) => [
      `${r.codigo}  ${r.nombre}`,
      r.subproy,
      r.actividad,
      formatHorasTotal(r.totalHoras),
      formatHistoricoRango(r.desde, r.hasta, r.abierto),
      r.abierto ? "Abierto" : "Cerrado",
    ]),
    foot: [["Total", "", "", formatHorasTotal(totalHoras), "", ""]],
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: {
      fillColor: [1, 71, 131],
      textColor: 255,
      fontStyle: "bold",
    },
    footStyles: {
      fillColor: [248, 250, 252],
      textColor: [17, 17, 17],
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 40 },
      2: { cellWidth: 45 },
      3: { cellWidth: 18, halign: "center" },
      4: { cellWidth: 45 },
      5: { cellWidth: 22 },
    },
  });

  const stamp = new Date().toISOString().slice(0, 10);
  doc.save(`mi-historico-${empNo || "empleado"}-${stamp}.pdf`);
}
