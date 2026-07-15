import { createClient } from "@/lib/supabase/server";
import { cleanupStuckDeals } from "@/app/actions/underwriting/deals";
import UWDashboardClient from "./uw-dashboard";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  await cleanupStuckDeals();

  const { data: deals } = await supabase
    .from("deals")
    .select("id, address, status, recommendation, arv_low, arv_high, max_offer, created_at")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  const rows            = deals ?? [];
  const completedDeals  = rows.filter((d) => d.status === "completed");
  const portfolioValue  = completedDeals.reduce((sum, d) => sum + (d.max_offer ?? 0), 0);
  const pursueCount     = completedDeals.filter((d) => d.recommendation === "pursue").length;
  const pursueRate      = completedDeals.length > 0
    ? Math.round((pursueCount / completedDeals.length) * 100)
    : null;

  return (
    <UWDashboardClient
      totalDeals={rows.length}
      completedCount={completedDeals.length}
      portfolioValue={portfolioValue}
      pursueRate={pursueRate}
      pursueCount={pursueCount}
      pendingCount={rows.filter((d) => d.status === "pending").length}
      recent={rows.slice(0, 5)}
      hasMore={rows.length > 5}
    />
  );
}
