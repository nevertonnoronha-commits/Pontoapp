"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatHours, formatCurrency, getMonthName } from "@/lib/hours";
import { generateMonthlyReportPDF } from "@/lib/pdf";
import type { WorkdaySummary, User, EmployeeProfile } from "@/types";
import { useEffect } from "react";

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
      const { data: emps } = await supabase.from("users").select("id, name, email, role, organization_id, is_active, created_at, updated_at")
        .eq("organization_id", adminData?.organization_id).eq("role", "employee").eq("is_active", true).order("name");
      setEmployees(emps || []);
      const { data: config } = await supabase.from("store_configs").select("store_name").eq("organization_id", adminData?.organization_id).single();
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
      .from("workday_summaries").select("*")
      .eq("user_id", selectedEmployee)
      .gte("work_date", from).lte("work_date", to)
      .order("work_date");
    const { data: p } = await supabase.from("employee_profiles").select("*").eq("user_id", selectedEmployee).single();
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Relatórios Mensais</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Funcionário</label>
          <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm min-w-[180px]">
            <option value="">Selecione...</option>
            {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mês</label>
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
              <option key={m} value={m}>{getMonthName(m)}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ano</label>
          <input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24" />
        </div>
        <button onClick={handleSearch} disabled={!selectedEmployee || loading}
          className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-5 py-2 rounded-lg text-sm font-medium">
          {loading ? "Buscando..." : "Buscar"}
        </button>
        {workdays.length > 0 && (
          <button onClick={handlePDF}
            className="bg-amber-800 hover:bg-amber-900 text-white px-5 py-2 rounded-lg text-sm font-medium">
            📄 Gerar PDF
          </button>
        )}
      </div>

      {workdays.length > 0 && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "Dias trabalhados", value: daysWorked },
              { label: "Horas trabalhadas", value: formatHours(totalHours) },
              { label: "Horas extras", value: formatHours(totalOvertime) },
              { label: "Valor extras", value: formatCurrency(totalOvertimeValue) },
            ].map((c) => (
              <div key={c.label} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="text-xl font-bold text-green-700">{c.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{c.label}</div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {["Data", "Entrada", "Almoço", "Retorno", "Saída", "Trabalhado", "Extra", "Banco"].map((h) => (
                    <th key={h} className="px-3 py-3 text-left font-medium text-gray-600 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {workdays.map((d) => (
                  <tr key={d.id} className={`hover:bg-gray-50 ${d.bank_balance < 0 ? "bg-red-50" : ""}`}>
                    <td className="px-3 py-2 font-medium">{new Date(d.work_date + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })}</td>
                    <td className="px-3 py-2">{d.entry_time ? new Date(d.entry_time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--"}</td>
                    <td className="px-3 py-2">{d.lunch_out_time ? new Date(d.lunch_out_time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--"}</td>
                    <td className="px-3 py-2">{d.lunch_return_time ? new Date(d.lunch_return_time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--"}</td>
                    <td className="px-3 py-2">{d.exit_time ? new Date(d.exit_time).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "--"}</td>
                    <td className="px-3 py-2 font-medium">{formatHours(d.hours_worked)}</td>
                    <td className="px-3 py-2 text-amber-700">{d.overtime_hours > 0 ? formatHours(d.overtime_hours) : "--"}</td>
                    <td className={`px-3 py-2 font-medium ${d.bank_balance >= 0 ? "text-green-700" : "text-red-600"}`}>{formatHours(d.bank_balance)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-green-50 border-t-2 border-green-200">
                <tr>
                  <td colSpan={5} className="px-3 py-3 font-bold text-gray-800">TOTAL ({daysWorked} dias)</td>
                  <td className="px-3 py-3 font-bold">{formatHours(totalHours)}</td>
                  <td className="px-3 py-3 font-bold text-amber-700">{formatHours(totalOvertime)}</td>
                  <td className={`px-3 py-3 font-bold ${totalBank >= 0 ? "text-green-700" : "text-red-600"}`}>{formatHours(totalBank)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {!loading && workdays.length === 0 && selectedEmployee && (
        <div className="text-center text-gray-500 py-12">Nenhum registro para o período selecionado.</div>
      )}
    </div>
  );
}
