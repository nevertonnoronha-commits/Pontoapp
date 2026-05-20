import { NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  // Authenticate via session client
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  // Service client — no cookies, service role key, bypasses RLS
  const service = await createServiceClient();

  const { data: adminData, error: adminErr } = await service
    .from("users")
    .select("organization_id, role")
    .eq("id", user.id)
    .single();

  if (adminErr || !adminData) {
    return NextResponse.json({ error: "Falha ao buscar admin", detail: adminErr?.message }, { status: 500 });
  }
  if (adminData.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const orgId = adminData.organization_id;

  // Today in Brazil (sv-SE = YYYY-MM-DD format, reliable across all Node versions)
  const todayBrazil = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });

  // Build UTC bounds for the full Brazil calendar day
  const startUTC = new Date(todayBrazil + "T00:00:00-03:00").toISOString();
  const endUTC = new Date(todayBrazil + "T23:59:59-03:00").toISOString();

  const [
    { data: todayRecords, error: recErr },
    { data: employees, error: empErr },
    { data: todaySummaries, error: sumErr },
  ] = await Promise.all([
    service
      .from("time_records")
      .select("id, user_id, punch_type, recorded_at, gps_verified, wifi_confirmed")
      .eq("organization_id", orgId)
      .gte("recorded_at", startUTC)
      .lte("recorded_at", endUTC)
      .order("recorded_at", { ascending: false }),
    service
      .from("users")
      .select("id, name")
      .eq("organization_id", orgId)
      .eq("role", "employee")
      .eq("is_active", true),
    service
      .from("workday_summaries")
      .select("user_id, overtime_hours, hours_worked")
      .eq("organization_id", orgId)
      .eq("work_date", todayBrazil),
  ]);

  if (recErr) console.error("[dashboard] time_records error:", recErr.message);
  if (empErr) console.error("[dashboard] employees error:", empErr.message);
  if (sumErr) console.error("[dashboard] summaries error:", sumErr.message);

  // Build a name map from employees
  const nameMap: Record<string, string> = {};
  (employees || []).forEach((e: { id: string; name: string }) => { nameMap[e.id] = e.name; });

  // Attach names to records
  const recordsWithNames = (todayRecords || []).map((r: {
    id: string; user_id: string; punch_type: string;
    recorded_at: string; gps_verified: boolean; wifi_confirmed: boolean;
  }) => ({
    ...r,
    userName: nameMap[r.user_id] || "—",
  }));

  return NextResponse.json({
    todayRecords: recordsWithNames,
    employees: employees || [],
    todaySummaries: todaySummaries || [],
    today: todayBrazil,
    debug: { startUTC, endUTC, orgId, recErr: recErr?.message, empErr: empErr?.message },
  });
}
