import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { data: adminData } = await supabase
    .from("users")
    .select("role, organization_id")
    .eq("id", user.id)
    .single();

  if (!adminData || adminData.role !== "admin") {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }

  const { user_id, face_descriptor, photo_url, is_active } = await req.json();
  if (!user_id) return NextResponse.json({ error: "user_id obrigatório." }, { status: 400 });

  const service = await createServiceClient();
  const { error } = await service.from("facial_profiles").upsert(
    {
      user_id,
      organization_id: adminData.organization_id,
      face_descriptor: face_descriptor ?? null,
      photo_url: photo_url ?? null,
      trained_at: new Date().toISOString(),
      is_active: is_active ?? false,
    },
    { onConflict: "user_id" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
