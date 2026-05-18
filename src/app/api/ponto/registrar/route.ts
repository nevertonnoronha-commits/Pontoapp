import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isWithinRadius } from "@/lib/geo";
import { calculateWorkday } from "@/lib/hours";
import { registerPunchSchema } from "@/lib/validations";
import type { PunchType } from "@/types";

const PUNCH_SEQUENCE: PunchType[] = ["entry", "lunch_out", "lunch_return", "exit"];

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const body = await req.json();
  const parsed = registerPunchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const { punch_type, gps_latitude, gps_longitude, gps_accuracy_meters, wifi_confirmed, wifi_ssid_reported, face_verified, face_similarity } = parsed.data;

  const { data: userData } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
  if (!userData) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  const { data: config } = await supabase.from("store_configs").select("*").eq("organization_id", userData.organization_id).single();
  if (!config) return NextResponse.json({ error: "Configuração da loja não encontrada." }, { status: 404 });

  let gps_verified = false;
  let gps_distance_meters = null;

  if (gps_latitude && gps_longitude) {
    const { isValid, distance } = isWithinRadius(gps_latitude, gps_longitude, config.gps_latitude, config.gps_longitude, config.gps_radius_meters);
    gps_verified = isValid;
    gps_distance_meters = distance;
    if (!isValid) {
      return NextResponse.json({ error: `Você está fora da área permitida (${distance}m do local, máximo: ${config.gps_radius_meters}m).` }, { status: 403 });
    }
  }

  const today = new Date().toLocaleDateString("sv-SE");
  const { data: todayRecords } = await supabase
    .from("time_records")
    .select("punch_type, recorded_at")
    .eq("user_id", user.id)
    .gte("recorded_at", today + "T00:00:00")
    .order("recorded_at", { ascending: false })
    .limit(10);

  const lastPunch = todayRecords?.[0]?.punch_type as PunchType | undefined;
  const lastIdx = lastPunch ? PUNCH_SEQUENCE.indexOf(lastPunch) : -1;
  const nextIdx = lastIdx + 1;

  if (nextIdx >= PUNCH_SEQUENCE.length) {
    return NextResponse.json({ error: "Jornada já concluída hoje." }, { status: 400 });
  }

  if (PUNCH_SEQUENCE[nextIdx] !== punch_type) {
    const expected = PUNCH_SEQUENCE[nextIdx];
    const labels: Record<PunchType, string> = { entry: "Entrada", lunch_out: "Saída para Almoço", lunch_return: "Retorno do Almoço", exit: "Saída Final" };
    return NextResponse.json({ error: `Ação inválida. O próximo registro deve ser: ${labels[expected]}.` }, { status: 400 });
  }

  let status = "valid";
  if (!gps_verified || !wifi_confirmed) status = "suspicious";

  const service = await createServiceClient();
  const { data: record, error: insertError } = await service
    .from("time_records")
    .insert({
      user_id: user.id,
      organization_id: userData.organization_id,
      punch_type,
      gps_latitude,
      gps_longitude,
      gps_accuracy_meters,
      gps_distance_meters,
      gps_verified,
      wifi_confirmed,
      wifi_ssid_reported,
      face_verified,
      face_similarity,
      ip_address: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip"),
      user_agent: req.headers.get("user-agent"),
      status,
    })
    .select()
    .single();

  if (insertError) return NextResponse.json({ error: "Erro ao registrar ponto." }, { status: 500 });

  await recalcWorkday(service, user.id, userData.organization_id, today);

  await service.from("audit_logs").insert({
    organization_id: userData.organization_id,
    user_id: user.id,
    action: "punch_registered",
    entity_type: "time_records",
    entity_id: record.id,
    new_values: { punch_type, gps_verified, wifi_confirmed },
    ip_address: req.headers.get("x-forwarded-for") || null,
  });

  return NextResponse.json({ success: true, record });
}

async function recalcWorkday(service: Awaited<ReturnType<typeof createServiceClient>>, userId: string, orgId: string, date: string) {
  const { data: records } = await service
    .from("time_records")
    .select("punch_type, recorded_at")
    .eq("user_id", userId)
    .gte("recorded_at", date + "T00:00:00")
    .order("recorded_at", { ascending: true });

  if (!records) return;

  const get = (type: PunchType) => records.find((r) => r.punch_type === type)?.recorded_at || null;
  const entry = get("entry");
  const lunchOut = get("lunch_out");
  const lunchReturn = get("lunch_return");
  const exit = get("exit");

  const { data: profile } = await service.from("employee_profiles").select("*").eq("user_id", userId).single();
  const dailyHours = profile?.daily_hours || 8;
  const salary = profile?.salary || 0;
  const monthlyHours = profile?.monthly_hours || 176;

  const calc = calculateWorkday(entry, lunchOut, lunchReturn, exit, dailyHours, salary, monthlyHours);

  await service.from("workday_summaries").upsert({
    user_id: userId,
    organization_id: orgId,
    work_date: date,
    entry_time: entry,
    lunch_out_time: lunchOut,
    lunch_return_time: lunchReturn,
    exit_time: exit,
    hours_worked: calc.hours_worked,
    hours_expected: dailyHours,
    overtime_hours: calc.overtime_hours,
    bank_balance: calc.bank_balance,
    overtime_value: calc.overtime_value,
    is_complete: !!exit,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,work_date" });
}
