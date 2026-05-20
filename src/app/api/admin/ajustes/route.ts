import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { calculateWorkday } from "@/lib/hours";

export const dynamic = "force-dynamic";

function todayBrazil() {
  return new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
}

function dayBounds(date: string) {
  return {
    start: new Date(date + "T00:00:00-03:00").toISOString(),
    end:   new Date(date + "T23:59:59-03:00").toISOString(),
  };
}

async function assertAdmin(supabase: Awaited<ReturnType<typeof createClient>>, service: Awaited<ReturnType<typeof createServiceClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: adminData } = await service.from("users").select("organization_id, role").eq("id", user.id).single();
  if (!adminData || adminData.role !== "admin") return null;
  return { user, orgId: adminData.organization_id as string };
}

// GET /api/admin/ajustes              → employees + suspicious records
// GET /api/admin/ajustes?employee=X&date=Y → day records for employee
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const service  = await createServiceClient();

  const auth = await assertAdmin(supabase, service);
  if (!auth) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { orgId } = auth;

  const { searchParams } = new URL(req.url);
  const employeeId = searchParams.get("employee");
  const date = searchParams.get("date");

  // Day search mode
  if (employeeId && date) {
    const { start, end } = dayBounds(date);
    const { data: records, error } = await service
      .from("time_records")
      .select("*")
      .eq("user_id", employeeId)
      .eq("organization_id", orgId)
      .gte("recorded_at", start)
      .lte("recorded_at", end)
      .order("recorded_at", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ records: records || [] });
  }

  // Initial load: employees + suspicious records
  const [{ data: employees }, { data: suspicious }] = await Promise.all([
    service.from("users")
      .select("id, name")
      .eq("organization_id", orgId)
      .eq("role", "employee")
      .eq("is_active", true)
      .order("name"),
    service.from("time_records")
      .select("*, users!time_records_user_id_fkey(name)")
      .eq("organization_id", orgId)
      .eq("status", "suspicious")
      .order("recorded_at", { ascending: false })
      .limit(50),
  ]);

  return NextResponse.json({
    employees: employees || [],
    suspicious: suspicious || [],
  });
}

// POST → create manual record + recalc workday
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const service  = await createServiceClient();

  const auth = await assertAdmin(supabase, service);
  if (!auth) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { user, orgId } = auth;

  const { user_id, punch_type, recorded_at, edit_reason } = await req.json();
  if (!user_id || !punch_type || !recorded_at || !edit_reason?.trim()) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }

  const { data: record, error } = await service.from("time_records").insert({
    user_id,
    organization_id: orgId,
    punch_type,
    recorded_at,
    status: "manual",
    is_manual_edit: true,
    edited_by: user.id,
    edit_reason,
    gps_verified: false,
    wifi_confirmed: false,
    face_verified: false,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await Promise.all([
    service.from("audit_logs").insert({
      organization_id: orgId, user_id: user.id,
      action: "record_manually_created", entity_type: "time_records", entity_id: record.id,
      new_values: { user_id, punch_type, recorded_at, edit_reason },
    }),
    recalcWorkday(service, user_id, orgId, recorded_at.slice(0, 10)),
  ]);

  return NextResponse.json({ success: true, record });
}

// PATCH → edit existing record + recalc workday
export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const service  = await createServiceClient();

  const auth = await assertAdmin(supabase, service);
  if (!auth) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  const { user, orgId } = auth;

  const { id, recorded_at, edit_reason } = await req.json();
  if (!id || !recorded_at || !edit_reason?.trim()) {
    return NextResponse.json({ error: "Dados incompletos." }, { status: 400 });
  }

  const { data: existing } = await service.from("time_records")
    .select("recorded_at, user_id")
    .eq("id", id)
    .single();

  const { error } = await service.from("time_records").update({
    recorded_at,
    is_manual_edit: true,
    edited_by: user.id,
    edit_reason,
    original_recorded_at: existing?.recorded_at,
    status: "manual",
  }).eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const affectedDate = new Date(recorded_at).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

  await Promise.all([
    service.from("audit_logs").insert({
      organization_id: orgId, user_id: user.id,
      action: "record_manually_adjusted", entity_type: "time_records", entity_id: id,
      old_values: { recorded_at: existing?.recorded_at },
      new_values: { recorded_at, edit_reason },
    }),
    existing?.user_id ? recalcWorkday(service, existing.user_id, orgId, affectedDate) : Promise.resolve(),
  ]);

  return NextResponse.json({ success: true });
}

async function recalcWorkday(
  service: Awaited<ReturnType<typeof createServiceClient>>,
  userId: string,
  orgId: string,
  date: string,
) {
  const { start, end } = dayBounds(date);
  const { data: records } = await service
    .from("time_records")
    .select("punch_type, recorded_at")
    .eq("user_id", userId)
    .gte("recorded_at", start)
    .lte("recorded_at", end)
    .order("recorded_at", { ascending: true });

  if (!records || records.length === 0) return;

  const { data: profile } = await service.from("employee_profiles")
    .select("daily_hours, salary, monthly_hours").eq("user_id", userId).single();

  const dailyHours   = profile?.daily_hours   || 8;
  const salary       = profile?.salary         || 0;
  const monthlyHours = profile?.monthly_hours  || 176;

  const calc = calculateWorkday(records, dailyHours, salary, monthlyHours);
  const lastExit = [...records].reverse().find((r) => r.punch_type === "exit" || r.punch_type === "lunch_out");
  const firstEntry = records.find((r) => r.punch_type === "entry" || r.punch_type === "lunch_return");

  await service.from("workday_summaries").upsert({
    user_id: userId,
    organization_id: orgId,
    work_date: date,
    entry_time: records.find((r) => r.punch_type === "entry")?.recorded_at || null,
    lunch_out_time: records.find((r) => r.punch_type === "lunch_out")?.recorded_at || null,
    lunch_return_time: records.find((r) => r.punch_type === "lunch_return")?.recorded_at || null,
    exit_time: lastExit?.recorded_at || null,
    hours_worked: calc.hours_worked,
    hours_expected: dailyHours,
    overtime_hours: calc.overtime_hours,
    bank_balance: calc.bank_balance,
    overtime_value: calc.overtime_value,
    is_complete: !!(lastExit && firstEntry && new Date(lastExit.recorded_at) > new Date(firstEntry.recorded_at)),
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id,work_date" });
}
