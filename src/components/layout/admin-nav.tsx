"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/funcionarios", label: "Funcionários", icon: "👥" },
  { href: "/registros", label: "Registros", icon: "📋" },
  { href: "/relatorios", label: "Relatórios", icon: "📄" },
  { href: "/ajustes", label: "Ajustes", icon: "✏️" },
  { href: "/configuracoes", label: "Configurações", icon: "⚙️" },
];

export default function AdminNav({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-amber-900 text-white flex-col">
        <div className="p-5 border-b border-amber-800">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🦎</span>
            <span className="font-bold text-xl">PontoApp</span>
          </div>
          <div className="text-xs text-amber-300">Admin: {userName}</div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${
                pathname === l.href || pathname.startsWith(l.href + "/")
                  ? "bg-amber-800 text-white font-semibold"
                  : "text-amber-100 hover:bg-amber-800"
              }`}
            >
              <span>{l.icon}</span> {l.label}
            </Link>
          ))}
        </nav>
        <button onClick={handleLogout} className="p-4 text-sm text-amber-300 hover:text-white flex items-center gap-2">
          🚪 Sair
        </button>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-amber-900 text-white flex lg:hidden z-50">
        {links.slice(0, 5).map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex-1 flex flex-col items-center py-2 text-xs gap-0.5 ${pathname === l.href ? "text-white font-semibold" : "text-amber-300"}`}
          >
            <span className="text-lg">{l.icon}</span>
            {l.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
