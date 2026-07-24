import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Building2, Plus, ListFilter } from "lucide-react";
import { NewDealModal } from "@/components/underwriting/new-deal-modal";
import { DealsTable } from "@/components/underwriting/deals-table";
import { cleanupStuckDeals } from "@/app/actions/underwriting/deals";

export default async function DealsPage() {
  await cleanupStuckDeals();

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("access_role, company_id")
    .eq("id", user.id)
    .single();

  const accessRole   = profile?.access_role ?? "user";
  const isSuperAdmin = accessRole === "super_admin";

  type DealRow = {
    id: string;
    address: string;
    status: string;
    recommendation: string | null;
    arv_low: number | null;
    arv_high: number | null;
    max_offer: number | null;
    created_at: string;
    user_id?: string;
    agent_name?: string | null;
    company_id?: string | null;
    company_name?: string | null;
    last_rerun_by_name?: string | null;
  };

  type CompanyUser = { id: string; full_name: string | null; email: string | null };

  let rows: DealRow[] = [];
  let companies: { id: string; name: string }[] = [];
  let companyUsers: CompanyUser[] = [];

  if (isSuperAdmin) {
    const admin = createAdminClient();
    const { data: allDeals } = await admin
      .from("deals")
      .select("id, address, status, recommendation, arv_low, arv_high, max_offer, created_at, user_id, last_rerun_by")
      .order("created_at", { ascending: false });

    if (allDeals?.length) {
      const uniqueUserIds = [...new Set([
        ...allDeals.map((d) => d.user_id as string),
        ...allDeals.map((d) => d.last_rerun_by as string | null).filter(Boolean) as string[],
      ])];
      const { data: userRows } = await admin
        .from("users")
        .select("id, company_id, full_name, email")
        .in("id", uniqueUserIds);

      const userCompanyMap = new Map((userRows ?? []).map((u) => [u.id, u.company_id as string | null]));
      const userNameMap    = new Map((userRows ?? []).map((u) => [u.id, (u.full_name || u.email || null) as string | null]));

      const { data: companyRows } = await admin
        .from("companies")
        .select("id, name")
        .order("name");

      companies = companyRows ?? [];
      const companyNameMap = new Map((companyRows ?? []).map((c) => [c.id, c.name as string]));

      rows = allDeals.map((d) => {
        const cid = userCompanyMap.get(d.user_id as string) ?? null;
        return {
          ...d,
          agent_name:         userNameMap.get(d.user_id as string) ?? null,
          company_id:         cid,
          company_name:       cid ? (companyNameMap.get(cid) ?? null) : null,
          last_rerun_by_name: d.last_rerun_by ? (userNameMap.get(d.last_rerun_by as string) ?? null) : null,
        };
      });
    }
  } else {
    // RLS returns all company deals after migration 024
    const { data } = await supabase
      .from("deals")
      .select("id, address, status, recommendation, arv_low, arv_high, max_offer, created_at, user_id, last_rerun_by")
      .order("created_at", { ascending: false });

    // Fetch company members for the user filter dropdown + agent name enrichment
    if (profile?.company_id) {
      const { data: members } = await supabase
        .from("users")
        .select("id, full_name, email")
        .eq("company_id", profile.company_id)
        .eq("is_active", true)
        .order("full_name");
      companyUsers = (members ?? []) as CompanyUser[];
    }

    const nameMap = new Map(companyUsers.map((u) => [u.id, u.full_name || u.email || null]));

    // Resolve re-runner names — they may be outside companyUsers (e.g. super_admin, different company)
    const unknownRerunIds = [...new Set(
      (data ?? [])
        .map((d) => d.last_rerun_by as string | null)
        .filter((id): id is string => !!id && !nameMap.has(id))
    )];
    if (unknownRerunIds.length > 0) {
      const adminForNames = createAdminClient();
      const { data: extraUsers } = await adminForNames
        .from("users")
        .select("id, full_name, email")
        .in("id", unknownRerunIds);
      for (const u of extraUsers ?? []) {
        nameMap.set(u.id as string, (u.full_name || u.email || null) as string | null);
      }
    }

    rows = (data ?? []).map((d) => ({
      ...d,
      agent_name:         nameMap.get(d.user_id as string) ?? null,
      last_rerun_by_name: d.last_rerun_by ? (nameMap.get(d.last_rerun_by as string) ?? null) : null,
    })) as DealRow[];
  }

  const completed = rows.filter((d) => d.status === "completed").length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto w-full">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ListFilter size={13} style={{ color: '#43B749' }} />
            <span className="text-[11px] font-bold uppercase tracking-widest" style={{ color: '#43B749' }}>Deal Pipeline</span>
          </div>
          <h1 className="text-white font-black text-[32px] leading-none tracking-tight mb-2">All Deals</h1>
          <p className="text-muted text-sm font-medium">
            {rows.length === 0
              ? "No Deals Yet — Run Your First Analysis"
              : `${rows.length} Total · ${completed} Completed`}
          </p>
        </div>

        <NewDealModal
          trigger={
            <button className="btn-primary shrink-0">
              <Plus size={15} />
              New Deal
            </button>
          }
        />
      </div>

      {/* Empty state */}
      {rows.length === 0 && (
        <div
          className="rounded-xl border border-edge flex flex-col items-center justify-center py-24 px-6 text-center"
          style={{ background: '#0F2032' }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
            style={{ background: 'rgba(48,125,192,0.10)', border: '1px solid rgba(48,125,192,0.2)' }}
          >
            <Building2 size={26} className="text-brand" strokeWidth={1.5} />
          </div>
          <p className="text-white font-bold text-[15px] mb-2">No Deals Yet</p>
          <p className="text-muted text-[13px] mb-7 max-w-[300px] leading-relaxed">
            Run Your First Underwriting Analysis To See Results Here.
          </p>
          <NewDealModal
            trigger={
              <button className="btn-primary">
                <Plus size={14} />
                Create Your First Deal
              </button>
            }
          />
        </div>
      )}

      {/* Table */}
      {rows.length > 0 && (
        <DealsTable
          deals={rows}
          companies={isSuperAdmin ? companies : []}
          accessRole={accessRole}
          currentUserId={user.id}
          companyUsers={companyUsers}
        />
      )}
    </div>
  );
}
