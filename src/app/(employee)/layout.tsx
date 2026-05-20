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
    <div className="min-h-screen bg-[#07080A] flex flex-col text-white relative">
      <div className="aurora-bg">
        <div className="aurora-glow-1" />
        <div className="aurora-glow-2" />
        <div className="aurora-glow-3" />
      </div>

      {/* Fixed thin top navbar */}
      <header className="fixed top-0 left-0 right-0 z-40 h-12 glass-panel flex items-center px-4 border-b border-white/[0.06]">
        <Logo size="xs" />
        <div className="flex items-center gap-2 ml-auto">
          <div className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse shrink-0" />
          <span className="text-xs font-semibold text-slate-300 truncate max-w-[140px]">
            {userData?.name || "Colaborador"}
          </span>
        </div>
      </header>

      <main className="flex-grow pt-12 pb-28 relative z-10 px-4 max-w-lg mx-auto w-full">
        {children}
      </main>

      <EmployeeNav />
    </div>
  );
}
