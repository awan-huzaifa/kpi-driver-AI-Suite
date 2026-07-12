import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import DashboardClient, { type DashboardData } from "@/components/sales-coach/dashboard/DashboardClient";

type CallRow = {
  id:            string;
  user_id:       string;
  contact_name:  string | null;
  direction:     "inbound" | "outbound";
  call_stage:    string | null;
  scorable:      boolean;
  score:         number | null;
  call_result:   string | null;
  duration_sec:  number;
  created_at:    string;
  agent:         { full_name: string | null } | null;
};

function computeDashboard(calls: CallRow[]): DashboardData {
  const now = new Date();
  const day7  = new Date(now); day7.setDate(now.getDate() - 7);
  const day14 = new Date(now); day14.setDate(now.getDate() - 14);

  const thisWeek = calls.filter(c => new Date(c.created_at) >= day7);
  const lastWeek = calls.filter(c => new Date(c.created_at) >= day14 && new Date(c.created_at) < day7);

  const scorable     = calls.filter(c => c.scorable && c.score !== null);
  const totalCalls   = calls.length;
  const avgScore     = scorable.length > 0
    ? Math.round(scorable.reduce((s, c) => s + c.score!, 0) / scorable.length)
    : null;
  const scorableRate = totalCalls > 0 ? Math.round((scorable.length / totalCalls) * 100) : 0;
  const activeAgents = new Set(calls.map(c => c.user_id)).size;

  const twScoreable  = thisWeek.filter(c => c.scorable && c.score !== null);
  const lwScoreable  = lastWeek.filter(c => c.scorable && c.score !== null);
  const twAvg = twScoreable.length > 0 ? twScoreable.reduce((s, c) => s + c.score!, 0) / twScoreable.length : null;
  const lwAvg = lwScoreable.length > 0 ? lwScoreable.reduce((s, c) => s + c.score!, 0) / lwScoreable.length : null;

  const totalCallsChange = lastWeek.length > 0
    ? Math.round(((thisWeek.length - lastWeek.length) / lastWeek.length) * 100)
    : 0;
  const avgScoreChange = twAvg !== null && lwAvg !== null && lwAvg > 0
    ? Math.round(((twAvg - lwAvg) / lwAvg) * 100)
    : 0;

  const callVolume = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];
    return {
      day:   d.toLocaleDateString("en-US", { weekday: "short" }),
      count: calls.filter(c => c.created_at.startsWith(dateStr)).length,
    };
  });

  const BANDS = [
    { range: "0–20",   min: 0,  max: 20  },
    { range: "21–40",  min: 21, max: 40  },
    { range: "41–60",  min: 41, max: 60  },
    { range: "61–80",  min: 61, max: 80  },
    { range: "81–100", min: 81, max: 100 },
  ];
  const scoreDistribution = BANDS.map(b => ({
    range: b.range,
    count: scorable.filter(c => c.score! >= b.min && c.score! <= b.max).length,
  }));

  const recentCalls = calls.slice(0, 10).map(c => ({
    id:        c.id,
    agent:     c.agent?.full_name ?? "Unknown",
    contact:   c.contact_name ?? "Unknown",
    direction: c.direction,
    stage:     c.call_stage,
    score:     c.score,
    result:    c.call_result,
    duration:  `${Math.floor(c.duration_sec / 60)}:${String(c.duration_sec % 60).padStart(2, "0")}`,
  }));

  return {
    stats: { totalCalls, avgScore, scorableRate, activeAgents, totalCallsChange, avgScoreChange },
    callVolume,
    scoreDistribution,
    recentCalls,
  };
}

async function fetchCalls(supabase: Awaited<ReturnType<typeof createClient>>, filter: Record<string, string>) {
  let query = supabase
    .from("live_calls")
    .select("id, user_id, contact_name, direction, call_stage, scorable, score, call_result, duration_sec, created_at, agent:users(full_name)")
    .order("created_at", { ascending: false })
    .limit(500);

  for (const [key, value] of Object.entries(filter)) {
    query = query.eq(key, value);
  }

  const { data } = await query;
  return (data ?? []) as CallRow[];
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("id, full_name, access_role, company_id")
    .eq("id", user.id)
    .single();

  const role      = profile?.access_role ?? "user";
  const companyId = profile?.company_id  ?? "";
  const userId    = profile?.id          ?? "";

  let data: DashboardData;
  let companyData: DashboardData | undefined;

  if (role === "super_admin") {
    data = computeDashboard(await fetchCalls(supabase, {}));
  } else if (role === "admin") {
    data = computeDashboard(await fetchCalls(supabase, { company_id: companyId }));
  } else {
    // user: own + company (for toggle)
    const [ownCalls, companyCalls] = await Promise.all([
      fetchCalls(supabase, { user_id: userId }),
      fetchCalls(supabase, { company_id: companyId }),
    ]);
    data        = computeDashboard(ownCalls);
    companyData = computeDashboard(companyCalls);
  }

  return (
    <DashboardClient
      data={data}
      companyData={companyData}
      accessRole={role}
      userName={profile?.full_name ?? user.email ?? ""}
    />
  );
}
