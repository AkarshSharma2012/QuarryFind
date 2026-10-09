-- OsintSet initial schema. All times timestamptz (UTC). Money in integer cents.
-- Access: Postgres RLS. Users read their own rows; every write that touches
-- credits goes through a security definer function so it is atomic.

create extension if not exists pgcrypto;
create extension if not exists pg_cron;

-- ── users ────────────────────────────────────────────────────────────────
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── plans and billing ────────────────────────────────────────────────────
create table public.plans (
  id text primary key check (id in ('free','starter','basic','pro')),
  name text not null,
  monthly_credits int not null check (monthly_credits >= 0),
  price_cents int not null check (price_cents >= 0),
  currency text not null default 'usd',
  premium_allowed boolean not null default false,
  api_allowed boolean not null default false,
  stripe_price_id text
);

insert into public.plans (id, name, monthly_credits, price_cents, premium_allowed, api_allowed) values
  ('free',    'Free',      0,    0, false, false),
  ('starter', 'Starter',  25, 1499, false, false),
  ('basic',   'Basic',    75, 2499, true,  false),
  ('pro',     'Pro',     150, 4999, true,  true);

create table public.billing_accounts (
  user_id uuid primary key references public.users(id) on delete cascade,
  plan_id text not null default 'free' references public.plans(id),
  status text not null default 'inactive'
    check (status in ('inactive','trialing','active','past_due','canceled')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  period_start timestamptz,
  period_end timestamptz,
  credits_allowed int not null default 0 check (credits_allowed >= 0),
  credits_used int not null default 0 check (credits_used >= 0),
  api_credits int not null default 0,               -- prepaid, never resets; may go negative after a refund
  use_subscription_fallback boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  bucket text not null check (bucket in ('subscription','api')),
  delta int not null,
  reason text not null check (reason in ('search','premium_search','refund','topup','reset','adjustment')),
  run_id uuid,
  stripe_event_id text unique,                       -- idempotency for webhook-driven rows
  created_at timestamptz not null default now()
);
create index on public.credit_ledger (user_id, created_at desc);
create index on public.credit_ledger (run_id);

create table public.stripe_events (                  -- webhook idempotency
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);

-- ── API keys ─────────────────────────────────────────────────────────────
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null default 'Default',
  prefix text not null,                              -- first 12 chars, shown in UI
  key_hash text not null unique,                     -- sha256 hex of the full key
  last_used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index on public.api_keys (user_id);

-- ── searches ─────────────────────────────────────────────────────────────
create table public.search_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null check (type in ('email','username','domain')),
  query text not null check (length(query) between 1 and 320),
  premium boolean not null default false,
  via text not null default 'web' check (via in ('web','api')),
  status text not null default 'running' check (status in ('running','completed','failed')),
  credits_charged int not null default 0,
  credit_bucket text check (credit_bucket in ('subscription','api')),
  modules_total int not null default 0,
  modules_completed int not null default 0,
  modules_with_hits int not null default 0,
  modules_failed int not null default 0,
  results_purged_at timestamptz,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now()
);
create index on public.search_runs (user_id, created_at desc);
create index on public.search_runs (status, created_at);

create table public.search_results (
  run_id uuid not null references public.search_runs(id) on delete cascade,
  seq int not null,                                  -- sequential per run (API "id")
  user_id uuid not null references public.users(id) on delete cascade,
  type text not null default 'account',
  platform text,
  category text,
  value text,
  confidence real not null default 1.0 check (confidence between 0 and 1),
  source text not null,                              -- module name
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now(),
  primary key (run_id, seq)
);
create index on public.search_results (user_id);
create index on public.search_results (created_at);

create table public.module_statuses (
  run_id uuid not null references public.search_runs(id) on delete cascade,
  module text not null,
  outcome text not null check (outcome in ('hit','absent','inconclusive','error')),
  detail text,
  latency_ms int,
  created_at timestamptz not null default now(),
  primary key (run_id, module)
);

-- ── module health (fixture checks) ───────────────────────────────────────
create table public.module_health (
  module text primary key,
  state text not null check (state in ('ok','degraded','broken','disabled')),
  positive_ok boolean,
  negative_ok boolean,
  checked_at timestamptz not null default now(),
  note text
);

-- ── cases (saved findings; survive the result purge) ─────────────────────
create table public.cases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 120),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.cases (user_id, updated_at desc);

create table public.case_items (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  source_run_id uuid references public.search_runs(id) on delete set null,
  query_type text not null,
  query text not null,
  platform text,
  value text,
  source text not null,
  confidence real not null default 1.0,
  metadata jsonb not null default '{}',              -- snapshot, not a reference
  note text not null default '',
  saved_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.case_items (case_id, saved_at desc);
create index on public.case_items (user_id);
create unique index case_items_no_dupes on public.case_items (case_id, source, coalesce(value,''));

-- ── rate limits (fixed one-minute windows) ───────────────────────────────
create table public.rate_limits (
  bucket text not null,                              -- e.g. 'search:<user_id>'
  window_start timestamptz not null,
  hits int not null default 0,
  primary key (bucket, window_start)
);

-- ── updated_at trigger ───────────────────────────────────────────────────
create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger t_users before update on public.users for each row execute function public.touch_updated_at();
create trigger t_billing before update on public.billing_accounts for each row execute function public.touch_updated_at();
create trigger t_runs before update on public.search_runs for each row execute function public.touch_updated_at();
create trigger t_cases before update on public.cases for each row execute function public.touch_updated_at();
create trigger t_case_items before update on public.case_items for each row execute function public.touch_updated_at();

-- ── new auth user → users + billing row ──────────────────────────────────
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, display_name, avatar_url)
  values (new.id, coalesce(new.email,''),
          new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  insert into public.billing_accounts (user_id) values (new.id);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── start a search: plan check + atomic credit charge ────────────────────
-- Raises: plan_required, insufficient_credits, insufficient_api_credits.
create function public.start_search(p_user uuid, p_type text, p_query text,
                                    p_premium boolean, p_via text)
returns public.search_runs
language plpgsql security definer set search_path = public as $$
declare
  b public.billing_accounts;
  pl public.plans;
  cost int;
  premium boolean := p_premium and p_type = 'username';   -- premium ignored for email/domain
  bucket text;
  run public.search_runs;
begin
  select * into b from billing_accounts where user_id = p_user for update;
  if not found then raise exception 'plan_required'; end if;
  select * into pl from plans where id = b.plan_id;

  if b.status not in ('active','trialing') or b.plan_id = 'free' then raise exception 'plan_required'; end if;
  if premium and not pl.premium_allowed then raise exception 'plan_required'; end if;
  if p_via = 'api' and not pl.api_allowed then raise exception 'plan_required'; end if;

  cost := case when premium then 2 else 1 end;

  if p_via = 'api' then
    if b.api_credits >= cost then
      bucket := 'api';
      update billing_accounts set api_credits = api_credits - cost where user_id = p_user;
    elsif b.use_subscription_fallback and b.credits_allowed - b.credits_used >= cost then
      bucket := 'subscription';
      update billing_accounts set credits_used = credits_used + cost where user_id = p_user;
    else
      raise exception 'insufficient_api_credits';
    end if;
  else
    if b.credits_allowed - b.credits_used < cost then raise exception 'insufficient_credits'; end if;
    bucket := 'subscription';
    update billing_accounts set credits_used = credits_used + cost where user_id = p_user;
  end if;

  insert into search_runs (user_id, type, query, premium, via, credits_charged, credit_bucket)
  values (p_user, p_type, p_query, premium, p_via, cost, bucket)
  returning * into run;

  insert into credit_ledger (user_id, bucket, delta, reason, run_id)
  values (p_user, bucket, -cost, case when premium then 'premium_search' else 'search' end, run.id);

  return run;
end $$;

-- ── finish a run; refund if it failed ────────────────────────────────────
create function public.finish_run(p_run uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
declare r public.search_runs;
begin
  update search_runs set status = p_status, completed_at = now()
   where id = p_run and status = 'running' returning * into r;
  if not found then return; end if;                -- already terminal: idempotent
  if p_status = 'failed' and r.credits_charged > 0 then
    if r.credit_bucket = 'api' then
      update billing_accounts set api_credits = api_credits + r.credits_charged where user_id = r.user_id;
    else
      update billing_accounts set credits_used = greatest(0, credits_used - r.credits_charged) where user_id = r.user_id;
    end if;
    insert into credit_ledger (user_id, bucket, delta, reason, run_id)
    values (r.user_id, r.credit_bucket, r.credits_charged, 'refund', r.id);
  end if;
end $$;

-- ── record one module outcome (and its result rows) atomically ───────────
create function public.record_module(p_run uuid, p_module text, p_outcome text,
                                     p_detail text, p_latency int, p_results jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare r public.search_runs; item jsonb; n int;
begin
  select * into r from search_runs where id = p_run for update;
  if not found or r.status <> 'running' then return; end if;
  insert into module_statuses (run_id, module, outcome, detail, latency_ms)
  values (p_run, p_module, p_outcome, p_detail, p_latency)
  on conflict (run_id, module) do nothing;
  if not found then return; end if;                -- duplicate delivery: ignore

  select coalesce(max(seq),0) into n from search_results where run_id = p_run;
  for item in select * from jsonb_array_elements(coalesce(p_results,'[]'::jsonb)) loop
    n := n + 1;
    insert into search_results (run_id, seq, user_id, type, platform, category, value, confidence, source, metadata)
    values (p_run, n, r.user_id, coalesce(item->>'type','account'), item->>'platform', item->>'category',
            item->>'value', coalesce((item->>'confidence')::real, 1.0), p_module,
            coalesce(item->'metadata','{}'::jsonb));
  end loop;

  update search_runs set
    modules_completed = modules_completed + 1,
    modules_with_hits = modules_with_hits + (case when p_outcome = 'hit' then 1 else 0 end),
    modules_failed = modules_failed + (case when p_outcome in ('inconclusive','error') then 1 else 0 end)
  where id = p_run;
end $$;

-- ── rate limit: returns true if allowed ──────────────────────────────────
create function public.hit_rate_limit(p_bucket text, p_limit int)
returns boolean language plpgsql security definer set search_path = public as $$
declare w timestamptz := date_trunc('minute', now()); h int;
begin
  insert into rate_limits (bucket, window_start, hits) values (p_bucket, w, 1)
  on conflict (bucket, window_start) do update set hits = rate_limits.hits + 1
  returning hits into h;
  return h <= p_limit;
end $$;

-- ── RLS ──────────────────────────────────────────────────────────────────
alter table public.users            enable row level security;
alter table public.plans            enable row level security;
alter table public.billing_accounts enable row level security;
alter table public.credit_ledger    enable row level security;
alter table public.stripe_events    enable row level security;
alter table public.api_keys         enable row level security;
alter table public.search_runs      enable row level security;
alter table public.search_results   enable row level security;
alter table public.module_statuses  enable row level security;
alter table public.module_health    enable row level security;
alter table public.cases            enable row level security;
alter table public.case_items       enable row level security;
alter table public.rate_limits      enable row level security;

create policy "own user"        on public.users            for select using (id = auth.uid());
create policy "own user update" on public.users            for update using (id = auth.uid()) with check (id = auth.uid());
create policy "plans public"    on public.plans            for select using (true);
create policy "own billing"     on public.billing_accounts for select using (user_id = auth.uid());
create policy "own ledger"      on public.credit_ledger    for select using (user_id = auth.uid());
create policy "own keys"        on public.api_keys         for select using (user_id = auth.uid());
create policy "own runs"        on public.search_runs      for select using (user_id = auth.uid());
create policy "own results"     on public.search_results   for select using (user_id = auth.uid());
create policy "own statuses"    on public.module_statuses  for select
  using (exists (select 1 from public.search_runs r where r.id = run_id and r.user_id = auth.uid()));
create policy "health public"   on public.module_health    for select using (true);
create policy "own cases"       on public.cases            for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own case items"  on public.case_items       for all using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.cases c where c.id = case_id and c.user_id = auth.uid()));
-- stripe_events, rate_limits: no policies → service role only.

revoke execute on function public.start_search(uuid,text,text,boolean,text) from public, anon, authenticated;
revoke execute on function public.finish_run(uuid,text) from public, anon, authenticated;
revoke execute on function public.record_module(uuid,text,text,text,int,jsonb) from public, anon, authenticated;
revoke execute on function public.hit_rate_limit(text,int) from public, anon, authenticated;

-- ── realtime: live result streaming to the web app ───────────────────────
alter publication supabase_realtime add table public.search_results, public.search_runs, public.module_statuses;

-- ── jobs ─────────────────────────────────────────────────────────────────
-- Purge findings 6h after creation; keep run metadata (history) 90 days.
select cron.schedule('purge-results', '7 * * * *', $$
  delete from public.module_statuses where created_at < now() - interval '6 hours';
  with gone as (delete from public.search_results where created_at < now() - interval '6 hours' returning run_id)
  update public.search_runs set results_purged_at = now()
   where id in (select distinct run_id from gone) and results_purged_at is null;
$$);
select cron.schedule('purge-history', '17 3 * * *', $$
  delete from public.search_runs where created_at < now() - interval '90 days';
  delete from public.rate_limits where window_start < now() - interval '1 hour';
$$);
-- Fail runs stuck in 'running' for >10 minutes (and refund them).
select cron.schedule('reap-stuck-runs', '*/5 * * * *', $$
  select public.finish_run(id, 'failed') from public.search_runs
   where status = 'running' and created_at < now() - interval '10 minutes';
$$);
