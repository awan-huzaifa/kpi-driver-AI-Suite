import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getDisputes } from "@/app/actions/sales-coach/disputes";
import DisputesClient from "./disputes-client";

export default async function DisputesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("access_role, is_qa")
    .eq("id", user.id)
    .single();

  const disputes = await getDisputes();

  return <DisputesClient disputes={disputes} />;
}
