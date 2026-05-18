"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatTime, formatDate } from "@/lib/hours";
import type { TimeRecord } from "@/types";

const PUNCH_LABELS: Record<string, string> = {
  entry: "Entrada", lunch_out: "Saída Almoço", lunch_return: "Retorno", exit: "Saída Final",
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
    setSaving(true); setError("");
    const res = await fetch(`/api/registros`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editing.id, recorded_at: new Date(newTime).toISOString(), edit_reason: reason }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error || "Erro ao salvar."); setSaving(false); return; }
    setEditing(null);
    setSaving(false);
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Ajustes de Ponto</h1>
      <p className="text-sm text-gray-500">Registros marcados como suspeitos para revisão manual.</p>

      {editing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
            <h2 className="font-bold text-lg">Ajustar Registro</h2>
            <div className="text-sm text-gray-600">
              <div>Funcionário: <strong>{editing.user.name}</strong></div>
              <div>Tipo: <strong>{PUNCH_LABELS[editing.punch_type]}</strong></div>
              <div>Original: <strong>{formatDate(editing.recorded_at)} {formatTime(editing.recorded_at)}</strong></div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nova data e hora *</label>
              <input type="datetime-local" value={newTime} onChange={(e) => setNewTime(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo do ajuste *</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Descreva o motivo..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none" />
            </div>
            {error && <div className="text-sm text-red-600">{error}</div>}
            <div className="flex gap-3">
              <button onClick={() => setEditing(null)} className="flex-1 border border-gray-300 text-gray-700 rounded-lg py-2 text-sm">Cancelar</button>
              <button onClick={handleSave} disabled={saving || !reason.trim() || !newTime}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg py-2 text-sm font-medium">
                {saving ? "Salvando..." : "Salvar Ajuste"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        {records.length === 0 ? (
          <div className="p-8 text-center text-gray-500">Nenhum registro suspeito pendente. ✅</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {records.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <div className="font-medium text-gray-800">{r.user.name}</div>
                  <div className="text-sm text-gray-500">{PUNCH_LABELS[r.punch_type]} · {formatDate(r.recorded_at)} {formatTime(r.recorded_at)}</div>
                  <div className="text-xs text-amber-700 mt-0.5">
                    GPS {r.gps_verified ? "✅" : "❌"} · WiFi {r.wifi_confirmed ? "✅" : "❌"}
                  </div>
                </div>
                <button onClick={() => startEdit(r)} className="text-sm bg-amber-100 text-amber-800 px-3 py-1.5 rounded-lg font-medium hover:bg-amber-200">
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
