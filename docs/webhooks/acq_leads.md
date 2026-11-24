# Webhook: `acq_leads`

**GHL Folder:** `00 - Notifications & Contact/Opps / 02 - Lead Contacts`  
**Automations:** `08.1 - Lead Submission Form` · `08.2 - CSV Lead Submission`  
**Endpoint:** `POST /api/kpi/ingest`  
**Header:** `x-webhook-secret: <KPI_WEBHOOK_SECRET>`  
**kpi_type:** `ACQ` · **kpi_name:** `lead`

---

## Standard Fields (GHL sends automatically)

These come on the top-level body — do NOT add to customData in GHL.

| Body field | Example value | Maps to (`kpi_events`) |
|---|---|---|
| `body.contact_id` | `TBIZckotpwqddCNae2tN` | `contact_id` |
| `body.location.id` | `HbeHSpKVWHt37YclS9RR` | `location_id` → resolves `company_id` |
| `body.full_name` | `test ai suite` | `contact_name` |
| `body.email` | `aisuite@gmail.com` | `contact_email` |
| `body.date_created` | `2026-10-10T18:46:59.174Z` | `metadata.date_created` |
| `body.contact_type` | `lead` | `contact_type` |

---

## Custom Fields (configured manually in GHL customData)

These must be added in GHL's webhook customData configuration using merge tags.

| customData key | GHL merge tag | Maps to (`kpi_events`) | Notes |
|---|---|---|---|
| `type` | `acq_leads` *(hardcoded — not a merge tag)* | `metadata.source_automation` | Required — route 400s without it |
| `crmlink` | `{{contact.crm_link}}` | `crm_link` | |
| `datekpi` | `{{contact.date_kpi}}` | `occurred_at` | Falls back to ingest time if empty |
| `kpi` | `{{contact.kpi}}` | `metadata.kpi_raw` | Raw GHL label e.g. `"lead"` |
| `phone` | `{{contact.phone}}` | `contact_phone` | |
| `address` | `{{contact.full_address_2}}` | `contact_address` | Property address, not mailing address |
| `leadsource` | `{{contact.lead_source}}` | `lead_source` | |
| `campaign` | `{{contact.campaign}}` | `campaign` | |
| `callcount` | `{{contact.call_count}}` | `call_count` | integer |
| `stage` | `{{contact.stage}}` | `stage` | |
| `pipeline` | `{{contact.pipeline}}` | `pipeline` | |
| `quality` | `{{contact.quality}}` | `quality` | `Pending / Qualified / Disqualified` |
| `score` | `{{contact.score}}` | `score` | numeric |
| `feedback` | `{{contact.feedback}}` | `feedback` | |
| `agent` | `{{contact.lead_agent}}` | `agent_name` | Marketing/lead agent |
| `user` | `{{user.name}}` | `ghl_user_name` | GHL user assigned to contact |
| `acqmanager` | `{{contact.acq_manager}}` | `acq_manager` | Used to resolve `user_id` via name match |
| `acqleadmanager` | `{{contact.acq_lead_manager}}` | `acq_lead_manager` | |
| `dispomanager` | `{{contact.dispo_manager}}` | `dispo_manager` | |
| `dispoleadmanager` | `{{contact.dispo_lead_manager}}` | `dispo_lead_manager` | |
| `transactioncoordinator` | `{{contact.transaction_coordinator}}` | `transaction_coordinator` | |
| `underwriter` | `{{contact.underwriter}}` | `underwriter` | |
| `initialexitstrategy` | `{{contact.initial_exit_strategy}}` | `initial_exit_strategy` | |
| `finalexitstrategy` | `{{contact.final_exit_strategy}}` | `final_exit_strategy` | |
| `temperature` | `{{contact.temperature}}` | `temperature` | e.g. `Hot / Warm / Cold` |
| `appointmentdateandtime` | `{{appointment.start_time}}` | `appointment_at` | |
| `reduction` | `{{contact.reduction}}` | `reduction` | numeric |
| `actualprofit` | `{{contact.actual_profit}}` | `actual_profit` | numeric |
| `potentialprofit` | `{{contact.potential_profit}}` | `potential_profit` | numeric |
| `marketingprice` | `{{contact.marketing_price}}` | `marketing_price` | numeric |

---

## Notes

- Empty string `""` and `"\"\""` (GHL placeholder for unset custom fields) are both treated as `null` — nothing bad is stored
- `acqmanager` is the primary attribution field — route attempts to resolve it to a `user_id` via `ilike` match on `users.full_name` scoped to the company
- `datekpi` should be the date the KPI action occurred (not today's date) — if the custom field is not set in GHL, `occurred_at` falls back to the ingest timestamp

---

## Status

- [x] Built
- [x] Tested (fields verified via debug log 2026-10-11)
- [ ] Live (pending migration `058_kpi_events_new_columns.sql`)
