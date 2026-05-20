"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Camera, RefreshCw, CheckCircle2, XCircle, Loader2, ScanFace, X, ShieldCheck } from "lucide-react";

export type FaceVerifyResult =
  | { verified: true; similarity: number; photoDataUrl: string }
  | { verified: false; reason: "no_profile" | "no_face" | "no_match" | "error"; photoDataUrl?: string; similarity?: number };

interface FaceVerifyProps {
  userId: string;
  onResult: (result: FaceVerifyResult) => void;
}

type Step = "idle" | "camera" | "capturing" | "processing" | "done";

const MODEL_URL = "/models";
const SIMILARITY_THRESHOLD = 0.50;

export function FaceVerify({ userId, onResult }: FaceVerifyProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const openingRef = useRef(false);

  const [step, setStep] = useState<Step>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [error, setError] = useState("");
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => { if (step === "done") stopCamera(); }, [step, stopCamera]);
  useEffect(() => () => stopCamera(), [stopCamera]);

  // Auto-open camera on mount
  useEffect(() => { openCamera(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function openCamera() {
    if (openingRef.current) return;
    openingRef.current = true;
    setStep("camera");
    setError("");
    setCameraReady(false);
    setCapturedUrl(null);
    setSimilarity(null);
    setVerified(null);

    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      if (!videoRef.current) { stream.getTracks().forEach((t) => t.stop()); throw new Error("Video lost"); }
      streamRef.current = stream;
      videoRef.current.srcObject = stream;

      try {
        await videoRef.current.play();
        openingRef.current = false;
        setCameraReady(true);
      } catch {
        await new Promise<void>((resolve, reject) => {
          if (!videoRef.current) { reject(new Error("Video lost")); return; }
          const tid = setTimeout(() => { cleanup(); reject(new Error("Camera timeout")); }, 8000);
          const cleanup = () => {
            clearTimeout(tid);
            videoRef.current?.removeEventListener("canplay", onReady);
            videoRef.current?.removeEventListener("error", onErr);
          };
          const onReady = () => { cleanup(); openingRef.current = false; setCameraReady(true); resolve(); };
          const onErr  = () => { cleanup(); reject(new Error("Video error")); };
          if (videoRef.current!.readyState >= 2) { onReady(); return; }
          videoRef.current!.addEventListener("canplay", onReady, { once: true });
          videoRef.current!.addEventListener("error",   onErr,   { once: true });
        });
      }
    } catch (err) {
      openingRef.current = false;
      stopCamera();
      let msg = "Não foi possível acessar a câmera.";
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError")  msg = "Permissão negada. Permita acesso à câmera nas configurações.";
        else if (err.name === "NotFoundError") msg = "Nenhuma câmera encontrada no dispositivo.";
        else if (err.name === "NotReadableError") msg = "Câmera em uso por outro aplicativo.";
        else msg = err.message;
      } else if (err instanceof Error) msg = err.message;
      setError(msg);
      setStep("idle");
      setCameraReady(false);
    }
  }

  async function capture() {
    if (!videoRef.current || !canvasRef.current) return;
    setStep("capturing");
    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas context unavailable");
      ctx.drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
      setCapturedUrl(dataUrl);
      stopCamera();
      setStep("processing");
      await processFace(dataUrl);
    } catch (err) {
      stopCamera();
      setError(err instanceof Error ? err.message : "Erro ao capturar");
      setStep("idle");
    }
  }

  async function processFace(dataUrl: string) {
    try {
      setStatusMsg("Carregando modelos...");
      const faceapi = await import("face-api.js");
      if (!faceapi.nets.tinyFaceDetector.isLoaded) {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        ]);
      }
      setStatusMsg("Buscando perfil...");
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: profile } = await supabase
        .from("facial_profiles").select("face_descriptor")
        .eq("user_id", userId).eq("is_active", true).maybeSingle();

      if (!profile?.face_descriptor) {
        setStep("done"); setVerified(null);
        onResult({ verified: false, reason: "no_profile", photoDataUrl: dataUrl });
        return;
      }
      setStatusMsg("Detectando rosto...");
      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = rej; });

      const detection = await faceapi
        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3 }))
        .withFaceLandmarks().withFaceDescriptor();

      if (!detection) {
        setStep("done"); setVerified(false); setSimilarity(null);
        onResult({ verified: false, reason: "no_face", photoDataUrl: dataUrl });
        return;
      }
      setStatusMsg("Comparando...");
      const stored = new Float32Array(profile.face_descriptor as number[]);
      const sim = Math.max(0, 1 - faceapi.euclideanDistance(detection.descriptor, stored));
      setSimilarity(sim);

      if (sim >= SIMILARITY_THRESHOLD) {
        setStep("done"); setVerified(true);
        onResult({ verified: true, similarity: sim, photoDataUrl: dataUrl });
      } else {
        setStep("done"); setVerified(false);
        onResult({ verified: false, reason: "no_match", photoDataUrl: dataUrl, similarity: sim });
      }
    } catch {
      setStep("done"); setVerified(false);
      onResult({ verified: false, reason: "error", photoDataUrl: dataUrl });
    } finally {
      setStatusMsg("");
    }
  }

  function retry() {
    setCapturedUrl(null); setVerified(null); setSimilarity(null); setError("");
    openCamera();
  }

  // ─── FULL-SCREEN OVERLAY ────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-[#07080A] flex flex-col">

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-safe-top py-4 shrink-0">
        <div className="flex items-center gap-2.5">
          <ShieldCheck size={20} className="text-yellow-400" />
          <span className="text-sm font-bold text-white tracking-wide">Verificação Facial</span>
        </div>
        <button
          onClick={() => { stopCamera(); onResult({ verified: false, reason: "error" }); }}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-white/[0.07] hover:bg-white/[0.12] text-slate-300 transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Camera / content area — flex-1 so it fills remaining space */}
      <div className="flex-1 relative overflow-hidden">

        {/* ── CAMERA STEP ── */}
        {(step === "camera") && (
          <>
            <video
              ref={videoRef}
              autoPlay playsInline muted
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Dark overlay with oval cutout via box-shadow */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div
                className="w-64 h-80 rounded-[50%] border-[3px] border-yellow-400"
                style={{ boxShadow: "0 0 0 100vmax rgba(0,0,0,0.65)" }}
              />
            </div>

            {/* Camera loading */}
            {!cameraReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#07080A]">
                <Loader2 size={32} className="text-yellow-400 animate-spin" />
                <p className="text-sm text-slate-400">Inicializando câmera...</p>
              </div>
            )}
          </>
        )}

        {/* ── IDLE / ERROR STEP ── */}
        {step === "idle" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-8 text-center">
            <div className="w-20 h-20 rounded-3xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
              <ScanFace size={40} className="text-yellow-400" />
            </div>
            <div>
              <p className="text-white font-bold text-lg">Câmera indisponível</p>
              <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">{error || "Permita o acesso à câmera para continuar."}</p>
            </div>
          </div>
        )}

        {/* ── PROCESSING STEP ── */}
        {(step === "processing" || step === "capturing") && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-8 text-center">
            {capturedUrl && (
              <div className="w-40 h-40 rounded-[50%] overflow-hidden border-4 border-yellow-400 shadow-[0_0_30px_rgba(234,179,8,0.3)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={capturedUrl} alt="" className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex flex-col items-center gap-3">
              <Loader2 size={36} className="text-yellow-400 animate-spin" />
              <p className="text-base font-semibold text-white">{statusMsg || "Processando..."}</p>
              <p className="text-sm text-slate-400">Aguarde um momento</p>
            </div>
          </div>
        )}

        {/* ── DONE STEP ── */}
        {step === "done" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 px-8 text-center">
            {/* Verified */}
            {verified === true && (
              <>
                <div className="w-28 h-28 rounded-[50%] overflow-hidden border-4 border-yellow-400 shadow-[0_0_40px_rgba(234,179,8,0.4)]">
                  {capturedUrl && <img src={capturedUrl} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center">
                    <CheckCircle2 size={28} className="text-yellow-400" />
                  </div>
                  <p className="text-xl font-bold text-white">Identidade confirmada</p>
                  <p className="text-sm text-yellow-400 font-semibold">
                    {similarity !== null ? `${Math.round(similarity * 100)}% de compatibilidade` : ""}
                  </p>
                </div>
              </>
            )}

            {/* No profile */}
            {verified === null && (
              <>
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <ScanFace size={36} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">Perfil biométrico incompleto</p>
                  <p className="text-sm text-slate-400 mt-2">Contacte o administrador para recadastrar sua foto facial.</p>
                </div>
              </>
            )}

            {/* Not verified */}
            {verified === false && (
              <>
                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
                  <XCircle size={36} className="text-rose-400" />
                </div>
                <div>
                  <p className="text-lg font-bold text-white">Não reconhecido</p>
                  <p className="text-sm text-slate-400 mt-2">
                    {similarity !== null
                      ? `Compatibilidade: ${Math.round(similarity * 100)}% (mín. ${Math.round(SIMILARITY_THRESHOLD * 100)}%)`
                      : "Rosto não detectado. Posicione-se bem iluminado."}
                  </p>
                </div>
              </>
            )}
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Bottom controls */}
      <div className="shrink-0 px-6 pb-10 pt-4 space-y-3">
        {step === "camera" && (
          <>
            <p className="text-center text-xs text-slate-400 mb-4">
              Centralize seu rosto dentro do oval e mantenha boa iluminação
            </p>
            <button
              onClick={capture}
              disabled={!cameraReady}
              className="w-full flex items-center justify-center gap-3 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-black font-bold rounded-2xl py-4 text-base transition-all shadow-[0_4px_24px_rgba(234,179,8,0.3)]"
            >
              <Camera size={22} />
              Capturar foto
            </button>
          </>
        )}

        {step === "idle" && (
          <button
            onClick={openCamera}
            className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-2xl py-4 text-base transition-all"
          >
            <Camera size={20} />
            Tentar novamente
          </button>
        )}

        {step === "done" && verified === false && (
          <button
            onClick={retry}
            className="w-full flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-2xl py-4 text-base transition-all"
          >
            <RefreshCw size={18} />
            Tentar novamente
          </button>
        )}

        {step === "done" && (verified === null || verified === true) && (
          <div className="h-14" /> /* spacer so content doesn't look cut off */
        )}

        {(step === "processing" || step === "capturing") && (
          <div className="h-14" />
        )}
      </div>
    </div>
  );
}
