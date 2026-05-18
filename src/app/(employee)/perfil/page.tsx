"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/hours";

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
      const { data: p } = await supabase.from("employee_profiles").select("salary, daily_hours, job_title").eq("user_id", authUser.id).single();
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

  if (loading) return <div className="p-6 text-center text-gray-500">Carregando...</div>;

  return (
    <div className="px-4 py-6 space-y-6">
      <h1 className="text-xl font-bold text-gray-800">Meu Perfil</h1>
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <div className="text-center mb-4">
          <div className="text-5xl mb-2">👤</div>
          <div className="font-bold text-xl text-gray-800">{user?.name}</div>
          <div className="text-sm text-gray-500">{profile?.job_title || "Funcionário"}</div>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">E-mail:</span><div className="font-medium text-gray-800 break-all">{user?.email}</div></div>
          <div><span className="text-gray-500">Jornada:</span><div className="font-medium text-gray-800">{profile?.daily_hours}h/dia</div></div>
          {profile?.salary ? <div><span className="text-gray-500">Salário:</span><div className="font-medium text-gray-800">{formatCurrency(profile.salary)}</div></div> : null}
        </div>
      </div>
      <button onClick={handleLogout} className="w-full bg-red-50 border border-red-200 text-red-700 rounded-xl py-3 font-medium">
        Sair da conta
      </button>
    </div>
  );
}
