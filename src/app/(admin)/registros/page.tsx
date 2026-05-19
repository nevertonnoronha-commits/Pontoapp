import { createClient } from "@/lib/supabase/server";
import { formatTime, formatDate } from "@/lib/hours";
import { CheckCircle2, XCircle, Search, ClipboardList } from "lucide-react";

const PUNCH_LABELS: Record<string, string> = {
  entry: "Entrada",
  lunch_out: "Saída Almoço",
  lunch_return: "Retorno",
  exit: "Saída Final",
};
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  valid: { label: "Válido", color: "bg-green-100 text-green-700" },
  suspicious: { label: "Suspeito", color: "bg-amber-100 text-amber-700" },
  rejected: { label: "Rejeitado", color: "bg-red-100 text-red-700" },
  manual: { label: "Manual", color: "bg-blue-100 text-blue-700" },
};

export default async function RegistrosPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; employee?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: adminData } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
  const orgId = adminData?.organization_id;

  let query = supabase
    .from("time_records")
    .select("*, user:users(name, email)")
    .eq("organization_id", orgId)
    .order("recorded_at", { ascending: false })
    .limit(100);

  if (params.from) query = query.gte("recorded_at", params.from + "T00:00:00");
  if (params.to) query = query.lte("recorded_at", params.to + "T23:59:59");
  if (params.employee) query = query.eq("user_id", params.employee);

  const { data: records } = await query;
  const { data: employees } = await supabase
    .from("users")
    .select("id, name")
    .eq("organization_id", orgId)
    .eq("role", "employee");

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Registros de Ponto</h1>
        <p className="text-sm text-gray-500 mt-0.5">{records?.length || 0} registros encontrados</p>
      </div>

      {/* Filter form */}
      <form className="bg-white rounded-2xl border border-gray-100 p-5">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Data inicial</label>
            <input
              type="date"
              name="from"
              defaultValue={params.from}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Data final</label>
            <input
              type="date"
              name="to"
              defaultValue={params.to}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">Funcionário</label>
            <select
              name="employee"
              defaultValue={params.employee}
              className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
            >
              <option value="">Todos</option>
              {employees?.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-xl text-sm font-semibold transition-colors"
          >
            <Search size={15} />
            Filtrar
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {(!records || records.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ClipboardList size={32} className="text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">Nenhum registro encontrado</p>
            <p className="text-gray-400 text-sm mt-1">Tente ajustar os filtros acima.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {["Funcionário", "Data", "Hora", "Tipo", "GPS", "WiFi", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map((r) => {
                  const st = STATUS_LABELS[r.status] || { label: r.status, color: "bg-gray-100 text-gray-700" };
                  return (
                    <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {(r.user as { name: string })?.name}
                      </td>
                      <td className="px-4 py-3 text-gray-500">{formatDate(r.recorded_at)}</td>
                      <td className="px-4 py-3 text-gray-700 font-medium tabular-nums">
                        {formatTime(r.recorded_at)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{PUNCH_LABELS[r.punch_type] || r.punch_type}</td>
                      <td className="px-4 py-3">
                        {r.gps_verified ? (
                          <CheckCircle2 size={16} className="text-green-500" />
                        ) : (
                          <XCircle size={16} className="text-red-400" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.wifi_confirmed ? (
                          <CheckCircle2 size={16} className="text-green-500" />
                        ) : (
                          <XCircle size={16} className="text-red-400" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${st.color}`}>
                          {st.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
