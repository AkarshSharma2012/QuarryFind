-- Fix #2: users report a wrong result; counts feed the public source status page (fix #3).
create table public.result_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  module text not null check (length(module) between 1 and 120),
  kind text not null check (kind in ('not_this_account', 'account_missing', 'other')),
  query_type text not null check (query_type in ('email','username','domain')),
  note text not null default '' check (length(note) <= 500),
  created_at timestamptz not null default now(),
  unique (user_id, module, query_type, created_at)
);
create index on public.result_reports (module, created_at desc);
alter table public.result_reports enable row level security;
create policy "insert own reports" on public.result_reports for insert with check (user_id = auth.uid());
create policy "read own reports" on public.result_reports for select using (user_id = auth.uid());

-- Public, anonymous-safe summary: per module, reports in the last 30 days (no user data).
create view public.module_report_counts with (security_invoker = false) as
  select module, count(*)::int as reports_30d
  from public.result_reports
  where created_at > now() - interval '30 days'
  group by module;
grant select on public.module_report_counts to anon, authenticated;

-- Health rows are written by the fixture job; the status page reads them anonymously.
grant select on public.module_health to anon, authenticated;
