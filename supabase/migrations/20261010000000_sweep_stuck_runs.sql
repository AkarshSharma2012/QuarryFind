-- BUG-006: a batch that hits the Edge Function CPU/wall limit is killed and
-- never records its remaining modules, so the run would sit at "running".
-- Close any run older than 3 minutes: unreported modules count as failed
-- (shown as "didn't answer"), so the result is honest partial coverage.
create function public.sweep_stuck_runs() returns int
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  update search_runs set
    modules_failed = modules_failed + greatest(0, modules_total - modules_completed),
    modules_completed = greatest(modules_completed, modules_total),
    status = 'completed',
    completed_at = now()
  where status = 'running' and created_at < now() - interval '3 minutes';
  get diagnostics n = row_count;
  return n;
end $$;
revoke execute on function public.sweep_stuck_runs() from public, anon, authenticated;

select cron.schedule('sweep-stuck-runs', '* * * * *', $$ select public.sweep_stuck_runs(); $$);
-- The 10-minute reaper stays as a last resort.
