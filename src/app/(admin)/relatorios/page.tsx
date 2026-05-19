"use client";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatHours, formatCurrency, getMonthName } from "@/lib/hours";
import { generateMonthlyReportPDF } from "@/lib/pdf";
import type { WorkdaySummary, User, EmployeeProfile } from "@/types";
import { FileText, Search, Download, CalendarDays, Clock, TrendingUp, DollarSign } from "lucide-react";

export default function RelatoriosPage() {
  const [employees, setEmployees] = useState<User[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [loading, setLoading] = useState(false);
  const [workdays, setWorkdays] = useState<WorkdaySummary[]>([]);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [employeeData, setEmployeeData] = useState<User | null>(null);
  const [storeName, setStoreName] = useState("PontoApp");

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: adminData } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
      const { data: emps } = await supabase
        .from("users")
        .select("id, name, email, role, organization_id, is_active, created_at, updated_at")
        .eq("organization_id", adminData?.organization_id)
        .eq("role", "employee")
        .eq("is_active", true)
        .order("name");
      setEmployees(emps || []);
      const { data: config } = await supabase
        .from("store_configs")
        .select("store_name")
        .eq("organization_id", adminData?.organization_id)
        .maybeSingle();
      setStoreName(config?.store_name || "PontoApp");
    }
    load();
  }, []);

  async function handleSearch() {
    if (!selectedEmployee) return;
    setLoading(true);
    const from = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDay = new Date(year, month, 0).getDate();
    const to = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;
    const { data: days } = await supabase
      .from("workday_summaries")
      .select("*")
      .eq("user_id", selectedEmployee)
      .gte("work_date", from)
      .lte("work_date", to)
      .order("work_date");
    const { data: p } = await supabase
      .from("employee_profiles")
      .select("*")
      .eq("user_id", selectedEmployee)
      .maybeSingle();
    const emp = employees.find((e) => e.id === selectedEmployee) || null;
    setWorkdays(days || []);
    setProfile(p);
    setEmployeeData(emp);
    setLoading(false);
  }

  function handlePDF() {
    if (!employeeData || !profile || workdays.length === 0) return;
    generateMonthlyReportPDF({ employee: employeeData, profile, workdays, year, month, storeName });
  }

  const totalHours = workdays.reduce((s, d) => s + d.hours_worked, 0);
  const totalOvertime = workdays.reduce((s, d) => s + d.overtime_hours, 0);
  const totalBank = workdays.reduce((s, d) => s + d.bank_balance, 0);
  const totalOvertimeValue = workdays.reduce((s, d) => s + d.overtime_value, 0);
  const daysWorked = workdays.filter((d) => d.is_complete).length;

  const summaryCards = [
    { label: "Dias trabalhados", value: daysWorked, icon: CalendarDays, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/25" },
    { label: "Horas trabalhadas", value: formatHours(totalHours), icon: Clock, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25" },
    { label: "Horas extras", value: formatHours(totalOvertime), icon: TrendingUp, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25" },
    { label: "Valor extras", value: formatCurrency(totalOvertimeValue), icon: DollarSign, color: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/25" },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight text-glow">Relatórios Mensais</h1>
        <p className="text-sm text-slate-400 mt-0.5">Gere e exporte relatórios de ponto por funcionário.</p>
      </div>

      {/* Filter */}
      <div className="glass-card rounded-2xl border border-white/[0.06] p-5">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Funcionário</label>
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="glass-input rounded-xl px-3 py-2.5 text-sm min-w-[180px] [&>option]:bg-[#0d162d] [&>option]:text-white focus:outline-none transition-all"
            >
              <option value="">Selecione...</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Mês</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="glass-input rounded-xl px-3 py-2.5 text-sm [&>option]:bg-[#0d162d] [&>option]:text-white focus:outline-none transition-all"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>{getMonthName(m)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Ano</label>
            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="glass-input rounded-xl px-3 py-2.5 text-sm w-24 focus:outline-none transition-all"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!selectedEmployee || loading}
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 disabled:from-emerald-800/50 disabled:to-teal-800/50 disabled:text-slate-500 disabled:shadow-none text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
          >
            <Search size={15} />
            {loading ? "Buscando..." : "Buscar"}
          </button>
          {workdays.length > 0 && (
            <button
              onClick={handlePDF}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-[0_0_20px_rgba(245,158,11,0.2)] hover:shadow-[0_0_25px_rgba(245,158,11,0.35)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
            >
              <Download size={15} />
              Gerar PDF
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      {workdays.length > 0 && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {summaryCards.map((c) => {
              const Icon = c.icon;
              return (
                <div key={c.label} className={`glass-card rounded-2xl border ${c.border} p-4 flex flex-col gap-3 transition-transform hover:scale-[1.02] duration-300`}>
                  <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center`}>
                    <Icon size={20} className={c.color} />
                  </div>
                  <div>
                    <div className={`text-2xl font-bold ${c.color}`}>{c.value}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{c.label}</div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Table */}
          <div className="glass-card rounded-2xl border border-white/[0.06] overflow-hidden">
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
              <span className="font-semibold text-slate-200">
                {getMonthName(month)} {year} — {employeeData?.name}
              </span>
              <span className="text-xs text-slate-400">{daysWorked} dias completos</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    {["Data", "Entrada", "Almoço", "Retorno", "Saída", "Trabalhado", "Extra", "Banco"].map((h) => (
                      <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {workdays.map((d) => (
                    <tr key={d.id} className={`hover:bg-white/5 transition-colors ${d.bank_balance < 0 ? "bg-rose-500/[0.04] hover:bg-rose-500/[0.08]" : ""}`}>
                      <td className="px-3 py-2.5 font-medium text-slate-200">
                        {new Date(d.work_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-slate-400">
                        {d.entry_time ? new Date(d.entry_time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--"}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-slate-400">
                        {d.lunch_out_time ? new Date(d.lunch_out_time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--"}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-slate-400">
                        {d.lunch_return_time ? new Date(d.lunch_return_time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--"}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-slate-400">
                        {d.exit_time ? new Date(d.exit_time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--"}
                      </td>
                      <td className="px-3 py-2.5 font-semibold text-slate-200 tabular-nums">
                        {formatHours(d.hours_worked)}
                      </td>
                      <td className="px-3 py-2.5 text-amber-400 font-medium tabular-nums">
                        {d.overtime_hours > 0 ? formatHours(d.overtime_hours) : "--"}
                      </td>
                      <td className={`px-3 py-2.5 font-semibold tabular-nums ${d.bank_balance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {d.bank_balance >= 0 ? "+" : ""}{formatHours(d.bank_balance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-white/5 border-t border-white/10">
                  <tr>
                    <td colSpan={5} className="px-3 py-3.5 font-bold text-slate-200">
                      TOTAL ({daysWorked} dias)
                    </td>
                    <td className="px-3 py-3.5 font-bold text-slate-200 tabular-nums">{formatHours(totalHours)}</td>
                    <td className="px-3 py-3.5 font-bold text-amber-400 tabular-nums">{formatHours(totalOvertime)}</td>
                    <td className={`px-3 py-3.5 font-bold tabular-nums ${totalBank >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {totalBank >= 0 ? "+" : ""}{formatHours(totalBank)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}

      {!loading && workdays.length === 0 && selectedEmployee && (
        <div className="flex flex-col items-center justify-center py-16 text-center glass-card rounded-2xl border border-white/[0.06]">
          <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText size={32} className="text-slate-400" />
          </div>
          <p className="text-slate-200 font-medium">Nenhum registro no período</p>
          <p className="text-slate-400 text-sm mt-1">Tente outro mês ou funcionário.</p>
        </div>
      )}
    </div>
  );
}
