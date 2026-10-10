-- Client-driven batches: the run stores the exact module list chosen at start,
-- so any caller (browser, API, retry) can ask for a slice or for whatever is
-- still unreported, and every batch is an ordinary request with its own CPU budget.
alter table public.search_runs add column module_names text[] not null default '{}';

-- Modules of a run that haven't reported yet (for resume / retry).
create function public.unreported_modules(p_run uuid, p_limit int)
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(n), '{}') from (
    select n from search_runs r, unnest(r.module_names) as n
    where r.id = p_run
      and not exists (select 1 from module_statuses s where s.run_id = p_run and s.module = n)
    limit p_limit
  ) x;
$$;
revoke execute on function public.unreported_modules(uuid,int) from public, anon, authenticated;
