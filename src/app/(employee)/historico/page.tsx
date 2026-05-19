import { createClient } from "@/lib/supabase/server";
import { formatTime, formatHours } from "@/lib/hours";
import { CalendarDays, CheckCircle2, Clock, TrendingUp } from "lucide-react";

export default async function HistoricoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: summaries } = await supabase
    .from("workday_summaries")
    .select("*")
    .eq("user_id", user.id)
    .order("work_date", { ascending: false })
    .limit(30);

  return (
    <div className="px-4 py-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Meu Histórico</h1>
        {summaries && summaries.length > 0 && (
          <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
            {summaries.length} dias
          </span>
        )}
      </div>

      {(!summaries || summaries.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CalendarDays size={32} className="text-gray-400" />
          </div>
          <p className="text-gray-500 font-medium">Nenhum registro ainda</p>
          <p className="text-gray-400 text-sm mt-1">Seus registros de ponto aparecerão aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {summaries.map((s) => {
            const date = new Date(s.work_date + "T12:00:00");
            const dayName = date.toLocaleDateString("pt-BR", { weekday: "short" });
            const dayNum = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

            return (
              <div key={s.id} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-50 rounded-xl flex flex-col items-center justify-center">
                      <span className="text-[9px] text-green-600 font-medium uppercase leading-none">{dayName}</span>
                      <span className="text-sm font-bold text-green-700 leading-none mt-0.5">
                        {date.getDate().toString().padStart(2, "0")}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-gray-800 text-sm">{dayNum}</div>
                      <div className={`text-xs font-medium mt-0.5 ${s.is_complete ? "text-green-600" : "text-amber-600"}`}>
                        {s.is_complete ? "Completo" : "Em andamento"}
                      </div>
                    </div>
                  </div>

                  {s.overtime_hours > 0 && (
                    <span className="flex items-center gap-1 text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-medium">
                      <TrendingUp size={11} />
                      +{formatHours(s.overtime_hours)}
                    </span>
                  )}
                </div>

                {/* Times grid */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-gray-50 rounded-xl px-3 py-2">
                    <div className="text-xs text-gray-400 mb-0.5">Entrada</div>
                    <div className="font-semibold text-gray-800">{formatTime(s.entry_time) || "--"}</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl px-3 py-2">
                    <div className="text-xs text-gray-400 mb-0.5">Saída</div>
                    <div className="font-semibold text-gray-800">{formatTime(s.exit_time) || "--"}</div>
                  </div>
                  <div className="bg-gray-50 rounded-xl px-3 py-2">
                    <div className="text-xs text-gray-400 mb-0.5">Trabalhado</div>
                    <div className="font-semibold text-gray-800 flex items-center gap-1">
                      <Clock size={12} className="text-gray-400" />
                      {formatHours(s.hours_worked)}
                    </div>
                  </div>
                  <div className={`rounded-xl px-3 py-2 ${s.bank_balance >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                    <div className="text-xs text-gray-400 mb-0.5">Banco de horas</div>
                    <div className={`font-semibold text-sm ${s.bank_balance >= 0 ? "text-green-700" : "text-red-600"}`}>
                      {s.bank_balance >= 0 ? "+" : ""}{formatHours(s.bank_balance)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
