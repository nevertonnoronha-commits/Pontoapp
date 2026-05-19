import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createServiceClient();

  try {
    // 1. Criar usuário no auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: "joao@example.com",
      password: "Teste@123456",
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const userId = authData.user.id;

    // 2. Criar usuário no banco
    const { error: userError } = await supabase
      .from("users")
      .insert({
        id: userId,
        organization_id: "a9d801a7-7953-4508-97a3-6a87ad130036",
        name: "João Teste",
        email: "joao@example.com",
        role: "employee",
        is_active: true,
      });

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 400 });
    }

    // 3. Criar perfil
    const { error: profileError } = await supabase
      .from("employee_profiles")
      .insert({
        user_id: userId,
        organization_id: "a9d801a7-7953-4508-97a3-6a87ad130036",
        job_title: "Vendedor",
        salary: 2500,
        daily_hours: 8,
        monthly_hours: 220,
        compensation_type: "payment",
        lunch_break_minutes: 60,
        admission_date: new Date().toISOString().split("T")[0],
      });

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Funcionário de teste criado com sucesso!",
      user: {
        id: userId,
        email: "joao@example.com",
        password: "Teste@123456",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}
