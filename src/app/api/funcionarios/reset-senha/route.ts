import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { data: adminData } = await supabase.from("users").select("role").eq("id", user.id).single();
  if (adminData?.role === "employee") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const { user_id, nova_senha } = await req.json();
  if (!user_id || !nova_senha || nova_senha.length < 6) {
    return NextResponse.json({ error: "user_id e nova_senha (mín. 6 chars) são obrigatórios." }, { status: 400 });
  }

  const service = await createServiceClient();
  const { error } = await service.auth.admin.updateUserById(user_id, { password: nova_senha });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
