-- In-app roadmap: upcoming features people can vote on.
-- Content is edited in the database (no app release needed). Clients never touch
-- the tables directly; they use two authenticated RPCs.

create table public.roadmap_items (
  id uuid primary key default gen_random_uuid(),
  audience text not null check (audience in ('customer', 'barber', 'both')),
  title text not null check (length(trim(title)) between 2 and 120),
  description text not null default '' check (length(description) <= 300),
  icon text not null default 'sparkles-outline',
  status text not null default 'planned' check (status in ('in_progress', 'soon', 'planned')),
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.roadmap_votes (
  item_id uuid not null references public.roadmap_items(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (item_id, user_id)
);

create trigger roadmap_items_updated_at
  before update on public.roadmap_items
  for each row execute function public.set_updated_at();

alter table public.roadmap_items enable row level security;
alter table public.roadmap_votes enable row level security;
revoke all on public.roadmap_items, public.roadmap_votes from public, anon, authenticated;

create or replace function public.list_roadmap_items()
returns table (
  id uuid,
  audience text,
  title text,
  description text,
  icon text,
  status text,
  vote_count integer,
  has_voted boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text;
begin
  if actor_id is null then
    raise exception 'Authentication is required';
  end if;
  select profile.role::text into actor_role from public.profiles profile where profile.id = actor_id;
  if actor_role is null then
    raise exception 'Profile is required';
  end if;

  return query
  select
    item.id,
    item.audience,
    item.title,
    item.description,
    item.icon,
    item.status,
    (select count(*)::integer from public.roadmap_votes vote where vote.item_id = item.id),
    exists (select 1 from public.roadmap_votes vote where vote.item_id = item.id and vote.user_id = actor_id)
  from public.roadmap_items item
  where item.is_visible
    and item.audience in ('both', actor_role)
  order by
    case item.status when 'in_progress' then 0 when 'soon' then 1 else 2 end,
    item.sort_order,
    item.created_at;
end;
$$;

create or replace function public.set_roadmap_vote(item_id_value uuid, vote_value boolean)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  actor_id uuid := auth.uid();
  actor_role text;
  total integer;
begin
  if actor_id is null then
    raise exception 'Authentication is required';
  end if;
  select profile.role::text into actor_role from public.profiles profile where profile.id = actor_id;
  if actor_role is null then
    raise exception 'Profile is required';
  end if;
  if not exists (
    select 1 from public.roadmap_items item
    where item.id = item_id_value and item.is_visible and item.audience in ('both', actor_role)
  ) then
    raise exception 'Roadmap item is not available';
  end if;

  if vote_value then
    insert into public.roadmap_votes (item_id, user_id) values (item_id_value, actor_id)
    on conflict do nothing;
  else
    delete from public.roadmap_votes where item_id = item_id_value and user_id = actor_id;
  end if;

  select count(*)::integer into total from public.roadmap_votes where item_id = item_id_value;
  return total;
end;
$$;

revoke all on function public.list_roadmap_items() from public, anon;
revoke all on function public.set_roadmap_vote(uuid, boolean) from public, anon;
grant execute on function public.list_roadmap_items() to authenticated;
grant execute on function public.set_roadmap_vote(uuid, boolean) to authenticated;

insert into public.roadmap_items (audience, title, description, icon, status, sort_order) values
  ('customer', 'تقييم الحلاق بعد الزيارة', 'قيّم تجربتك بعد اكتمال الموعد لتساعد غيرك على الاختيار.', 'star-outline', 'soon', 10),
  ('customer', 'إعدادات الإشعارات', 'اختر الإشعارات التي تريد استلامها ومتى.', 'options-outline', 'soon', 20),
  ('customer', 'إعادة الحجز بضغطة واحدة', 'احجز من جديد مع نفس الحلاق ونفس الخدمة بسرعة.', 'repeat-outline', 'planned', 30),
  ('customer', 'الحلاقون المفضلون', 'احفظ حلاقيك المفضلين للوصول إليهم بسهولة.', 'heart-outline', 'planned', 40),
  ('barber', 'التحليلات والأرباح', 'تابع دخلك وعدد الزبائن وأوقات الذروة.', 'stats-chart-outline', 'soon', 10),
  ('barber', 'لوحة تحكم المحل', 'نظرة شاملة على مواعيد وأداء كل حلاقي المحل.', 'business-outline', 'planned', 20),
  ('barber', 'ملاحظات عن الزبائن', 'دوّن تفضيلات كل زبون لتخدمه بشكل أفضل.', 'document-text-outline', 'planned', 30),
  ('barber', 'صور للخدمات', 'أضف صورا لخدماتك وأعمالك لتجذب زبائن أكثر.', 'images-outline', 'planned', 40),
  ('both', 'اللغة الإنجليزية', 'استخدم التطبيق بالعربية أو الإنجليزية.', 'language-outline', 'planned', 50),
  ('both', 'الوضع الداكن', 'مظهر مريح للعين في الإضاءة المنخفضة.', 'moon-outline', 'planned', 60),
  ('both', 'محادثة داخل التطبيق', 'تواصل مباشرة بين الزبون والحلاق دون مغادرة كوپا.', 'chatbubbles-outline', 'planned', 70);
