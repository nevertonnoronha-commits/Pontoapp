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
  entry: "bg-green-600 hover:bg-green-700",
  lunch_out: "bg-amber-600 hover:bg-amber-700",
  lunch_return: "bg-blue-600 hover:bg-blue-700",
  exit: "bg-gray-700 hover:bg-gray-800",
  complete: "bg-gray-100",
};

export default function PontoPage() {
  const [time, setTime] = useState("");
  const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);
  const [location, setLocation] = useState<LocationState>({ status: "checking" });
  const [wifiConfirmed, setWifiConfirmed] = useState(false);
  const [nextPunch, setNextPunch] = useState<PunchType | "complete" | null>(null);
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

    const { data: facialProfile } = await supabase
      .from("facial_profiles").select("id").eq("user_id", user.id).eq("is_active", true).maybeSingle();
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
    setNextPunch(getNextPunchType(lastType || null));
  }, []);

  const checkLocation = useCallback(async (config: StoreConfig) => {
    setLocation({ status: "checking" });
    try {
      const pos = await getCurrentPosition();
      const { latitude: lat, longitude: lon, accuracy: acc } = pos.coords;
      setCoords({ lat, lon, acc });
      const { isValid, distance } = isWithinRadius(lat, lon, config.gps_latitude, config.gps_longitude, config.gps_radius_meters);
      setLocation({ status: isValid ? "ok" : "error", distance, message: isValid ? undefined : `Você está ${distance}m fora da área permitida (raio: ${config.gps_radius_meters}m).` });
    } catch (e) {
      const msg = e instanceof GeolocationPositionError ? getGeoErrorMessage(e) : "Erro ao obter localização.";
      setLocation({ status: "error", message: msg });
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);
  useEffect(() => { if (storeConfig) checkLocation(storeConfig); }, [storeConfig, checkLocation]);

  function handleStartPunch() {
    if (!nextPunch || nextPunch === "complete" || location.status !== "ok" || !wifiConfirmed) return;
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
    if (!nextPunch || nextPunch === "complete") return;
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

  const canPunch = location.status === "ok" && wifiConfirmed && !!nextPunch && nextPunch !== "complete";
  const isIdle = punchState === "idle";

  return (
    <div className="max-w-sm mx-auto px-4 py-6 space-y-5">
      {/* Clock */}
      <div className="text-center py-4">
        <div className="text-6xl font-mono font-bold text-gray-900 tracking-tighter tabular-nums">
          {time}
        </div>
        <div className="text-sm text-gray-500 mt-2 capitalize">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
        </div>
      </div>

      {/* Location status */}
      <div className={`rounded-2xl p-4 flex items-center gap-3 transition-colors ${
        location.status === "ok" ? "bg-green-50 border border-green-200"
          : location.status === "error" ? "bg-red-50 border border-red-200"
          : "bg-gray-50 border border-gray-200"
      }`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          location.status === "ok" ? "bg-green-100" : location.status === "error" ? "bg-red-100" : "bg-gray-100"
        }`}>
          {location.status === "checking" ? (
            <Loader2 size={20} className="text-gray-400 animate-spin" />
          ) : location.status === "ok" ? (
            <MapPin size={20} className="text-green-600" />
          ) : (
            <MapPin size={20} className="text-red-500" />
          )}
        </div>
        <div className="min-w-0">
          <div className={`font-medium text-sm ${
            location.status === "ok" ? "text-green-800" : location.status === "error" ? "text-red-800" : "text-gray-700"
          }`}>
            {location.status === "ok"
              ? `Dentro da área (${location.distance}m)`
              : location.status === "error" ? "Fora da área permitida"
              : "Verificando localização..."}
          </div>
          {location.message && (
            <div className="text-xs text-red-600 mt-0.5 leading-snug">{location.message}</div>
          )}
        </div>
        {location.status !== "checking" && (
          <button
            onClick={() => storeConfig && checkLocation(storeConfig)}
            className="ml-auto shrink-0 p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Atualizar localização"
          >
            <RefreshCw size={16} />
          </button>
        )}
      </div>

      {/* WiFi confirmation */}
      <label className={`flex items-center gap-3 rounded-2xl p-4 cursor-pointer transition-colors ${
        wifiConfirmed ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-gray-200 hover:bg-gray-100"
      }`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${wifiConfirmed ? "bg-green-100" : "bg-gray-100"}`}>
          <Wifi size={20} className={wifiConfirmed ? "text-green-600" : "text-gray-400"} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`font-medium text-sm ${wifiConfirmed ? "text-green-800" : "text-gray-700"}`}>
            Conectado ao WiFi da loja
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {storeConfig?.wifi_ssid ? `Rede: ${storeConfig.wifi_ssid}` : "Confirme que está na rede do estabelecimento"}
          </div>
        </div>
        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all shrink-0 ${
          wifiConfirmed ? "bg-green-600 border-green-600" : "border-gray-300 bg-white"
        }`}>
          {wifiConfirmed && <CheckCircle2 size={16} className="text-white" strokeWidth={2.5} />}
          <input type="checkbox" checked={wifiConfirmed} onChange={(e) => setWifiConfirmed(e.target.checked)} className="sr-only" />
        </div>
      </label>

      {/* Face verification result badge */}
      {faceResult && !showFaceVerify && (
        <div className={`rounded-2xl p-4 flex items-center gap-3 border ${
          faceResult.verified ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
        }`}>
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${faceResult.verified ? "bg-green-100" : "bg-gray-100"}`}>
            <ScanFace size={20} className={faceResult.verified ? "text-green-600" : "text-gray-400"} />
          </div>
          <div className="min-w-0">
            <div className={`font-medium text-sm ${faceResult.verified ? "text-green-800" : "text-gray-600"}`}>
              {faceResult.verified
                ? `Identidade confirmada (${Math.round((faceResult.similarity || 0) * 100)}%)`
                : faceResult.reason === "no_profile" ? "Sem perfil facial — ponto liberado"
                : "Verificação facial pulada"}
            </div>
          </div>
        </div>
      )}

      {/* Face Verify Component */}
      {showFaceVerify && userId && isIdle && (
        <FaceVerify userId={userId} onResult={handleFaceResult} onSkip={handleFaceSkip} />
      )}

      {/* Punch button area */}
      {!showFaceVerify && (
        <>
          {punchState === "success" ? (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-8 text-center space-y-2">
              <div className="flex justify-center mb-2">
                <CircleCheckBig size={48} className="text-green-600" strokeWidth={1.5} />
              </div>
              <div className="font-bold text-green-800 text-lg">{successMsg}</div>
              <div className="text-sm text-green-600">Registro confirmado!</div>
            </div>
          ) : punchState === "error" ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center space-y-2">
              <div className="flex justify-center mb-2">
                <XCircle size={48} className="text-red-500" strokeWidth={1.5} />
              </div>
              <div className="font-bold text-red-800">{errorMsg}</div>
            </div>
          ) : nextPunch === "complete" ? (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-8 text-center space-y-2">
              <div className="flex justify-center mb-2">
                <CircleCheckBig size={48} className="text-gray-400" strokeWidth={1.5} />
              </div>
              <div className="font-semibold text-gray-600">Jornada completa!</div>
              <div className="text-sm text-gray-400">Todos os registros do dia foram realizados.</div>
            </div>
          ) : (
            <button
              onClick={handleStartPunch}
              disabled={!canPunch || !isIdle}
              className={`w-full rounded-2xl py-6 text-lg font-bold transition-all text-white flex items-center justify-center gap-3 ${
                canPunch && isIdle
                  ? `${PUNCH_COLORS[nextPunch || "entry"]} shadow-md active:scale-[0.98]`
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }`}
            >
              {punchState === "registering" ? (
                <><Loader2 size={22} className="animate-spin" />Registrando...</>
              ) : (
                <>
                  {hasFacialProfile && !faceResult ? <ScanFace size={22} /> : <Clock size={22} />}
                  {nextPunch ? PUNCH_TYPE_LABELS[nextPunch] : "Carregando..."}
                </>
              )}
            </button>
          )}
        </>
      )}

      {/* Hints */}
      {!wifiConfirmed && nextPunch !== "complete" && isIdle && !showFaceVerify && (
        <p className="text-center text-xs text-amber-600">
          Confirme a conexão WiFi para habilitar o registro
        </p>
      )}
      {location.status === "error" && (
        <p className="text-center text-xs text-red-600">
          Verifique se o GPS está ativo e você está dentro da área da loja
        </p>
      )}
      {hasFacialProfile && !faceResult && canPunch && isIdle && !showFaceVerify && (
        <p className="text-center text-xs text-purple-600">
          Ao registrar, você será solicitado a verificar sua identidade pela câmera
        </p>
      )}
    </div>
  );
}
