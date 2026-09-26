-- Bulletproofing for the WhatsApp lead-alert pipeline.
-- Adds a weekly "dead-man's switch" heartbeat: every Monday 08:00 UTC the
-- notify-lead Edge Function is called with {type:"HEARTBEAT"} and sends a
-- "system healthy" WhatsApp. If that weekly ping ever stops arriving, that is
-- the early warning that something needs attention.
--
-- (Timeout + fallback-template safeguards live in the Edge Function itself.)

create extension if not exists pg_cron;

-- Fire the heartbeat by calling the Edge Function, reading URL + shared secret
-- from private.app_secrets (same source the INSERT trigger uses).
create or replace function private.send_heartbeat()
returns void
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
  if v_url is null or v_secret is null then
    return;
  end if;

  perform net.http_post(
    url     := v_url,
    body    := jsonb_build_object('type', 'HEARTBEAT'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_secret
    ),
    timeout_milliseconds := 5000
  );
exception when others then
  -- A failed heartbeat must never error the cron runner.
  return;
end;
$$;

-- Weekly on Monday 08:00 UTC. cron.schedule upserts by job name.
select cron.schedule('notify-lead-heartbeat', '0 8 * * 1', $$ select private.send_heartbeat(); $$);
