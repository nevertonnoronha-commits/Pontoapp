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
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 flex z-50">
      {links.map((l) => {
        const Icon = l.icon;
        const active = pathname === l.href;
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`flex-1 flex flex-col items-center py-3 gap-1 transition-colors ${
              active ? "text-green-700" : "text-gray-400"
            }`}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
            <span className={`text-[11px] leading-none ${active ? "font-semibold" : ""}`}>
              {l.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
