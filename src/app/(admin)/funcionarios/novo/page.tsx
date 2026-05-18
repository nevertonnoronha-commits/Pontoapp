import { createClient } from "@/lib/supabase/server";
import { EmployeeForm } from "@/components/admin/employee-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function NovoFuncionarioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: adminData } = await supabase
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .single();

  if (!adminData) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/funcionarios"
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Novo Funcionário</h1>
          <p className="text-gray-500 mt-0.5">
            Preencha os dados para criar o funcionário
          </p>
        </div>
      </div>

      <EmployeeForm
        organizationId={adminData.organization_id}
        employee={null}
      />
    </div>
  );
}
