import { createClient } from "@/lib/supabase/server";
import CompaniesClient from "./companies-client";

export default async function CompaniesPage() {
  const supabase = await createClient();

  const [{ data: companies }, { data: users }] = await Promise.all([
    supabase.from("companies").select("*").order("created_at", { ascending: false }),
    supabase.from("users").select("company_id").not("company_id", "is", null),
  ]);

  const countMap = (users ?? []).reduce<Record<string, number>>((acc, u) => {
    if (u.company_id) acc[u.company_id] = (acc[u.company_id] ?? 0) + 1;
    return acc;
  }, {});

  const data = (companies ?? []).map((c) => ({ ...c, user_count: countMap[c.id] ?? 0 }));

  return <CompaniesClient companies={data} />;
}
