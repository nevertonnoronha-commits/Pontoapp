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
  valid: { label: "Válido", color: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" },
  suspicious: { label: "Suspeito", color: "bg-amber-500/10 text-amber-400 border border-amber-500/20" },
  rejected: { label: "Rejeitado", color: "bg-red-500/10 text-red-400 border border-red-500/20" },
  manual: { label: "Manual", color: "bg-blue-500/10 text-blue-400 border border-blue-500/20" },
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
        <h1 className="text-2xl font-bold text-white tracking-tight">Registros de Ponto</h1>
        <p className="text-sm text-slate-400 mt-0.5">{records?.length || 0} registros encontrados</p>
      </div>

      {/* Filter form */}
      <form className="glass-card rounded-2xl p-5">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Data inicial</label>
            <input
              type="date"
              name="from"
              defaultValue={params.from}
              className="glass-input rounded-xl px-3 py-2 text-sm [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Data final</label>
            <input
              type="date"
              name="to"
              defaultValue={params.to}
              className="glass-input rounded-xl px-3 py-2 text-sm [color-scheme:dark]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">Funcionário</label>
            <select
              name="employee"
              defaultValue={params.employee}
              className="glass-input rounded-xl px-3 py-2 text-sm [&>option]:bg-[#0d162d] [&>option]:text-white"
            >
              <option value="">Todos</option>
              {employees?.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white px-5 py-2 rounded-xl text-sm font-semibold shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all"
          >
            <Search size={15} />
            Filtrar
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {(!records || records.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <ClipboardList size={32} className="text-slate-400" />
            </div>
            <p className="text-slate-200 font-medium">Nenhum registro encontrado</p>
            <p className="text-slate-400 text-sm mt-1">Tente ajustar os filtros acima.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-white/5 border-b border-white/10">
                <tr>
                  {["Funcionário", "Data", "Hora", "Tipo", "GPS", "WiFi", "Status"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {records.map((r) => {
                  const st = STATUS_LABELS[r.status] || { label: r.status, color: "bg-white/10 text-slate-300 border border-white/20" };
                  return (
                    <tr key={r.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-4 py-3 font-semibold text-white">
                        {(r.user as { name: string })?.name}
                      </td>
                      <td className="px-4 py-3 text-slate-400">{formatDate(r.recorded_at)}</td>
                      <td className="px-4 py-3 text-emerald-400 font-semibold tabular-nums">
                        {formatTime(r.recorded_at)}
                      </td>
                      <td className="px-4 py-3 text-slate-300">{PUNCH_LABELS[r.punch_type] || r.punch_type}</td>
                      <td className="px-4 py-3">
                        {r.gps_verified ? (
                          <CheckCircle2 size={16} className="text-emerald-400" />
                        ) : (
                          <XCircle size={16} className="text-rose-400" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {r.wifi_confirmed ? (
                          <CheckCircle2 size={16} className="text-emerald-400" />
                        ) : (
                          <XCircle size={16} className="text-rose-400" />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${st.color}`}>
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
