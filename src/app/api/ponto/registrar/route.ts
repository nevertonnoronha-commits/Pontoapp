import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isWithinRadius } from "@/lib/geo";
import { calculateWorkday } from "@/lib/hours";
import { registerPunchSchema } from "@/lib/validations";
import type { PunchType } from "@/types";

// Maps punch type to "in" or "out" for alternation validation
const PUNCH_DIRECTION: Record<PunchType, "in" | "out"> = {
  entry: "in",
  lunch_return: "in",
  lunch_out: "out",
  exit: "out",
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const body = await req.json();
  const parsed = registerPunchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const { punch_type, gps_latitude, gps_longitude, gps_accuracy_meters, wifi_ssid_reported, face_verified, face_similarity } = parsed.data;

  // Auto-detect WiFi by IP — ignore client-sent wifi_confirmed
  const requestIp =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    null;

  const { data: userData } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
  if (!userData) return NextResponse.json({ error: "Usuário não encontrado." }, { status: 404 });

  const { data: config } = await supabase.from("store_configs").select("*").eq("organization_id", userData.organization_id).single();
  if (!config) return NextResponse.json({ error: "Configuração da loja não encontrada." }, { status: 404 });

  // Enforce facial recognition server-side: if employee has an active profile, face must be verified
  const { data: facialProfile } = await supabase
    .from("facial_profiles")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .not("face_descriptor", "is", null)
    .maybeSingle();

  if (facialProfile && !face_verified) {
    return NextResponse.json(
      { error: "Reconhecimento facial obrigatório. Posicione seu rosto na câmera e tente novamente." },
      { status: 403 }
    );
  }

  // WiFi confirmed automatically by IP match
  const wifi_confirmed = config.allowed_ip
    ? requestIp === config.allowed_ip
    : false;

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

  // Always use Brazil timezone so server and client agree on what "today" is
  const todayBrazil = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const startOfTodayUTC = new Date(todayBrazil + "T00:00:00-03:00").toISOString();

  const { data: todayRecords } = await supabase
    .from("time_records")
    .select("punch_type, recorded_at")
    .eq("user_id", user.id)
    .gte("recorded_at", startOfTodayUTC)
    .order("recorded_at", { ascending: false })
    .limit(20);

  const lastPunch = todayRecords?.[0]?.punch_type as PunchType | undefined;
  const lastDirection = lastPunch ? PUNCH_DIRECTION[lastPunch] : null;
  const incomingDirection = PUNCH_DIRECTION[punch_type];

  // Must alternate: if last was "in", next must be "out" and vice versa
  if (lastDirection === incomingDirection) {
    const msg = incomingDirection === "in"
      ? "Você já está registrado como presente. Registre uma saída primeiro."
      : "Você já está registrado como ausente. Registre uma entrada primeiro.";
    return NextResponse.json({ error: msg }, { status: 400 });
  }

  // First punch of the day must be an entry
  if (!lastPunch && incomingDirection !== "in") {
    return NextResponse.json({ error: "O primeiro registro do dia deve ser uma entrada." }, { status: 400 });
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

  await recalcWorkday(service, user.id, userData.organization_id, todayBrazil);

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
  // date is always a Brazil calendar day (YYYY-MM-DD). Use explicit UTC bounds.
  const startUTC = new Date(date + "T00:00:00-03:00").toISOString();
  const endUTC   = new Date(date + "T23:59:59-03:00").toISOString();

  const { data: records } = await service
    .from("time_records")
    .select("punch_type, recorded_at")
    .eq("user_id", userId)
    .gte("recorded_at", startUTC)
    .lte("recorded_at", endUTC)
    .order("recorded_at", { ascending: true });

  if (!records || records.length === 0) return;

  const { data: profile } = await service.from("employee_profiles").select("*").eq("user_id", userId).single();
  const dailyHours = profile?.daily_hours || 8;
  const salary = profile?.salary || 0;
  const monthlyHours = profile?.monthly_hours || 176;

  const calc = calculateWorkday(records, dailyHours, salary, monthlyHours);

  // First entry and last exit of the day for reference columns
  const firstEntry = records.find((r) => r.punch_type === "entry" || r.punch_type === "lunch_return");
  const lastExit = [...records].reverse().find((r) => r.punch_type === "exit" || r.punch_type === "lunch_out");
  const isCurrentlyOut = lastExit && (!firstEntry || new Date(lastExit.recorded_at) > new Date(firstEntry.recorded_at));

  await service.from("workday_summaries").upsert({
    user_id: userId,
    organization_id: orgId,
    work_date: date,
    entry_time: records.find((r) => r.punch_type === "entry")?.recorded_at || null,
    lunch_out_time: records.find((r) => r.punch_type === "lunch_out")?.recorded_at || null,
    lunch_return_time: records.find((r) => r.punch_type === "lunch_return")?.recorded_at || null,
    exit_time: [...records].reverse().find((r) => r.punch_type === "exit" || r.punch_type === "lunch_out")?.recorded_at || null,
    hours_worked: calc.hours_worked,
    hours_expected: dailyHours,
    overtime_hours: calc.overtime_hours,
    bank_balance: calc.bank_balance,
    overtime_value: calc.overtime_value,
    is_complete: !!isCurrentlyOut,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,work_date" });
}
