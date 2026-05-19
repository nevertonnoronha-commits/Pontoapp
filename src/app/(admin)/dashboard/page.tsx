import { createClient } from "@/lib/supabase/server";
import { formatHours, formatTime } from "@/lib/hours";
import { CheckCircle2, XCircle, Users, Timer, MapPin, Wifi } from "lucide-react";

const PUNCH_LABELS: Record<string, string> = {
  entry: "Entrada",
  lunch_out: "Saída Almoço",
  lunch_return: "Retorno",
  exit: "Saída",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: adminData } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
  const orgId = adminData?.organization_id;

  const today = new Date().toLocaleDateString("sv-SE");

  const { data: todayRecords } = await supabase
    .from("time_records")
    .select("*, user:users(name, email)")
    .eq("organization_id", orgId)
    .gte("recorded_at", today + "T00:00:00")
    .order("recorded_at", { ascending: false });

  const { data: employees } = await supabase
    .from("users")
    .select("id, name")
    .eq("organization_id", orgId)
    .eq("role", "employee")
    .eq("is_active", true);

  const { data: todaySummaries } = await supabase
    .from("workday_summaries")
    .select("*")
    .eq("organization_id", orgId)
    .eq("work_date", today);

  const presentIds = new Set(
    todaySummaries?.filter((s) => s.entry_time && !s.exit_time).map((s) => s.user_id)
  );
  const presentCount = presentIds.size;
  const absentCount = (employees?.length || 0) - presentCount;
  const totalOvertimeToday = todaySummaries?.reduce((s, r) => s + (r.overtime_hours || 0), 0) || 0;

  const stats = [
    { label: "Presentes agora", value: presentCount, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25" },
    { label: "Ausentes", value: absentCount, icon: XCircle, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/25" },
    { label: "Total funcionários", value: employees?.length || 0, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/25" },
    { label: "Horas extras hoje", value: formatHours(totalOvertimeToday), icon: Timer, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25" },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight text-glow">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-0.5">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`glass-card rounded-2xl border ${card.border} p-4 flex flex-col gap-3 transition-transform hover:scale-[1.02] duration-300`}>
              <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center`}>
                <Icon size={20} className={card.color} />
              </div>
              <div>
                <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                <div className="text-xs text-slate-400 mt-0.5">{card.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent activity */}
      <div className="glass-card rounded-2xl border border-white/[0.06] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <span className="font-semibold text-slate-200">Atividade de Hoje</span>
          <span className="text-xs text-slate-400">{todayRecords?.length || 0} registros</span>
        </div>

        {(!todayRecords || todayRecords.length === 0) ? (
          <div className="p-10 text-center">
            <div className="w-12 h-12 bg-white/[0.04] border border-white/[0.08] rounded-full flex items-center justify-center mx-auto mb-3">
              <Timer size={24} className="text-slate-400" />
            </div>
            <p className="text-slate-400 text-sm">Nenhum registro hoje.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {todayRecords.slice(0, 20).map((r) => (
              <div key={r.id} className="px-5 py-3.5 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center shrink-0 font-semibold text-xs">
                    {((r.user as { name: string })?.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-slate-200">{(r.user as { name: string })?.name}</div>
                    <div className="text-xs text-slate-400">{PUNCH_LABELS[r.punch_type] || r.punch_type}</div>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${r.gps_verified ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
                      <MapPin size={10} />
                      GPS
                    </span>
                    <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${r.wifi_confirmed ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/[0.04] text-slate-400 border border-white/[0.06]"}`}>
                      <Wifi size={10} />
                      WiFi
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-300 tabular-nums">
                    {formatTime(r.recorded_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
