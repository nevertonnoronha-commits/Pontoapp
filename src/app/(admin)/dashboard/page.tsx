"use client";

import { useEffect, useState, useCallback } from "react";
import { formatHours, formatTime } from "@/lib/hours";
import { CheckCircle2, XCircle, Users, Timer, MapPin, Wifi, Coffee, RefreshCw } from "lucide-react";

const PUNCH_LABELS: Record<string, string> = {
  entry: "Entrada",
  lunch_out: "Saída Almoço",
  lunch_return: "Retorno",
  exit: "Saída",
};

const PUNCH_DIRECTION: Record<string, "in" | "out"> = {
  entry: "in",
  lunch_return: "in",
  lunch_out: "out",
  exit: "out",
};

type PunchRecord = {
  id: string;
  user_id: string;
  punch_type: string;
  recorded_at: string;
  gps_verified: boolean;
  wifi_confirmed: boolean;
  userName: string;
};

type Employee = { id: string; name: string };
type Summary = { user_id: string; overtime_hours: number; hours_worked: number };

type DashboardData = {
  todayRecords: PunchRecord[];
  employees: Employee[];
  todaySummaries: Summary[];
  today: string;
};

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dashboard", { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setLastUpdate(new Date());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30_000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const todayLabel = new Date().toLocaleDateString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight text-glow">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">{todayLabel}</p>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-card rounded-2xl border border-white/[0.06] p-4 h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { todayRecords, employees, todaySummaries } = data;

  // Determine current status per employee from last punch today
  const lastPunchByUser = new Map<string, string>();
  todayRecords.forEach((r) => {
    if (!lastPunchByUser.has(r.user_id)) {
      lastPunchByUser.set(r.user_id, r.punch_type);
    }
  });

  const workingCount = [...lastPunchByUser.values()].filter(pt => PUNCH_DIRECTION[pt] === "in").length;
  const atLunchCount = [...lastPunchByUser.values()].filter(pt => pt === "lunch_out").length;
  const totalEmployees = employees.length;
  const absentCount = totalEmployees - workingCount - atLunchCount;
  const totalOvertime = todaySummaries.reduce((s, r) => s + (r.overtime_hours || 0), 0);

  const stats = [
    { label: "Trabalhando agora", value: workingCount, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/25" },
    { label: "No almoço", value: atLunchCount, icon: Coffee, color: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/25" },
    { label: "Ausentes / Saíram", value: absentCount, icon: XCircle, color: "text-rose-400", bg: "bg-rose-500/10", border: "border-rose-500/25" },
    { label: "Total funcionários", value: totalEmployees, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/25" },
  ];

  const employeeStatuses = employees.map((emp) => {
    const lastPunch = lastPunchByUser.get(emp.id);
    let status: "working" | "lunch" | "absent" = "absent";
    if (lastPunch && PUNCH_DIRECTION[lastPunch] === "in") status = "working";
    else if (lastPunch === "lunch_out") status = "lunch";
    return { ...emp, status, lastPunch };
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight text-glow">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-0.5">{todayLabel}</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.08] px-3 py-1.5 rounded-lg transition-all shrink-0 mt-1"
        >
          <RefreshCw size={12} />
          {lastUpdate ? lastUpdate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "Atualizar"}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className={`glass-card rounded-2xl border ${card.border} p-4 flex flex-col gap-3`}>
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

      {/* Employee status */}
      <div className="glass-card rounded-2xl border border-white/[0.06] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06]">
          <span className="font-semibold text-slate-200">Status dos Funcionários</span>
        </div>
        <div className="divide-y divide-white/[0.04]">
          {employeeStatuses.length === 0 ? (
            <div className="px-5 py-8 text-center text-slate-400 text-sm">Nenhum funcionário cadastrado.</div>
          ) : (
            employeeStatuses.map((emp) => (
              <div key={emp.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-slate-700 rounded-full flex items-center justify-center shrink-0 font-semibold text-xs text-white">
                    {emp.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-slate-200">{emp.name}</span>
                </div>
                {emp.status === "working" && (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-3 py-1">
                    <CheckCircle2 size={12} />Trabalhando
                  </span>
                )}
                {emp.status === "lunch" && (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-3 py-1">
                    <Coffee size={12} />Almoço
                  </span>
                )}
                {emp.status === "absent" && (
                  <span className="flex items-center gap-1.5 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-full px-3 py-1">
                    <XCircle size={12} />{emp.lastPunch === "exit" ? "Saiu" : "Ausente"}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="glass-card rounded-2xl border border-white/[0.06] overflow-hidden">
        <div className="px-5 py-4 border-b border-white/[0.06] flex items-center justify-between">
          <span className="font-semibold text-slate-200">Atividade de Hoje</span>
          <span className="text-xs text-slate-400">{todayRecords.length} registros</span>
        </div>

        {todayRecords.length === 0 ? (
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
                    {(r.userName || "?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-slate-200">{r.userName}</div>
                    <div className="text-xs text-slate-400">{PUNCH_LABELS[r.punch_type] || r.punch_type}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${r.gps_verified ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border border-amber-500/20"}`}>
                      <MapPin size={10} />GPS
                    </span>
                    <span className={`flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${r.wifi_confirmed ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-white/[0.04] text-slate-400 border border-white/[0.06]"}`}>
                      <Wifi size={10} />WiFi
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

      {totalOvertime > 0 && (
        <div className="glass-card rounded-2xl border border-amber-500/20 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center shrink-0">
            <Timer size={20} className="text-amber-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-amber-400">Horas extras acumuladas hoje</div>
            <div className="text-xs text-slate-400">{formatHours(totalOvertime)} no total</div>
          </div>
        </div>
      )}
    </div>
  );
}
