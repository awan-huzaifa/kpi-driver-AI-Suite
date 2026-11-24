import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("access_role, company_id")
    .eq("id", user.id)
    .single();

  if (!profile || profile.access_role === "user") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const admin = createAdminClient();
  let query = admin.from("sent_reports").select("id, html_content, subject, sent_at").eq("id", id);

  if (profile.access_role === "admin" && profile.company_id) {
    query = query.eq("company_id", profile.company_id);
  }

  const { data, error } = await query.single();
  if (error || !data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(data);
}
