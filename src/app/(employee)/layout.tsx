import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EmployeeNav from "@/components/layout/employee-nav";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: userData } = await supabase
    .from("users").select("name, role").eq("id", user.id).single();

  if (userData?.role === "admin" || userData?.role === "super_admin") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-green-700 text-white px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🦎</span>
          <span className="font-bold text-lg">PontoApp</span>
        </div>
        <span className="text-sm opacity-90">{userData?.name}</span>
      </header>
      <main className="flex-1 pb-20">{children}</main>
      <EmployeeNav />
    </div>
  );
}
