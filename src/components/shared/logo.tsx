import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  size?: "xs" | "sm" | "md" | "lg";
  className?: string;
  // kept for backward compat, no longer used (text is in the image)
  showText?: boolean;
  variant?: "dark" | "light";
}

export function Logo({ size = "md", className }: LogoProps) {
  const dims = { xs: 64, sm: 100, md: 140, lg: 180 };
  const d = dims[size as keyof typeof dims] ?? 100;

  return (
    <div className={cn("flex items-center", className)}>
      <Image
        src="/camaleao-logo.png"
        alt="Camaleão"
        width={d}
        height={d}
        className="object-contain"
        priority
        unoptimized
      />
    </div>
  );
}
