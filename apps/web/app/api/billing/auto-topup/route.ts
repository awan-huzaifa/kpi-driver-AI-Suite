import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TOP_UP_OPTIONS } from "@kpidriver/stripe/topup";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("access_role, company_id")
    .eq("id", user.id)
    .single();

  if (!profile?.company_id || !["admin", "super_admin"].includes(profile.access_role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json() as {
    enabled:   boolean;
    priceId:   string | null;
    threshold: number | null;
  };

  if (body.enabled) {
    if (!body.priceId || !TOP_UP_OPTIONS.find(o => o.priceId === body.priceId)) {
      return NextResponse.json({ error: "Invalid top-up amount" }, { status: 400 });
    }
    if (!body.threshold || body.threshold <= 0) {
      return NextResponse.json({ error: "Threshold is required and must be greater than 0" }, { status: 400 });
    }
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("companies")
    .update({
      auto_topup_enabled:   body.enabled,
      auto_topup_price_id:  body.enabled ? body.priceId : null,
      auto_topup_threshold: body.enabled ? body.threshold : null,
    })
    .eq("id", profile.company_id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
