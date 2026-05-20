"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatTime, formatDate } from "@/lib/hours";
import type { TimeRecord, PunchType } from "@/types";
import {
  XCircle, PenLine, X, MapPin, Wifi, CircleCheckBig,
  Search, Plus, AlertTriangle, Calendar, Loader2,
} from "lucide-react";

const PUNCH_LABELS: Record<string, string> = {
  entry: "Entrada",
  lunch_out: "Saída Almoço",
  lunch_return: "Retorno",
  exit: "Saída Final",
};
const PUNCH_SEQUENCE: PunchType[] = ["entry", "lunch_out", "lunch_return", "exit"];
const PUNCH_COLORS: Record<string, string> = {
  entry:        "text-yellow-400 bg-yellow-500/10 border border-yellow-500/20",
  lunch_out:    "text-amber-400  bg-amber-500/10  border border-amber-500/20",
  lunch_return: "text-blue-400   bg-blue-500/10   border border-blue-500/20",
  exit:         "text-slate-400  bg-white/[0.05]  border border-white/[0.08]",
};

interface RecordWithUser extends TimeRecord { user: { name: string } }
interface DayRecord { punch_type: PunchType; record: RecordWithUser | null }

const inputCls = "w-full glass-input rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:ring-1 focus:ring-yellow-500/50 transition-all";

export default function AjustesPage() {
  const [employees, setEmployees] = useState<{ id: string; name: string }[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString("sv-SE"));
  const [dayRecords, setDayRecords] = useState<DayRecord[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [suspicious, setSuspicious] = useState<RecordWithUser[]>([]);
  const [modal, setModal] = useState<{ punchType: PunchType; record: RecordWithUser | null } | null>(null);
  const [newTime, setNewTime] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: adminData } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
    const orgId = adminData?.organization_id;
    const { data: emps } = await supabase.from("users").select("id, name")
      .eq("organization_id", orgId).eq("role", "employee").eq("is_active", true).order("name");
    setEmployees(emps || []);
    const { data } = await supabase.from("time_records").select("*, user:users(name)")
      .eq("organization_id", orgId).eq("status", "suspicious")
      .order("recorded_at", { ascending: false }).limit(50);
    setSuspicious((data as RecordWithUser[]) || []);
  }

  useEffect(() => { load(); }, []);

  async function handleSearch() {
    if (!selectedEmployee || !selectedDate) return;
    setSearching(true);
    const startOfDay = new Date(selectedDate + "T00:00:00-03:00").toISOString();
    const endOfDay   = new Date(selectedDate + "T23:59:59-03:00").toISOString();
    const { data } = await supabase.from("time_records").select("*, user:users(name)")
      .eq("user_id", selectedEmployee).gte("recorded_at", startOfDay).lte("recorded_at", endOfDay)
      .order("recorded_at");
    const records = (data as RecordWithUser[]) || [];
    setDayRecords(PUNCH_SEQUENCE.map((pt) => ({
      punch_type: pt,
      record: records.find((r) => r.punch_type === pt) || null,
    })));
    setSearching(false);
  }

  function openModal(punchType: PunchType, record: RecordWithUser | null) {
    setModal({ punchType, record });
    setNewTime(record
      ? new Date(record.recorded_at).toISOString().slice(0, 16)
      : `${selectedDate}T08:00`);
    setReason(""); setError("");
  }

  async function handleSave() {
    if (!modal || !reason.trim() || !newTime) return;
    setSaving(true); setError("");
    const method = modal.record ? "PATCH" : "POST";
    const body = modal.record
      ? { id: modal.record.id, recorded_at: new Date(newTime).toISOString(), edit_reason: reason }
      : { user_id: selectedEmployee, punch_type: modal.punchType, recorded_at: new Date(newTime).toISOString(), edit_reason: reason };
    const res = await fetch("/api/registros", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json();
    if (!res.ok) { setError(json.error || "Erro ao salvar."); setSaving(false); return; }
    setModal(null); setSaving(false);
    await load();
    if (dayRecords !== null) await handleSearch();
  }

  const employeeName = employees.find((e) => e.id === selectedEmployee)?.name;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Ajustes de Ponto</h1>
        <p className="text-sm text-slate-400 mt-0.5">Edite ou adicione registros de qualquer dia.</p>
      </div>

      {/* Day search */}
      <div className="glass-card rounded-2xl border border-white/[0.08] p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
          <Calendar size={16} className="text-yellow-400" />
          Buscar dia
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Funcionário</label>
            <select
              value={selectedEmployee}
              onChange={(e) => { setSelectedEmployee(e.target.value); setDayRecords(null); }}
              className={`${inputCls} [&>option]:bg-[#0d162d]`}
            >
              <option value="">Selecione...</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1.5 font-medium">Data</label>
            <input type="date" value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setDayRecords(null); }}
              className={`${inputCls} [color-scheme:dark]`}
            />
          </div>
          <button onClick={handleSearch} disabled={!selectedEmployee || searching}
            className="inline-flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors">
            <Search size={15} />
            {searching ? "Buscando..." : "Buscar"}
          </button>
        </div>

        {dayRecords !== null && (
          <div className="border border-white/[0.08] rounded-xl overflow-hidden">
            <div className="bg-white/[0.03] px-4 py-2.5 text-xs font-semibold text-slate-400 border-b border-white/[0.06]">
              {employeeName} — {new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
            </div>
            <div className="divide-y divide-white/[0.04]">
              {dayRecords.map(({ punch_type, record }) => (
                <div key={punch_type} className="flex items-center gap-4 px-4 py-3">
                  <div className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 ${PUNCH_COLORS[punch_type]}`}>
                    {PUNCH_LABELS[punch_type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    {record ? (
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-slate-200 text-sm tabular-nums">
                          {new Date(record.recorded_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${
                          record.status === "manual"    ? "bg-blue-500/10 text-blue-400 border-blue-500/20" :
                          record.status === "suspicious"? "bg-amber-500/10 text-amber-400 border-amber-500/20" :
                                                          "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                        }`}>
                          {record.status === "manual" ? "manual" : record.status === "suspicious" ? "suspeito" : "válido"}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-500 text-sm">— não registrado</span>
                    )}
                  </div>
                  <button onClick={() => openModal(punch_type, record)}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors border ${
                      record
                        ? "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20"
                        : "bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border-yellow-500/20"
                    }`}>
                    {record ? <PenLine size={13} /> : <Plus size={13} />}
                    {record ? "Editar" : "Adicionar"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Suspicious records */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-300 px-1">
          <AlertTriangle size={15} className="text-amber-400" />
          Registros suspeitos ({suspicious.length})
        </div>
        <div className="glass-card rounded-2xl border border-white/[0.08] overflow-hidden">
          {suspicious.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <CircleCheckBig size={28} className="text-yellow-400" />
              </div>
              <p className="text-slate-200 font-semibold text-sm">Nenhum ajuste pendente</p>
              <p className="text-slate-500 text-xs mt-0.5">Todos os registros foram revisados.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {suspicious.map((r) => (
                <div key={r.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center justify-center shrink-0">
                    <PenLine size={18} className="text-amber-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-slate-200 text-sm">{r.user.name}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {PUNCH_LABELS[r.punch_type]} · {formatDate(r.recorded_at)} {formatTime(r.recorded_at)}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`flex items-center gap-1 text-[11px] ${r.gps_verified ? "text-yellow-400" : "text-rose-400"}`}>
                        <MapPin size={11} />GPS {r.gps_verified ? "ok" : "falhou"}
                      </span>
                      <span className={`flex items-center gap-1 text-[11px] ${r.wifi_confirmed ? "text-yellow-400" : "text-rose-400"}`}>
                        <Wifi size={11} />WiFi {r.wifi_confirmed ? "ok" : "falhou"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => { setSelectedEmployee(r.user_id); setSelectedDate(r.recorded_at.slice(0, 10)); openModal(r.punch_type, r); }}
                    className="shrink-0 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors">
                    Ajustar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass-card rounded-2xl border border-white/[0.1] p-6 w-full max-w-md shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-white">
                {modal.record ? "Editar Registro" : `Adicionar ${PUNCH_LABELS[modal.punchType]}`}
              </h2>
              <button onClick={() => setModal(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/[0.08] text-slate-400 hover:text-slate-200 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="bg-white/[0.04] border border-white/[0.07] rounded-xl p-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Funcionário</span>
                <span className="font-medium text-slate-200">{employeeName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Tipo</span>
                <span className={`font-medium px-2.5 py-0.5 rounded-lg text-xs ${PUNCH_COLORS[modal.punchType]}`}>
                  {PUNCH_LABELS[modal.punchType]}
                </span>
              </div>
              {modal.record && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Original</span>
                  <span className="font-medium text-slate-200 tabular-nums">
                    {formatDate(modal.record.recorded_at)} {formatTime(modal.record.recorded_at)}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Data e hora <span className="text-rose-400">*</span>
              </label>
              <input type="datetime-local" value={newTime} onChange={(e) => setNewTime(e.target.value)}
                className={`${inputCls} [color-scheme:dark]`} />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">
                Motivo <span className="text-rose-400">*</span>
              </label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)}
                rows={3} placeholder="Descreva o motivo..."
                className={`${inputCls} resize-none`} />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl px-4 py-3 text-sm">
                <XCircle size={16} className="shrink-0" />{error}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button onClick={() => setModal(null)}
                className="flex-1 border border-white/[0.1] text-slate-300 hover:bg-white/[0.05] rounded-xl py-2.5 text-sm font-medium transition-colors">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving || !reason.trim() || !newTime}
                className="flex-1 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black rounded-xl py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2">
                {saving && <Loader2 size={15} className="animate-spin" />}
                {saving ? "Salvando..." : modal.record ? "Salvar Ajuste" : "Criar Registro"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
