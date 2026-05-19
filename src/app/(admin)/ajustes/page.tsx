"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatTime, formatDate } from "@/lib/hours";
import type { TimeRecord, PunchType } from "@/types";
import {
  XCircle, PenLine, X, MapPin, Wifi, CircleCheckBig,
  Search, Plus, AlertTriangle, Calendar,
} from "lucide-react";

const PUNCH_LABELS: Record<string, string> = {
  entry: "Entrada",
  lunch_out: "Saída Almoço",
  lunch_return: "Retorno",
  exit: "Saída Final",
};
const PUNCH_SEQUENCE: PunchType[] = ["entry", "lunch_out", "lunch_return", "exit"];
const PUNCH_COLORS: Record<string, string> = {
  entry: "text-green-700 bg-green-50",
  lunch_out: "text-amber-700 bg-amber-50",
  lunch_return: "text-blue-700 bg-blue-50",
  exit: "text-gray-700 bg-gray-100",
};

interface RecordWithUser extends TimeRecord {
  user: { name: string };
}

interface DayRecord {
  punch_type: PunchType;
  record: RecordWithUser | null;
}

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
    const { data: emps } = await supabase
      .from("users").select("id, name")
      .eq("organization_id", orgId).eq("role", "employee").eq("is_active", true).order("name");
    setEmployees(emps || []);
    const { data } = await supabase
      .from("time_records").select("*, user:users(name)")
      .eq("organization_id", orgId)
      .eq("status", "suspicious")
      .order("recorded_at", { ascending: false }).limit(50);
    setSuspicious((data as RecordWithUser[]) || []);
  }

  useEffect(() => { load(); }, []);

  async function handleSearch() {
    if (!selectedEmployee || !selectedDate) return;
    setSearching(true);
    const startOfDay = new Date(selectedDate + "T00:00:00").toISOString();
    const endOfDay = new Date(selectedDate + "T23:59:59").toISOString();
    const { data } = await supabase
      .from("time_records").select("*, user:users(name)")
      .eq("user_id", selectedEmployee)
      .gte("recorded_at", startOfDay)
      .lte("recorded_at", endOfDay)
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
    if (record) {
      setNewTime(new Date(record.recorded_at).toISOString().slice(0, 16));
    } else {
      const [y, m, d] = selectedDate.split("-");
      setNewTime(`${y}-${m}-${d}T08:00`);
    }
    setReason("");
    setError("");
  }

  async function handleSave() {
    if (!modal || !reason.trim() || !newTime) return;
    setSaving(true);
    setError("");
    const method = modal.record ? "PATCH" : "POST";
    const body = modal.record
      ? { id: modal.record.id, recorded_at: new Date(newTime).toISOString(), edit_reason: reason }
      : { user_id: selectedEmployee, punch_type: modal.punchType, recorded_at: new Date(newTime).toISOString(), edit_reason: reason };
    const res = await fetch("/api/registros", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const json = await res.json();
    if (!res.ok) { setError(json.error || "Erro ao salvar."); setSaving(false); return; }
    setModal(null);
    setSaving(false);
    await load();
    if (dayRecords !== null) await handleSearch();
  }

  const employeeName = employees.find((e) => e.id === selectedEmployee)?.name;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Ajustes de Ponto</h1>
        <p className="text-sm text-gray-500 mt-0.5">Edite ou adicione registros de qualquer dia.</p>
      </div>

      {/* Day search */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Calendar size={16} className="text-green-600" />
          Buscar dia
        </div>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[180px]">
            <label className="block text-xs text-gray-500 mb-1.5">Funcionário</label>
            <select
              value={selectedEmployee}
              onChange={(e) => { setSelectedEmployee(e.target.value); setDayRecords(null); }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
            >
              <option value="">Selecione...</option>
              {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Data</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => { setSelectedDate(e.target.value); setDayRecords(null); }}
              className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={!selectedEmployee || searching}
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <Search size={15} />
            {searching ? "Buscando..." : "Buscar"}
          </button>
        </div>

        {dayRecords !== null && (
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2.5 text-xs font-semibold text-gray-500 border-b border-gray-100">
              {employeeName} — {new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}
            </div>
            <div className="divide-y divide-gray-50">
              {dayRecords.map(({ punch_type, record }) => (
                <div key={punch_type} className="flex items-center gap-4 px-4 py-3">
                  <div className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 ${PUNCH_COLORS[punch_type]}`}>
                    {PUNCH_LABELS[punch_type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    {record ? (
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-gray-800 text-sm tabular-nums">
                          {new Date(record.recorded_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          record.status === "manual" ? "bg-blue-100 text-blue-700" :
                          record.status === "suspicious" ? "bg-amber-100 text-amber-700" :
                          "bg-green-100 text-green-700"
                        }`}>
                          {record.status === "manual" ? "manual" : record.status === "suspicious" ? "suspeito" : "válido"}
                        </span>
                      </div>
                    ) : (
                      <span className="text-gray-400 text-sm">— não registrado</span>
                    )}
                  </div>
                  <button
                    onClick={() => openModal(punch_type, record)}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
                      record ? "bg-amber-100 hover:bg-amber-200 text-amber-800" : "bg-green-100 hover:bg-green-200 text-green-800"
                    }`}
                  >
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
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 px-1">
          <AlertTriangle size={15} className="text-amber-600" />
          Registros suspeitos ({suspicious.length})
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          {suspicious.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <CircleCheckBig size={28} className="text-green-500" />
              </div>
              <p className="text-gray-700 font-semibold text-sm">Nenhum ajuste pendente</p>
              <p className="text-gray-400 text-xs mt-0.5">Todos os registros foram revisados.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {suspicious.map((r) => (
                <div key={r.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                    <PenLine size={18} className="text-amber-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-800 text-sm">{r.user.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {PUNCH_LABELS[r.punch_type]} · {formatDate(r.recorded_at)} {formatTime(r.recorded_at)}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`flex items-center gap-1 text-[11px] ${r.gps_verified ? "text-green-600" : "text-red-500"}`}>
                        <MapPin size={11} />GPS {r.gps_verified ? "ok" : "falhou"}
                      </span>
                      <span className={`flex items-center gap-1 text-[11px] ${r.wifi_confirmed ? "text-green-600" : "text-red-500"}`}>
                        <Wifi size={11} />WiFi {r.wifi_confirmed ? "ok" : "falhou"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedEmployee(r.user_id);
                      setSelectedDate(r.recorded_at.slice(0, 10));
                      openModal(r.punch_type, r);
                    }}
                    className="shrink-0 bg-amber-100 hover:bg-amber-200 text-amber-800 px-3.5 py-2 rounded-xl text-sm font-medium transition-colors"
                  >
                    Ajustar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Edit/Add Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-gray-900">
                {modal.record ? "Editar Registro" : `Adicionar ${PUNCH_LABELS[modal.punchType]}`}
              </h2>
              <button onClick={() => setModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Funcionário</span>
                <span className="font-medium text-gray-800">{employeeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tipo</span>
                <span className={`font-medium px-2 py-0.5 rounded-lg text-xs ${PUNCH_COLORS[modal.punchType]}`}>
                  {PUNCH_LABELS[modal.punchType]}
                </span>
              </div>
              {modal.record && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Original</span>
                  <span className="font-medium text-gray-800 tabular-nums">
                    {formatDate(modal.record.recorded_at)} {formatTime(modal.record.recorded_at)}
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Data e hora <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Motivo <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Descreva o motivo..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none transition-all"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm">
                <XCircle size={16} className="shrink-0" />{error}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button onClick={() => setModal(null)} className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl py-2.5 text-sm font-medium transition-colors">
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !reason.trim() || !newTime}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
              >
                {saving ? "Salvando..." : modal.record ? "Salvar Ajuste" : "Criar Registro"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
