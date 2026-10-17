-- Daily WhatsApp reminder for bookings within the next 7 days.
-- Every day at 05:00 UTC (≈08:00 Helsinki EEST / 10:30 IST) pg_cron calls the
-- `booking-reminders` Edge Function, which scans bookings 0..7 days out and
-- WhatsApps the owner one reminder per upcoming booking.
--
-- Mirrors the notify-lead heartbeat: URL + shared secret are read at runtime
-- from private.app_secrets (populated out-of-band, never committed).
--
-- Populate the URL once (psql / Supabase SQL editor); lead_webhook_secret is
-- already set by the notify-lead migration:
--   insert into private.app_secrets(key, value) values
--     ('booking_reminders_url',
--      'https://bvcwxwxagnxklrbwlrjo.supabase.co/functions/v1/booking-reminders')
--   on conflict (key) do update set value = excluded.value;

create extension if not exists pg_cron;
create extension if not exists pg_net;
create schema if not exists private;

create table if not exists private.app_secrets (
  key   text primary key,
  value text not null
);
alter table private.app_secrets enable row level security;

create or replace function private.send_booking_reminders()
returns void
language plpgsql
security definer
set search_path = private, public, extensions
as $$
declare
  v_url    text;
  v_secret text;
begin
  select value into v_url    from private.app_secrets where key = 'booking_reminders_url';
  select value into v_secret from private.app_secrets where key = 'lead_webhook_secret';
  if v_url is null or v_secret is null then
    return;
  end if;

  perform net.http_post(
    url     := v_url,
    body    := jsonb_build_object('type', 'DAILY'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_secret
    ),
    timeout_milliseconds := 10000
  );
exception when others then
  -- A failed reminder run must never error the cron runner.
  return;
end;
$$;

-- Daily at 05:00 UTC. cron.schedule upserts by job name.
select cron.schedule('booking-reminders-daily', '0 5 * * *', $$ select private.send_booking_reminders(); $$);
