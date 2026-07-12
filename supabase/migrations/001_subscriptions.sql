-- Subscription records linked to auth.users
create table if not exists public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid references auth.users(id) on delete cascade not null,
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  plan_id                text check (plan_id in ('starter', 'pro')),
  status                 text,
  current_period_end     timestamptz,
  created_at             timestamptz default now() not null,
  updated_at             timestamptz default now() not null,

  constraint subscriptions_user_id_key unique (user_id)
);

-- RLS: users can only read their own subscription row
alter table public.subscriptions enable row level security;

create policy "Users can view own subscription"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Service role (webhook handler) writes via service key, bypasses RLS
-- No insert/update policies needed for anon/authenticated roles

-- Index for webhook lookups by Stripe IDs
create index on public.subscriptions (stripe_customer_id);
create index on public.subscriptions (stripe_subscription_id);
