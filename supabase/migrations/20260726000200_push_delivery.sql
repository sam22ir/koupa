-- Track delivery so the notification worker can retry safely without duplicating sends.
alter table public.notifications
  add column if not exists push_delivered_at timestamptz,
  add column if not exists push_delivery_error text;

create index if not exists notifications_push_delivery_idx
  on public.notifications (created_at)
  where push_delivered_at is null;
