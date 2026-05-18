"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentPosition } from "@/lib/geo";

export default function ConfiguracoesPage() {
  const [form, setForm] = useState({
    store_name: "", wifi_ssid: "",
    gps_latitude: "", gps_longitude: "",
    gps_radius_meters: "200",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: u } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
      const { data: c } = await supabase.from("store_configs").select("*").eq("organization_id", u?.organization_id).single();
      if (c) {
        setForm({
          store_name: c.store_name || "",
          wifi_ssid: c.wifi_ssid || "",
          gps_latitude: String(c.gps_latitude || ""),
          gps_longitude: String(c.gps_longitude || ""),
          gps_radius_meters: String(c.gps_radius_meters || 200),
        });
      }
      setLoading(false);
    }
    load();
  }, []);

  async function useCurrentLocation() {
    try {
      const pos = await getCurrentPosition();
      setForm((f) => ({ ...f, gps_latitude: String(pos.coords.latitude), gps_longitude: String(pos.coords.longitude) }));
    } catch {
      setError("Não foi possível obter a localização.");
    }
  }

  async function handleSave() {
    setSaving(true); setError(""); setSuccess(false);
    const res = await fetch("/api/configuracoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        store_name: form.store_name,
        wifi_ssid: form.wifi_ssid,
        gps_latitude: parseFloat(form.gps_latitude),
        gps_longitude: parseFloat(form.gps_longitude),
        gps_radius_meters: parseInt(form.gps_radius_meters),
      }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error || "Erro ao salvar."); } else { setSuccess(true); }
    setSaving(false);
  }

  if (loading) return <div className="p-6 text-center text-gray-500">Carregando...</div>;

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Configurações da Loja</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Loja *</label>
          <input type="text" value={form.store_name} onChange={(e) => setForm((f) => ({ ...f, store_name: e.target.value }))}
            placeholder="Ex: Loja da Dona Maria" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">📶 SSID do WiFi autorizado</label>
          <input type="text" value={form.wifi_ssid} onChange={(e) => setForm((f) => ({ ...f, wifi_ssid: e.target.value }))}
            placeholder="Ex: MinhaLoja-WiFi" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          <p className="text-xs text-gray-500 mt-1">Nome exato da rede WiFi da loja</p>
        </div>

        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">📍 Localização da Loja</label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Latitude</label>
              <input type="number" step="any" value={form.gps_latitude} onChange={(e) => setForm((f) => ({ ...f, gps_latitude: e.target.value }))}
                placeholder="-12.345678" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Longitude</label>
              <input type="number" step="any" value={form.gps_longitude} onChange={(e) => setForm((f) => ({ ...f, gps_longitude: e.target.value }))}
                placeholder="-38.123456" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <button type="button" onClick={useCurrentLocation}
            className="w-full border border-green-300 text-green-700 rounded-lg py-2 text-sm font-medium hover:bg-green-50">
            📌 Usar minha localização atual
          </button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Raio permitido: <strong>{form.gps_radius_meters}m</strong>
          </label>
          <input type="range" min="50" max="500" step="10" value={form.gps_radius_meters}
            onChange={(e) => setForm((f) => ({ ...f, gps_radius_meters: e.target.value }))}
            className="w-full accent-green-600" />
          <div className="flex justify-between text-xs text-gray-400"><span>50m</span><span>500m</span></div>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
        {success && <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">✅ Configurações salvas com sucesso!</div>}

        <button onClick={handleSave} disabled={saving}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-lg py-3 text-sm transition-colors">
          {saving ? "Salvando..." : "💾 Salvar Configurações"}
        </button>
      </div>
    </div>
  );
}
