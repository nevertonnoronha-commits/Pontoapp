import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

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
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const employeeId = searchParams.get("employee");

  // Fetch employees first (for name lookup)
  const { data: employees, error: empErr } = await service
    .from("users")
    .select("id, name")
    .eq("organization_id", orgId)
    .eq("role", "employee")
    .order("name");

  if (empErr) console.error("[registros] employees error:", empErr.message);

  const nameMap: Record<string, string> = {};
  (employees || []).forEach((e: { id: string; name: string }) => { nameMap[e.id] = e.name; });

  // Build records query — no FK join
  let query = service
    .from("time_records")
    .select("id, user_id, punch_type, recorded_at, gps_verified, wifi_confirmed, status")
    .eq("organization_id", orgId)
    .order("recorded_at", { ascending: false })
    .limit(200);

  if (from) query = query.gte("recorded_at", new Date(from + "T00:00:00-03:00").toISOString());
  if (to) query = query.lte("recorded_at", new Date(to + "T23:59:59-03:00").toISOString());
  if (employeeId) query = query.eq("user_id", employeeId);

  const { data: rawRecords, error: recErr } = await query;
  if (recErr) console.error("[registros] records error:", recErr.message);

  const records = (rawRecords || []).map((r: {
    id: string; user_id: string; punch_type: string; recorded_at: string;
    gps_verified: boolean; wifi_confirmed: boolean; status: string;
  }) => ({ ...r, userName: nameMap[r.user_id] || "—" }));

  return NextResponse.json({ records, employees: employees || [] });
}
