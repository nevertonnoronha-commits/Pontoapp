"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentPosition } from "@/lib/geo";
import {
  Store, Wifi, MapPin, Navigation, CheckCircle2,
  AlertCircle, Loader2, Save, Info, Globe,
} from "lucide-react";

const inputCls = "w-full glass-input rounded-xl px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:ring-1 focus:ring-yellow-500/50 transition-all";

export default function ConfiguracoesPage() {
  const [form, setForm] = useState({
    store_name: "", wifi_ssid: "",
    gps_latitude: "", gps_longitude: "", gps_radius_meters: "300",
    allowed_ip: "",
  });
  const [capturingIp, setCapturingIp] = useState(false);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [locating, setLocating] = useState(false);
  const [success, setSuccess]   = useState(false);
  const [error, setError]       = useState("");
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: u } = await supabase.from("users").select("organization_id").eq("id", user.id).maybeSingle();
      if (!u?.organization_id) { setLoading(false); return; }
      const { data: c } = await supabase.from("store_configs").select("*").eq("organization_id", u.organization_id).maybeSingle();
      if (c) setForm({
        store_name: c.store_name || "", wifi_ssid: c.wifi_ssid || "",
        gps_latitude: c.gps_latitude != null ? String(c.gps_latitude) : "",
        gps_longitude: c.gps_longitude != null ? String(c.gps_longitude) : "",
        gps_radius_meters: String(c.gps_radius_meters || 200),
        allowed_ip: c.allowed_ip || "",
      });
      setLoading(false);
    }
    load();
  }, []);

  async function useCurrentLocation() {
    setLocating(true); setError(""); setGpsAccuracy(null);
    try {
      const pos = await getCurrentPosition();
      setForm((f) => ({
        ...f,
        gps_latitude: pos.coords.latitude.toFixed(7),
        gps_longitude: pos.coords.longitude.toFixed(7),
      }));
      setGpsAccuracy(Math.round(pos.coords.accuracy));
    } catch {
      setError("Não foi possível obter a localização. Verifique se o GPS está habilitado.");
    } finally {
      setLocating(false);
    }
  }

  async function captureCurrentIp() {
    setCapturingIp(true);
    try {
      const res = await fetch("/api/meu-ip");
      const json = await res.json();
      if (json.ip && json.ip !== "unknown") {
        setForm((f) => ({ ...f, allowed_ip: json.ip }));
      } else {
        setError("Não foi possível detectar o IP. Tente novamente.");
      }
    } catch {
      setError("Erro ao capturar IP.");
    } finally {
      setCapturingIp(false);
    }
  }

  async function handleSave() {
    setError(""); setSuccess(false);
    if (!form.store_name.trim()) { setError("Nome da loja é obrigatório."); return; }
    const lat = parseFloat(form.gps_latitude);
    const lon = parseFloat(form.gps_longitude);
    if (!form.gps_latitude || !form.gps_longitude || isNaN(lat) || isNaN(lon)) {
      setError("Latitude e longitude são obrigatórias. Use o botão para capturar sua localização."); return;
    }
    setSaving(true);
    const res = await fetch("/api/configuracoes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ store_name: form.store_name, wifi_ssid: form.wifi_ssid || null, gps_latitude: lat, gps_longitude: lon, gps_radius_meters: parseInt(form.gps_radius_meters), allowed_ip: form.allowed_ip || null }),
    });
    const json = await res.json();
    if (!res.ok) { setError(json.error || "Erro ao salvar configurações."); }
    else { setSuccess(true); setTimeout(() => setSuccess(false), 4000); }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-yellow-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-400">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-xl lg:text-2xl font-bold text-white tracking-tight">Configurações da Loja</h1>
        <p className="text-xs lg:text-sm text-slate-400 mt-1">
          Defina o WiFi e a localização onde os funcionários podem bater ponto.
        </p>
      </div>

      <div className="glass-card rounded-2xl border border-white/[0.08] p-4 lg:p-6 space-y-4 lg:space-y-6">

        {/* Store name */}
        <div>
          <label className="flex items-center gap-1.5 text-xs lg:text-sm font-medium text-slate-300 mb-1.5 lg:mb-2">
            <Store size={14} className="text-slate-400 shrink-0" />
            Nome da Loja <span className="text-rose-400 ml-0.5">*</span>
          </label>
          <input type="text" value={form.store_name}
            onChange={(e) => setForm((f) => ({ ...f, store_name: e.target.value }))}
            placeholder="Ex: Loja Camaleão" className={inputCls} />
        </div>

        {/* WiFi */}
        <div>
          <label className="flex items-center gap-1.5 text-xs lg:text-sm font-medium text-slate-300 mb-1.5 lg:mb-2">
            <Wifi size={14} className="text-slate-400 shrink-0" />
            Nome da Rede WiFi (SSID)
          </label>
          <input type="text" value={form.wifi_ssid}
            onChange={(e) => setForm((f) => ({ ...f, wifi_ssid: e.target.value }))}
            placeholder="Ex: MinhaLoja-WiFi" className={inputCls} />
          <p className="text-xs text-slate-500 mt-1">
            Opcional — apenas para referência.
          </p>
        </div>

        {/* IP da rede */}
        <div>
          <label className="flex items-center gap-1.5 text-xs lg:text-sm font-medium text-slate-300 mb-1.5 lg:mb-2">
            <Globe size={14} className="text-slate-400 shrink-0" />
            IP da Rede da Loja
            <span className="ml-1 text-[10px] font-normal text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 rounded px-1.5 py-0.5">Automático</span>
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={form.allowed_ip}
              onChange={(e) => setForm((f) => ({ ...f, allowed_ip: e.target.value }))}
              placeholder="Ex: 189.100.23.45"
              className={`${inputCls} flex-1 font-mono text-yellow-300`}
              readOnly
            />
            <button
              type="button"
              onClick={captureCurrentIp}
              disabled={capturingIp}
              className="shrink-0 flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black text-xs font-bold rounded-xl px-3 transition-colors"
            >
              {capturingIp ? <Loader2 size={14} className="animate-spin" /> : <Globe size={14} />}
              {capturingIp ? "..." : "Capturar"}
            </button>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Clique em <strong className="text-slate-400">Capturar</strong> estando na rede da loja. O WiFi dos funcionários será verificado automaticamente por IP.
          </p>
          {form.allowed_ip && (
            <div className="mt-2 flex items-center gap-2 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
              <CheckCircle2 size={13} />
              IP cadastrado: <span className="font-mono font-semibold">{form.allowed_ip}</span>
            </div>
          )}
        </div>

        {/* GPS */}
        <div className="space-y-2 lg:space-y-3">
          <label className="flex items-center gap-1.5 text-xs lg:text-sm font-medium text-slate-300">
            <MapPin size={14} className="text-slate-400 shrink-0" />
            Localização da Loja <span className="text-rose-400 ml-0.5">*</span>
          </label>

          <button type="button" onClick={useCurrentLocation} disabled={locating}
            className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black rounded-xl py-2 lg:py-2.5 text-xs lg:text-sm font-semibold transition-colors flex items-center justify-center gap-2">
            {locating ? <><Loader2 size={16} className="animate-spin" />Obtendo localização...</>
                      : <><Navigation size={16} />Usar minha localização atual</>}
          </button>

          {form.gps_latitude && form.gps_longitude ? (
            <div className={`rounded-xl px-4 py-3 text-sm space-y-1 border ${
              gpsAccuracy && gpsAccuracy > 100
                ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                : "bg-yellow-500/10 border-yellow-500/20 text-yellow-300"
            }`}>
              <div className="flex items-center gap-2.5">
                {gpsAccuracy && gpsAccuracy > 100
                  ? <AlertCircle size={16} className="text-amber-400 shrink-0" />
                  : <CheckCircle2 size={16} className="text-yellow-400 shrink-0" />}
                <span>
                  {parseFloat(form.gps_latitude).toFixed(5)}, {parseFloat(form.gps_longitude).toFixed(5)}
                  {gpsAccuracy !== null && <span className="ml-2 font-medium">(±{gpsAccuracy}m)</span>}
                </span>
              </div>
              {gpsAccuracy && gpsAccuracy > 100 && (
                <p className="text-xs text-amber-400 pl-6">
                  Precisão baixa — capture a localização pelo <strong>celular</strong> para melhor resultado.
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-sm text-amber-300">
              <AlertCircle size={16} className="text-amber-400 shrink-0" />
              Localização não definida. Clique no botão acima estando na loja.
            </div>
          )}

          <div className="grid grid-cols-2 gap-2 lg:gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">Latitude (manual)</label>
              <input type="number" step="any" value={form.gps_latitude}
                onChange={(e) => setForm((f) => ({ ...f, gps_latitude: e.target.value }))}
                placeholder="-12.345678" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Longitude (manual)</label>
              <input type="number" step="any" value={form.gps_longitude}
                onChange={(e) => setForm((f) => ({ ...f, gps_longitude: e.target.value }))}
                placeholder="-38.123456" className={inputCls} />
            </div>
          </div>
        </div>

        {/* Radius */}
        <div>
          <label className="block text-xs lg:text-sm font-medium text-slate-300 mb-2">
            Raio permitido: <span className="text-yellow-400 font-bold">{form.gps_radius_meters}m</span>
          </label>
          <input type="range" min="50" max="500" step="10" value={form.gps_radius_meters}
            onChange={(e) => setForm((f) => ({ ...f, gps_radius_meters: e.target.value }))}
            className="w-full accent-yellow-500" />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>50m</span><span>500m</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Máx. para registrar ponto. Recomendado: 200–400m.</p>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl px-4 py-3 text-sm">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />{error}
          </div>
        )}
        {success && (
          <div className="flex items-center gap-2.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 rounded-xl px-4 py-3 text-sm">
            <CheckCircle2 size={16} className="shrink-0" />Configurações salvas com sucesso!
          </div>
        )}

        <button onClick={handleSave} disabled={saving}
          className="w-full bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 text-black font-semibold rounded-xl py-2 lg:py-3 text-xs lg:text-sm transition-colors flex items-center justify-center gap-2">
          {saving ? <><Loader2 size={16} className="animate-spin" />Salvando...</>
                  : <><Save size={16} />Salvar Configurações</>}
        </button>
      </div>

      {/* Info box */}
      <div className="glass-card border border-white/[0.08] rounded-2xl p-3 lg:p-5">
        <div className="flex items-center gap-2 font-semibold text-slate-300 text-xs lg:text-sm mb-2 lg:mb-3">
          <Info size={14} className="shrink-0 text-yellow-400" />
          Como funciona
        </div>
        <div className="text-xs lg:text-sm text-slate-400 space-y-1.5 lg:space-y-2">
          {["O funcionário registra ponto dentro do raio definido.",
            "WiFi é confirmado manualmente pelo funcionário.",
            "Use celular para capturar a localização — é mais preciso que computador."
          ].map((txt) => (
            <div key={txt} className="flex items-start gap-2">
              <span className="w-1 h-1 rounded-full bg-yellow-500 mt-1.5 shrink-0" />
              <span dangerouslySetInnerHTML={{ __html: txt.replace("celular", "<strong>celular</strong>") }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
