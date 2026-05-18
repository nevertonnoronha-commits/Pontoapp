import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { WorkdaySummary, User, EmployeeProfile } from "@/types";
import { formatHours, formatCurrency, getMonthName, formatTime } from "./hours";

interface ReportData {
  employee: User;
  profile: EmployeeProfile;
  workdays: WorkdaySummary[];
  year: number;
  month: number;
  storeName: string;
}

export function generateMonthlyReportPDF(data: ReportData): void {
  const { employee, profile, workdays, year, month, storeName } = data;
  const doc = new jsPDF();

  // Header
  doc.setFillColor(22, 163, 74); // green-600
  doc.rect(0, 0, 210, 35, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("PontoApp", 14, 15);

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Relatório Mensal de Ponto", 14, 23);
  doc.text(storeName, 14, 30);

  // Employee info section
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Dados do Funcionário", 14, 45);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Nome: ${employee.name}`, 14, 53);
  doc.text(`E-mail: ${employee.email}`, 14, 59);
  doc.text(`Cargo: ${profile.job_title || "Não informado"}`, 14, 65);
  doc.text(
    `Período: ${getMonthName(month)} / ${year}`,
    14,
    71
  );

  doc.text(
    `Salário Base: ${formatCurrency(profile.salary)}`,
    120,
    53
  );
  doc.text(
    `Horas Diárias: ${profile.daily_hours}h`,
    120,
    59
  );
  doc.text(
    `Horas Mensais: ${profile.monthly_hours}h`,
    120,
    65
  );
  doc.text(
    `Valor Hora: ${formatCurrency(profile.salary / profile.monthly_hours)}`,
    120,
    71
  );

  // Separator line
  doc.setDrawColor(22, 163, 74);
  doc.setLineWidth(0.5);
  doc.line(14, 76, 196, 76);

  // Table
  const tableData = workdays.map((day) => {
    const date = new Date(day.work_date + "T00:00:00");
    const dateStr = date.toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    });

    return [
      dateStr,
      formatTime(day.entry_time),
      formatTime(day.lunch_out_time),
      formatTime(day.lunch_return_time),
      formatTime(day.exit_time),
      formatHours(day.hours_worked),
      formatHours(day.overtime_hours),
      formatHours(day.bank_balance),
    ];
  });

  // Calculate totals
  const totalHoursWorked = workdays.reduce(
    (sum, d) => sum + (d.hours_worked || 0),
    0
  );
  const totalOvertime = workdays.reduce(
    (sum, d) => sum + (d.overtime_hours || 0),
    0
  );
  const totalBank = workdays.reduce(
    (sum, d) => sum + (d.bank_balance || 0),
    0
  );
  const totalOvertimeValue = workdays.reduce(
    (sum, d) => sum + (d.overtime_value || 0),
    0
  );
  const daysWorked = workdays.filter((d) => d.is_complete).length;

  // Add totals row
  tableData.push([
    `TOTAL (${daysWorked} dias)`,
    "",
    "",
    "",
    "",
    formatHours(totalHoursWorked),
    formatHours(totalOvertime),
    formatHours(totalBank),
  ]);

  autoTable(doc, {
    startY: 82,
    head: [
      [
        "Data",
        "Entrada",
        "Saída Almoço",
        "Retorno",
        "Saída",
        "Trabalhado",
        "Extra",
        "Banco",
      ],
    ],
    body: tableData,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [22, 163, 74],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [240, 253, 244],
    },
    foot: [],
    didParseCell: (data) => {
      // Style totals row
      if (data.row.index === tableData.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [209, 250, 229];
      }
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable.finalY || 200;

  // Summary section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo Financeiro", 14, finalY + 12);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Dias Trabalhados: ${daysWorked}`, 14, finalY + 20);
  doc.text(
    `Total de Horas: ${formatHours(totalHoursWorked)}`,
    14,
    finalY + 27
  );
  doc.text(
    `Horas Extras: ${formatHours(totalOvertime)}`,
    14,
    finalY + 34
  );
  doc.text(
    `Banco de Horas: ${formatHours(totalBank)}`,
    14,
    finalY + 41
  );
  doc.text(
    `Valor Horas Extras: ${formatCurrency(totalOvertimeValue)}`,
    14,
    finalY + 48
  );

  doc.setFont("helvetica", "bold");
  doc.text(
    `Salário Total: ${formatCurrency(profile.salary + totalOvertimeValue)}`,
    14,
    finalY + 58
  );

  // Footer
  const pageCount = doc.getNumberOfPages();
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(128, 128, 128);

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.text(
      `Gerado em ${new Date().toLocaleString("pt-BR")} | PontoApp`,
      14,
      290
    );
    doc.text(`Página ${i} de ${pageCount}`, 180, 290);
  }

  // Download
  const fileName = `relatorio-${employee.name.replace(/\s+/g, "-").toLowerCase()}-${String(month).padStart(2, "0")}-${year}.pdf`;
  doc.save(fileName);
}
