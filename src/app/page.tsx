import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: userData } = await supabase
    .from("users").select("role").eq("id", user.id).single();

  const role = userData?.role || "employee";
  if (role === "admin" || role === "super_admin") redirect("/dashboard");
  redirect("/ponto");
}
