-- Limits on what a signed-in user can write straight to the database through
-- the public API (cases, saved items, result reports), so one account can't fill
-- the free-tier database or skew the public source report counts.
-- NOT VALID: existing rows are left alone; new and updated rows are checked.

alter table public.cases
  add constraint cases_notes_len check (length(notes) <= 20000) not valid;

alter table public.case_items
  add constraint case_items_value_len check (value is null or length(value) <= 4000) not valid,
  add constraint case_items_note_len check (length(note) <= 5000) not valid,
  add constraint case_items_query_len check (length(query) <= 320) not valid,
  add constraint case_items_text_len check (length(source) <= 120 and (platform is null or length(platform) <= 120)) not valid,
  add constraint case_items_metadata_size check (octet_length(metadata::text) <= 65536) not valid;

-- Row caps. Volatile triggers see rows inserted earlier in the same statement.
create function public.enforce_case_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from cases where user_id = new.user_id) >= 200 then
    raise exception 'case_limit: up to 200 cases per account' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger cases_limit before insert on public.cases for each row execute function public.enforce_case_limit();

create function public.enforce_case_item_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from case_items where case_id = new.case_id) >= 1000 then
    raise exception 'case_item_limit: up to 1000 items per case' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger case_items_limit before insert on public.case_items for each row execute function public.enforce_case_item_limit();

create function public.enforce_report_limit() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from result_reports where user_id = new.user_id and created_at > now() - interval '1 day') >= 50 then
    raise exception 'report_limit: up to 50 reports a day' using errcode = 'check_violation';
  end if;
  return new;
end $$;
create trigger result_reports_limit before insert on public.result_reports for each row execute function public.enforce_report_limit();

revoke execute on function public.enforce_case_limit() from public, anon, authenticated;
revoke execute on function public.enforce_case_item_limit() from public, anon, authenticated;
revoke execute on function public.enforce_report_limit() from public, anon, authenticated;

-- Public counts: distinct people per module, so one account can't inflate them.
create or replace view public.module_report_counts with (security_invoker = false) as
  select module, count(distinct user_id)::int as reports_30d
  from public.result_reports
  where created_at > now() - interval '30 days'
  group by module;
grant select on public.module_report_counts to anon, authenticated;
