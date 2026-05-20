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
    <div className="min-h-screen bg-[#07080A] flex flex-col lg:flex-row text-white relative">
      <div className="aurora-bg">
        <div className="aurora-glow-1"></div>
        <div className="aurora-glow-2"></div>
        <div className="aurora-glow-3"></div>
      </div>

      <AdminNav userName={userData?.name || ""} />

      <div className="flex-1 flex flex-col lg:ml-64 min-w-0">
        <main className="flex-1 px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-8 relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
}
