import { createAdminClient } from "@/lib/supabase/admin";
import { chargeWithSavedMethod, TOP_UP_OPTIONS } from "@kpidriver/stripe/topup";
import { listPaymentMethods } from "@kpidriver/stripe/payment-methods";

export async function autoTopupIfNeeded(companyId: string, newBalance: number): Promise<void> {
  const admin = createAdminClient();

  const { data: company } = await admin
    .from("companies")
    .select("auto_topup_enabled, auto_topup_threshold, auto_topup_price_id, stripe_customer_id")
    .eq("id", companyId)
    .single();

  if (!company?.auto_topup_enabled) return;
  if (company.auto_topup_threshold == null || newBalance >= Number(company.auto_topup_threshold)) return;
  if (!company.auto_topup_price_id || !company.stripe_customer_id) return;

  const option = TOP_UP_OPTIONS.find(o => o.priceId === company.auto_topup_price_id);
  if (!option) return;

  const { paymentMethods, defaultPaymentMethodId } = await listPaymentMethods(company.stripe_customer_id);
  const defaultPm = defaultPaymentMethodId
    ? paymentMethods.find(pm => pm.id === defaultPaymentMethodId)
    : null;

  if (!defaultPm) {
    console.warn(`[auto-topup] no default payment method for company ${companyId}`);
    return;
  }

  try {
    const intent = await chargeWithSavedMethod(
      company.stripe_customer_id,
      defaultPm.id,
      option.amount * 100,
      companyId,
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
