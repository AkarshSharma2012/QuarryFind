-- Engine support: platform label on module statuses, API key lookup, and
-- a helper the API uses to read a run as the key's owner.

alter table public.module_statuses add column platform text;

drop function public.record_module(uuid,text,text,text,int,jsonb);

-- Same as before, plus the module's human label.
create function public.record_module(p_run uuid, p_module text, p_platform text, p_outcome text,
                                     p_detail text, p_latency int, p_results jsonb)
returns boolean language plpgsql security definer set search_path = public as $$
declare r public.search_runs; item jsonb; n int;
begin
  select * into r from search_runs where id = p_run for update;
  if not found or r.status <> 'running' then return false; end if;
  insert into module_statuses (run_id, module, platform, outcome, detail, latency_ms)
  values (p_run, p_module, p_platform, p_outcome, left(p_detail, 300), p_latency)
  on conflict (run_id, module) do nothing;
  if not found then return false; end if;

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
revoke execute on function public.record_module(uuid,text,text,text,text,int,jsonb) from public, anon, authenticated;

-- Resolve an API key hash to its owner and stamp last use. null = invalid.
create function public.api_key_owner(p_hash text)
returns uuid language plpgsql security definer set search_path = public as $$
declare u uuid;
begin
  update api_keys set last_used_at = now()
   where key_hash = p_hash and revoked_at is null
   returning user_id into u;
  return u;
end $$;
revoke execute on function public.api_key_owner(text) from public, anon, authenticated;

-- Users may delete their own cases/items (policy "for all" covers it) and
-- revoke their own keys only through the api-keys function.

-- Saving or removing a finding bumps its case to the top of the list.
create function public.touch_case() returns trigger language plpgsql security definer set search_path = public as $$
begin
  update cases set updated_at = now() where id = coalesce(new.case_id, old.case_id);
  return null;
end $$;
create trigger t_case_items_touch after insert or delete on public.case_items
  for each row execute function public.touch_case();
