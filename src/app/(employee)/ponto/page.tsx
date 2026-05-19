"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentPosition, isWithinRadius, getGeoErrorMessage } from "@/lib/geo";
import type { StoreConfig, PunchType } from "@/types";
import { getNextPunchType, PUNCH_TYPE_LABELS } from "@/types";
import {
  MapPin, Wifi, CheckCircle2, XCircle, Loader2, Clock, RefreshCw,
  CircleCheckBig, ScanFace,
} from "lucide-react";
import { FaceVerify, type FaceVerifyResult } from "@/components/employee/face-verify";

type LocationState = { status: "checking" | "ok" | "error"; distance?: number; message?: string };
type PunchState = "idle" | "registering" | "success" | "error";

const PUNCH_COLORS: Record<PunchType | "complete", string> = {
  entry: "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-[0_4px_25px_rgba(16,185,129,0.25)] hover:shadow-[0_4px_30px_rgba(16,185,129,0.35)]",
  lunch_return: "bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-[0_4px_25px_rgba(16,185,129,0.25)] hover:shadow-[0_4px_30px_rgba(16,185,129,0.35)]",
  lunch_out: "bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 shadow-[0_4px_25px_rgba(99,102,241,0.25)] hover:shadow-[0_4px_30px_rgba(99,102,241,0.35)]",
  exit: "bg-gradient-to-r from-rose-500 to-orange-600 hover:from-rose-400 hover:to-orange-500 shadow-[0_4px_25px_rgba(244,63,94,0.25)] hover:shadow-[0_4px_30px_rgba(244,63,94,0.35)]",
  complete: "bg-white/[0.04]",
};

export default function PontoPage() {
  const [time, setTime] = useState("");
  const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);
  const [location, setLocation] = useState<LocationState>({ status: "checking" });
  const [wifiConfirmed, setWifiConfirmed] = useState(false);
  const [nextPunch, setNextPunch] = useState<PunchType | null>(null);
  const [punchState, setPunchState] = useState<PunchState>("idle");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lon: number; acc: number } | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasFacialProfile, setHasFacialProfile] = useState<boolean | null>(null);
  const [faceResult, setFaceResult] = useState<FaceVerifyResult | null>(null);
  const [showFaceVerify, setShowFaceVerify] = useState(false);

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("pt-BR"));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: userData } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
    if (!userData) return;

    const { data: config } = await supabase
      .from("store_configs").select("*").eq("organization_id", userData.organization_id).maybeSingle();
    setStoreConfig(config);

    const { data: facialProfile, error: faceError } = await supabase
      .from("facial_profiles").select("id").eq("user_id", user.id).eq("is_active", true).maybeSingle();
    if (faceError) console.error("Facial profile query error:", faceError);
    setHasFacialProfile(!!facialProfile);

    const today = new Date().toLocaleDateString("sv-SE");
    const startOfDay = new Date(today + "T00:00:00").toISOString();
    const { data: records } = await supabase
      .from("time_records")
      .select("punch_type, recorded_at")
      .eq("user_id", user.id)
      .gte("recorded_at", startOfDay)
      .order("recorded_at", { ascending: false })
      .limit(1);

    const lastType = records?.[0]?.punch_type as PunchType | undefined;
    const next = getNextPunchType(lastType || null);
    setNextPunch(next === "complete" ? "entry" : next);
  }, []);

  const checkLocation = useCallback(async (config: StoreConfig) => {
    setLocation({ status: "checking" });
    try {
      const pos = await getCurrentPosition();
      const { latitude: lat, longitude: lon, accuracy: acc } = pos.coords;
      setCoords({ lat, lon, acc });
      const { isValid, distance } = isWithinRadius(lat, lon, config.gps_latitude, config.gps_longitude, config.gps_radius_meters);
      setLocation({ status: isValid ? "ok" : "error", distance, message: isValid ? undefined : `Você está ${distance}m fora da área (raio: ${config.gps_radius_meters}m).` });
    } catch (e) {
      const msg = e instanceof GeolocationPositionError ? getGeoErrorMessage(e) : "Erro ao obter localização.";
      setLocation({ status: "error", message: msg });
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { if (storeConfig) checkLocation(storeConfig); }, [storeConfig, checkLocation]);

  function handleStartPunch() {
    if (!nextPunch || location.status !== "ok" || !wifiConfirmed) return;
    if (hasFacialProfile && !faceResult) {
      setShowFaceVerify(true);
      return;
    }
    executePunch();
  }

  function handleFaceResult(result: FaceVerifyResult) {
    setFaceResult(result);
    setShowFaceVerify(false);
    if (result.verified || result.reason === "no_profile") {
      executePunch(result);
    }
  }

  function handleFaceSkip() {
    setShowFaceVerify(false);
    const r: FaceVerifyResult = { verified: false, reason: "no_profile" };
    setFaceResult(r);
    executePunch(r);
  }

  async function executePunch(face?: FaceVerifyResult) {
    if (!nextPunch) return;
    setPunchState("registering");
    setErrorMsg("");
    const faceVerified = face?.verified === true;
    const faceSimilarity = face?.verified ? face.similarity : undefined;

    try {
      const res = await fetch("/api/ponto/registrar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          punch_type: nextPunch,
          gps_latitude: coords?.lat,
          gps_longitude: coords?.lon,
          gps_accuracy_meters: coords?.acc,
          wifi_confirmed: wifiConfirmed,
          face_verified: faceVerified,
          face_similarity: faceSimilarity,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao registrar ponto.");
      setSuccessMsg(`${PUNCH_TYPE_LABELS[nextPunch]} registrado às ${new Date(json.record.recorded_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`);
      setPunchState("success");
      setFaceResult(null);
      await loadData();
      setTimeout(() => setPunchState("idle"), 4000);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Erro ao registrar ponto.");
      setPunchState("error");
      setFaceResult(null);
      setTimeout(() => { setPunchState("idle"); setShowFaceVerify(false); }, 4000);
    }
  }

  const canPunch = location.status === "ok" && wifiConfirmed && !!nextPunch;
  const isIdle = punchState === "idle";

  return (
    <div className="space-y-6 max-w-sm mx-auto">
      {/* Dynamic Glass Clock widget */}
      <div className="glass-card rounded-3xl p-6 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none"></div>
        <div className="w-48 h-48 rounded-full border border-white/[0.08] bg-gradient-to-tr from-white/[0.01] to-white/[0.04] flex flex-col items-center justify-center mx-auto shadow-[inset_0_0_20px_rgba(255,255,255,0.02)] relative">
          <div className="absolute inset-2 border border-dashed border-white/[0.04] rounded-full animate-[spin_120s_linear_infinite]"></div>
          <div className="text-4xl font-mono font-bold text-white tracking-tighter tabular-nums text-glow drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            {time}
          </div>
          <Clock size={16} className="text-slate-500 mt-2" />
        </div>
        <div className="text-xs text-slate-400 mt-4 capitalize font-semibold tracking-wide">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
        </div>
      </div>

      {/* Location Status Glass Panel */}
      <div className={`glass-card rounded-2xl p-4 flex items-center gap-4 transition-all duration-300 ${
        location.status === "ok" ? "border-emerald-500/20 bg-emerald-500/[0.04]"
          : location.status === "error" ? "border-rose-500/20 bg-rose-500/[0.04]"
          : "border-white/[0.08]"
      }`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300 ${
          location.status === "ok" ? "bg-emerald-500/10 text-emerald-400" 
            : location.status === "error" ? "bg-rose-500/10 text-rose-400" 
            : "bg-white/5 text-slate-400"
        }`}>
          {location.status === "checking" ? (
            <Loader2 size={18} className="animate-spin text-slate-400" />
          ) : (
            <MapPin size={18} className="transition-transform duration-300" />
          )}
        </div>
        <div className="min-w-0 flex-grow">
          <div className={`font-semibold text-xs tracking-wide uppercase ${
            location.status === "ok" ? "text-emerald-400" 
              : location.status === "error" ? "text-rose-400" 
              : "text-slate-400"
          }`}>
            GPS &amp; Localização
          </div>
          <div className="text-sm text-slate-200 font-medium mt-0.5 leading-snug">
            {location.status === "ok"
              ? `Área autorizada (${location.distance}m)`
              : location.status === "error" ? "Fora do raio de alcance"
              : "Obtendo sinal GPS..."}
          </div>
          {location.message && (
            <div className="text-xs text-rose-300/80 mt-1 leading-relaxed bg-rose-500/10 border border-rose-500/10 rounded-lg p-2">{location.message}</div>
          )}
        </div>
        {location.status !== "checking" && (
          <button
            onClick={() => storeConfig && checkLocation(storeConfig)}
            className="shrink-0 p-2 text-slate-400 hover:text-white bg-white/[0.04] border border-white/[0.06] rounded-lg transition-colors cursor-pointer hover:scale-105 active:scale-95"
            aria-label="Atualizar localização"
          >
            <RefreshCw size={16} />
          </button>
        )}
      </div>

      {/* Wi-Fi Checkbox Glass Panel */}
      <label className={`glass-card rounded-2xl p-4 flex items-center gap-4 cursor-pointer transition-all duration-300 ${
        wifiConfirmed ? "border-emerald-500/20 bg-emerald-500/[0.04]" : "border-white/[0.08] hover:bg-white/[0.02]"
      }`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors duration-300 ${
          wifiConfirmed ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-slate-400"
        }`}>
          <Wifi size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`font-semibold text-xs tracking-wide uppercase ${
            wifiConfirmed ? "text-emerald-400" : "text-slate-400"
          }`}>
            Conexão Wi-Fi
          </div>
          <div className="text-sm text-slate-200 font-medium mt-0.5 leading-snug">
            {wifiConfirmed ? "Wi-Fi local confirmado" : "Conectado na rede da loja"}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            {storeConfig?.wifi_ssid ? `SSID: ${storeConfig.wifi_ssid}` : "Confirme sua rede"}
          </div>
        </div>
        <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-300 shrink-0 ${
          wifiConfirmed ? "bg-emerald-500 border-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.3)]" : "border-white/20 bg-white/[0.03]"
        }`}>
          {wifiConfirmed && <CheckCircle2 size={16} className="text-white" strokeWidth={2.5} />}
          <input type="checkbox" checked={wifiConfirmed} onChange={(e) => setWifiConfirmed(e.target.checked)} className="sr-only" />
        </div>
      </label>

      {/* Face verification result badge */}
      {faceResult && !showFaceVerify && (
        <div className={`glass-card rounded-2xl p-4 flex items-center gap-4 border transition-all duration-300 ${
          faceResult.verified ? "border-emerald-500/20 bg-emerald-500/[0.04]" : "border-white/[0.08]"
        }`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${faceResult.verified ? "bg-emerald-500/10 text-emerald-400" : "bg-white/5 text-slate-400"}`}>
            <ScanFace size={18} />
          </div>
          <div className="min-w-0">
            <div className="font-semibold text-xs tracking-wide uppercase text-slate-400">Reconhecimento Facial</div>
            <div className={`font-medium text-sm mt-0.5 ${faceResult.verified ? "text-emerald-400" : "text-slate-200"}`}>
              {faceResult.verified
                ? `Identidade Confirmada (${Math.round((faceResult.similarity || 0) * 100)}%)`
                : faceResult.reason === "no_profile" ? "Sem perfil facial — ponto liberado"
                : "Verificação facial pulada"}
            </div>
          </div>
        </div>
      )}

      {/* Face Verify Component */}
      {showFaceVerify && userId && isIdle && (
        <div className="glass-card rounded-3xl p-4 border border-white/[0.08]">
          <FaceVerify userId={userId} onResult={handleFaceResult} onSkip={handleFaceSkip} />
        </div>
      )}

      {/* Punch button area */}
      {!showFaceVerify && (
        <div className="pt-2">
          {punchState === "success" ? (
            <div className="glass-card border-emerald-500/20 bg-emerald-500/[0.04] rounded-2xl p-5 text-center space-y-2 animate-fade-in">
              <div className="flex justify-center mb-1">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                  <CircleCheckBig size={32} strokeWidth={1.5} className="animate-pulse" />
                </div>
              </div>
              <div className="font-bold text-emerald-300 text-sm leading-relaxed">{successMsg}</div>
              <div className="text-xs text-slate-400">Registro confirmado no banco de dados</div>
            </div>
          ) : punchState === "error" ? (
            <div className="glass-card border-rose-500/20 bg-rose-500/[0.04] rounded-2xl p-5 text-center space-y-2 animate-shake">
              <div className="flex justify-center mb-1">
                <div className="w-14 h-14 rounded-full bg-rose-500/10 flex items-center justify-center text-rose-400 shadow-[0_0_20px_rgba(244,63,94,0.2)]">
                  <XCircle size={32} strokeWidth={1.5} />
                </div>
              </div>
              <div className="font-bold text-rose-300 text-sm leading-relaxed">{errorMsg}</div>
            </div>
          ) : (
            <button
              onClick={handleStartPunch}
              disabled={!canPunch || !isIdle}
              className={`w-full rounded-2xl py-4 text-sm tracking-widest uppercase font-bold transition-all text-white flex items-center justify-center gap-2 cursor-pointer ${
                canPunch && isIdle
                  ? `${PUNCH_COLORS[nextPunch || "entry"]} active:scale-[0.98] transform`
                  : "bg-white/[0.02] border border-white/[0.05] text-slate-600 cursor-not-allowed shadow-none"
              }`}
            >
              {punchState === "registering" ? (
                <><Loader2 size={18} className="animate-spin" /><span>Registrando Ponto...</span></>
              ) : (
                <>
                  {hasFacialProfile && !faceResult ? <ScanFace size={18} /> : <Clock size={18} />}
                  <span>{nextPunch ? PUNCH_TYPE_LABELS[nextPunch] : "Carregando..."}</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Hints & Instructions */}
      {!wifiConfirmed && isIdle && !showFaceVerify && (
        <div className="glass-card border-amber-500/15 bg-amber-500/[0.02] rounded-xl p-3 text-center text-xs text-amber-300/90 font-medium">
          Confirme a conexão Wi-Fi da loja para liberar o registro
        </div>
      )}
      {location.status === "error" && (
        <div className="glass-card border-rose-500/15 bg-rose-500/[0.02] rounded-xl p-3 text-center text-xs text-rose-300/90 font-medium">
          Ative o GPS do aparelho e certifique-se de estar dentro da loja
        </div>
      )}
      {hasFacialProfile && !faceResult && canPunch && isIdle && !showFaceVerify && (
        <div className="glass-card border-indigo-500/15 bg-indigo-500/[0.02] rounded-xl p-3 text-center text-xs text-indigo-300/90 font-medium">
          Identificação facial biométrica será necessária ao bater ponto
        </div>
      )}
      {!hasFacialProfile && canPunch && isIdle && !showFaceVerify && (
        <div className="glass-card border-white/5 bg-white/[0.01] rounded-xl p-3 text-center text-xs text-slate-400 font-medium">
          Foto facial não configurada. Fale com seu gerente para cadastrar.
        </div>
      )}
    </div>
  );
}
