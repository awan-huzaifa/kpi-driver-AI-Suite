# Webhook: `dispo_leads`

**GHL Folder:** `00 - Notifications & Contact/Opps / 03 - Potential Buyers / 00.0 - Potential Buyer Created`  
**Automation:** `00.0 - Potential Buyer Created`  
**Endpoint:** `POST /api/kpi/ingest`  
**Header:** `x-webhook-secret: <KPI_WEBHOOK_SECRET>`  
**kpi_type:** `DISPO` · **kpi_name:** `lead`

---

## Standard Fields (GHL sends automatically)

| Body field | Example value | Maps to (`kpi_events`) |
|---|---|---|
| `body.contact_id` | `TBIZckotpwqddCNae2tN` | `contact_id` |
| `body.location.id` | `HbeHSpKVWHt37YclS9RR` | `location_id` → resolves `company_id` |
| `body.full_name` | `test ai suite` | `contact_name` |
| `body.email` | `aisuite@gmail.com` | `contact_email` |
| `body.date_created` | `2026-10-10T18:46:59.174Z` | `metadata.date_created` |
| `body.contact_type` | `lead` | `contact_type` |

---

## Custom Fields — Shared with `acq_leads`

| customData key | GHL merge tag | Maps to (`kpi_events`) |
|---|---|---|
| `type` | `dispo_leads` *(hardcoded)* | `metadata.source_automation` |
| `crmlink` | `{{contact.crm_link}}` | `crm_link` |
| `datekpi` | `{{contact.date_kpi}}` | `occurred_at` |
| `kpi` | `{{contact.kpi}}` | `metadata.kpi_raw` |
| `phone` | `{{contact.phone}}` | `contact_phone` |
| `address` | `{{contact.full_address_2}}` | `contact_address` |
| `leadsource` | `{{contact.lead_source}}` | `lead_source` |
| `campaign` | `{{contact.campaign}}` | `campaign` |
| `callcount` | `{{contact.call_count}}` | `call_count` |
| `stage` | `{{contact.stage}}` | `stage` |
| `pipeline` | `{{contact.pipeline}}` | `pipeline` |
| `quality` | `{{contact.quality}}` | `quality` |
| `score` | `{{contact.score}}` | `score` |
| `feedback` | `{{contact.feedback}}` | `feedback` |
| `agent` | `{{contact.lead_agent}}` | `agent_name` |
| `user` | `{{user.name}}` | `ghl_user_name` |
| `acqmanager` | `{{contact.acq_manager}}` | `acq_manager` |
| `acqleadmanager` | `{{contact.acq_lead_manager}}` | `acq_lead_manager` |
| `dispomanager` | `{{contact.dispo_manager}}` | `dispo_manager` |
| `dispoleadmanager` | `{{contact.dispo_lead_manager}}` | `dispo_lead_manager` |
| `transactioncoordinator` | `{{contact.transaction_coordinator}}` | `transaction_coordinator` |
| `underwriter` | `{{contact.underwriter}}` | `underwriter` |
| `initialexitstrategy` | `{{contact.initial_exit_strategy}}` | `initial_exit_strategy` |
| `finalexitstrategy` | `{{contact.final_exit_strategy}}` | `final_exit_strategy` |
| `temperature` | `{{contact.temperature}}` | `temperature` |
| `appointmentdateandtime` | `{{appointment.start_time}}` | `appointment_at` |
| `reduction` | `{{contact.reduction}}` | `reduction` |
| `actualprofit` | `{{contact.actual_profit}}` | `actual_profit` |
| `potentialprofit` | `{{contact.potential_profit}}` | `potential_profit` |
| `marketingprice` | `{{contact.marketing_price}}` | `marketing_price` |

---

## Custom Fields — DISPO Only

| customData key | GHL merge tag | Maps to (`kpi_events`) |
|---|---|---|
| `addressinterested` | `{{contact.addresses_interested_in}}` | `address_interested_in` |
| `potentialbuyercity` | `{{contact.potential_buyer_city}}` | `potential_buyer_city` |
| `potentialbuyerstate` | `{{contact.potential_buyer_state}}` | `potential_buyer_state` |
| `currentshowingaddress` | `{{contact.current_showing_address}}` | `current_showing_address` |
| `currentshowingphonenumber` | `{{contact.current_showing_phone_number}}` | `current_showing_phone` |

---

## Notes

- `dispomanager` is the primary attribution field — route attempts `user_id` resolution via `ilike` match on `users.full_name`
- Empty `""` and `"\"\""` values are sanitized to `null`
- `datekpi` falls back to ingest timestamp if empty

---

## Status

- [x] Built
- [x] Tested (fields verified via n8n visualization 2026-10-11)
- [ ] Live (pending migration `058_kpi_events_new_columns.sql`)
