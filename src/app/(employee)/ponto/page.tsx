"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { getCurrentPosition, isWithinRadius, getGeoErrorMessage } from "@/lib/geo";
import type { StoreConfig, PunchType } from "@/types";
import { getNextPunchType, PUNCH_TYPE_LABELS } from "@/types";

type LocationState = { status: "checking" | "ok" | "error"; distance?: number; message?: string };
type PunchState = "idle" | "registering" | "success" | "error";

const PUNCH_ICONS: Record<PunchType | "complete", string> = {
  entry: "▶️",
  lunch_out: "🍽️",
  lunch_return: "↩️",
  exit: "⏹️",
  complete: "✅",
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

    const { data: userData } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
    if (!userData) return;

    const { data: config } = await supabase
      .from("store_configs").select("*").eq("organization_id", userData.organization_id).single();
    setStoreConfig(config);

    const today = new Date().toLocaleDateString("sv-SE");
    const { data: records } = await supabase
      .from("time_records")
      .select("punch_type, recorded_at")
      .eq("user_id", user.id)
      .gte("recorded_at", today + "T00:00:00")
      .order("recorded_at", { ascending: false })
      .limit(1);

    const lastType = records?.[0]?.punch_type as PunchType | undefined;
    setNextPunch(getNextPunchType(lastType || null));
  }, []);

  const checkLocation = useCallback(async (config: StoreConfig) => {
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

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (storeConfig) checkLocation(storeConfig);
  }, [storeConfig, checkLocation]);

  async function handlePunch() {
    if (!nextPunch || nextPunch === "complete" || location.status !== "ok" || !wifiConfirmed) return;
    setPunchState("registering");
    setErrorMsg("");

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
          face_verified: false,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao registrar ponto.");
      setSuccessMsg(`${PUNCH_TYPE_LABELS[nextPunch]} registrado às ${new Date(json.record.recorded_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`);
      setPunchState("success");
      await loadData();
      setTimeout(() => setPunchState("idle"), 4000);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Erro ao registrar ponto.");
      setPunchState("error");
      setTimeout(() => setPunchState("idle"), 4000);
    }
  }

  const canPunch = location.status === "ok" && wifiConfirmed && nextPunch && nextPunch !== "complete" && punchState === "idle";

  return (
    <div className="max-w-sm mx-auto px-4 py-6 space-y-6">
      <div className="text-center">
        <div className="text-5xl font-mono font-bold text-gray-800">{time}</div>
        <div className="text-sm text-gray-500 mt-1">
          {new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
        </div>
      </div>

      {/* Location status */}
      <div className={`rounded-xl p-4 flex items-center gap-3 ${location.status === "ok" ? "bg-green-50 border border-green-200" : location.status === "error" ? "bg-red-50 border border-red-200" : "bg-gray-50 border border-gray-200"}`}>
        <span className="text-2xl">{location.status === "ok" ? "✅" : location.status === "error" ? "❌" : "⏳"}</span>
        <div>
          <div className="font-medium text-sm">
            {location.status === "ok" ? `Localização confirmada (${location.distance}m)` : location.status === "error" ? "Fora da área permitida" : "Verificando localização..."}
          </div>
          {location.message && <div className="text-xs text-red-600 mt-0.5">{location.message}</div>}
        </div>
      </div>

      {/* WiFi confirmation */}
      <label className={`flex items-center gap-3 rounded-xl p-4 cursor-pointer ${wifiConfirmed ? "bg-green-50 border border-green-200" : "bg-gray-50 border border-gray-200"}`}>
        <input
          type="checkbox"
          checked={wifiConfirmed}
          onChange={(e) => setWifiConfirmed(e.target.checked)}
          className="w-5 h-5 accent-green-600"
        />
        <div>
          <div className="font-medium text-sm">Conectado ao WiFi da loja</div>
          <div className="text-xs text-gray-500">Confirme que está na rede do estabelecimento</div>
        </div>
      </label>

      {/* Punch button */}
      {punchState === "success" ? (
        <div className="bg-green-100 border border-green-300 rounded-2xl p-6 text-center">
          <div className="text-4xl mb-2">✅</div>
          <div className="font-bold text-green-800">{successMsg}</div>
        </div>
      ) : punchState === "error" ? (
        <div className="bg-red-100 border border-red-300 rounded-2xl p-6 text-center">
          <div className="text-4xl mb-2">❌</div>
          <div className="font-bold text-red-800">{errorMsg}</div>
        </div>
      ) : (
        <button
          onClick={handlePunch}
          disabled={!canPunch || (punchState as string) === "registering"}
          className={`w-full rounded-2xl py-6 text-xl font-bold transition-all ${
            nextPunch === "complete"
              ? "bg-gray-100 text-gray-500 cursor-default"
              : canPunch
              ? "bg-green-600 hover:bg-green-700 active:scale-95 text-white shadow-lg"
              : "bg-gray-200 text-gray-400 cursor-not-allowed"
          }`}
        >
          {(punchState as string) === "registering" ? "Registrando..." : (
            <>
              <span className="mr-2">{nextPunch ? PUNCH_ICONS[nextPunch] : "⏳"}</span>
              {nextPunch ? PUNCH_TYPE_LABELS[nextPunch] : "Carregando..."}
            </>
          )}
        </button>
      )}

      {!wifiConfirmed && nextPunch !== "complete" && (
        <p className="text-center text-xs text-amber-700">Confirme o WiFi para habilitar o registro</p>
      )}
      {location.status === "error" && (
        <button onClick={() => storeConfig && checkLocation(storeConfig)} className="w-full text-sm text-green-700 underline">
          Tentar localização novamente
        </button>
      )}
    </div>
  );
}
