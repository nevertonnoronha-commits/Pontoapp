"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import { Camera, RefreshCw, CheckCircle2, XCircle, Loader2, ScanFace, X } from "lucide-react";

export type FaceVerifyResult =
  | { verified: true; similarity: number; photoDataUrl: string }
  | { verified: false; reason: "no_profile" | "no_face" | "no_match" | "error"; photoDataUrl?: string; similarity?: number };

interface FaceVerifyProps {
  userId: string;
  onResult: (result: FaceVerifyResult) => void;
  onSkip?: () => void;
}

type Step = "idle" | "camera" | "capturing" | "processing" | "done";

const MODEL_URL = "/models";
const SIMILARITY_THRESHOLD = 0.50;

export function FaceVerify({ userId, onResult, onSkip }: FaceVerifyProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

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
  }, []);

  useEffect(() => () => stopCamera(), [stopCamera]);

  async function openCamera() {
    setStep("camera");
    setError("");
    setCameraReady(false);
    setCapturedUrl(null);
    setSimilarity(null);
    setVerified(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>((resolve, reject) => {
          const checkStream = () => {
            if (videoRef.current?.readyState === 2) {
              videoRef.current.play().then(() => {
                setCameraReady(true);
                resolve();
              }).catch(reject);
            } else {
              setTimeout(checkStream, 50);
            }
          };
          checkStream();
          setTimeout(() => reject(new Error("Camera initialization timeout")), 5000);
        });
      }
    } catch (err) {
      console.error("Camera access error - Full error:", err);
      console.error("Error type:", err instanceof DOMException ? "DOMException" : typeof err);
      console.error("Error name:", (err as any)?.name);
      console.error("Error message:", (err as any)?.message);

      let errorMsg = "Não foi possível acessar a câmera.";

      if (err instanceof DOMException) {
        console.error("DOMException detected. Name:", err.name);
        if (err.name === "NotAllowedError") {
          errorMsg = "Permissão negada. Por favor, permita acesso à câmera nas configurações do dispositivo.";
        } else if (err.name === "NotFoundError") {
          errorMsg = "Nenhuma câmera encontrada no dispositivo.";
        } else if (err.name === "NotReadableError") {
          errorMsg = "Câmera já está sendo usada por outro aplicativo.";
        } else if (err.name === "SecurityError") {
          errorMsg = "Erro de segurança. Verifique se está usando HTTPS.";
        } else {
          errorMsg = `Erro: ${err.name} - ${err.message}`;
        }
      } else if (err instanceof Error) {
        errorMsg = `Erro: ${err.message}`;
      }

      console.log("Final error message:", errorMsg);
      setError(errorMsg);
      setStep("idle");
      setCameraReady(false);
    }
  }

  async function capture() {
    if (!videoRef.current || !canvasRef.current) return;
    setStep("capturing");

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedUrl(dataUrl);
    stopCamera();

    setStep("processing");
    await processFace(dataUrl);
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

      setStatusMsg("Buscando perfil facial...");
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data: profile } = await supabase
        .from("facial_profiles")
        .select("face_descriptor")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (!profile?.face_descriptor) {
        setVerified(null);
        setStep("done");
        onResult({ verified: false, reason: "no_profile", photoDataUrl: dataUrl });
        return;
      }

      setStatusMsg("Detectando rosto...");
      const img = new Image();
      img.src = dataUrl;
      await new Promise<void>((res, rej) => {
        img.onload = () => res();
        img.onerror = rej;
      });

      const detection = await faceapi
        .detectSingleFace(img, new faceapi.TinyFaceDetectorOptions({ scoreThreshold: 0.3 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detection) {
        setVerified(false);
        setSimilarity(null);
        setStep("done");
        onResult({ verified: false, reason: "no_face", photoDataUrl: dataUrl });
        return;
      }

      setStatusMsg("Comparando...");
      const stored = new Float32Array(profile.face_descriptor as number[]);
      const dist = faceapi.euclideanDistance(detection.descriptor, stored);
      const sim = Math.max(0, 1 - dist);
      setSimilarity(sim);

      if (sim >= SIMILARITY_THRESHOLD) {
        setVerified(true);
        setStep("done");
        onResult({ verified: true, similarity: sim, photoDataUrl: dataUrl });
      } else {
        setVerified(false);
        setStep("done");
        onResult({ verified: false, reason: "no_match", photoDataUrl: dataUrl, similarity: sim });
      }
    } catch (e) {
      console.error("Face verify error:", e);
      setError("Erro no reconhecimento. Tente novamente.");
      setStep("done");
      setVerified(false);
      onResult({ verified: false, reason: "error", photoDataUrl: dataUrl });
    } finally {
      setStatusMsg("");
    }
  }

  function retry() {
    setCapturedUrl(null);
    setVerified(null);
    setSimilarity(null);
    setError("");
    openCamera();
  }

  // Step: idle
  if (step === "idle") {
    return (
      <div className={`rounded-2xl border p-5 space-y-4 text-center ${error ? "border-red-200 bg-red-50" : "border-gray-200 bg-gray-50"}`}>
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto ${error ? "bg-red-100" : "bg-purple-100"}`}>
          <ScanFace size={28} className={error ? "text-red-600" : "text-purple-600"} />
        </div>
        <div>
          <p className={`font-semibold text-sm ${error ? "text-red-800" : "text-gray-800"}`}>
            {error ? "Erro ao acessar câmera" : "Verificação Facial"}
          </p>
          <p className={`text-xs mt-0.5 ${error ? "text-red-600" : "text-gray-400"}`}>
            {error ? error : "Tire uma selfie para confirmar sua identidade"}
          </p>
        </div>
        {error && (
          <div className="bg-white rounded-lg p-3 text-left text-xs text-gray-600 border border-red-100">
            <p className="font-semibold text-red-700 mb-1">Solução:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              {error.includes("Permissão") && (
                <>
                  <li>Verifique as permissões do navegador</li>
                  <li>Vá para configurações do site e permita câmera</li>
                </>
              )}
              {error.includes("câmera não encontrada") && (
                <li>Seu dispositivo não possui câmera ou ela não foi detectada</li>
              )}
              {error.includes("já está sendo usada") && (
                <li>Feche outros aplicativos que estão usando a câmera</li>
              )}
              {error.includes("HTTPS") && (
                <li>O aplicativo precisa estar em HTTPS para acessar a câmera</li>
              )}
              <li>Tente novamente após resolver o problema</li>
            </ul>
          </div>
        )}
        <div className="flex gap-2">
          <button
            onClick={openCamera}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold transition-colors ${
              error
                ? "border border-red-200 text-red-700 hover:bg-red-100"
                : "bg-purple-600 hover:bg-purple-700 text-white"
            }`}
          >
            <Camera size={18} />
            {error ? "Tentar novamente" : "Abrir câmera"}
          </button>
          {onSkip && (
            <button
              onClick={onSkip}
              className="flex items-center gap-1.5 border border-gray-200 text-gray-500 hover:bg-gray-100 rounded-xl px-3 py-3 text-sm transition-colors"
              title="Pular verificação"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Step: camera live
  if (step === "camera") {
    return (
      <div className="rounded-2xl overflow-hidden border border-gray-200 space-y-0">
        <div className="relative bg-black aspect-[4/3] max-h-64 flex items-center justify-center">
          <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
          {/* Loading indicator while camera initializes */}
          {!cameraReady && (
            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-2">
              <Loader2 size={24} className="text-white animate-spin" />
              <p className="text-xs text-white">Inicializando câmera...</p>
            </div>
          )}
          {/* Face guide oval */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-36 h-44 rounded-full border-4 border-white/60 border-dashed" />
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>
        <div className="bg-white p-4 flex gap-2">
          <button
            onClick={() => { stopCamera(); setStep("idle"); setCameraReady(false); }}
            className="flex items-center gap-1.5 border border-gray-200 text-gray-500 hover:bg-gray-100 rounded-xl px-4 py-2.5 text-sm transition-colors"
          >
            <X size={16} />
          </button>
          <button
            onClick={capture}
            disabled={!cameraReady}
            className="flex-1 flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors"
          >
            <Camera size={18} />
            Capturar
          </button>
        </div>
      </div>
    );
  }

  // Step: processing
  if (step === "processing" || step === "capturing") {
    return (
      <div className="rounded-2xl border border-purple-100 bg-purple-50 p-6 text-center space-y-3">
        {capturedUrl && (
          <img src={capturedUrl} alt="Foto capturada" className="w-20 h-20 rounded-xl object-cover mx-auto border-2 border-purple-200" />
        )}
        <div className="flex flex-col items-center gap-2">
          <Loader2 size={28} className="text-purple-600 animate-spin" />
          <p className="text-sm font-medium text-purple-800">{statusMsg || "Processando..."}</p>
        </div>
      </div>
    );
  }

  // Step: done
  if (step === "done") {
    // No profile — skip gracefully
    if (verified === null) {
      return (
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5 text-center space-y-2">
          <ScanFace size={32} className="text-gray-400 mx-auto" />
          <p className="text-sm font-medium text-gray-600">Sem perfil facial cadastrado</p>
          <p className="text-xs text-gray-400">O ponto será registrado sem verificação facial.</p>
        </div>
      );
    }

    if (verified) {
      return (
        <div className="rounded-2xl border border-green-200 bg-green-50 p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
              <CheckCircle2 size={22} className="text-green-600" />
            </div>
            <div>
              <p className="font-semibold text-green-800 text-sm">Identidade confirmada</p>
              <p className="text-xs text-green-600">
                Similaridade: {similarity !== null ? Math.round(similarity * 100) : "--"}%
              </p>
            </div>
            {capturedUrl && (
              <img src={capturedUrl} alt="" className="w-10 h-10 rounded-lg object-cover ml-auto shrink-0 border-2 border-green-200" />
            )}
          </div>
        </div>
      );
    }

    // Not verified
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
            <XCircle size={22} className="text-red-500" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-red-800 text-sm">Não reconhecido</p>
            <p className="text-xs text-red-500">
              {similarity !== null
                ? `Similaridade: ${Math.round(similarity * 100)}% (mín. ${Math.round(SIMILARITY_THRESHOLD * 100)}%)`
                : error || "Rosto não detectado. Tente novamente."}
            </p>
          </div>
        </div>
        <button
          onClick={retry}
          className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-700 hover:bg-red-100 rounded-xl py-2.5 text-sm font-medium transition-colors"
        >
          <RefreshCw size={15} />
          Tentar novamente
        </button>
      </div>
    );
  }

  return null;
}
