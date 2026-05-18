import { createClient } from "@/lib/supabase/server";
import { formatTime, formatDate, formatHours } from "@/lib/hours";

const PUNCH_LABELS: Record<string, string> = {
  entry: "Entrada",
  lunch_out: "Saída Almoço",
  lunch_return: "Retorno Almoço",
  exit: "Saída Final",
};

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

  const { data: records } = await supabase
    .from("time_records")
    .select("*")
    .eq("user_id", user.id)
    .order("recorded_at", { ascending: false })
    .limit(50);

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-800">Meu Histórico</h1>

      {(!summaries || summaries.length === 0) ? (
        <div className="text-center text-gray-500 py-12">Nenhum registro ainda.</div>
      ) : (
        <div className="space-y-3">
          {summaries.map((s) => (
            <div key={s.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex justify-between items-start mb-3">
                <div className="font-semibold text-gray-800">
                  {new Date(s.work_date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" })}
                </div>
                <div className={`text-sm font-medium ${s.is_complete ? "text-green-700" : "text-amber-700"}`}>
                  {s.is_complete ? "Completo" : "Em andamento"}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-600">
                <div>Entrada: <span className="font-medium text-gray-800">{formatTime(s.entry_time)}</span></div>
                <div>Saída: <span className="font-medium text-gray-800">{formatTime(s.exit_time)}</span></div>
                <div>Trabalhado: <span className="font-medium text-gray-800">{formatHours(s.hours_worked)}</span></div>
                <div className={`${s.bank_balance >= 0 ? "text-green-700" : "text-red-600"}`}>
                  Banco: <span className="font-medium">{formatHours(s.bank_balance)}</span>
                </div>
              </div>
              {s.overtime_hours > 0 && (
                <div className="mt-2 text-xs text-amber-700 bg-amber-50 rounded px-2 py-1">
                  Hora extra: {formatHours(s.overtime_hours)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
