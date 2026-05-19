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
    <div className="min-h-screen bg-[#070a13] flex flex-col text-white relative">
      {/* Background Aurora Elements */}
      <div className="aurora-bg">
        <div className="aurora-glow-1"></div>
        <div className="aurora-glow-2"></div>
        <div className="aurora-glow-3"></div>
      </div>

      <header className="glass-panel px-5 py-4 flex items-center justify-between sticky top-0 z-40">
        <Logo size="sm" variant="light" />
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-xs text-slate-300 font-semibold bg-white/[0.04] border border-white/[0.08] px-3 py-1.5 rounded-full">
            {userData?.name || "Colaborador"}
          </span>
        </div>
      </header>

      <main className="flex-grow pb-24 relative z-10 px-4 pt-6 max-w-lg mx-auto w-full">
        {children}
      </main>

      <EmployeeNav />
    </div>
  );
}
