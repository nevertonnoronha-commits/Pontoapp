import { createClient } from "@/lib/supabase/server";
import { formatTime, formatDate } from "@/lib/hours";

const PUNCH_LABELS: Record<string, string> = {
  entry: "Entrada", lunch_out: "Saída Almoço", lunch_return: "Retorno", exit: "Saída Final",
};
const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  valid: { label: "Válido", color: "bg-green-100 text-green-700" },
  suspicious: { label: "Suspeito", color: "bg-amber-100 text-amber-700" },
  rejected: { label: "Rejeitado", color: "bg-red-100 text-red-700" },
  manual: { label: "Manual", color: "bg-blue-100 text-blue-700" },
};

export default async function RegistrosPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; employee?: string }> }) {
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
  const { data: employees } = await supabase.from("users").select("id, name").eq("organization_id", orgId).eq("role", "employee");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Registros de Ponto</h1>

      <form className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">De</label>
          <input type="date" name="from" defaultValue={params.from} className="border border-gray-300 rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Até</label>
          <input type="date" name="to" defaultValue={params.to} className="border border-gray-300 rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Funcionário</label>
          <select name="employee" defaultValue={params.employee} className="border border-gray-300 rounded px-3 py-2 text-sm">
            <option value="">Todos</option>
            {employees?.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded text-sm font-medium">Filtrar</button>
      </form>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {["Funcionário", "Data", "Hora", "Tipo", "GPS", "WiFi", "Status"].map((h) => (
                <th key={h} className="px-4 py-3 text-left font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {!records || records.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">Nenhum registro encontrado.</td></tr>
            ) : records.map((r) => {
              const st = STATUS_LABELS[r.status] || { label: r.status, color: "bg-gray-100 text-gray-700" };
              return (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{(r.user as { name: string })?.name}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(r.recorded_at)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatTime(r.recorded_at)}</td>
                  <td className="px-4 py-3">{PUNCH_LABELS[r.punch_type] || r.punch_type}</td>
                  <td className="px-4 py-3">{r.gps_verified ? "✅" : "❌"}</td>
                  <td className="px-4 py-3">{r.wifi_confirmed ? "✅" : "❌"}</td>
                  <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.color}`}>{st.label}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
