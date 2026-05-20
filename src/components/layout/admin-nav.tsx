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
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-[#0a1122]/65 backdrop-blur-xl border-r border-white/[0.06] flex-col z-30 shadow-[4px_0_24px_rgba(0,0,0,0.3)]">
        <div className="px-4 py-5 border-b border-white/[0.06] flex flex-col items-center text-center">
          <Logo size="md" variant="light" />
          <div className="mt-3 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse shrink-0"></div>
            <span className="text-xs text-slate-300 font-semibold truncate">{userName}</span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {links.map((l) => {
            const Icon = l.icon;
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all duration-300 relative ${
                  active
                    ? "bg-gradient-to-r from-yellow-500/10 to-transparent border-l-2 border-yellow-500 text-yellow-400 font-semibold"
                    : "text-slate-400 hover:bg-white/[0.03] hover:text-slate-200"
                }`}
              >
                <Icon
                  size={18}
                  className={`transition-colors duration-300 ${
                    active ? "text-yellow-400" : "text-slate-400"
                  }`}
                />
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/[0.06]">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold border border-rose-500/20 text-rose-400 bg-rose-500/5 hover:bg-rose-500/10 hover:text-rose-300 transition-all duration-300"
          >
            <LogOut size={16} />
            Sair da conta
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <div className="fixed bottom-6 left-0 right-0 px-4 flex justify-center lg:hidden z-50 pointer-events-none safe-area-pb">
        <nav className="w-full max-w-sm glass-card rounded-2xl flex items-center py-2 px-2 border border-white/[0.08] shadow-[0_12px_40px_rgba(0,0,0,0.6)] pointer-events-auto relative">
          {links.slice(0, 4).map((l) => {
            const Icon = l.icon;
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex-1 flex flex-col items-center justify-center py-2 gap-1 transition-all duration-300 relative rounded-xl ${
                  active ? "scale-105" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {active && (
                  <span className="absolute -top-2 w-6 h-[3px] bg-gradient-to-r from-yellow-400 to-yellow-300 rounded-full shadow-[0_0_10px_rgba(234,179,8,0.7)] animate-pulse" />
                )}
                <Icon size={22} strokeWidth={active ? 2.2 : 1.7} className={active ? "text-yellow-400" : ""} />
                <span className={`text-[9px] uppercase font-semibold leading-none tracking-wide ${active ? "text-yellow-400" : "text-slate-500"}`}>
                  {l.label.split(" ")[0]}
                </span>
              </Link>
            );
          })}

          {/* Mais */}
          <div className="flex-1 relative flex flex-col items-center justify-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`w-full flex flex-col items-center justify-center py-2 gap-1 transition-all duration-300 rounded-xl ${
                mobileMenuOpen ? "text-yellow-400 scale-105" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {mobileMenuOpen ? <X size={22} strokeWidth={2.2} /> : <Menu size={22} strokeWidth={1.7} />}
              <span className="text-[9px] uppercase font-semibold leading-none tracking-wide">Mais</span>
            </button>

            {mobileMenuOpen && (
              <div className="absolute bottom-full right-0 bg-[#0c1324]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.6)] overflow-hidden w-52 mb-3 p-1.5 animate-in fade-in slide-in-from-bottom-2 duration-200">
                <Link href="/ajustes" onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 rounded-xl hover:bg-white/[0.05] hover:text-white transition-colors">
                  <PenLine size={16} /> Ajustes
                </Link>
                <Link href="/configuracoes" onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 text-sm text-slate-300 rounded-xl hover:bg-white/[0.05] hover:text-white transition-colors">
                  <Settings size={16} /> Configurações
                </Link>
                <div className="my-1 border-t border-white/[0.06]" />
                <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-rose-400 rounded-xl hover:bg-rose-500/10 transition-colors text-left font-medium">
                  <LogOut size={16} /> Sair da conta
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>
    </>
  );
}
