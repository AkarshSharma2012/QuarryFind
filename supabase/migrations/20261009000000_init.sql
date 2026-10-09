-- OsintSet initial schema. All times timestamptz (UTC).
-- Free and unlimited: no plans, credits or payments. Abuse protection is a
-- per-minute rate limit only.
-- Access: Postgres RLS. Users read their own rows; engine writes go through
-- security definer functions callable only by the service role.

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

-- ── API keys (free for every user) ───────────────────────────────────────
create table public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null default 'Default' check (length(name) between 1 and 60),
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
  deep boolean not null default false,
  via text not null default 'web' check (via in ('web','api')),
  status text not null default 'running' check (status in ('running','completed','failed')),
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
create trigger t_runs before update on public.search_runs for each row execute function public.touch_updated_at();
create trigger t_cases before update on public.cases for each row execute function public.touch_updated_at();
create trigger t_case_items before update on public.case_items for each row execute function public.touch_updated_at();

-- ── new auth user → users row ────────────────────────────────────────────
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, display_name, avatar_url)
  values (new.id, coalesce(new.email,''),
          new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

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

-- ── start a search. Raises rate_limited or too_many_running. ─────────────
create function public.start_search(p_user uuid, p_type text, p_query text,
                                    p_deep boolean, p_via text, p_per_minute int default 10)
returns public.search_runs
language plpgsql security definer set search_path = public as $$
declare run public.search_runs; running int;
begin
  if not public.hit_rate_limit('search:' || p_user, p_per_minute) then
    raise exception 'rate_limited';
  end if;
  select count(*) into running from search_runs
   where user_id = p_user and status = 'running' and created_at > now() - interval '10 minutes';
  if running >= 3 then raise exception 'too_many_running'; end if;

  insert into search_runs (user_id, type, query, deep, via)
  values (p_user, p_type, p_query, p_deep and p_type = 'username', p_via)
  returning * into run;
  return run;
end $$;

-- ── finish a run (idempotent) ────────────────────────────────────────────
create function public.finish_run(p_run uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update search_runs set status = p_status, completed_at = now()
   where id = p_run and status = 'running';
end $$;

-- ── record one module outcome (and its result rows) atomically ───────────
-- Returns true when this call completed the run.
create function public.record_module(p_run uuid, p_module text, p_outcome text,
                                     p_detail text, p_latency int, p_results jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
declare r public.search_runs; item jsonb; n int;
begin
  select * into r from search_runs where id = p_run for update;
  if not found or r.status <> 'running' then return false; end if;
  insert into module_statuses (run_id, module, outcome, detail, latency_ms)
  values (p_run, p_module, p_outcome, left(p_detail, 300), p_latency)
  on conflict (run_id, module) do nothing;
  if not found then return false; end if;          -- duplicate delivery: ignore

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
  where id = p_run
  returning * into r;

  if r.modules_total > 0 and r.modules_completed >= r.modules_total then
    update search_runs set status = 'completed', completed_at = now() where id = p_run;
    return true;
  end if;
  return false;
end $$;

-- ── RLS ──────────────────────────────────────────────────────────────────
alter table public.users            enable row level security;
alter table public.api_keys         enable row level security;
alter table public.search_runs      enable row level security;
alter table public.search_results   enable row level security;
alter table public.module_statuses  enable row level security;
alter table public.module_health    enable row level security;
alter table public.cases            enable row level security;
alter table public.case_items       enable row level security;
alter table public.rate_limits      enable row level security;

create policy "own user"        on public.users            for select using (id = auth.uid());
create policy "own keys"        on public.api_keys         for select using (user_id = auth.uid());
create policy "own runs"        on public.search_runs      for select using (user_id = auth.uid());
create policy "own results"     on public.search_results   for select using (user_id = auth.uid());
create policy "own statuses"    on public.module_statuses  for select
  using (exists (select 1 from public.search_runs r where r.id = run_id and r.user_id = auth.uid()));
create policy "health public"   on public.module_health    for select using (true);
create policy "own cases"       on public.cases            for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own case items"  on public.case_items       for all using (user_id = auth.uid())
  with check (user_id = auth.uid() and exists (select 1 from public.cases c where c.id = case_id and c.user_id = auth.uid()));
-- rate_limits: no policies → service role only.

revoke execute on function public.start_search(uuid,text,text,boolean,text,int) from public, anon, authenticated;
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
-- Fail runs stuck in 'running' for >10 minutes.
select cron.schedule('reap-stuck-runs', '*/5 * * * *', $$
  update public.search_runs set status = 'failed', completed_at = now()
   where status = 'running' and created_at < now() - interval '10 minutes';
$$);
