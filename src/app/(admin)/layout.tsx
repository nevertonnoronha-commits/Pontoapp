import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/layout/admin-nav";
import { Logo } from "@/components/shared/logo";

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
        {/* Mobile header */}
        <header className="bg-amber-900 text-white px-4 py-2.5 lg:hidden flex items-center justify-between">
          <Logo size="sm" variant="light" />
          <span className="text-xs text-amber-200/80">{userData?.name}</span>
        </header>
        <main className="flex-1 px-4 py-4 pb-20 lg:px-8 lg:py-6 lg:pb-8">{children}</main>
      </div>
    </div>
  );
}
