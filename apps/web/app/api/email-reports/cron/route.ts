import { createAdminClient } from "@/lib/supabase/admin";
import { getResend, FROM_EMAIL } from "@/lib/email/client";
import { getLocalHour, getLocalDate, getDueReportTypes, getPeriodBounds, REPORT_LABELS } from "@/lib/email/periods";
import { scTeamTemplate, scRepTemplate, tcTeamTemplate, tcRepTemplate, uwTemplate, uwTeamTemplate } from "@/lib/email/templates";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const now   = new Date();

  // All companies
  const { data: companies } = await admin
    .from("companies")
    .select("id, name, timezone");

  if (!companies?.length) return Response.json({ ok: true, sent: 0 });

  // All auth users — build id→email map (one call covers all companies)
  const { data: { users: authUsers } } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const emailMap = new Map(authUsers.map(u => [u.id, u.email ?? ""]));

  let totalSent = 0;

  for (const company of companies) {
    const tz   = company.timezone ?? "America/New_York";
    const hour = getLocalHour(now, tz);
    if (hour !== 8) continue;

    const localDate = getLocalDate(now, tz);
    const dueTypes  = getDueReportTypes(localDate);

    // All active users in this company
    const { data: users } = await admin
      .from("users")
      .select("id, full_name, access_role, app_sales_coach, app_training_coach, app_underwriting, notify_reports")
      .eq("company_id", company.id)
      .eq("is_active", true);

    if (!users?.length) continue;

    // Only admins with report notifications enabled
    const admins = users.filter(u =>
      (u.access_role === "admin" || u.access_role === "super_admin") &&
      (u.notify_reports !== false)
    );

    for (const reportType of dueTypes) {
      const period      = getPeriodBounds(reportType, localDate);
      const reportLabel = REPORT_LABELS[reportType];

      // ── Sales Coach ───────────────────────────────────────────────────────
      const scEnabled = users.some(u => u.app_sales_coach || u.access_role === "admin" || u.access_role === "super_admin");
      if (scEnabled) {
        const { data: scCalls } = await admin
          .from("live_calls")
          .select("id, user_id, score, scorable, direction, duration_sec, call_result, created_at, evaluation, agent:users(full_name, agent_type)")
          .eq("company_id", company.id)
          .gte("created_at", period.from)
          .lte("created_at", period.to);

        if (scCalls?.length) {
          // Admins → team report
          for (const u of admins) {
            const email = emailMap.get(u.id);
            if (!email) continue;
            try {
              await getResend().emails.send({
                from:    FROM_EMAIL,
                to:      email,
                subject: `Sales Coach Team Report — ${period.label}`,
                html:    scTeamTemplate(company.name, period, scCalls as any, reportLabel),
              });
              totalSent++;
            } catch (e) {
              console.error("[email-reports] SC team send failed:", e);
            }
          }

          // Reps → individual report (includes admins who are also active reps)
          const scReps = users.filter(u => u.access_role !== "super_admin" && u.app_sales_coach);
          for (const u of scReps) {
            const repCalls = scCalls.filter(c => c.user_id === u.id);
            if (!repCalls.length) continue;
            const email = emailMap.get(u.id);
            if (!email) continue;
            const repHtml = scRepTemplate(u.full_name ?? "Agent", company.name, period, repCalls as any, reportLabel);
            try {
              await getResend().emails.send({
                from:    FROM_EMAIL,
                to:      email,
                subject: `Your Sales Coach Report — ${period.label}`,
                html:    repHtml,
              });
              totalSent++;
            } catch (e) {
              console.error("[email-reports] SC rep send failed:", e);
            }
            // Send copy to admins so they can see each rep's individual report
            for (const a of admins) {
              if (a.id === u.id) continue; // already got their own copy above
              const adminEmail = emailMap.get(a.id);
              if (!adminEmail) continue;
              try {
                await getResend().emails.send({
                  from:    FROM_EMAIL,
                  to:      adminEmail,
                  subject: `[Team] ${u.full_name ?? "Agent"} — Sales Coach Report — ${period.label}`,
                  html:    repHtml,
                });
                totalSent++;
              } catch (e) {
                console.error("[email-reports] SC rep→admin copy failed:", e);
              }
            }
          }
        }
      }

      // ── Training Coach ────────────────────────────────────────────────────
      const tcEnabled = users.some(u => u.app_training_coach || u.access_role === "admin" || u.access_role === "super_admin");
      if (tcEnabled) {
        const { data: tcCalls } = await admin
          .from("training_calls")
          .select("id, user_id, score, scorable, call_result, created_at, evaluation, agent:users(full_name, agent_type), ai_agent:training_ai_agents(agent_name)")
          .eq("company_id", company.id)
          .gte("created_at", period.from)
          .lte("created_at", period.to);

        if (tcCalls?.length) {
          for (const u of admins) {
            const email = emailMap.get(u.id);
            if (!email) continue;
            try {
              await getResend().emails.send({
                from:    FROM_EMAIL,
                to:      email,
                subject: `Training Coach Team Report — ${period.label}`,
                html:    tcTeamTemplate(company.name, period, tcCalls as any, reportLabel),
              });
              totalSent++;
            } catch (e) {
              console.error("[email-reports] TC team send failed:", e);
            }
          }

          // Reps → individual report (includes admins who are also active reps)
          const tcReps = users.filter(u => u.access_role !== "super_admin" && u.app_training_coach);
          for (const u of tcReps) {
            const repCalls = tcCalls.filter(c => c.user_id === u.id);
            if (!repCalls.length) continue;
            const email = emailMap.get(u.id);
            if (!email) continue;
            const repHtml = tcRepTemplate(u.full_name ?? "Agent", company.name, period, repCalls as any, reportLabel);
            try {
              await getResend().emails.send({
                from:    FROM_EMAIL,
                to:      email,
                subject: `Your Training Report — ${period.label}`,
                html:    repHtml,
              });
              totalSent++;
            } catch (e) {
              console.error("[email-reports] TC rep send failed:", e);
            }
            // Send copy to admins
            for (const a of admins) {
              if (a.id === u.id) continue;
              const adminEmail = emailMap.get(a.id);
              if (!adminEmail) continue;
              try {
                await getResend().emails.send({
                  from:    FROM_EMAIL,
                  to:      adminEmail,
                  subject: `[Team] ${u.full_name ?? "Agent"} — Training Report — ${period.label}`,
                  html:    repHtml,
                });
                totalSent++;
              } catch (e) {
                console.error("[email-reports] TC rep→admin copy failed:", e);
              }
            }
          }
        }
      }

      // ── Deal Underwriting ─────────────────────────────────────────────────
      const { data: deals } = await admin
        .from("deals")
        .select("id, address, recommendation, arv_low, arv_high, max_offer, created_at, user_id")
        .eq("company_id", company.id)
        .eq("status", "completed")
        .gte("created_at", period.from)
        .lte("created_at", period.to);

      if (deals?.length) {
        // Build deals with user names attached for the team report
        const dealsWithNames = deals.map(d => ({
          ...d,
          user_name: users.find(u => u.id === d.user_id)?.full_name ?? null,
        }));

        // Admins → one consolidated team report with all deals
        for (const u of admins) {
          const email = emailMap.get(u.id);
          if (!email) continue;
          try {
            await getResend().emails.send({
              from:    FROM_EMAIL,
              to:      email,
              subject: `Deal Underwriting Team Report — ${period.label}`,
              html:    uwTeamTemplate(company.name, period, dealsWithNames as any, reportLabel),
            });
            totalSent++;
          } catch (e) {
            console.error("[email-reports] UW team send failed:", e);
          }
        }

        // Individual reps → only their own deals
        const dealsByUser = new Map<string, typeof deals>();
        for (const deal of deals) {
          const uid = deal.user_id as string;
          if (!dealsByUser.has(uid)) dealsByUser.set(uid, []);
          dealsByUser.get(uid)!.push(deal);
        }

        for (const [userId, userDeals] of dealsByUser) {
          const u = users.find(u => u.id === userId);
          if (!u || u.access_role === "super_admin") continue;
          const email = emailMap.get(userId);
          if (!email) continue;
          const repHtml = uwTemplate(u.full_name ?? "User", company.name, period, userDeals as any, reportLabel);
          try {
            await getResend().emails.send({
              from:    FROM_EMAIL,
              to:      email,
              subject: `Deal Underwriting Report — ${period.label}`,
              html:    repHtml,
            });
            totalSent++;
          } catch (e) {
            console.error("[email-reports] UW rep send failed:", e);
          }
          // Send copy to admins
          for (const a of admins) {
            if (a.id === u.id) continue;
            const adminEmail = emailMap.get(a.id);
            if (!adminEmail) continue;
            try {
              await getResend().emails.send({
                from:    FROM_EMAIL,
                to:      adminEmail,
                subject: `[Team] ${u.full_name ?? "User"} — Deal Underwriting Report — ${period.label}`,
                html:    repHtml,
              });
              totalSent++;
            } catch (e) {
              console.error("[email-reports] UW rep→admin copy failed:", e);
            }
          }
        }
      }
    }
  }

  console.log(`[email-reports] cron complete — sent ${totalSent} emails`);
  return Response.json({ ok: true, sent: totalSent });
}
