import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { data: userData } = await supabase.from("users").select("organization_id, role").eq("id", user.id).single();
  if (userData?.role === "employee") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const params = req.nextUrl.searchParams;
  const employeeId = params.get("employee");
  const year = params.get("year");
  const month = params.get("month");

  if (!employeeId || !year || !month) return NextResponse.json({ error: "Parâmetros obrigatórios: employee, year, month." }, { status: 400 });

  const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
  const from = `${year}-${String(month).padStart(2, "0")}-01`;
  const to = `${year}-${String(month).padStart(2, "0")}-${lastDay}`;

  const { data: workdays } = await supabase
    .from("workday_summaries").select("*")
    .eq("user_id", employeeId).eq("organization_id", userData?.organization_id)
    .gte("work_date", from).lte("work_date", to).order("work_date");

  const { data: employee } = await supabase.from("users").select("id, name, email").eq("id", employeeId).single();
  const { data: profile } = await supabase.from("employee_profiles").select("*").eq("user_id", employeeId).single();

  return NextResponse.json({ workdays: workdays || [], employee, profile });
}
