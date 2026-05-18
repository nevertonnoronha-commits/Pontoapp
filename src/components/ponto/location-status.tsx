"use client";

import { CheckCircle, XCircle, MapPin, Loader2 } from "lucide-react";
import type { LocationStatus } from "@/types";
import { cn } from "@/lib/utils";

interface LocationStatusProps {
  status: LocationStatus;
  distance?: number | null;
  radius?: number;
  errorMessage?: string;
}

export function LocationStatusCard({
  status,
  distance,
  radius,
  errorMessage,
}: LocationStatusProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl p-4 border-2",
        status === "verified" && "bg-green-50 border-green-200",
        status === "failed" && "bg-red-50 border-red-200",
        status === "checking" && "bg-yellow-50 border-yellow-200",
        status === "disabled" && "bg-gray-50 border-gray-200"
      )}
    >
      <div className="shrink-0">
        {status === "checking" && (
          <Loader2 className="h-6 w-6 text-yellow-500 animate-spin" />
        )}
        {status === "verified" && (
          <CheckCircle className="h-6 w-6 text-green-600" />
        )}
        {status === "failed" && (
          <XCircle className="h-6 w-6 text-red-500" />
        )}
        {status === "disabled" && (
          <MapPin className="h-6 w-6 text-gray-400" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-semibold",
            status === "verified" && "text-green-700",
            status === "failed" && "text-red-700",
            status === "checking" && "text-yellow-700",
            status === "disabled" && "text-gray-500"
          )}
        >
          {status === "checking" && "Verificando localização..."}
          {status === "verified" && "Localização verificada"}
          {status === "failed" && "Fora da área permitida"}
          {status === "disabled" && "GPS não configurado"}
        </p>

        {status === "verified" && distance !== null && distance !== undefined && (
          <p className="text-xs text-green-600 mt-0.5">
            Você está a {distance}m da loja (raio: {radius}m)
          </p>
        )}

        {status === "failed" && distance !== null && distance !== undefined && (
          <p className="text-xs text-red-600 mt-0.5">
            Você está a {distance}m (máximo permitido: {radius}m)
          </p>
        )}

        {status === "failed" && errorMessage && !distance && (
          <p className="text-xs text-red-600 mt-0.5">{errorMessage}</p>
        )}
      </div>
    </div>
  );
}
