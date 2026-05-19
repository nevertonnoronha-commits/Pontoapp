import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import EmployeeNav from "@/components/layout/employee-nav";
import { Logo } from "@/components/shared/logo";

export default async function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: userData } = await supabase
    .from("users").select("name, role").eq("id", user.id).single();

  if (userData?.role === "admin" || userData?.role === "super_admin") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-green-700 text-white px-5 py-3.5 flex items-center justify-between sticky top-0 z-40">
        <Logo size="sm" variant="light" />
        <span className="text-sm text-green-100/80 font-medium">{userData?.name}</span>
      </header>
      <main className="flex-1 pb-20">{children}</main>
      <EmployeeNav />
    </div>
  );
}
