import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { data: adminData } = await supabase.from("users").select("organization_id, role").eq("id", user.id).single();
  if (adminData?.role === "employee") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const { name, email, password, job_title, salary, daily_hours, monthly_hours, compensation_type, lunch_break_minutes, admission_date, is_active } = await req.json();

  if (!password || password.length < 6) {
    return NextResponse.json({ error: "Senha obrigatória (mínimo 6 caracteres)." }, { status: 400 });
  }

  const service = await createServiceClient();

  const { data: authUser, error: authError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (authError) return NextResponse.json({ error: `Erro ao criar usuário: ${authError.message}` }, { status: 400 });

  await service.from("users").insert({
    id: authUser.user.id,
    organization_id: adminData?.organization_id,
    name,
    email,
    role: "employee",
    is_active,
  });

  await service.from("employee_profiles").insert({
    user_id: authUser.user.id,
    organization_id: adminData?.organization_id,
    job_title,
    salary: parseFloat(salary),
    daily_hours: parseFloat(daily_hours),
    monthly_hours: parseFloat(monthly_hours),
    compensation_type,
    lunch_break_minutes: parseInt(lunch_break_minutes),
    admission_date: admission_date || null,
  });

  return NextResponse.json({ success: true, userId: authUser.user.id });
}

export async function PUT(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { data: adminData } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (adminData?.role === "employee") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const { id, name, job_title, salary, daily_hours, monthly_hours, compensation_type, lunch_break_minutes, admission_date, is_active } = await req.json();

  const service = await createServiceClient();

  await service.from("users").update({ name, is_active, updated_at: new Date().toISOString() }).eq("id", id);
  await service.from("employee_profiles").upsert({
    user_id: id,
    job_title,
    salary: parseFloat(salary),
    daily_hours: parseFloat(daily_hours),
    monthly_hours: parseFloat(monthly_hours),
    compensation_type,
    lunch_break_minutes: parseInt(lunch_break_minutes),
    admission_date: admission_date || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });

  return NextResponse.json({ success: true });
}
