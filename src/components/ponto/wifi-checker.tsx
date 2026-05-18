"use client";

import { Wifi } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface WifiCheckerProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  ssid?: string | null;
}

export function WifiChecker({ checked, onCheckedChange, ssid }: WifiCheckerProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl p-4 border-2 cursor-pointer transition-colors",
        checked ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
      )}
      onClick={() => onCheckedChange(!checked)}
    >
      <div className="mt-0.5">
        <Wifi
          className={cn(
            "h-5 w-5",
            checked ? "text-green-600" : "text-gray-400"
          )}
        />
      </div>

      <div className="flex-1">
        <div className="flex items-center gap-3">
          <Label
            htmlFor="wifi-confirm"
            className="text-sm font-semibold text-gray-700 cursor-pointer"
          >
            Estou conectado ao WiFi da loja
          </Label>
          <Checkbox
            id="wifi-confirm"
            checked={checked}
            onCheckedChange={(val) => onCheckedChange(val === true)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        {ssid && (
          <p className="text-xs text-gray-500 mt-0.5">
            Rede esperada: {ssid}
          </p>
        )}
        <p className="text-xs text-gray-400 mt-1">
          Confirme que você está na rede da loja
        </p>
      </div>
    </div>
  );
}
