import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  showText?: boolean;
}

export function Logo({ size = "md", className, showText = true }: LogoProps) {
  const sizeClasses = {
    sm: "text-2xl",
    md: "text-4xl",
    lg: "text-6xl",
  };

  const textSizeClasses = {
    sm: "text-lg",
    md: "text-2xl",
    lg: "text-4xl",
  };

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <span className={sizeClasses[size]} role="img" aria-label="Camaleão">
        🦎
      </span>
      {showText && (
        <span
          className={cn(
            "font-bold text-green-600",
            textSizeClasses[size]
          )}
        >
          PontoApp
        </span>
      )}
    </div>
  );
}
