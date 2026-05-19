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
    { label: "Presentes agora", value: presentCount, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", border: "border-green-100" },
    { label: "Ausentes", value: absentCount, icon: XCircle, color: "text-red-500", bg: "bg-red-50", border: "border-red-100" },
    { label: "Total funcionários", value: employees?.length || 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-100" },
    { label: "Horas extras hoje", value: formatHours(totalOvertimeToday), icon: Timer, color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-100" },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`bg-white rounded-xl border ${card.border} p-4 flex flex-col gap-3`}>
              <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center`}>
                <Icon size={20} className={card.color} />
              </div>
              <div>
                <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
                <div className="text-xs text-gray-500 mt-0.5">{card.label}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent activity */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <span className="font-semibold text-gray-800">Atividade de Hoje</span>
          <span className="text-xs text-gray-400">{todayRecords?.length || 0} registros</span>
        </div>

        {(!todayRecords || todayRecords.length === 0) ? (
          <div className="p-10 text-center">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Timer size={24} className="text-gray-400" />
            </div>
            <p className="text-gray-500 text-sm">Nenhum registro hoje.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {todayRecords.slice(0, 20).map((r) => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-green-700">
                      {((r.user as { name: string })?.name || "?").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-sm text-gray-800">{(r.user as { name: string })?.name}</div>
                    <div className="text-xs text-gray-400">{PUNCH_LABELS[r.punch_type] || r.punch_type}</div>
                  </div>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${r.gps_verified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                      <MapPin size={10} />
                      GPS
                    </span>
                    <span className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${r.wifi_confirmed ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      <Wifi size={10} />
                      WiFi
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-gray-700 tabular-nums">
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
