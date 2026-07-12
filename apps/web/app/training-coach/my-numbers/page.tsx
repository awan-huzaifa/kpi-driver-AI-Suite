import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import MyNumbersClient from "./my-numbers-client";

export default async function MyNumbersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("access_role")
    .eq("id", user.id)
    .single();

  const isSuperAdmin = profile?.access_role === "super_admin";

  type PhoneRow = {
    id:           string;
    phone:        string;
    created_at:   string;
    user_name?:   string;
    company_id?:  string | null;
    company_name?: string | null;
  };

  let phones: PhoneRow[] = [];
  let companies: { id: string; name: string }[] = [];

  if (isSuperAdmin) {
    const admin = createAdminClient();
    const { data: allPhones } = await admin
      .from("user_phones")
      .select("id, phone, created_at, user_id")
      .order("created_at", { ascending: false });

    if (allPhones?.length) {
      const uniqueUserIds = [...new Set(allPhones.map((p) => p.user_id as string))];
      const { data: userRows } = await admin
        .from("users")
        .select("id, full_name, company_id")
        .in("id", uniqueUserIds);

      const { data: companyRows } = await admin
        .from("companies")
        .select("id, name")
        .order("name");

      companies = companyRows ?? [];
      const userMap       = new Map((userRows ?? []).map((u) => [u.id, u]));
      const companyNameMap = new Map((companyRows ?? []).map((c) => [c.id, c.name as string]));

      phones = allPhones.map((p) => {
        const u   = userMap.get(p.user_id as string);
        const cid = u?.company_id ?? null;
        return {
          id:           p.id,
          phone:        p.phone,
          created_at:   p.created_at,
          user_name:    u?.full_name ?? "Unknown",
          company_id:   cid,
          company_name: cid ? (companyNameMap.get(cid) ?? null) : null,
        };
      });
    }
  } else {
    const { data } = await supabase
      .from("user_phones")
      .select("id, phone, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    phones = data ?? [];
  }

  return (
    <MyNumbersClient
      phones={phones}
      isSuperAdmin={isSuperAdmin}
      companies={companies}
    />
  );
}
