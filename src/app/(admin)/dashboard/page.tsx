import { createClient } from "@/lib/supabase/server";
import { formatHours, formatTime } from "@/lib/hours";

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500">{new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Presentes agora", value: presentCount, icon: "✅", color: "text-green-700" },
          { label: "Ausentes", value: absentCount, icon: "❌", color: "text-red-600" },
          { label: "Total funcionários", value: employees?.length || 0, icon: "👥", color: "text-blue-600" },
          { label: "Horas extras hoje", value: formatHours(totalOvertimeToday), icon: "⏱️", color: "text-amber-700" },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="text-2xl mb-1">{card.icon}</div>
            <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
            <div className="text-xs text-gray-500 mt-0.5">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 font-semibold text-gray-800">Atividade Recente</div>
        {(!todayRecords || todayRecords.length === 0) ? (
          <div className="p-6 text-center text-gray-500 text-sm">Nenhum registro hoje.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {todayRecords.slice(0, 20).map((r) => (
              <div key={r.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm text-gray-800">{(r.user as { name: string })?.name}</div>
                  <div className="text-xs text-gray-500">{PUNCH_LABELS[r.punch_type] || r.punch_type}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-700">{formatTime(r.recorded_at)}</div>
                  <div className={`text-xs ${r.gps_verified ? "text-green-600" : "text-amber-600"}`}>
                    GPS {r.gps_verified ? "✅" : "⚠️"}
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
