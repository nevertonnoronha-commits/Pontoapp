"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatTime, formatDate } from "@/lib/hours";
import type { TimeRecord } from "@/types";
import { CheckCircle2, XCircle, PenLine, X, MapPin, Wifi, CircleCheckBig } from "lucide-react";

const PUNCH_LABELS: Record<string, string> = {
  entry: "Entrada",
  lunch_out: "Saída Almoço",
  lunch_return: "Retorno",
  exit: "Saída Final",
};

interface RecordWithUser extends TimeRecord {
  user: { name: string };
}

export default function AjustesPage() {
  const [records, setRecords] = useState<RecordWithUser[]>([]);
  const [editing, setEditing] = useState<RecordWithUser | null>(null);
  const [newTime, setNewTime] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: adminData } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
    const { data } = await supabase
      .from("time_records")
      .select("*, user:users(name)")
      .eq("organization_id", adminData?.organization_id)
      .in("status", ["suspicious"])
      .order("recorded_at", { ascending: false })
      .limit(50);
    setRecords((data as RecordWithUser[]) || []);
  }

  useEffect(() => { load(); }, []);

  function startEdit(r: RecordWithUser) {
    setEditing(r);
    setNewTime(new Date(r.recorded_at).toISOString().slice(0, 16));
    setReason("");
    setError("");
  }

  async function handleSave() {
    if (!editing || !reason.trim() || !newTime) return;
    setSaving(true);
    setError("");
    const res = await fetch(`/api/registros`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editing.id, recorded_at: new Date(newTime).toISOString(), edit_reason: reason }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Erro ao salvar.");
      setSaving(false);
      return;
    }
    setEditing(null);
    setSaving(false);
    load();
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Ajustes de Ponto</h1>
        <p className="text-sm text-gray-500 mt-0.5">Registros suspeitos aguardando revisão manual.</p>
      </div>

      {/* Edit Modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg text-gray-900">Ajustar Registro</h2>
              <button
                onClick={() => setEditing(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Funcionário</span>
                <span className="font-medium text-gray-800">{editing.user.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Tipo</span>
                <span className="font-medium text-gray-800">{PUNCH_LABELS[editing.punch_type]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Original</span>
                <span className="font-medium text-gray-800">
                  {formatDate(editing.recorded_at)} {formatTime(editing.recorded_at)}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Nova data e hora <span className="text-red-500">*</span>
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
                Motivo do ajuste <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="Descreva o motivo do ajuste..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none transition-all"
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm">
                <XCircle size={16} className="shrink-0" />
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setEditing(null)}
                className="flex-1 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl py-2.5 text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !reason.trim() || !newTime}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
              >
                {saving ? "Salvando..." : "Salvar Ajuste"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Records list */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {records.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CircleCheckBig size={32} className="text-green-500" />
            </div>
            <p className="text-gray-700 font-semibold">Nenhum ajuste pendente</p>
            <p className="text-gray-400 text-sm mt-1">Todos os registros foram revisados.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {records.map((r) => (
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
                      <MapPin size={11} />
                      GPS {r.gps_verified ? "ok" : "falhou"}
                    </span>
                    <span className={`flex items-center gap-1 text-[11px] ${r.wifi_confirmed ? "text-green-600" : "text-red-500"}`}>
                      <Wifi size={11} />
                      WiFi {r.wifi_confirmed ? "ok" : "falhou"}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => startEdit(r)}
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
  );
}
