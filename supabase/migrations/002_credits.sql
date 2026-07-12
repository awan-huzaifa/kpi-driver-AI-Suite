-- Credit balance per user
create table if not exists public.user_balances (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  balance    numeric(12,6) not null default 0 check (balance >= 0),
  updated_at timestamptz default now() not null
);

-- Audit log for top-ups and deductions
create table if not exists public.balance_transactions (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid references auth.users(id) on delete cascade not null,
  type                     text not null check (type in ('topup', 'deduction')),
  amount                   numeric(12,6) not null,
  description              text,
  stripe_payment_intent_id text,
  created_at               timestamptz default now() not null
);

alter table public.user_balances enable row level security;
alter table public.balance_transactions enable row level security;

create policy "Users can view own balance"
  on public.user_balances for select
  using (auth.uid() = user_id);

create policy "Users can view own transactions"
  on public.balance_transactions for select
  using (auth.uid() = user_id);

create index on public.balance_transactions (user_id, created_at desc);

-- Atomically add balance after a successful top-up (called by webhook via service role)
create or replace function add_balance(
  p_user_id                uuid,
  p_amount                 numeric,
  p_description            text,
  p_stripe_payment_intent  text default null
) returns numeric
language plpgsql security definer as $$
declare
  v_new_balance numeric;
begin
  insert into public.user_balances (user_id, balance, updated_at)
  values (p_user_id, p_amount, now())
  on conflict (user_id) do update
    set balance    = public.user_balances.balance + p_amount,
        updated_at = now()
  returning balance into v_new_balance;

  insert into public.balance_transactions (user_id, type, amount, description, stripe_payment_intent_id)
  values (p_user_id, 'topup', p_amount, p_description, p_stripe_payment_intent);

  return v_new_balance;
end;
$$;

-- Atomically deduct balance for a workflow run — raises exception if insufficient
create or replace function deduct_balance(
  p_user_id    uuid,
  p_amount     numeric,
  p_description text
) returns numeric
language plpgsql security definer as $$
declare
  v_new_balance numeric;
begin
  update public.user_balances
  set balance    = balance - p_amount,
      updated_at = now()
  where user_id = p_user_id
    and balance >= p_amount
  returning balance into v_new_balance;

  if not found then
    raise exception 'insufficient_balance';
  end if;

  insert into public.balance_transactions (user_id, type, amount, description)
  values (p_user_id, 'deduction', p_amount, p_description);

  return v_new_balance;
end;
$$;
