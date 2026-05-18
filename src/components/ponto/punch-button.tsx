"use client";

import { cn } from "@/lib/utils";
import { CheckCircle, Loader2, Clock, Coffee, LogIn, LogOut } from "lucide-react";
import type { PunchButtonState, PunchType } from "@/types";
import { PUNCH_TYPE_LABELS } from "@/types";

interface PunchButtonProps {
  nextPunch: PunchType | "complete";
  state: PunchButtonState;
  onClick: () => void;
  disabled?: boolean;
}

const punchIcons: Record<PunchType | "complete", React.ComponentType<{ className?: string }>> = {
  entry: LogIn,
  lunch_out: Coffee,
  lunch_return: Coffee,
  exit: LogOut,
  complete: CheckCircle,
};

export function PunchButton({
  nextPunch,
  state,
  onClick,
  disabled,
}: PunchButtonProps) {
  const Icon = punchIcons[nextPunch];
  const isComplete = nextPunch === "complete";
  const isLoading = state === "validating" || state === "registering";
  const isDisabled = disabled || isComplete || isLoading;

  const getButtonColor = () => {
    if (isComplete) return "bg-gray-200 text-gray-400 cursor-not-allowed";
    if (state === "confirmed") return "bg-green-500 text-white";
    if (state === "error") return "bg-red-500 text-white";
    return "bg-green-600 hover:bg-green-700 active:bg-green-800 text-white";
  };

  const getLabel = () => {
    if (state === "validating") return "Validando...";
    if (state === "registering") return "Registrando...";
    if (state === "confirmed") return "Registrado!";
    if (state === "error") return "Erro - Tente novamente";
    return PUNCH_TYPE_LABELS[nextPunch];
  };

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className={cn(
        "relative w-full rounded-2xl py-5 px-6 text-lg font-bold transition-all duration-200 shadow-lg",
        "focus:outline-none focus:ring-4 focus:ring-green-300",
        "flex items-center justify-center gap-3",
        getButtonColor()
      )}
    >
      {isLoading ? (
        <Loader2 className="h-6 w-6 animate-spin" />
      ) : state === "confirmed" ? (
        <CheckCircle className="h-6 w-6" />
      ) : (
        <Icon className="h-6 w-6" />
      )}
      <span>{getLabel()}</span>
    </button>
  );
}
