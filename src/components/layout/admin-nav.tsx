"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/shared/logo";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  FileText,
  PenLine,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";

const links = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/funcionarios", label: "Funcionários", icon: Users },
  { href: "/registros", label: "Registros", icon: ClipboardList },
  { href: "/relatorios", label: "Relatórios", icon: FileText },
  { href: "/ajustes", label: "Ajustes", icon: PenLine },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export default function AdminNav({ userName }: { userName: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-amber-900 text-white flex-col">
        <div className="px-5 py-5 border-b border-amber-800/60">
          <Logo size="md" variant="light" />
          <div className="text-xs text-amber-300/80 mt-2 pl-0.5">Admin: {userName}</div>
        </div>

        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {links.map((l) => {
            const Icon = l.icon;
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-white/10 text-white font-semibold"
                    : "text-amber-100/80 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Icon size={18} className={active ? "text-amber-300" : "text-amber-400/70"} />
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-amber-800/60">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-amber-200/70 hover:bg-white/5 hover:text-white transition-colors"
          >
            <LogOut size={18} />
            Sair da conta
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-amber-900 border-t border-amber-800/60 flex lg:hidden z-50 safe-area-pb">
        {links.slice(0, 5).map((l) => {
          const Icon = l.icon;
          const active = pathname === l.href || pathname.startsWith(l.href + "/");
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex-1 flex flex-col items-center py-2 gap-0.5 transition-colors ${
                active ? "text-white" : "text-amber-400"
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 1.8} />
              <span className={`text-[9px] leading-none ${active ? "font-semibold" : ""}`}>
                {l.label}
              </span>
            </Link>
          );
        })}
        {/* Mobile menu button */}
        <div className="relative flex-1">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className={`w-full flex flex-col items-center py-2 gap-0.5 transition-colors ${
              mobileMenuOpen ? "text-white" : "text-amber-400"
            }`}
          >
            {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            <span className="text-[9px] leading-none font-semibold">Menu</span>
          </button>

          {/* Dropdown menu */}
          {mobileMenuOpen && (
            <div className="absolute bottom-full right-0 bg-amber-900 border border-amber-800/60 rounded-lg shadow-lg overflow-hidden w-48 mb-1">
              <Link
                href="/configuracoes"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-sm text-amber-100 hover:bg-white/10 border-b border-amber-800/60"
              >
                <Settings size={16} />
                Configurações
              </Link>
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-amber-200/70 hover:bg-white/10 transition-colors text-left"
              >
                <LogOut size={16} />
                Sair da conta
              </button>
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
