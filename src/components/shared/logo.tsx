import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  showText?: boolean;
  variant?: "dark" | "light";
}

export function Logo({ size = "md", className, showText = true, variant = "dark" }: LogoProps) {
  const sizes = { sm: 28, md: 40, lg: 56 };
  const textSizes = { sm: "text-base", md: "text-xl", lg: "text-3xl" };
  const s = sizes[size];
  const textColor = variant === "light" ? "text-white" : "text-green-700";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <svg width={s} height={s} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" aria-label="PontoApp logo">
        {/* Body */}
        <ellipse cx="20" cy="22" rx="13" ry="9" fill={variant === "light" ? "white" : "#16a34a"} />
        {/* Head */}
        <ellipse cx="31" cy="17" rx="7" ry="5.5" fill={variant === "light" ? "white" : "#16a34a"} />
        {/* Eye */}
        <circle cx="34" cy="15" r="2.5" fill={variant === "light" ? "#16a34a" : "white"} />
        <circle cx="34.8" cy="14.5" r="1" fill={variant === "light" ? "white" : "#16a34a"} />
        {/* Tail */}
        <path d="M7 22 Q2 26 4 31 Q6 35 9 32 Q10 28 8 26" fill={variant === "light" ? "white" : "#16a34a"} />
        {/* Legs */}
        <path d="M14 29 L12 36 M20 30 L19 37 M26 29 L28 36" stroke={variant === "light" ? "white" : "#15803d"} strokeWidth="2" strokeLinecap="round"/>
        {/* Spots */}
        <circle cx="16" cy="21" r="2" fill={variant === "light" ? "rgba(22,163,74,0.4)" : "rgba(255,255,255,0.3)"} />
        <circle cx="22" cy="20" r="1.5" fill={variant === "light" ? "rgba(22,163,74,0.4)" : "rgba(255,255,255,0.3)"} />
      </svg>
      {showText && (
        <span className={cn("font-bold tracking-tight", textSizes[size], textColor)}>
          PontoApp
        </span>
      )}
    </div>
  );
}
