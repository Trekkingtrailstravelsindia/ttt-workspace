-- Website inbox → WhatsApp alert.
-- On every INSERT into public.website_bookings, POST the new row to the
-- `notify-lead` Edge Function, which sends a WhatsApp message via CallMeBot.
--
-- The function URL + shared secret are read at runtime from private.app_secrets
-- (populated OUT-OF-BAND, never committed) so no secret lives in git.
--
-- Populate the two values once (psql / Supabase SQL editor), e.g.:
--   insert into private.app_secrets(key, value) values
--     ('notify_lead_url', 'https://ageqtujursfesoekhgzm.supabase.co/functions/v1/notify-lead'),
--     ('lead_webhook_secret', '<the LEAD_WEBHOOK_SECRET you set on the function>')
--   on conflict (key) do update set value = excluded.value;

create extension if not exists pg_net;

create schema if not exists private;

create table if not exists private.app_secrets (
  key   text primary key,
  value text not null
);
-- RLS on with no policies = only the service role / superuser can read it.
alter table private.app_secrets enable row level security;

create or replace function private.notify_new_website_booking()
returns trigger
language plpgsql
security definer
set search_path = private, public, extensions
as $$
declare
  v_url    text;
  v_secret text;
begin
  select value into v_url    from private.app_secrets where key = 'notify_lead_url';
  select value into v_secret from private.app_secrets where key = 'lead_webhook_secret';

  -- If not configured yet, do nothing (never block the insert).
  if v_url is null or v_secret is null then
    return new;
  end if;

  perform net.http_post(
    url     := v_url,
    body    := jsonb_build_object('type', 'INSERT', 'table', 'website_bookings', 'record', to_jsonb(new)),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_secret
    ),
    timeout_milliseconds := 5000
  );

  return new;
exception when others then
  -- Alerting must never break an inbound booking/lead insert.
  return new;
end;
$$;

drop trigger if exists trg_notify_new_website_booking on public.website_bookings;
create trigger trg_notify_new_website_booking
  after insert on public.website_bookings
  for each row
  execute function private.notify_new_website_booking();
