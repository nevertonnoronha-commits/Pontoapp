import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { storeConfigSchema } from "@/lib/validations";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { data: userData } = await supabase.from("users").select("organization_id").eq("id", user.id).maybeSingle();
  if (!userData?.organization_id) return NextResponse.json({});

  const { data } = await supabase.from("store_configs").select("*").eq("organization_id", userData.organization_id).maybeSingle();
  return NextResponse.json(data || {});
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { data: userData } = await supabase.from("users").select("organization_id, role").eq("id", user.id).maybeSingle();
  if (!userData) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });
  if (userData.role === "employee") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const body = await req.json();
  const parsed = storeConfigSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.errors[0]?.message || "Dados inválidos." }, { status: 400 });

  const service = await createServiceClient();
  const { data: existing } = await service.from("store_configs").select("id").eq("organization_id", userData.organization_id).maybeSingle();

  if (existing) {
    const { error } = await service.from("store_configs").update({
      ...parsed.data,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    }).eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await service.from("store_configs").insert({
      ...parsed.data,
      organization_id: userData.organization_id,
      updated_by: user.id,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
