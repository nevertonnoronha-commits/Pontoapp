import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createServiceClient();
  const body = await req.json().catch(() => ({}));
  const userId = body.userId as string;
  const email = body.email as string;
  const name = body.name || "Funcionário Teste";

  if (!userId || !email) {
    return NextResponse.json({ error: "userId e email são obrigatórios" }, { status: 400 });
  }

  try {
    // 1. Criar usuário no banco
    const { error: userError } = await supabase
      .from("users")
      .insert({
        id: userId,
        organization_id: "a9d801a7-7953-4508-97a3-6a87ad130036",
        name,
        email,
        role: "employee",
        is_active: true,
      });

    if (userError) {
      return NextResponse.json({ error: userError.message }, { status: 400 });
    }

    // 2. Criar perfil
    const { error: profileError } = await supabase
      .from("employee_profiles")
      .insert({
        user_id: userId,
        organization_id: "a9d801a7-7953-4508-97a3-6a87ad130036",
        job_title: "Funcionário",
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
      message: "Funcionário criado com sucesso!",
      user: { id: userId, email, name },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erro desconhecido" },
      { status: 500 }
    );
  }
}
