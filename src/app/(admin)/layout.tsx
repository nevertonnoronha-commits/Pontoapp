import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/layout/admin-nav";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: userData } = await supabase
    .from("users").select("name, role").eq("id", user.id).single();

  if (userData?.role === "employee") redirect("/ponto");

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminNav userName={userData?.name || ""} />
      <div className="flex-1 flex flex-col lg:ml-64">
        <header className="bg-white border-b border-gray-200 px-6 py-4 lg:hidden flex items-center gap-2">
          <span className="text-2xl">🦎</span>
          <span className="font-bold text-green-700">PontoApp Admin</span>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
