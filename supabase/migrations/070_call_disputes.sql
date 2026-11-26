-- Call score dispute system
create table if not exists public.call_disputes (
  id                uuid        primary key default gen_random_uuid(),
  call_id           uuid        not null references public.live_calls(id) on delete cascade,
  user_id           uuid        not null references public.users(id) on delete cascade,
  company_id        uuid        not null references public.companies(id) on delete cascade,
  category          text        not null,
  reason            text        not null,
  status            text        not null default 'pending'
                                check (status in ('pending','accepted','rejected')),
  resolution_reason text,
  resolved_by       uuid        references public.users(id),
  created_at        timestamptz not null default now(),
  resolved_at       timestamptz
);

-- One dispute per call
create unique index if not exists call_disputes_call_id_idx on public.call_disputes(call_id);

create index if not exists call_disputes_company_status_idx on public.call_disputes(company_id, status);
create index if not exists call_disputes_user_id_idx on public.call_disputes(user_id);

alter table public.call_disputes enable row level security;

-- Rep can see their own disputes
create policy "user sees own disputes"
  on public.call_disputes for select
  using (user_id = auth.uid());

-- Rep can submit a dispute for their own call
create policy "user can insert own dispute"
  on public.call_disputes for insert
  with check (user_id = auth.uid());
