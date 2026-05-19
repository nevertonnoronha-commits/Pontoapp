"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/hours";
import { UserCircle, Mail, Clock, Briefcase, DollarSign, LogOut } from "lucide-react";

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  const initials = user?.name?.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase() || "?";

  return (
    <div className="px-4 py-6 space-y-5 max-w-sm mx-auto">
      {/* Avatar card */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
        <div className="w-20 h-20 bg-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-2xl font-bold text-white">{initials}</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">{user?.name}</h1>
        <p className="text-sm text-gray-500 mt-0.5">{profile?.job_title || "Funcionário"}</p>
      </div>

      {/* Info card */}
      <div className="bg-white rounded-2xl border border-gray-100 divide-y divide-gray-50">
        <div className="flex items-center gap-3 px-5 py-4">
          <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
            <Mail size={18} className="text-blue-500" />
          </div>
          <div className="min-w-0">
            <div className="text-xs text-gray-400">E-mail</div>
            <div className="text-sm font-medium text-gray-800 truncate">{user?.email}</div>
          </div>
        </div>

        {profile?.job_title && (
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center shrink-0">
              <Briefcase size={18} className="text-purple-500" />
            </div>
            <div>
              <div className="text-xs text-gray-400">Cargo</div>
              <div className="text-sm font-medium text-gray-800">{profile.job_title}</div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 px-5 py-4">
          <div className="w-9 h-9 bg-green-50 rounded-xl flex items-center justify-center shrink-0">
            <Clock size={18} className="text-green-600" />
          </div>
          <div>
            <div className="text-xs text-gray-400">Jornada diária</div>
            <div className="text-sm font-medium text-gray-800">{profile?.daily_hours || 8}h por dia</div>
          </div>
        </div>

        {profile?.salary ? (
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center shrink-0">
              <DollarSign size={18} className="text-amber-600" />
            </div>
            <div>
              <div className="text-xs text-gray-400">Salário</div>
              <div className="text-sm font-medium text-gray-800">{formatCurrency(profile.salary)}</div>
            </div>
          </div>
        ) : null}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-2xl py-3.5 font-medium text-sm transition-colors"
      >
        <LogOut size={18} />
        Sair da conta
      </button>
    </div>
  );
}
