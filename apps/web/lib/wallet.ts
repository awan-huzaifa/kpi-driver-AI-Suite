import { createAdminClient } from "@/lib/supabase/admin";
import { chargeWithSavedMethod, TOP_UP_OPTIONS } from "@kpidriver/stripe/topup";
import { listPaymentMethods } from "@kpidriver/stripe/payment-methods";

export async function autoTopupIfNeeded(companyId: string, newBalance: number): Promise<void> {
  const admin = createAdminClient();

  const { data: company } = await admin
    .from("companies")
    .select("auto_topup_enabled, auto_topup_threshold, auto_topup_price_id, stripe_customer_id, name, last_auto_topup_at")
    .eq("id", companyId)
    .single();

  if (!company?.auto_topup_enabled) return;
  if (company.auto_topup_threshold == null || newBalance >= Number(company.auto_topup_threshold)) return;
  if (!company.auto_topup_price_id || !company.stripe_customer_id) return;

  const option = TOP_UP_OPTIONS.find(o => o.priceId === company.auto_topup_price_id);
  if (!option) return;

  // Atomic claim: only one worker can win this UPDATE. If last_auto_topup_at was set
  // within the last 5 minutes, the WHERE clause matches 0 rows → this worker skips.
  const { data: claimed } = await admin
    .from("companies")
    .update({ last_auto_topup_at: new Date().toISOString() })
    .eq("id", companyId)
    .or("last_auto_topup_at.is.null,last_auto_topup_at.lt." + new Date(Date.now() - 5 * 60 * 1000).toISOString())
    .select("id");

  if (!claimed?.length) {
    console.log(`[auto-topup] skipped — another top-up already fired within 5 min for company ${companyId}`);
    return;
  }

  const { paymentMethods, defaultPaymentMethodId } = await listPaymentMethods(company.stripe_customer_id);
  const defaultPm = defaultPaymentMethodId
    ? paymentMethods.find(pm => pm.id === defaultPaymentMethodId)
    : null;

  if (!defaultPm) {
    console.warn(`[auto-topup] no default payment method for company ${companyId}`);
    return;
  }

  try {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
    const companyName = company.name ?? 'Unknown Company'
    const description = `Auto-Recharge for Sub-Account - ${companyName} of USD ${option.amount} was successfully added to the wallet. Please, check the billing page for more details: ${appUrl}/billing`

    const intent = await chargeWithSavedMethod(
      company.stripe_customer_id,
      defaultPm.id,
      option.amount * 100,
      companyId,
      description,
    );

    const { error } = await admin.rpc("add_wallet_balance", {
      p_company_id:            companyId,
      p_amount_usd:            option.amount,
      p_description:           `Auto top-up (${option.label})`,
      p_stripe_payment_intent: intent.id,
    });

    if (error) console.error("[auto-topup] wallet credit failed:", error.message);
    else console.log(`[auto-topup] ${option.label} charged for company ${companyId} — triggered at $${newBalance.toFixed(2)}`);
  } catch (err) {
    console.error(`[auto-topup] charge failed for company ${companyId}:`, err);
  }
}
