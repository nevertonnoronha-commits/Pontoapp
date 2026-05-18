"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/ponto", label: "Ponto", icon: "🏠" },
  { href: "/historico", label: "Histórico", icon: "📋" },
  { href: "/perfil", label: "Perfil", icon: "👤" },
];

export default function EmployeeNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex">
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`flex-1 flex flex-col items-center py-3 text-xs gap-1 transition-colors ${
            pathname === l.href ? "text-green-700 font-semibold" : "text-gray-500"
          }`}
        >
          <span className="text-xl">{l.icon}</span>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
