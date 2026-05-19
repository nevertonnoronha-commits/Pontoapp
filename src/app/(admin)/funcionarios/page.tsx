import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatCurrency } from "@/lib/hours";
import { UserPlus, Users, ChevronRight, Briefcase } from "lucide-react";

export default async function FuncionariosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: adminData } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
  const { data: employees } = await supabase
    .from("users")
    .select("*, employee_profiles(*)")
    .eq("organization_id", adminData?.organization_id)
    .eq("role", "employee")
    .order("name");

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Funcionários</h1>
          <p className="text-sm text-gray-500 mt-0.5">{employees?.length || 0} cadastrados</p>
        </div>
        <Link
          href="/funcionarios/novo"
          className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <UserPlus size={16} />
          Novo Funcionário
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {(!employees || employees.length === 0) ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users size={32} className="text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">Nenhum funcionário cadastrado</p>
            <p className="text-gray-400 text-sm mt-1">Adicione o primeiro funcionário para começar.</p>
            <Link
              href="/funcionarios/novo"
              className="mt-4 inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
            >
              <UserPlus size={16} />
              Adicionar funcionário
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {employees.map((emp) => {
              const profile = Array.isArray(emp.employee_profiles) ? emp.employee_profiles[0] : emp.employee_profiles;
              const initials = emp.name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() || "?";
              return (
                <Link
                  key={emp.id}
                  href={`/funcionarios/${emp.id}`}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors group"
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-semibold text-sm ${
                    emp.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                  }`}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800 truncate">{emp.name}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                        emp.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {emp.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                      {profile?.job_title && (
                        <>
                          <span className="flex items-center gap-1">
                            <Briefcase size={11} />
                            {profile.job_title}
                          </span>
                          <span>·</span>
                        </>
                      )}
                      <span className="truncate">{emp.email}</span>
                    </div>
                    {profile && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        {profile.daily_hours}h/dia · {formatCurrency(profile.salary)}
                      </div>
                    )}
                  </div>
                  <ChevronRight size={18} className="text-gray-300 group-hover:text-gray-400 transition-colors shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
