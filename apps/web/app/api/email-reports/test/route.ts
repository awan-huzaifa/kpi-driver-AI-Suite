import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, FROM_EMAIL } from "@/lib/email/client";
import { getPeriodBounds, REPORT_LABELS } from "@/lib/email/periods";
import { scAgentTypeTeamTemplate, SC_TYPE_ORDER, scRepTemplate, tcTeamTemplate, tcRepTemplate, uwTemplate, uwTeamTemplate } from "@/lib/email/templates";

export const runtime = "nodejs";

// GET /api/email-reports/test?to=you@email.com&period=weekly&company=<id>
// Auth: Authorization: Bearer <CRON_SECRET>
// period: daily | weekly | monthly (default: weekly)
// company: company id (default: first company found)
// to: override recipient email (default: first admin in company)

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url        = new URL(req.url);
  const toOverride = url.searchParams.get("to") ?? undefined;
  const periodType = (url.searchParams.get("period") ?? "weekly") as "daily" | "weekly" | "monthly";
  const companyId  = url.searchParams.get("company") ?? undefined;

  const admin = createAdminClient();

  // Resolve company
  const companyQuery = admin.from("companies").select("id, name, timezone");
  if (companyId) companyQuery.eq("id", companyId);
  else companyQuery.limit(1);
  const { data: companies } = await companyQuery;
  const company = companies?.[0];
  if (!company) return Response.json({ error: "No company found" }, { status: 404 });

  // Auth users for email lookup
  const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map(authUsers.map(u => [u.id, u.email ?? ""]));

  // Users in this company
  const { data: users } = await admin
    .from("users")
    .select("id, full_name, access_role, app_sales_coach, app_training_coach, app_underwriting")
    .eq("company_id", company.id)
    .eq("is_active", true);

  if (!users?.length) return Response.json({ error: "No active users in company" }, { status: 404 });

  // Period — use today's local date (UTC fallback)
  const now       = new Date();
  const tz        = company.timezone ?? "America/New_York";
  const localDate = (() => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, year: "numeric", month: "numeric", day: "numeric", weekday: "short", hour12: false,
    }).formatToParts(now);
    const get = (t: string) => parts.find(p => p.type === t)?.value ?? "0";
    const DOW: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return {
      year: Number(get("year")), month: Number(get("month")),
      day: Number(get("day")), dayOfWeek: DOW[get("weekday")] ?? 1,
    };
  })();

  // Force dayOfWeek=1 (Mon) for weekly so getPeriodBounds works correctly regardless of real day
  const fakeDateForPeriod = periodType === "weekly"
    ? { ...localDate, dayOfWeek: 1 }
    : periodType === "monthly"
    ? { ...localDate, day: 1 }
    : localDate;

  const period      = getPeriodBounds(periodType, fakeDateForPeriod);
  const reportLabel = REPORT_LABELS[periodType];

  const admins = users.filter(u => u.access_role === "admin" || u.access_role === "super_admin");
  const sent: string[] = [];

  // Helper: resolve recipient
  const resolveEmail = (userId: string) => toOverride ?? emailMap.get(userId) ?? "";

  // ── Sales Coach ─────────────────────────────────────────────────────────────
  const scEnabled = users.some(u => u.app_sales_coach || u.access_role === "admin" || u.access_role === "super_admin");
  if (scEnabled) {
    const { data: scCalls } = await admin
      .from("live_calls")
      .select("id, user_id, score, scorable, direction, duration_sec, call_result, created_at, evaluation, agent:users(full_name, agent_type)")
      .eq("company_id", company.id)
      .gte("created_at", period.from)
      .lte("created_at", period.to);

    const calls = scCalls ?? [];

    // Team report — one per active agent type, send to first admin only (to avoid flooding)
    const firstAdmin = admins[0];
    if (firstAdmin) {
      const to = resolveEmail(firstAdmin.id);
      if (to) {
        const byType = new Map<string, typeof calls>()
        for (const c of calls) {
          const t = (c.agent as any)?.agent_type ?? 'none'
          if (!byType.has(t)) byType.set(t, [])
          byType.get(t)!.push(c)
        }
        for (const agentType of SC_TYPE_ORDER) {
          const typeCalls = byType.get(agentType)
          if (!typeCalls?.length) continue
          await getResend().emails.send({
            from: FROM_EMAIL, to,
            subject: `[TEST] Sales Coach ${agentType.toUpperCase()} Team Report — ${period.label}`,
            html: scAgentTypeTeamTemplate(agentType, company.name, period, typeCalls as any, reportLabel),
          });
          sent.push(`SC ${agentType.toUpperCase()} Team → ${to}`);
        }
      }
    }

    // Rep report → first rep with calls (or first rep)
    const scReps = users.filter(u => u.access_role === "user" && u.app_sales_coach);
    const repWithCalls = scReps.find(u => calls.some(c => c.user_id === u.id)) ?? scReps[0];
    if (repWithCalls) {
      const repCalls = calls.filter(c => c.user_id === repWithCalls.id);
      const to = resolveEmail(repWithCalls.id);
      if (to) {
        await getResend().emails.send({
          from: FROM_EMAIL, to,
          subject: `[TEST] Your Sales Coach Report — ${period.label}`,
          html: scRepTemplate(repWithCalls.full_name ?? "Agent", company.name, period, repCalls as any, reportLabel),
        });
        sent.push(`SC Rep (${repWithCalls.full_name}) → ${to}`);
      }
    }
  }

  // ── Training Coach ──────────────────────────────────────────────────────────
  const tcEnabled = users.some(u => u.app_training_coach || u.access_role === "admin" || u.access_role === "super_admin");
  if (tcEnabled) {
    const { data: tcCalls } = await admin
      .from("training_calls")
      .select("id, user_id, score, scorable, call_result, created_at, evaluation, agent:users(full_name, agent_type), ai_agent:training_ai_agents(agent_name)")
      .eq("company_id", company.id)
      .gte("created_at", period.from)
      .lte("created_at", period.to);

    const calls = tcCalls ?? [];

    const firstAdmin = admins[0];
    if (firstAdmin) {
      const to = resolveEmail(firstAdmin.id);
      if (to) {
        await getResend().emails.send({
          from: FROM_EMAIL, to,
          subject: `[TEST] Training Coach Team Report — ${period.label}`,
          html: tcTeamTemplate(company.name, period, calls as any, reportLabel),
        });
        sent.push(`TC Team → ${to}`);
      }
    }

    const tcReps = users.filter(u => u.access_role === "user" && u.app_training_coach);
    const repWithCalls = tcReps.find(u => calls.some(c => c.user_id === u.id)) ?? tcReps[0];
    if (repWithCalls) {
      const repCalls = calls.filter(c => c.user_id === repWithCalls.id);
      const to = resolveEmail(repWithCalls.id);
      if (to) {
        await getResend().emails.send({
          from: FROM_EMAIL, to,
          subject: `[TEST] Your Training Report — ${period.label}`,
          html: tcRepTemplate(repWithCalls.full_name ?? "Agent", company.name, period, repCalls as any, reportLabel),
        });
        sent.push(`TC Rep (${repWithCalls.full_name}) → ${to}`);
      }
    }
  }

  // ── Deal Underwriting ────────────────────────────────────────────────────────
  const { data: deals } = await admin
    .from("deals")
    .select("id, address, recommendation, arv_low, arv_high, max_offer, created_at, user_id")
    .eq("company_id", company.id)
    .eq("status", "completed")
    .gte("created_at", period.from)
    .lte("created_at", period.to);

  if (deals?.length) {
    const dealsWithNames = deals.map(d => ({
      ...d, user_name: users.find(u => u.id === d.user_id)?.full_name ?? null,
    }));

    const firstAdmin = admins[0];
    if (firstAdmin) {
      const to = resolveEmail(firstAdmin.id);
      if (to) {
        await getResend().emails.send({
          from: FROM_EMAIL, to,
          subject: `[TEST] Deal Underwriting Team Report — ${period.label}`,
          html: uwTeamTemplate(company.name, period, dealsWithNames as any, reportLabel),
        });
        sent.push(`UW Team → ${to}`);
      }
    }

    const firstUserWithDeal = deals[0]?.user_id
      ? users.find(u => u.id === deals[0].user_id && u.access_role === "user")
      : undefined;
    if (firstUserWithDeal) {
      const userDeals = deals.filter(d => d.user_id === firstUserWithDeal.id);
      const to = resolveEmail(firstUserWithDeal.id);
      if (to) {
        await getResend().emails.send({
          from: FROM_EMAIL, to,
          subject: `[TEST] Deal Underwriting Report — ${period.label}`,
          html: uwTemplate(firstUserWithDeal.full_name ?? "User", company.name, period, userDeals as any, reportLabel),
        });
        sent.push(`UW Rep (${firstUserWithDeal.full_name}) → ${to}`);
      }
    }
  }

  return Response.json({ ok: true, company: company.name, period: period.label, sent });
}
