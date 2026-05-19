import { createClient } from "@/lib/supabase/server";
import { formatTime, formatHours } from "@/lib/hours";
import { CalendarDays, Clock, TrendingUp } from "lucide-react";

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
    <div className="px-1 py-2 space-y-6 max-w-sm mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Meu Histórico</h1>
        {summaries && summaries.length > 0 && (
          <span className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full font-semibold">
            {summaries.length} {summaries.length === 1 ? "dia" : "dias"}
          </span>
        )}
      </div>

      {(!summaries || summaries.length === 0) ? (
        <div className="glass-card rounded-2xl flex flex-col items-center justify-center py-16 px-4 text-center border border-white/[0.08]">
          <div className="w-16 h-16 bg-white/[0.04] border border-white/[0.08] rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400 shadow-inner animate-pulse">
            <CalendarDays size={28} />
          </div>
          <p className="text-white font-bold text-sm">Nenhum registro ainda</p>
          <p className="text-slate-400 text-xs mt-1">Seus registros de ponto diários aparecerão listados aqui.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {summaries.map((s) => {
            const date = new Date(s.work_date + "T12:00:00");
            const dayName = date.toLocaleDateString("pt-BR", { weekday: "short" });
            const dayNum = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

            return (
              <div key={s.id} className="glass-card rounded-2xl border border-white/[0.08] p-4.5 space-y-4 transition-all duration-300 hover:border-emerald-500/20 hover:scale-[1.01] hover:shadow-[0_4px_20px_rgba(0,0,0,0.2)]">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-white/[0.04] border border-white/[0.08] rounded-xl flex flex-col items-center justify-center shadow-sm shrink-0">
                      <span className="text-[9px] text-emerald-400 font-extrabold uppercase leading-none">{dayName}</span>
                      <span className="text-base font-extrabold text-white leading-none mt-1">
                        {date.getDate().toString().padStart(2, "0")}
                      </span>
                    </div>
                    <div>
                      <div className="font-bold text-white text-sm">{dayNum}</div>
                      <div className={`text-xs font-semibold mt-0.5 flex items-center gap-1.5`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${s.is_complete ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`}></span>
                        <span className={s.is_complete ? "text-emerald-400" : "text-amber-400"}>
                          {s.is_complete ? "Completo" : "Em andamento"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {s.overtime_hours > 0 && (
                    <span className="flex items-center gap-1 text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2.5 py-1 rounded-full font-semibold shadow-[0_0_10px_rgba(245,158,11,0.05)]">
                      <TrendingUp size={12} />
                      +{formatHours(s.overtime_hours)}
                    </span>
                  )}
                </div>

                {/* Times grid */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl px-3 py-2.5">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Entrada</div>
                    <div className="font-bold text-slate-100 text-sm">{formatTime(s.entry_time) || "--"}</div>
                  </div>
                  <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl px-3 py-2.5">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Saída</div>
                    <div className="font-bold text-slate-100 text-sm">{formatTime(s.exit_time) || "--"}</div>
                  </div>
                  <div className="bg-white/[0.02] border border-white/[0.05] rounded-xl px-3 py-2.5">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Trabalhado</div>
                    <div className="font-bold text-slate-100 text-sm flex items-center gap-1">
                      <Clock size={13} className="text-slate-500" />
                      {formatHours(s.hours_worked)}
                    </div>
                  </div>
                  <div className={`rounded-xl px-3 py-2.5 border ${
                    s.bank_balance >= 0 
                      ? "bg-emerald-500/[0.03] border-emerald-500/10 text-emerald-400" 
                      : "bg-rose-500/[0.03] border-rose-500/10 text-rose-400"
                  }`}>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Banco de Horas</div>
                    <div className="font-bold text-sm">
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
