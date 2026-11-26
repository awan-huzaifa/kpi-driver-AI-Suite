-- Add QA flag to users (admin-level capability to review and resolve call score disputes)
alter table public.users add column if not exists is_qa boolean not null default false;
