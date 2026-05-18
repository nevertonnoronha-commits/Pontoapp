import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { data: userData } = await supabase.from("users").select("organization_id, role").eq("id", user.id).single();
  if (!userData) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  const params = req.nextUrl.searchParams;
  let query = supabase.from("time_records").select("*, user:users(name, email)")
    .eq("organization_id", userData.organization_id)
    .order("recorded_at", { ascending: false }).limit(200);

  const from = params.get("from");
  const to = params.get("to");
  const employeeId = params.get("employee");

  if (from) query = query.gte("recorded_at", from + "T00:00:00");
  if (to) query = query.lte("recorded_at", to + "T23:59:59");
  if (employeeId) query = query.eq("user_id", employeeId);
  else if (userData.role === "employee") query = query.eq("user_id", user.id);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "Erro ao buscar registros." }, { status: 500 });
  return NextResponse.json(data);
}

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { data: userData } = await supabase.from("users").select("organization_id, role").eq("id", user.id).single();
  if (userData?.role === "employee") return NextResponse.json({ error: "Sem permissão." }, { status: 403 });

  const { id, recorded_at, edit_reason } = await req.json();
  if (!id || !recorded_at || !edit_reason) return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });

  const { data: existing } = await supabase.from("time_records").select("recorded_at").eq("id", id).single();

  const service = await createServiceClient();
  const { error } = await service.from("time_records").update({
    recorded_at,
    is_manual_edit: true,
    edited_by: user.id,
    edit_reason,
    original_recorded_at: existing?.recorded_at,
    status: "manual",
  }).eq("id", id);

  if (error) return NextResponse.json({ error: "Erro ao atualizar registro." }, { status: 500 });

  await service.from("audit_logs").insert({
    organization_id: userData?.organization_id,
    user_id: user.id,
    action: "record_manually_adjusted",
    entity_type: "time_records",
    entity_id: id,
    old_values: { recorded_at: existing?.recorded_at },
    new_values: { recorded_at, edit_reason },
  });

  return NextResponse.json({ success: true });
}
