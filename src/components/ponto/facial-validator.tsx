"use client";

/**
 * IMPORTANT: face-api.js models must be downloaded and placed in /public/models/
 * Download from: https://github.com/justadudewhohacks/face-api.js/tree/master/weights
 * Required files:
 *   - tiny_face_detector_model-weights_manifest.json + shard files
 *   - face_recognition_model-weights_manifest.json + shard files
 *   - face_landmark_68_model-weights_manifest.json + shard files
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { FaceStatus } from "@/types";

interface FacialValidatorProps {
  storedDescriptor: number[] | null;
  onValidated: (success: boolean, similarity: number, imageBlob: Blob | null) => void;
  onError: (error: string) => void;
}

export function FacialValidator({
  storedDescriptor,
  onValidated,
  onError,
}: FacialValidatorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [status, setStatus] = useState<FaceStatus>("idle");
  const [similarity, setSimilarity] = useState<number | null>(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [instruction, setInstruction] = useState("Clique para iniciar a câmera");
  const [faceApiLoaded, setFaceApiLoaded] = useState(false);

  // Dynamically import face-api to avoid SSR issues
  const loadFaceApi = useCallback(async () => {
    try {
      const faceapi = await import("face-api.js");
      const MODEL_URL = "/models";

      setInstruction("Carregando modelos de reconhecimento facial...");

      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      ]);

      setModelsLoaded(true);
      setFaceApiLoaded(true);
      setInstruction("Posicione seu rosto na câmera");
    } catch (err) {
      console.error("Failed to load face-api models:", err);
      onError(
        "Falha ao carregar modelos de reconhecimento facial. Verifique se os modelos estão na pasta /public/models/"
      );
      setInstruction("Erro ao carregar modelos");
    }
  }, [onError]);

  const startCamera = useCallback(async () => {
    try {
      setStatus("loading");
      setInstruction("Iniciando câmera...");

      if (!faceApiLoaded) {
        await loadFaceApi();
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: "user",
        },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
      setStatus("detecting");
      setInstruction("Posicione seu rosto no centro da câmera");
    } catch (err) {
      console.error("Camera error:", err);
      setStatus("failed");
      const errorMessage =
        err instanceof Error && err.name === "NotAllowedError"
          ? "Permissão de câmera negada. Permita o acesso à câmera."
          : "Erro ao acessar a câmera. Verifique se ela está disponível.";
      onError(errorMessage);
      setInstruction("Erro ao acessar câmera");
    }
  }, [faceApiLoaded, loadFaceApi, onError]);

  const stopCamera = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Face detection loop
  useEffect(() => {
    if (!cameraActive || !modelsLoaded) return;

    const detectFace = async () => {
      const faceapi = await import("face-api.js");

      if (!videoRef.current || videoRef.current.readyState < 2) return;

      try {
        const detection = await faceapi
          .detectSingleFace(
            videoRef.current,
            new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
          )
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!detection) {
          setInstruction("Nenhum rosto detectado. Posicione seu rosto.");
          return;
        }

        setInstruction("Rosto detectado! Verificando identidade...");

        // If no stored descriptor, just capture
        if (!storedDescriptor) {
          setInstruction("Rosto detectado com sucesso!");
          setStatus("verified");

          // Capture image
          const imageBlob = captureImage();
          onValidated(true, 1.0, imageBlob);
          stopCamera();
          return;
        }

        // Compare with stored descriptor
        const storedDescArray = new Float32Array(storedDescriptor);
        const distance = faceapi.euclideanDistance(
          detection.descriptor,
          storedDescArray
        );

        // Convert distance to similarity (0 to 1)
        // face-api.js uses euclidean distance; typically < 0.6 is same person
        const simScore = Math.max(0, 1 - distance);
        setSimilarity(simScore);

        if (distance < 0.6) {
          setInstruction(`Identidade confirmada! Similaridade: ${Math.round(simScore * 100)}%`);
          setStatus("verified");

          const imageBlob = captureImage();
          onValidated(true, simScore, imageBlob);
          stopCamera();
        } else {
          setInstruction(`Rosto não reconhecido. Similaridade: ${Math.round(simScore * 100)}%. Tente novamente.`);
          setStatus("failed");
          onValidated(false, simScore, null);
        }
      } catch (err) {
        console.error("Detection error:", err);
      }
    };

    intervalRef.current = setInterval(detectFace, 1500);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [cameraActive, modelsLoaded, storedDescriptor, onValidated, stopCamera]);

  const captureImage = (): Blob | null => {
    if (!videoRef.current || !canvasRef.current) return null;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0);

    let blob: Blob | null = null;
    canvas.toBlob(
      (b) => {
        blob = b;
      },
      "image/jpeg",
      0.8
    );

    return blob;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const statusColors: Record<FaceStatus, string> = {
    idle: "text-gray-400",
    loading: "text-yellow-500",
    detecting: "text-blue-500",
    verified: "text-green-600",
    failed: "text-red-500",
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Camera preview */}
      <div className="relative w-full max-w-sm aspect-video bg-gray-900 rounded-xl overflow-hidden border-2 border-gray-200">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          muted
          playsInline
          style={{ display: cameraActive ? "block" : "none" }}
        />
        <canvas ref={canvasRef} className="hidden" />

        {!cameraActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <Camera className="h-12 w-12 text-gray-400" />
            <p className="text-sm text-gray-400">Câmera inativa</p>
          </div>
        )}

        {/* Status overlay when camera is active */}
        {cameraActive && (
          <div className="absolute bottom-2 left-2 right-2">
            <div className="bg-black/60 rounded-lg px-3 py-1.5 text-center">
              <p className="text-white text-xs">{instruction}</p>
            </div>
          </div>
        )}

        {/* Face detection indicator */}
        {status === "verified" && (
          <div className="absolute inset-0 flex items-center justify-center bg-green-500/20">
            <CheckCircle className="h-16 w-16 text-green-500" />
          </div>
        )}
        {status === "failed" && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-500/20">
            <XCircle className="h-16 w-16 text-red-500" />
          </div>
        )}
      </div>

      {/* Status text */}
      <div className="flex flex-col items-center gap-1">
        <div className={cn("flex items-center gap-2", statusColors[status])}>
          {status === "loading" && (
            <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          )}
          {status === "detecting" && (
            <span className="h-3 w-3 bg-blue-500 rounded-full animate-pulse" />
          )}
          {status === "verified" && <CheckCircle className="h-4 w-4" />}
          {status === "failed" && <XCircle className="h-4 w-4" />}
          {status === "idle" && <AlertCircle className="h-4 w-4" />}
          <span className="text-sm font-medium">
            {status === "idle" && "Aguardando câmera"}
            {status === "loading" && "Carregando..."}
            {status === "detecting" && "Detectando rosto..."}
            {status === "verified" && "Identidade verificada"}
            {status === "failed" && "Verificação falhou"}
          </span>
        </div>

        {similarity !== null && (
          <p className="text-xs text-gray-500">
            Similaridade: {Math.round(similarity * 100)}%
          </p>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-3">
        {!cameraActive && status !== "verified" && (
          <Button
            onClick={startCamera}
            className="bg-green-600 hover:bg-green-700"
            size="sm"
          >
            <Camera className="h-4 w-4 mr-2" />
            {status === "failed" ? "Tentar Novamente" : "Iniciar Câmera"}
          </Button>
        )}

        {cameraActive && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              stopCamera();
              setStatus("idle");
              setSimilarity(null);
            }}
          >
            Cancelar
          </Button>
        )}
      </div>

      {!storedDescriptor && (
        <p className="text-xs text-amber-600 text-center">
          Reconhecimento facial não configurado. O ponto será registrado sem validação facial.
        </p>
      )}
    </div>
  );
}
