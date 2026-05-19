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
    <div className="min-h-screen bg-[#070a13] flex flex-col lg:flex-row text-white relative">
      {/* Background Aurora Elements */}
      <div className="aurora-bg">
        <div className="aurora-glow-1"></div>
        <div className="aurora-glow-2"></div>
        <div className="aurora-glow-3"></div>
      </div>

      <AdminNav userName={userData?.name || ""} />
      
      <div className="flex-1 flex flex-col lg:ml-64 min-w-0">
        {/* Mobile header */}
        <header className="glass-panel text-white px-5 py-4 lg:hidden flex items-center justify-between sticky top-0 z-40">
          <Logo size="sm" variant="light" />
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-xs text-slate-300 font-semibold bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 rounded-full">
              {userData?.name}
            </span>
          </div>
        </header>
        
        <main className="flex-1 px-4 py-6 pb-24 lg:px-8 lg:py-8 lg:pb-8 relative z-10">
          {children}
        </main>
      </div>
    </div>
  );
}
