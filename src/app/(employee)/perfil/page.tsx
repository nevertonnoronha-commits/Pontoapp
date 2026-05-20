"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/hours";
import { Mail, Clock, Briefcase, DollarSign, LogOut, Loader2 } from "lucide-react";

export default function PerfilPage() {
  const [user, setUser] = useState<{ name: string; email: string; role: string } | null>(null);
  const [profile, setProfile] = useState<{ salary: number; daily_hours: number; job_title: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data: u } = await supabase.from("users").select("name, email, role").eq("id", authUser.id).single();
      const { data: p } = await supabase.from("employee_profiles").select("salary, daily_hours, job_title").eq("user_id", authUser.id).maybeSingle();
      setUser(u);
      setProfile(p);
      setLoading(false);
    }
    load();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mx-auto" />
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  const initials = user?.name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "?";

  return (
    <div className="px-1 py-2 space-y-6 max-w-sm mx-auto">
      {/* Avatar card */}
      <div className="glass-card rounded-3xl p-6 text-center border border-white/[0.08] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none"></div>
        <div className="w-20 h-20 bg-gradient-to-tr from-emerald-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-[0_4px_20px_rgba(16,185,129,0.3)]">
          <span className="text-2xl font-extrabold text-white tracking-wide">{initials}</span>
        </div>
        <h1 className="text-xl font-bold text-white tracking-tight">{user?.name}</h1>
        <p className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">{profile?.job_title || "Colaborador"}</p>
      </div>

      {/* Info card */}
      <div className="glass-card rounded-3xl border border-white/[0.08] divide-y divide-white/[0.05] overflow-hidden">
        <div className="flex items-center gap-4 px-5 py-4">
          <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl flex items-center justify-center shrink-0">
            <Mail size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">E-mail</div>
            <div className="text-sm font-semibold text-slate-200 truncate mt-0.5">{user?.email}</div>
          </div>
        </div>

        {profile?.job_title && (
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center shrink-0">
              <Briefcase size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Cargo</div>
              <div className="text-sm font-semibold text-slate-200 mt-0.5">{profile.job_title}</div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-4 px-5 py-4">
          <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
            <Clock size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Jornada Diária</div>
            <div className="text-sm font-semibold text-slate-200 mt-0.5">{profile?.daily_hours || 8}h por dia</div>
          </div>
        </div>

        {profile?.salary ? (
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="w-10 h-10 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl flex items-center justify-center shrink-0">
              <DollarSign size={18} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Salário</div>
              <div className="text-sm font-semibold text-slate-200 mt-0.5">{formatCurrency(profile.salary)}</div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 bg-rose-500/10 border border-rose-500/20 text-rose-300 hover:bg-rose-500/20 rounded-2xl py-3.5 font-bold text-xs tracking-wider uppercase transition-all duration-300 shadow-md hover:scale-[1.01] cursor-pointer"
      >
        <LogOut size={16} />
        Sair da Conta
      </button>
    </div>
  );
}
