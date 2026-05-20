import { createClient } from "@/lib/supabase/server";
import { formatTime, formatHours } from "@/lib/hours";
import { CalendarDays, LogIn, LogOut, Clock, TrendingUp, TrendingDown } from "lucide-react";

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
    <div className="px-1 py-2 space-y-5 max-w-sm mx-auto">
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
          <div className="w-16 h-16 bg-white/[0.04] border border-white/[0.08] rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-400">
            <CalendarDays size={28} />
          </div>
          <p className="text-white font-bold text-sm">Nenhum registro ainda</p>
          <p className="text-slate-400 text-xs mt-1">Seus registros de ponto diários aparecerão aqui.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {summaries.map((s) => {
            const date = new Date(s.work_date + "T12:00:00");
            const dayName = date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").toUpperCase();
            const dayNum = date.getDate().toString().padStart(2, "0");
            const monthNum = (date.getMonth() + 1).toString().padStart(2, "0");
            const isPositiveBank = s.bank_balance >= 0;

            return (
              <div
                key={s.id}
                className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden transition-all duration-300 hover:border-white/[0.14] hover:shadow-[0_4px_24px_rgba(0,0,0,0.25)]"
              >
                {/* Card header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                  <div className="flex items-center gap-3">
                    {/* Day badge */}
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-600/30 to-teal-600/20 border border-emerald-500/20 flex flex-col items-center justify-center shrink-0">
                      <span className="text-[9px] text-emerald-400 font-bold uppercase leading-none tracking-wider">{dayName}</span>
                      <span className="text-xl font-extrabold text-white leading-tight">{dayNum}</span>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-200">{dayNum}/{monthNum}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.is_complete ? "bg-emerald-400" : "bg-amber-400 animate-pulse"}`} />
                        <span className={`text-xs font-semibold ${s.is_complete ? "text-emerald-400" : "text-amber-400"}`}>
                          {s.is_complete ? "Completo" : "Em andamento"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {s.overtime_hours > 0 ? (
                    <span className="flex items-center gap-1 text-xs bg-amber-500/10 text-amber-300 border border-amber-500/20 px-2.5 py-1 rounded-full font-bold">
                      <TrendingUp size={11} />+{formatHours(s.overtime_hours)}
                    </span>
                  ) : s.bank_balance < 0 ? (
                    <span className="flex items-center gap-1 text-xs bg-rose-500/10 text-rose-300 border border-rose-500/20 px-2.5 py-1 rounded-full font-bold">
                      <TrendingDown size={11} />{formatHours(s.bank_balance)}
                    </span>
                  ) : null}
                </div>

                {/* Stats grid */}
                <div className="grid grid-cols-2 gap-px bg-white/[0.04]">
                  {/* Entrada */}
                  <div className="bg-[#0d1a2d] px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <LogIn size={11} className="text-emerald-400" />
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Entrada</span>
                    </div>
                    <div className="text-base font-extrabold text-slate-100 tabular-nums">
                      {formatTime(s.entry_time)}
                    </div>
                  </div>

                  {/* Saída */}
                  <div className="bg-[#0d1a2d] px-4 py-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <LogOut size={11} className="text-rose-400" />
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Saída</span>
                    </div>
                    <div className="text-base font-extrabold text-slate-100 tabular-nums">
                      {formatTime(s.exit_time)}
                    </div>
                  </div>

                  {/* Trabalhado */}
                  <div className="bg-[#0d1a2d] px-4 py-3 border-t border-white/[0.04]">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock size={11} className="text-blue-400" />
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Trabalhado</span>
                    </div>
                    <div className="text-base font-extrabold text-slate-100 tabular-nums">
                      {formatHours(s.hours_worked)}
                    </div>
                  </div>

                  {/* Banco de horas */}
                  <div className="bg-[#0d1a2d] px-4 py-3 border-t border-white/[0.04]">
                    <div className="flex items-center gap-1.5 mb-1">
                      {isPositiveBank
                        ? <TrendingUp size={11} className="text-emerald-400" />
                        : <TrendingDown size={11} className="text-rose-400" />
                      }
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Banco</span>
                    </div>
                    <div className={`text-base font-extrabold tabular-nums ${isPositiveBank ? "text-emerald-400" : "text-rose-400"}`}>
                      {isPositiveBank ? "+" : ""}{formatHours(s.bank_balance)}
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
