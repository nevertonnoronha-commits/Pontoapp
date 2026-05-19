import type { WorkdayCalculation, MonthlyTotals, WorkdaySummary } from "@/types";

/**
 * Calculate workday hours from a list of punch records.
 * Supports multiple entry/exit cycles in the same day.
 * Pairs each "entry" or "lunch_return" with the next "exit" or "lunch_out".
 */
export function calculateWorkday(
  records: { punch_type: string; recorded_at: string }[],
  dailyHours: number,
  salary: number,
  monthlyHours: number
): WorkdayCalculation {
  const sorted = [...records].sort(
    (a, b) => new Date(a.recorded_at).getTime() - new Date(b.recorded_at).getTime()
  );

  let totalWorkMs = 0;
  let lastEntryMs: number | null = null;

  for (const rec of sorted) {
    const t = new Date(rec.recorded_at).getTime();
    const isIn = rec.punch_type === "entry" || rec.punch_type === "lunch_return";
    const isOut = rec.punch_type === "exit" || rec.punch_type === "lunch_out";

    if (isIn) {
      lastEntryMs = t;
    } else if (isOut && lastEntryMs !== null) {
      totalWorkMs += t - lastEntryMs;
      lastEntryMs = null;
    }
  }

  if (totalWorkMs === 0) {
    return { hours_worked: 0, overtime_hours: 0, bank_balance: 0, overtime_value: 0 };
  }

  const hours_worked = totalWorkMs / (1000 * 60 * 60);
  const overtime_hours = Math.max(0, hours_worked - dailyHours);
  const bank_balance = hours_worked - dailyHours;
  const hourly_rate = monthlyHours > 0 ? salary / monthlyHours : 0;
  const overtime_value = overtime_hours * hourly_rate;

  return {
    hours_worked: Math.round(hours_worked * 100) / 100,
    overtime_hours: Math.round(overtime_hours * 100) / 100,
    bank_balance: Math.round(bank_balance * 100) / 100,
    overtime_value: Math.round(overtime_value * 100) / 100,
  };
}

/**
 * Calculate monthly totals from an array of workday summaries.
 */
export function calculateMonthlyTotal(
  workdays: WorkdaySummary[]
): MonthlyTotals {
  const completedDays = workdays.filter((w) => w.is_complete);

  return {
    total_days_worked: completedDays.length,
    total_hours_worked:
      Math.round(
        workdays.reduce((sum, w) => sum + (w.hours_worked || 0), 0) * 100
      ) / 100,
    total_hours_expected:
      Math.round(
        workdays.reduce((sum, w) => sum + (w.hours_expected || 0), 0) * 100
      ) / 100,
    total_overtime_hours:
      Math.round(
        workdays.reduce((sum, w) => sum + (w.overtime_hours || 0), 0) * 100
      ) / 100,
    total_bank_balance:
      Math.round(
        workdays.reduce((sum, w) => sum + (w.bank_balance || 0), 0) * 100
      ) / 100,
    total_overtime_value:
      Math.round(
        workdays.reduce((sum, w) => sum + (w.overtime_value || 0), 0) * 100
      ) / 100,
  };
}

/**
 * Format decimal hours to HH:MM string.
 */
export function formatHours(hours: number): string {
  const sign = hours < 0 ? "-" : "";
  const absHours = Math.abs(hours);
  const h = Math.floor(absHours);
  const m = Math.round((absHours - h) * 60);
  return `${sign}${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Format currency to BRL.
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

/**
 * Format a date string to PT-BR locale.
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("pt-BR");
}

/**
 * Format a datetime string to PT-BR time.
 */
export function formatTime(dateStr: string | null): string {
  if (!dateStr) return "--:--";
  return new Date(dateStr).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Get the month name in Portuguese.
 */
export function getMonthName(month: number): string {
  const months = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  return months[month - 1] || "";
}

/**
 * Get Brazilian work date string (YYYY-MM-DD) for today.
 */
export function getTodayDateString(): string {
  return new Date().toLocaleDateString("sv-SE"); // Returns YYYY-MM-DD
}
