import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST() {
  const supabase = await createServiceClient();

  const { data: existing } = await supabase.storage.getBucket("face-photos");
  if (existing) return NextResponse.json({ ok: true, message: "Bucket já existe." });

  const { error } = await supabase.storage.createBucket("face-photos", {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, message: "Bucket 'face-photos' criado com sucesso." });
}
