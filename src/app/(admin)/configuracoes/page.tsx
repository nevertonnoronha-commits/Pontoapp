"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentPosition } from "@/lib/geo";
import {
  Store,
  Wifi,
  MapPin,
  Navigation,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Save,
  Info,
} from "lucide-react";

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
      setError("Latitude e longitude são obrigatórias. Use o botão para capturar sua localização atual.");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Configurações da Loja</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Defina o WiFi e a localização onde os funcionários podem bater ponto.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-6">

        {/* Store name */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
            <Store size={15} className="text-gray-400" />
            Nome da Loja
            <span className="text-red-500 ml-0.5">*</span>
          </label>
          <input
            type="text"
            value={form.store_name}
            onChange={(e) => setForm((f) => ({ ...f, store_name: e.target.value }))}
            placeholder="Ex: Loja da Dona Maria"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
          />
        </div>

        {/* WiFi */}
        <div>
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
            <Wifi size={15} className="text-gray-400" />
            Nome da Rede WiFi (SSID)
          </label>
          <input
            type="text"
            value={form.wifi_ssid}
            onChange={(e) => setForm((f) => ({ ...f, wifi_ssid: e.target.value }))}
            placeholder="Ex: MinhaLoja-WiFi"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
          />
          <p className="text-xs text-gray-400 mt-1.5">
            O funcionário confirmará manualmente que está nessa rede ao registrar o ponto.
          </p>
        </div>

        {/* GPS */}
        <div className="space-y-3">
          <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
            <MapPin size={15} className="text-gray-400" />
            Localização da Loja
            <span className="text-red-500 ml-0.5">*</span>
          </label>

          <button
            type="button"
            onClick={useCurrentLocation}
            disabled={locating}
            className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
          >
            {locating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Obtendo localização...
              </>
            ) : (
              <>
                <Navigation size={16} />
                Usar minha localização atual
              </>
            )}
          </button>

          {form.gps_latitude && form.gps_longitude ? (
            <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-800">
              <CheckCircle2 size={16} className="text-green-600 shrink-0" />
              Localização definida: {parseFloat(form.gps_latitude).toFixed(5)}, {parseFloat(form.gps_longitude).toFixed(5)}
            </div>
          ) : (
            <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
              <AlertCircle size={16} className="text-amber-600 shrink-0" />
              Localização não definida. Clique no botão acima estando na loja.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Latitude (manual)</label>
              <input
                type="number"
                step="any"
                value={form.gps_latitude}
                onChange={(e) => setForm((f) => ({ ...f, gps_latitude: e.target.value }))}
                placeholder="-12.345678"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Longitude (manual)</label>
              <input
                type="number"
                step="any"
                value={form.gps_longitude}
                onChange={(e) => setForm((f) => ({ ...f, gps_longitude: e.target.value }))}
                placeholder="-38.123456"
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Radius */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Raio permitido: <span className="text-green-700 font-bold">{form.gps_radius_meters}m</span>
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
            <span>50m (preciso)</span>
            <span>500m (flexível)</span>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">
            Distância máxima da loja para registrar ponto. Recomendado: 100–200m.
          </p>
        </div>

        {/* Feedback */}
        {error && (
          <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2.5 bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3 text-sm">
            <CheckCircle2 size={16} className="shrink-0" />
            Configurações salvas com sucesso!
          </div>
        )}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-amber-900 hover:bg-amber-950 disabled:bg-amber-400 text-white font-semibold rounded-xl py-3 text-sm transition-colors flex items-center justify-center gap-2"
        >
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save size={16} />
              Salvar Configurações
            </>
          )}
        </button>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5">
        <div className="flex items-center gap-2 font-semibold text-blue-800 text-sm mb-3">
          <Info size={16} />
          Como funciona
        </div>
        <div className="text-sm text-blue-700 space-y-2">
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
            O funcionário só pode registrar ponto dentro do raio definido aqui.
          </div>
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
            O WiFi é confirmado manualmente pelo funcionário no momento do ponto.
          </div>
          <div className="flex items-start gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
            Use o botão de localização <strong>estando dentro da loja</strong> para precisão máxima.
          </div>
        </div>
      </div>
    </div>
  );
}
