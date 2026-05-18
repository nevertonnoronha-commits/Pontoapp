import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { formatCurrency } from "@/lib/hours";

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Funcionários</h1>
        <Link href="/funcionarios/novo" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
          + Novo Funcionário
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {(!employees || employees.length === 0) ? (
          <div className="p-8 text-center text-gray-500">Nenhum funcionário cadastrado.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {employees.map((emp) => {
              const profile = Array.isArray(emp.employee_profiles) ? emp.employee_profiles[0] : emp.employee_profiles;
              return (
                <div key={emp.id} className="flex items-center justify-between px-5 py-4">
                  <div>
                    <div className="font-medium text-gray-800">{emp.name}</div>
                    <div className="text-sm text-gray-500">{profile?.job_title || "Sem cargo"} · {emp.email}</div>
                    <div className="text-xs text-gray-400 mt-0.5">
                      {profile ? `${profile.daily_hours}h/dia · ${formatCurrency(profile.salary)}` : "Perfil incompleto"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${emp.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {emp.is_active ? "Ativo" : "Inativo"}
                    </span>
                    <Link href={`/funcionarios/${emp.id}`} className="text-sm text-green-700 hover:underline">Editar</Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
