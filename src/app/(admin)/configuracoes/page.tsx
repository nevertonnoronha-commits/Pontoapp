"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentPosition } from "@/lib/geo";

export default function ConfiguracoesPage() {
  const [form, setForm] = useState({
    store_name: "",
    wifi_ssid: "",
    gps_latitude: "",
    gps_longitude: "",
    gps_radius_meters: "200",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: u } = await supabase.from("users").select("organization_id").eq("id", user.id).maybeSingle();
      if (!u?.organization_id) { setLoading(false); return; }
      const { data: c } = await supabase.from("store_configs").select("*").eq("organization_id", u.organization_id).maybeSingle();
      if (c) {
        setForm({
          store_name: c.store_name || "",
          wifi_ssid: c.wifi_ssid || "",
          gps_latitude: c.gps_latitude != null ? String(c.gps_latitude) : "",
          gps_longitude: c.gps_longitude != null ? String(c.gps_longitude) : "",
          gps_radius_meters: String(c.gps_radius_meters || 200),
        });
      }
      setLoading(false);
    }
    load();
  }, []);

  async function useCurrentLocation() {
    setLocating(true);
    setError("");
    try {
      const pos = await getCurrentPosition();
      setForm((f) => ({
        ...f,
        gps_latitude: pos.coords.latitude.toFixed(7),
        gps_longitude: pos.coords.longitude.toFixed(7),
      }));
    } catch {
      setError("Não foi possível obter a localização. Verifique se o GPS está habilitado no navegador.");
    } finally {
      setLocating(false);
    }
  }

  async function handleSave() {
    setError("");
    setSuccess(false);

    if (!form.store_name.trim()) {
      setError("Nome da loja é obrigatório.");
      return;
    }
    const lat = parseFloat(form.gps_latitude);
    const lon = parseFloat(form.gps_longitude);
    if (!form.gps_latitude || !form.gps_longitude || isNaN(lat) || isNaN(lon)) {
      setError("Latitude e longitude são obrigatórias. Use o botão '📌 Usar minha localização atual'.");
      return;
    }

    setSaving(true);
    const res = await fetch("/api/configuracoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        store_name: form.store_name,
        wifi_ssid: form.wifi_ssid || null,
        gps_latitude: lat,
        gps_longitude: lon,
        gps_radius_meters: parseInt(form.gps_radius_meters),
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Erro ao salvar configurações.");
    } else {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    }
    setSaving(false);
  }

  if (loading) return <div className="p-8 text-center text-gray-500">Carregando...</div>;

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Configurações da Loja</h1>
        <p className="text-sm text-gray-500 mt-1">Defina o WiFi e a localização onde os funcionários podem bater ponto.</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">

        {/* Nome da loja */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">🏪 Nome da Loja <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={form.store_name}
            onChange={(e) => setForm((f) => ({ ...f, store_name: e.target.value }))}
            placeholder="Ex: Loja da Dona Maria"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
        </div>

        {/* WiFi */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">📶 Nome do WiFi da loja (SSID)</label>
          <input
            type="text"
            value={form.wifi_ssid}
            onChange={(e) => setForm((f) => ({ ...f, wifi_ssid: e.target.value }))}
            placeholder="Ex: MinhaLoja-WiFi"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <p className="text-xs text-gray-400 mt-1">O funcionário precisará confirmar que está nessa rede ao bater ponto.</p>
        </div>

        {/* GPS */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700">📍 Localização da Loja <span className="text-red-500">*</span></label>

          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={locating}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg py-2.5 text-sm font-medium transition-colors"
          >
            {locating ? "⏳ Obtendo localização..." : "📌 Usar minha localização atual"}
          </button>

          {form.gps_latitude && form.gps_longitude ? (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800">
              ✅ Localização definida: {parseFloat(form.gps_latitude).toFixed(5)}, {parseFloat(form.gps_longitude).toFixed(5)}
            </div>
          ) : (
            <p className="text-xs text-amber-600">⚠️ Localização não definida. Clique no botão acima estando na loja.</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Latitude (manual)</label>
              <input
                type="number"
                step="any"
                value={form.gps_latitude}
                onChange={(e) => setForm((f) => ({ ...f, gps_latitude: e.target.value }))}
                placeholder="-12.345678"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Longitude (manual)</label>
              <input
                type="number"
                step="any"
                value={form.gps_longitude}
                onChange={(e) => setForm((f) => ({ ...f, gps_longitude: e.target.value }))}
                placeholder="-38.123456"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
          </div>
        </div>

        {/* Raio */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            🔵 Raio permitido: <strong className="text-green-700">{form.gps_radius_meters}m</strong>
          </label>
          <input
            type="range"
            min="50"
            max="500"
            step="10"
            value={form.gps_radius_meters}
            onChange={(e) => setForm((f) => ({ ...f, gps_radius_meters: e.target.value }))}
            className="w-full accent-green-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>50m (muito preciso)</span>
            <span>500m (flexível)</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Distância máxima da loja para bater ponto. Recomendado: 100–200m.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            ❌ {error}
          </div>
        )}
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg px-4 py-3 text-sm">
            ✅ Configurações salvas com sucesso!
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-amber-800 hover:bg-amber-900 disabled:bg-amber-400 text-white font-semibold rounded-lg py-3 text-sm transition-colors"
        >
          {saving ? "Salvando..." : "💾 Salvar Configurações"}
        </button>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800 space-y-1">
        <div className="font-semibold mb-2">ℹ️ Como funciona:</div>
        <div>• O funcionário só pode bater ponto dentro do raio definido aqui</div>
        <div>• O WiFi é confirmado manualmente pelo funcionário no momento do ponto</div>
        <div>• Use o botão de localização <strong>estando dentro da loja</strong> para precisão máxima</div>
      </div>
    </div>
  );
}
