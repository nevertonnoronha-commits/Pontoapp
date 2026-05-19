"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock, CalendarDays, UserCircle } from "lucide-react";

const links = [
  { href: "/ponto", label: "Ponto", icon: Clock },
  { href: "/historico", label: "Histórico", icon: CalendarDays },
  { href: "/perfil", label: "Perfil", icon: UserCircle },
];

export default function EmployeeNav() {
  const pathname = usePathname();
  return (
    <div className="fixed bottom-6 left-0 right-0 px-4 flex justify-center z-50 pointer-events-none">
      <nav className="w-full max-w-sm glass-card rounded-2xl flex items-center justify-around py-2.5 px-3 border border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.6)] pointer-events-auto">
        {links.map((l) => {
          const Icon = l.icon;
          const active = pathname === l.href;
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 gap-1.5 transition-all duration-300 relative rounded-xl ${
                active ? "text-emerald-400 scale-105" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {active && (
                <span className="absolute -top-1.5 w-8 h-[3px] bg-gradient-to-r from-emerald-400 to-teal-400 rounded-full shadow-[0_0_12px_rgba(52,211,153,0.6)] animate-pulse"></span>
              )}
              <Icon size={22} strokeWidth={active ? 2.3 : 1.8} className="transition-transform duration-300" />
              <span className={`text-[10px] tracking-wider uppercase font-semibold leading-none ${active ? "text-emerald-400" : "text-slate-400"}`}>
                {l.label}
              </span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
